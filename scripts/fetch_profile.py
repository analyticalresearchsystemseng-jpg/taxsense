"""Fetch profile by UUID (retry with delays for eventual consistency)"""
import json, base64, time, os, urllib.request, urllib.error
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
from cryptography.hazmat.backends import default_backend

KEY_PATH = os.path.expanduser("~/.appstoreconnect/private_keys/AuthKey_C5T5WC765Z.p8")
KEY_ID = "C5T5WC765Z"
ISSUER_ID = "a7b1f6f8-c49e-4ea3-8bc8-398812753255"
PROFILE_UUID = "42d636f7-1ae0-4296-bde4-1ac9e2d3f218"

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

for attempt in range(5):
    try:
        req = urllib.request.Request(
            f"https://api.appstoreconnect.apple.com/v1/profiles/{PROFILE_UUID}",
            headers={"Authorization": f"Bearer {jwt}"}
        )
        resp = json.loads(urllib.request.urlopen(req).read())
        content = resp["data"]["attributes"]["profileContent"]
        uuid = resp["data"]["attributes"]["uuid"]
        state = resp["data"]["attributes"].get("profileState", "?")
        import sys
        sys.stdout.write(content)
        sys.stderr.write(f"\nUUID={uuid} state={state} len={len(content)}\n")
        break
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"Attempt {attempt+1}: 404 (eventual consistency), retrying in 3s...", file=__import__('sys').stderr)
            time.sleep(3)
        else:
            print(f"Attempt {attempt+1}: {e.code} {e.read()[:200]}", file=__import__('sys').stderr)
            time.sleep(3)
else:
    print("Failed after 5 attempts", file=__import__('sys').stderr)