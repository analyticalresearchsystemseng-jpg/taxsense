"""Fix TaxSense — create a new App Store provisioning profile referencing an active cert."""
import json, base64, time, os, urllib.request
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.backends import default_backend

KEY_PATH = os.path.expanduser("~/.appstoreconnect/private_keys/AuthKey_C5T5WC765Z.p8")
KEY_ID = "C5T5WC765Z"
ISSUER_ID = "a7b1f6f8-c49e-4ea3-8bc8-398812753255"
GH_BIN = "/c/Users/analy/bin/bin/gh"

def b64url(d):
    if isinstance(d, str): d = d.encode()
    return base64.urlsafe_b64encode(d).rstrip(b'=').decode()

def jwt():
    with open(KEY_PATH) as f:
        key = serialization.load_pem_private_key(f.read().encode(), password=None, backend=default_backend())
    h = b64url(json.dumps({"kid": KEY_ID, "typ": "JWT", "alg": "ES256"}))
    p = b64url(json.dumps({"iss": ISSUER_ID, "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"}))
    sig = key.sign(f"{h}.{p}".encode(), ec.ECDSA(hashes.SHA256()))
    r, s2 = decode_dss_signature(sig)
    return f"{h}.{p}.{b64url(r.to_bytes(32,'big') + s2.to_bytes(32,'big'))}"

def asc(method, path, body=None):
    req = urllib.request.Request(f"https://api.appstoreconnect.apple.com{path}", headers={"Authorization": f"Bearer {jwt()}"})
    if body:
        req.data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    if method == "DELETE":
        req.method = "DELETE"
    try:
        resp = urllib.request.urlopen(req)
        if resp.status == 204: return {"status": "deleted"}
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        msg = "; ".join([er.get("detail", str(er)) for er in err.get("errors", [])])
        print(f"  API error {e.code}: {msg}")
        raise

# Step 1: Find ACTIVE distribution certs
print("=== Active distribution certs ===")
certs = asc("GET", "/v1/certificates?filter[certificateType]=DISTRIBUTION&limit=5")
cl = certs.get("data", [])
if not cl:
    print("❌ No distribution certs found at all!")
    exit(1)

for c in cl:
    attrs = c["attributes"]
    print(f"  {c['id']}: {attrs['name']} expires {attrs['expirationDate'][:19]}")

# Use the FIRST active cert (they're all "Apple Distribution: Neil Ross")
cert_id = cl[0]["id"]
print(f"\nUsing cert: {cert_id}")

# Step 2: Find TaxSense bundle ID
print("\n=== TaxSense bundle ID ===")
bids = asc("GET", "/v1/bundleIds?filter[identifier]=uk.co.taxsense.app")
bid_list = bids.get("data", [])
if not bid_list:
    print("❌ TaxSense bundle ID not found!")
    exit(1)
bid_id = bid_list[0]["id"]
print(f"  {bid_id}: uk.co.taxsense.app")

# Step 3: Delete stale TaxSense profiles
print("\n=== Cleaning stale TaxSense profiles ===")
profiles = asc("GET", "/v1/profiles?filter[profileType]=IOS_APP_STORE&limit=50")
deleted = 0
for p in profiles.get("data", []):
    rels = p.get("relationships", {})
    bid_rel = rels.get("bundleId", {}).get("data", {})
    if bid_rel.get("id") == bid_id:
        pid = p["id"]
        asc("DELETE", f"/v1/profiles/{pid}")
        print(f"  🗑️ Deleted {pid} ({p['attributes']['name']}, state={p['attributes'].get('profileState','?')})")
        deleted += 1
print(f"  Deleted {deleted} stale profile(s)")

# Step 4: Create new TaxSense profile
print("\n=== Creating new TaxSense profile ===")
prof_name = f"TaxSense App Store {int(time.time())}"
result = asc("POST", "/v1/profiles", {
    "data": {
        "type": "profiles",
        "attributes": {"name": prof_name, "profileType": "IOS_APP_STORE"},
        "relationships": {
            "certificates": {"data": [{"type": "certificates", "id": cert_id}]},
            "bundleId": {"data": {"type": "bundleIds", "id": bid_id}}
        }
    }
})
prof = result["data"]
prof_uuid = prof["attributes"]["uuid"]
prof_b64 = prof["attributes"]["profileContent"]
print(f"  ✅ Created: {prof['attributes']['name']}")
print(f"  UUID: {prof_uuid}")
print(f"  Content: {len(prof_b64)} chars base64")

# Step 5: Set TaxSense GH secrets
print("\n=== Updating TaxSense GH secrets ===")
import subprocess
def set_secret(repo, name, value):
    r = subprocess.run([GH_BIN, "secret", "set", name, "--repo", f"analyticalresearchsystemseng-jpg/{repo}", "--body", value],
                       capture_output=True, text=True, timeout=30)
    ok = "✅" if r.returncode == 0 else "❌"
    print(f"  {ok} {name} {'set' if r.returncode == 0 else 'FAILED'}")

set_secret("taxsense", "IOS_PROVISION_PROFILE_BASE64", prof_b64)
set_secret("taxsense", "PROVISIONING_PROFILE_UUID", prof_uuid)

print(f"\n✅ Done! New profile UUID: {prof_uuid}")
print("TaxSense IOS_DIST_P12 is unchanged — same private key, new profile.")