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

# Set Manual provisioning at project and target levels
content = content.replace("ProvisioningStyle = Automatic;", "ProvisioningStyle = Manual;")

# Remove conflicting hardcoded CODE_SIGN_IDENTITY lines
content = re.sub(r'\t{4}CODE_SIGN_IDENTITY = .*?;\n', "", content)
content = re.sub(r'\t{4}CODE_SIGNING_ALLOWED = .*?;\n', "", content)
content = re.sub(r'\t{4}CODE_SIGN_STYLE = .*?;\n', "", content)
content = re.sub(r'\t{4}CODE_SIGNING_REQUIRED = .*?;\n', "", content)
content = re.sub(r'\t{4}PROVISIONING_PROFILE_SPECIFIER = .*?;\n', "", content)
content = re.sub(r"\t{4}'PROVISIONING_PROFILE_SPECIFIER' = .*?;\n", "", content)

# Inject profile specifier into the App target's Release build config
pattern = r'(Release.*?\{[^}]*?ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;)'
if re.search(pattern, content, re.DOTALL):
    content = re.sub(
        pattern,
        r'\1\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "match AppStore uk.co.taxsense.app";',
        content,
        count=1,
        flags=re.DOTALL
    )
else:
    # Fallback: find any Release build settings block and inject
    content = content.replace(
        'PRODUCT_BUNDLE_IDENTIFIER = uk.co.taxsense.app;',
        'PRODUCT_BUNDLE_IDENTIFIER = uk.co.taxsense.app;\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "match AppStore uk.co.taxsense.app";'
    )

with open(path, "w") as f:
    f.write(content)
print("✅ pbxproj signing fix applied")
