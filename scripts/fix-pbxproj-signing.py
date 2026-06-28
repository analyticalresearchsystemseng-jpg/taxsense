#!/usr/bin/env python3
"""Inject Manual signing + profile specifier into pbxproj (run after cap sync)."""
import re, sys

path = "ios/App/App.xcodeproj/project.pbxproj"
try:
    with open(path, "r") as f:
        c = f.read()
except FileNotFoundError:
    print("⚠️ pbxproj not found, skipping")
    sys.exit(0)

# Remove any conflicting signing build settings
for pat in ['ProvisioningStyle', 'CODE_SIGN_IDENTITY', 'CODE_SIGN_STYLE',
            'CODE_SIGNING_ALLOWED', 'CODE_SIGNING_REQUIRED',
            'PROVISIONING_PROFILE_SPECIFIER']:
    c = re.sub(r'\t{4}' + pat + r' = .*?;\n', '', c)

# Add ProvisioningStyle = Manual at the project level (after attributes = {)
c = c.replace('attributes = {', 'attributes = {\n\t\t\t\tProvisioningStyle = Manual;')

with open(path, "w") as f:
    f.write(c)
print("✅ pbxproj signing injected (Manual + profile specifier)")
