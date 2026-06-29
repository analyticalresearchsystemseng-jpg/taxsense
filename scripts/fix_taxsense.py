#!/usr/bin/env python
"""Full fix: generate a new cert+p12 for TaxSense, create profile, set all secrets."""
import json, time, base64, os, tempfile, shutil, subprocess
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
GH_BIN = "/c/Users/analy/bin/bin/gh"
ORG = "analyticalresearchsystemseng-jpg"

def b64url(d):
    if isinstance(d, str): d = d.encode()
    return base64.urlsafe_b64encode(d).rstrip(b'=').decode()

def jwt():
    with open(KEY_PATH) as f: key = serialization.load_pem_private_key(f.read().encode(), password=None, backend=default_backend())
    h = b64url(json.dumps({"kid": KEY_ID, "typ": "JWT", "alg": "ES256"}))
    p = b64url(json.dumps({"iss": ISSUER_ID, "iat": int(time.time()), "exp": int(time.time()) + 300, "aud": "appstoreconnect-v1"}))
    sig = key.sign(f"{h}.{p}".encode(), ec.ECDSA(hashes.SHA256()))
    r, s2 = decode_dss_signature(sig)
    return f"{h}.{p}.{b64url(r.to_bytes(32,'big') + s2.to_bytes(32,'big'))}"

def asc(method, path, body=None):
    req = urllib.request.Request(f"https://api.appstoreconnect.apple.com{path}", headers={"Authorization": f"Bearer {jwt()}"})
    if body:
        req.data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    if method == "DELETE": req.method = "DELETE"
    try:
        resp = urllib.request.urlopen(req)
        if resp.status == 204: return None
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        msg = "; ".join([er.get("detail", str(er)) for er in err.get("errors", [])])
        print(f"  API ${e.code}: {msg}")
        raise

def run_gh(repo, name, value_file):
    r = subprocess.run(
        ["bash", "-c", f'cat "{value_file}" | {GH_BIN} secret set {name} --repo {ORG}/{repo}'],
        capture_output=True, text=True, timeout=30
    )
    return r.returncode == 0

# Step 1: Free a cert slot
print("=== Freeing cert slot ===")
certs = asc("GET", "/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=5")
cl = certs.get("data", [])
print(f"  {len(cl)} certs active")
cl.sort(key=lambda c: c["attributes"]["expirationDate"])
to_revoke = cl[0]
asc("DELETE", f"/v1/certificates/{to_revoke['id']}")
print(f"  ✅ Revoked {to_revoke['id']} ({to_revoke['attributes']['expirationDate'][:19]})")

# Step 2: Generate cert + p12
print("\n=== Generating cert + p12 ===")
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
print(f"  ✅ Cert created: {cert_id}")

with open(f"{td}/ts.cer.der", "wb") as f: f.write(base64.b64decode(cert_b64))
subprocess.run(["openssl", "x509", "-inform", "DER", "-in", f"{td}/ts.cer.der", "-out", f"{td}/ts.cer", "-outform", "PEM"], check=True, timeout=30)
subprocess.run(["openssl", "pkcs12", "-export", "-inkey", f"{td}/ts.key", "-in", f"{td}/ts.cer",
    "-out", f"{td}/taxsense.p12", "-passout", f"pass:{P12_PASS}", "-name", "iOS Distribution"],
    check=True, capture_output=True, timeout=30)
print(f"  ✅ p12 created ({os.path.getsize(f'{td}/taxsense.p12')} bytes)")

# Step 3: Create TaxSense provisioning profile
print("\n=== Creating profile ===")
# Find TaxSense bundle ID
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
print(f"  ✅ Profile: {prof['attributes']['name']}")
print(f"  UUID: {prof_uuid}")

# Step 4: Save to files then set GH secrets via bash
print("\n=== Setting GH secrets ===")
p12_b64_path = f"{td}/p12.b64"
with open(p12_b64_path, "w") as f: f.write(base64.b64encode(open(f"{td}/taxsense.p12", "rb").read()).decode())
prof_path = f"{td}/prof.b64"
with open(prof_path, "w") as f: f.write(prof_b64)
uuid_path = f"{td}/uuid.txt"
with open(uuid_path, "w") as f: f.write(prof_uuid)

for repo, name, fpath in [
    ("taxsense", "IOS_DIST_P12", p12_b64_path),
    ("taxsense", "IOS_DIST_P12_PASSWORD", None),
    ("taxsense", "IOS_PROVISION_PROFILE_BASE64", prof_path),
    ("taxsense", "PROVISIONING_PROFILE_UUID", uuid_path),
]:
    if name == "IOS_DIST_P12_PASSWORD":
        # Set password directly
        r = subprocess.run(["bash", "-c", f'echo -n "{P12_PASS}" | {GH_BIN} secret set {name} --repo {ORG}/{repo}'],
                          capture_output=True, text=True, timeout=30)
    else:
        r = subprocess.run(["bash", "-c", f'{GH_BIN} secret set {name} --repo {ORG}/{repo} --body "$(cat {fpath})"'],
                          capture_output=True, text=True, timeout=30)
    ok = "✅" if r.returncode == 0 else "❌"
    print(f"  {ok} {name}")
    if r.returncode != 0:
        print(f"    Error: {r.stderr.strip()}")

shutil.rmtree(td)
print(f"\n✅ Done! UUID: {prof_uuid}")