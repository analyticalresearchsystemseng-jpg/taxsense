#!/usr/bin/env python3
"""Write ASC API key JSON for Fastlane, accepting raw PEM or base64."""
import json, base64, os, sys
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

p8 = os.environ.get("ASC_KEY_P8", "")
b64 = os.environ.get("ASC_KEY_B64", "")

if b64:
    raw = base64.b64decode(b64)
elif p8:
    raw = p8.encode()
else:
    print("[write_asc_key] No key found in ASC_KEY_P8 or ASC_KEY_B64", file=sys.stderr)
    sys.exit(1)

key = serialization.load_pem_private_key(raw, password=None, backend=default_backend())
sec1 = key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=serialization.NoEncryption()
).decode()

c = {
    "key_id": os.environ.get("ASC_KEY_ID", ""),
    "issuer_id": os.environ.get("ASC_ISSUER_ID", ""),
    "key": sec1,
    "duration": 1200,
    "in_house": False,
}
with open("/tmp/asc_api_key.json", "w") as f:
    json.dump(c, f)
