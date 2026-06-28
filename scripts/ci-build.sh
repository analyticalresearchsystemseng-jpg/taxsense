#!/usr/bin/env bash
set -euo pipefail

echo "=== Install signing certificate and provisioning profile ==="
CERT_PATH=$RUNNER_TEMP/build_certificate.p12
PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

echo -n "$BUILD_CERTIFICATE_BASE64" | base64 --decode -o $CERT_PATH
echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o $PP_PATH

security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

# Import the full p12 (cert + private key) into the temporary keychain
security import $CERT_PATH -P "$P12_PASSWORD" -A -f pkcs12 -k $KEYCHAIN_PATH
security set-key-partition-list -S apple-tool:,apple: -k "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
security list-keychain -d user -s $KEYCHAIN_PATH
security default-keychain -s $KEYCHAIN_PATH

mkdir -p ~/Library/MobileDevice/"Provisioning Profiles"
UUID=$(openssl cms -in $PP_PATH -inform DER -verify -noverify -out /tmp/profile.plist 2>/dev/null && python3 -c "import plistlib; f=open('/tmp/profile.plist','rb'); print(plistlib.load(f)['UUID'])")
cp $PP_PATH ~/Library/MobileDevice/"Provisioning Profiles"/$UUID.mobileprovision
echo "✅ Certificate and profile installed (UUID: $UUID)"

echo "Installed identities:"
security find-identity -v -p codesigning $KEYCHAIN_PATH

echo "=== Setup ASC API Key ==="
printf '%s\n' "$ASC_KEY_P8" > /tmp/AuthKey.p8
chmod 600 /tmp/AuthKey.p8

echo "=== Archive ==="
cd ios

# Inject profile specifier into the App target's build config only (Pods already fine)
python3 -c "
import re
with open('App/App.xcodeproj/project.pbxproj') as f: c=f.read()
m = re.search(r'(buildSettings = \{[^\}]*PRODUCT_BUNDLE_IDENTIFIER = uk\.co\.taxsense\.app;)', c)
if m:
    start = m.end()
    c = c[:start] + '\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = \"822a9871-6ecc-4fc9-ae2f-098bb79bf314\";' + c[start:]
    with open('App/App.xcodeproj/project.pbxproj','w') as f: f.write(c)
    print('✅ pbxproj patched')
else:
    print('⚠️ Bundle ID not found in pbxproj, continuing anyway')
"

xcodebuild archive -scheme App -workspace App/App.xcworkspace -destination 'generic/platform=iOS' -archivePath ./build/App.xcarchive CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution" DEVELOPMENT_TEAM=M6BWMNZQ57 PRODUCT_BUNDLE_IDENTIFIER=uk.co.taxsense.app

echo "=== Export IPA ==="
mkdir -p build/export
cat > build/exportOptions.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>teamID</key>
    <string>M6BWMNZQ57</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>uk.co.taxsense.app</key>
        <string>822a9871-6ecc-4fc9-ae2f-098bb79bf314</string>
    </dict>
</dict>
</plist>
PLIST

xcodebuild -exportArchive -archivePath ./build/App.xcarchive -exportOptionsPlist ./build/exportOptions.plist -exportPath ./build/export
echo "✅ IPA exported"

echo "=== Upload to TestFlight ==="
mkdir -p ~/.appstoreconnect/private_keys
echo "$ASC_KEY_P8" > ~/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8
chmod 600 ~/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8

xcrun altool --upload-app --type ios --file ios/build/export/App.ipa --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
echo "✅ Uploaded to TestFlight"
