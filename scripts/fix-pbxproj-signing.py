#!/usr/bin/env python3
"""Fix pbxproj signing after cap sync (which resets the project)."""
import re, sys

path = "ios/App/App.xcodeproj/project.pbxproj"
try:
    with open(path, "r") as f:
        content = f.read()
except FileNotFoundError:
    print("⚠️ pbxproj not found, skipping")
    sys.exit(0)

# Remove any hardcoded signing build settings — they conflict with Manual
content = re.sub(r'\t{4}CODE_SIGN_IDENTITY = .*?;\n', "", content)
content = re.sub(r'\t{4}CODE_SIGNING_ALLOWED = .*?;\n', "", content)
content = re.sub(r'\t{4}CODE_SIGN_STYLE = .*?;\n', "", content)
content = re.sub(r'\t{4}CODE_SIGNING_REQUIRED = .*?;\n', "", content)
content = re.sub(r'\t{4}PROVISIONING_PROFILE_SPECIFIER = .*?;\n', "", content)
content = re.sub(r"\t{4}'PROVISIONING_PROFILE_SPECIFIER' = .*?;\n", "", content)

# Set Manual provisioning at project and target levels
content = content.replace("ProvisioningStyle = Automatic;", "ProvisioningStyle = Manual;")

# Inject profile specifier after the SECOND PRODUCT_BUNDLE_IDENTIFIER line (Release)
count = 0
def inject_profile(m):
    global count
    count += 1
    if count == 2:
        return m.group(0) + '\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "match AppStore uk.co.taxsense.app";'
    return m.group(0)

content = re.sub(
    r'\t{4}PRODUCT_BUNDLE_IDENTIFIER = uk\.co\.taxsense\.app;',
    inject_profile,
    content
)

with open(path, "w") as f:
    f.write(content)
print("✅ pbxproj signing fix applied")
