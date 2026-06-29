#!/usr/bin/env python
"""Full fix v2: generate new cert+p12 for TaxSense, create profile, save files for bash"""
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
OUT = "/tmp/taxsense_fix"

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

os.makedirs(OUT, exist_ok=True)

# Step 1: Free a cert slot
print("=== Certs ===")
certs = asc("GET", "/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=5")
cl = certs.get("data", [])
print(f"  {len(cl)} active")
cl.sort(key=lambda c: c["attributes"]["expirationDate"])
if len(cl) >= 2:
    asc("DELETE", f"/v1/certificates/{cl[0]['id']}")
    print(f"  ✅ Revoked {cl[0]['id']}")

# Step 2: Generate cert + p12
print("\n=== Generate cert ===")
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
p12_size = os.path.getsize(f"{td}/taxsense.p12")
print(f"  ✅ p12 ({p12_size} bytes)")

# Step 3: Bundle and profile
p12_b64 = base64.b64encode(open(f"{td}/taxsense.p12", "rb").read()).decode()
with open(f"{OUT}/IOS_DIST_P12.txt", "w") as f: f.write(p12_b64)
with open(f"{OUT}/IOS_DIST_P12_PASSWORD.txt", "w") as f: f.write(P12_PASS)
print(f"  ✅ Saved p12 to {OUT}/IOS_DIST_P12.txt ({len(p12_b64)} chars b64)")

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
with open(f"{OUT}/IOS_PROVISION_PROFILE_BASE64.txt", "w") as f: f.write(prof_b64)
with open(f"{OUT}/PROVISIONING_PROFILE_UUID.txt", "w") as f: f.write(prof_uuid)
print(f"  ✅ Profile: {prof_uuid}")
print(f"  ✅ Saved secrets to {OUT}/")

# Cleanup
import shutil
shutil.rmtree(td)
print(f"\nDone! Files in {OUT}/")
print(f"Run: cd {OUT} && for f in *; do echo \"Setting $f...\"; gh secret set \"\$f\" --repo analyticalresearchsystemseng-jpg/taxsense --body \"\\$(cat \\\"\\$f\\\")\"; done")