#!/usr/bin/env python3
"""Auto-increment build number before every build to prevent Apple duplicate rejection."""
import re, sys, os

PBXPROJ = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                       "ios/App/App.xcodeproj/project.pbxproj")

with open(PBXPROJ, 'r') as f:
    content = f.read()

# Find current build number
match = re.search(r'CURRENT_PROJECT_VERSION = (\d+);', content)
if not match:
    print("ERROR: Could not find CURRENT_PROJECT_VERSION", file=sys.stderr)
    sys.exit(1)

current = int(match.group(1))
new = current + 1

# Replace all occurrences (Debug and Release configs)
content = content.replace(
    f'CURRENT_PROJECT_VERSION = {current};',
    f'CURRENT_PROJECT_VERSION = {new};'
)

with open(PBXPROJ, 'w') as f:
    f.write(content)

print(f"Build: {current} → {new}")
