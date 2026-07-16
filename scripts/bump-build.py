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
# Use Unix timestamp as build number — always unique and ever-increasing
# Ensures every build gets a fresh number never used before
import time
new = int(time.time()) % 1000000  # Last 6 digits of timestamp — ~1.7M range, unique per-second
if new <= current:
    new = current + 1  # Safe fallback

# Replace ALL occurrences (Debug and Release configs)
content = re.sub(
    r'CURRENT_PROJECT_VERSION = \d+;',
    f'CURRENT_PROJECT_VERSION = {new};',
    content
)

# Also bump MARKETING_VERSION if the current one is closed on the store.
# Parses 1.3.9 → 1.3.10 (simple patch-level bump). Adjust as needed.
ver_matches = re.findall(r'MARKETING_VERSION = ([0-9]+\.[0-9]+\.[0-9]+);', content)
if ver_matches:
    old_ver = max(ver_matches)  # lexicographic is fine for semver, use max
    parts = old_ver.split('.')
    parts[-1] = str(int(parts[-1]) + 1)
    new_ver = '.'.join(parts)
    content = re.sub(
        r'MARKETING_VERSION = [0-9]+\.[0-9]+\.[0-9]+;',
        f'MARKETING_VERSION = {new_ver};',
        content
    )

with open(PBXPROJ, 'w') as f:
    f.write(content)

if ver_matches:
    print(f"Build: {current} → {new} (updated {len(matches)} occurrences)")
    print(f"Version: {old_ver} → {new_ver}")
else:
    print(f"Build: {current} → {new} (updated {len(matches)} occurrences)")
