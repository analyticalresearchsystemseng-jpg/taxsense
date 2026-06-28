#!/usr/bin/env bash
set -euo pipefail

SUMMARY=/tmp/BUILD_SUMMARY.txt
echo "TaxSense CI Build Summary" > "$SUMMARY"
echo "=========================" >> "$SUMMARY"

log() {
    echo "$1"
    echo "[$(date '+%H:%M:%S')] $1" >> "$SUMMARY"
}

log "=== Install signing certificate ==="
CERT_PATH=$RUNNER_TEMP/build_certificate.p12
PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

echo -n "$BUILD_CERTIFICATE_BASE64" | base64 --decode -o $CERT_PATH
echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o $PP_PATH

security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
security import $CERT_PATH -P "$P12_PASSWORD" -A -f pkcs12 -k $KEYCHAIN_PATH
security set-key-partition-list -S apple-tool:,apple: -k "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
security list-keychain -d user -s $KEYCHAIN_PATH
security default-keychain -s $KEYCHAIN_PATH

mkdir -p ~/Library/MobileDevice/"Provisioning Profiles"
UUID=$(openssl cms -in $PP_PATH -inform DER -verify -noverify -out /tmp/profile.plist 2>/dev/null && python3 -c "import plistlib; f=open('/tmp/profile.plist','rb'); print(plistlib.load(f)['UUID'])")
cp $PP_PATH ~/Library/MobileDevice/"Provisioning Profiles"/$UUID.mobileprovision
log "Certificate/profile installed: UUID=$UUID"

log "=== Setup ASC API Key ==="
printf '%s\n' "$ASC_KEY_P8" > /tmp/AuthKey.p8
chmod 600 /tmp/AuthKey.p8

log "=== Archive ==="
cd ios

# Inject profile into pbxproj only
python3 -c "
import re
with open('App/App.xcodeproj/project.pbxproj') as f: c=f.read()
if 'PROVISIONING_PROFILE_SPECIFIER' not in c:
    c = re.sub(
        r'(PRODUCT_BUNDLE_IDENTIFIER = uk\\.co\\.taxsense\\.app;)',
        r'\1\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = \"822a9871-6ecc-4fc9-ae2f-098bb79bf314\";',
        c)
    with open('App/App.xcodeproj/project.pbxproj','w') as f: f.write(c)
    print('pbxproj patched')
else:
    print('pbxproj skip: already patched')
"

# Run archive to file (-quiet dramatically reduces noise)
if ! xcodebuild archive -quiet -scheme App -workspace App/App.xcworkspace -destination 'generic/platform=iOS' -archivePath ./build/App.xcarchive CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution" DEVELOPMENT_TEAM=M6BWMNZQ57 PRODUCT_BUNDLE_IDENTIFIER=uk.co.taxsense.app > /tmp/archive.log 2>&1; then
    log "❌ ARCHIVE FAILED"
    tail -30 /tmp/archive.log >> "$SUMMARY"
    exit 1
fi

log "=== Check archive ==="
if [ ! -d "./build/App.xcarchive" ] || [ ! -f "./build/App.xcarchive/Products/Applications/App.app/Info.plist" ]; then
    log "❌ Archive not produced"
    ls -la ./build/ 2>/dev/null | head -20 >> "$SUMMARY"
    exit 1
fi
ARCHIVE_SIZE=$(du -sh ./build/App.xcarchive 2>/dev/null | awk '{print $1}')
log "✅ Archive verified: $ARCHIVE_SIZE"

log "=== Export IPA ==="
mkdir -p build/export
cat > build/exportOptions.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key><string>app-store</string>
    <key>signingStyle</key><string>manual</string>
    <key>teamID</key><string>M6BWMNZQ57</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>uk.co.taxsense.app</key><string>822a9871-6ecc-4fc9-ae2f-098bb79bf314</string>
    </dict>
</dict>
</plist>
PLIST

if ! xcodebuild -exportArchive -quiet -archivePath ./build/App.xcarchive -exportOptionsPlist ./build/exportOptions.plist -exportPath ./build/export > /tmp/export.log 2>&1; then
    log "❌ EXPORT FAILED"
    tail -30 /tmp/export.log >> "$SUMMARY"
    exit 1
fi

if [ ! -f "./build/export/App.ipa" ]; then
    log "❌ IPA not found"
    ls -la ./build/export/ 2>/dev/null | head -20 >> "$SUMMARY"
    exit 1
fi
IPA_SIZE=$(ls -lh ./build/export/App.ipa 2>/dev/null | awk '{print $5}')
log "✅ IPA exported: $IPA_SIZE"

log "=== Upload to TestFlight ==="
mkdir -p ~/.appstoreconnect/private_keys
echo "$ASC_KEY_P8" > ~/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8
chmod 600 ~/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8

if ! xcrun altool --upload-app --type ios --file ./build/export/App.ipa --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" > /tmp/upload.log 2>&1; then
    log "❌ UPLOAD FAILED"
    tail -30 /tmp/upload.log >> "$SUMMARY"
    exit 1
fi

log "✅ Uploaded to TestFlight"
echo "" >> "$SUMMARY"
echo "SUCCESS" >> "$SUMMARY"
log "Build completed successfully"
