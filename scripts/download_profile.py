"""Download TaxSense profile content to a file"""
import json, base64, time, os, urllib.request
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.backends import default_backend

KEY_PATH = os.path.expanduser("~/.appstoreconnect/private_keys/AuthKey_C5T5WC765Z.p8")
KEY_ID = "C5T5WC765Z"
ISSUER_ID = "a7b1f6f8-c49e-4ea3-8bc8-398812753255"

def b64url(d):
    if isinstance(d, str): d = d.encode()
    return base64.urlsafe_b64encode(d).rstrip(b'=').decode()

with open(KEY_PATH) as f:
    key = serialization.load_pem_private_key(f.read().encode(), password=None, backend=default_backend())
h = b64url(json.dumps({"kid": KEY_ID, "typ": "JWT", "alg": "ES256"}))
p = b64url(json.dumps({"iss": ISSUER_ID, "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"}))
sig = key.sign(f"{h}.{p}".encode(), ec.ECDSA(hashes.SHA256()))
r, s2 = decode_dss_signature(sig)
jwt = f"{h}.{p}.{b64url(r.to_bytes(32,'big') + s2.to_bytes(32,'big'))}"

# Try multiple times (eventual consistency)
for attempt in range(3):
    try:
        req = urllib.request.Request(
            "https://api.appstoreconnect.apple.com/v1/profiles?filter[name]=TaxSense&filter[profileType]=IOS_APP_STORE&limit=5",
            headers={"Authorization": f"Bearer {jwt}"}
        )
        resp = json.loads(urllib.request.urlopen(req).read())
        profiles = resp.get("data", [])
        # Find the newest one
        if profiles:
            newest = max(profiles, key=lambda p: p["attributes"].get("createdDate", ""))
            content = newest["attributes"]["profileContent"]
            uuid = newest["attributes"]["uuid"]
            with open("/tmp/taxsense_profile_b64.txt", "w") as f:
                f.write(content)
            print(f"Written: UUID={uuid}, {len(content)} chars")
            break
        else:
            print(f"Attempt {attempt+1}: no profiles found, retrying...")
            time.sleep(2)
    except Exception as e:
        print(f"Attempt {attempt+1}: {e}")
        time.sleep(2)
else:
    print("Failed to get profile after 3 attempts")