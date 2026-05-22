#!/usr/bin/env python3
"""Auto-increment build number before every build to prevent Apple duplicate rejection."""
import re, sys, os, time

PBXPROJ = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                       "ios/App/App.xcodeproj/project.pbxproj")

with open(PBXPROJ, 'r') as f:
    content = f.read()

# Find ALL build numbers and use the max (Debug and Release can differ)
matches = re.findall(r'CURRENT_PROJECT_VERSION = (\d+);', content)
if not matches:
    print("ERROR: Could not find CURRENT_PROJECT_VERSION", file=sys.stderr)
    sys.exit(1)

current = max(int(m) for m in matches)
# Use timestamp-based increment to avoid duplicate collisions with Apple
# Increment by at least 10, plus a small time-based offset to guarantee uniqueness
increment = 10 + (int(time.time()) % 10)
new = current + increment

# Replace ALL occurrences (Debug and Release configs)
content = re.sub(
    r'CURRENT_PROJECT_VERSION = \d+;',
    f'CURRENT_PROJECT_VERSION = {new};',
    content
)

with open(PBXPROJ, 'w') as f:
    f.write(content)

print(f"Build: {current} → {new} (updated {len(matches)} occurrences)")
