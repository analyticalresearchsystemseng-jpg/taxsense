const fs = require('fs');
const path = require('path');

const projectPath = path.resolve(__dirname, '../ios/App/App.xcodeproj/project.pbxproj');
const podfilePath = path.resolve(__dirname, '../ios/App/Podfile');
const TEAM_ID = 'M6BWMNZQ57';

// 1. PROJECT LEVEL FIX (For the main App target)
console.log('--- Step 1: Applying App Target Signing Fixes ---');
if (fs.existsSync(projectPath)) {
    let content = fs.readFileSync(projectPath, 'utf8');

    // Remove any hardcoded signing overrides — let the xcconfig handle it
    content = content.replace(/\t\t\t\tCODE_SIGNING_ALLOWED = .*?;\n/g, '');
    content = content.replace(/\t\t\t\tCODE_SIGN_STYLE = .*?;\n/g, '');
    content = content.replace(/\t\t\t\tCODE_SIGNING_REQUIRED = .*?;\n/g, '');
    content = content.replace(/\t\t\t\tCODE_SIGN_IDENTITY = .*?;\n/g, '');
    content = content.replace(/\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = .*?;\n/g, '');
    content = content.replace(/\t\t\t\t'PROVISIONING_PROFILE_SPECIFIER' = .*?;\n/g, '');
    
    // Use Manual provisioning — match handles certs + profiles
    content = content.replace(/ProvisioningStyle = Automatic;/g, 'ProvisioningStyle = Manual;');
    
    // Ensure the main project forces the Team ID
    if (content.includes('DevelopmentTeam =')) {
        content = content.replace(/DevelopmentTeam = .*?;/g, `DevelopmentTeam = ${TEAM_ID};`);
    } else {
        content = content.replace(/attributes = \{/, `attributes = {\n\t\t\t\tDevelopmentTeam = ${TEAM_ID};`);
    }

    fs.writeFileSync(projectPath, content);
    console.log('Successfully updated App target signing styles.');
} else {
    console.log(`Warning: project.pbxproj not found at ${projectPath}`);
}

// 2. COCOAPODS LEVEL FIX (For RevenueCat and other dependencies)
console.log('--- Step 2: Injecting CocoaPods Signing Hook ---');
if (fs.existsSync(podfilePath)) {
    let podfileContent = fs.readFileSync(podfilePath, 'utf8');

    const hookScript = `
post_install do |installer|
  # --- TAXSENSE SIGNING HOOK BEGIN ---
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['DEVELOPMENT_TEAM'] = '${TEAM_ID}'
      config.build_settings['CODE_SIGN_IDENTITY'] = '"Apple Distribution"'
      config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
    end
  end
  # --- TAXSENSE SIGNING HOOK END ---
end
`;

    // Capacitor writes its own post_install. We need to replace it or append to it.
    if (podfileContent.includes('post_install do |installer|')) {
        console.log('Existing post_install found. Injecting signing logic into it.');
        // If it already has our hook, don't duplicate
        if (!podfileContent.includes('TAXSENSE SIGNING HOOK BEGIN')) {
             podfileContent = podfileContent.replace(
                /post_install do \|installer\|/g, 
                `post_install do |installer|\n  # --- TAXSENSE SIGNING HOOK BEGIN ---\n  installer.pods_project.targets.each do |target|\n    target.build_configurations.each do |config|\n      config.build_settings['DEVELOPMENT_TEAM'] = '${TEAM_ID}'\n      config.build_settings['CODE_SIGN_IDENTITY'] = '"Apple Distribution"'\n      config.build_settings['CODE_SIGN_STYLE'] = 'Manual'\n    end\n  end\n  # --- TAXSENSE SIGNING HOOK END ---`
            );
            fs.writeFileSync(podfilePath, podfileContent);
            console.log('Successfully injected CocoaPods Team ID hook into existing post_install.');
        } else {
            console.log('CocoaPods hook already exists. Skipping injection.');
        }
    } else {
        // Append it to the bottom if there is no post_install block
        podfileContent += hookScript;
        fs.writeFileSync(podfilePath, podfileContent);
        console.log('Successfully appended CocoaPods Team ID hook to the bottom of the Podfile.');
    }
} else {
    console.log(`Warning: Podfile not found at ${podfilePath}. This script must run AFTER Capacitor has generated the iOS project/CocoaPods.`);
}

console.log('--- Signing Fixes Complete ---');
