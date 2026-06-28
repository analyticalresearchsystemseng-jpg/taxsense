#!/usr/bin/env python3
"""Fix pbxproj after cap sync: Manual signing + profile specifier."""
import re

with open('ios/App/App.xcodeproj/project.pbxproj', 'r+') as f:
    c = f.read()

    # Remove conflicting signing settings
    for p in ['ProvisioningStyle', 'CODE_SIGN_IDENTITY', 'CODE_SIGNING_ALLOWED',
              'CODE_SIGN_STYLE', 'PROVISIONING_PROFILE_SPECIFIER']:
        c = re.sub(r'\t{4}' + p + r' = .*?;\n', '', c)

    # Add Manual style at project level
    c = c.replace('attributes = {', 'attributes = {\n\t\t\t\tProvisioningStyle = Manual;')

    # Inject profile specifier in Release config (second bundle ID line)
    parts = c.split('PRODUCT_BUNDLE_IDENTIFIER = uk.co.taxsense.app;')
    if len(parts) >= 3:
        c = (parts[0] + parts[1] +
             'PRODUCT_BUNDLE_IDENTIFIER = uk.co.taxsense.app;\n'
             '\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "TaxSense App Store";' +
             ''.join(parts[2:]))

    f.seek(0)
    f.write(c)
    f.truncate()

print("✅ pbxproj fixed")
