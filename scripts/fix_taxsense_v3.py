#!/usr/bin/env python
"""TaxSense fix v3: generate cert+p12+profile and set secrets in one shot"""
import json, time, base64, os, tempfile, subprocess
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.backends import default_backend
import urllib.request, urllib.error

KEY_PATH = os.path.expanduser("~/.appstoreconnect/private_keys/AuthKey_C5T5WC765Z.p8")
KEY_ID = "C5T5WC765Z"
ISSUER_ID = "a7b1f6f8-c49e-4ea3-8bc8-398812753255"
TEAM_ID = "M6BWMNZQ57"
BUNDLE_ID = "uk.co.taxsense.app"
P12_PASS = "TaxSense2026"
# Windows-native path for gh (no MSYS translation needed)
GH = os.path.expanduser("~/bin/bin/gh.exe")

def b64url(d):
    if isinstance(d, str): d = d.encode()
    return base64.urlsafe_b64encode(d).rstrip(b'=').decode()

def jwt():
    kp = os.path.expanduser(KEY_PATH)
    with open(kp) as f: key = serialization.load_pem_private_key(f.read().encode(), password=None, backend=default_backend())
    h = b64url(json.dumps({"kid": KEY_ID, "typ": "JWT", "alg": "ES256"}))
    p = b64url(json.dumps({"iss": ISSUER_ID, "iat": int(time.time()), "exp": int(time.time()) + 300, "aud": "appstoreconnect-v1"}))
    sig = key.sign(f"{h}.{p}".encode(), ec.ECDSA(hashes.SHA256()))
    r, s2 = decode_dss_signature(sig)
    return f"{h}.{p}.{b64url(r.to_bytes(32,'big') + s2.to_bytes(32,'big'))}"

def asc(method, path, body=None):
    req = urllib.request.Request(f"https://api.appstoreconnect.apple.com{path}", headers={"Authorization": f"Bearer {jwt()}"})
    if body:
        req.data = json.dumps(body).encode()
        req.method = method
        req.add_header("Content-Type", "application/json")
    if method == "DELETE": req.method = "DELETE"
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        if resp.status == 204: return None
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        msg = "; ".join([er.get("detail", str(er)) for er in err.get("errors", [])])
        print(f"  API {e.code}: {msg}")
        raise

def gh_set(repo, name, value):
    r = subprocess.run([GH, "secret", "set", name, "--repo", f"analyticalresearchsystemseng-jpg/{repo}", "--body", value],
                       capture_output=True, text=True, timeout=30)
    ok = "✅" if r.returncode == 0 else "❌"
    print(f"  {ok} {name}")
    if r.returncode != 0:
        print(f"    {r.stderr.strip()}")
    return r.returncode == 0

# Step 1: Free a slot
print("=== Certs ===")
certs = asc("GET", "/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=5")
cl = certs.get("data", [])
print(f"  {len(cl)} active")
cl.sort(key=lambda c: c["attributes"]["expirationDate"])
if len(cl) >= 2:
    asc("DELETE", f"/v1/certificates/{cl[0]['id']}")
    print(f"  ✅ Revoked {cl[0]['id']:16s} ({cl[0]['attributes']['expirationDate'][:19]})")

# Step 2: Generate cert
print("\n=== Generate ===")
td = tempfile.mkdtemp()
subprocess.run(["openssl", "req", "-new", "-newkey", "rsa:2048", "-nodes",
    "-keyout", f"{td}/ts.key", "-out", f"{td}/ts.csr",
    "-subj", f"/C=GB/O=Neil Ross/CN=Apple Distribution: Neil Ross ({TEAM_ID})/UID={TEAM_ID}"],
    check=True, capture_output=True, timeout=30)

csr = open(f"{td}/ts.csr").read()
res = asc("POST", "/v1/certificates", {
    "data": {"type": "certificates", "attributes": {"csrContent": csr, "certificateType": "DISTRIBUTION"}}
})
cert_id = res["data"]["id"]
cert_b64 = res["data"]["attributes"]["certificateContent"]
print(f"  ✅ Cert: {cert_id}")

with open(f"{td}/ts.cer.der", "wb") as f: f.write(base64.b64decode(cert_b64))
subprocess.run(["openssl", "x509", "-inform", "DER", "-in", f"{td}/ts.cer.der", "-out", f"{td}/ts.cer", "-outform", "PEM"], check=True, timeout=30)
subprocess.run(["openssl", "pkcs12", "-export", "-inkey", f"{td}/ts.key", "-in", f"{td}/ts.cer",
    "-out", f"{td}/taxsense.p12", "-passout", f"pass:{P12_PASS}", "-name", "iOS Distribution"],
    check=True, capture_output=True, timeout=30)
p12_b64 = base64.b64encode(open(f"{td}/taxsense.p12", "rb").read()).decode()
print(f"  ✅ p12 ({os.path.getsize(f'{td}/taxsense.p12')} bytes)")

# Step 3: Profile
bids = asc("GET", f"/v1/bundleIds?filter[identifier]={BUNDLE_ID}")
bid_id = bids["data"][0]["id"]
res2 = asc("POST", "/v1/profiles", {
    "data": {
        "type": "profiles",
        "attributes": {"name": f"TaxSense App Store {int(time.time())}", "profileType": "IOS_APP_STORE"},
        "relationships": {
            "certificates": {"data": [{"type": "certificates", "id": cert_id}]},
            "bundleId": {"data": {"type": "bundleIds", "id": bid_id}}
        }
    }
})
prof = res2["data"]
prof_uuid = prof["attributes"]["uuid"]
prof_b64 = prof["attributes"]["profileContent"]
print(f"  ✅ Profile: {prof_uuid}")

# Cleanup temp
import shutil
shutil.rmtree(td)

# Step 4: Set secrets
print("\n=== Setting secrets ===")
gh_set("taxsense", "IOS_DIST_P12", p12_b64)
gh_set("taxsense", "IOS_DIST_P12_PASSWORD", P12_PASS)
gh_set("taxsense", "IOS_PROVISION_PROFILE_BASE64", prof_b64)
gh_set("taxsense", "PROVISIONING_PROFILE_UUID", prof_uuid)

print(f"\n✅ Done! UUID: {prof_uuid}")