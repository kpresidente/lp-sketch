#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"
output_dir="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/lp-sketch-unsigned"
mkdir -p "$output_dir"

xcodebuild -version
xcodebuild \
  -project apps/mobile/ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$output_dir/LP-Sketch.xcarchive" \
  -derivedDataPath "$output_dir/DerivedData" \
  CODE_SIGNING_ALLOWED=NO \
  archive

echo "Unsigned iPad archive compiled. This archive cannot be installed through TestFlight."
