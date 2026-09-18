#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

required=(IOS_BUNDLE_ID APPLE_TEAM_ID APP_VERSION BUILD_NUMBER
  APP_STORE_CONNECT_KEY_ID APP_STORE_CONNECT_ISSUER_ID APP_STORE_CONNECT_PRIVATE_KEY
  APPLE_DISTRIBUTION_P12_BASE64 APPLE_DISTRIBUTION_P12_PASSWORD APPLE_PROVISIONING_PROFILE_BASE64 RUNNER_TEMP)
for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "::error::Missing $variable. Follow docs/TESTFLIGHT.md."
    exit 1
  fi
done
python3 scripts/ios/ios_config.py
if [[ ! "$APP_STORE_CONNECT_KEY_ID" =~ ^[A-Z0-9]{10}$ ]] ||
   [[ ! "$APP_STORE_CONNECT_ISSUER_ID" =~ ^[a-fA-F0-9-]{36}$ ]]; then
  echo "::error::Invalid App Store Connect API key or issuer ID."
  exit 1
fi

# Restrict temporary files to this job. Never enable shell tracing here.
umask 077
signing_dir="$(mktemp -d "$RUNNER_TEMP/lp-sketch-signing.XXXXXX")"
keychain="$signing_dir/signing.keychain-db"
profile_path=""
cleanup() {
  security delete-keychain "$keychain" >/dev/null 2>&1 || true
  if [[ -n "$profile_path" ]]; then rm -f "$profile_path"; fi
  rm -rf "$signing_dir"
}
trap cleanup EXIT

printf '%s' "$APPLE_DISTRIBUTION_P12_BASE64" | base64 --decode > "$signing_dir/distribution.p12"
printf '%s' "$APPLE_PROVISIONING_PROFILE_BASE64" | base64 --decode > "$signing_dir/profile.mobileprovision"
security cms -D -i "$signing_dir/profile.mobileprovision" > "$signing_dir/profile.plist"
profile_uuid="$(python3 scripts/ios/ios_config.py \
  --profile "$signing_dir/profile.plist" --export-options "$signing_dir/ExportOptions.plist")"

keychain_password="$(openssl rand -base64 32)"
security create-keychain -p "$keychain_password" "$keychain"
security set-keychain-settings -lut 21600 "$keychain"
security unlock-keychain -p "$keychain_password" "$keychain"
security import "$signing_dir/distribution.p12" -P "$APPLE_DISTRIBUTION_P12_PASSWORD" \
  -A -t cert -f pkcs12 -k "$keychain"
security set-key-partition-list -S apple-tool:,apple:,codesign: -k "$keychain_password" "$keychain" >/dev/null
security list-keychains -d user -s "$keychain"

# Xcode 16+ uses this provisioning-profile directory.
profile_directory="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
mkdir -p "$profile_directory"
profile_path="$profile_directory/$profile_uuid.mobileprovision"
cp "$signing_dir/profile.mobileprovision" "$profile_path"

output_dir="$RUNNER_TEMP/lp-sketch-testflight"
mkdir -p "$output_dir"
xcodebuild \
  -project apps/mobile/ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$output_dir/LP-Sketch.xcarchive" \
  -derivedDataPath "$output_dir/DerivedData" \
  "LP_SKETCH_BUNDLE_ID=$IOS_BUNDLE_ID" \
  "LP_SKETCH_TEAM_ID=$APPLE_TEAM_ID" \
  "LP_SKETCH_VERSION=$APP_VERSION" \
  "LP_SKETCH_BUILD_NUMBER=$BUILD_NUMBER" \
  LP_SKETCH_SIGNING_STYLE=Manual \
  'LP_SKETCH_SIGNING_IDENTITY=Apple Distribution' \
  "LP_SKETCH_PROFILE_UUID=$profile_uuid" \
  archive

xcodebuild -exportArchive \
  -archivePath "$output_dir/LP-Sketch.xcarchive" \
  -exportPath "$output_dir/export" \
  -exportOptionsPlist "$signing_dir/ExportOptions.plist"

ipa_files=("$output_dir/export/"*.ipa)
if [[ ${#ipa_files[@]} -ne 1 || ! -f "${ipa_files[0]}" ]]; then
  echo "::error::Expected exactly one exported IPA."
  exit 1
fi

# altool searches ./private_keys for the API key. It is removed by the exit trap.
mkdir -p "$signing_dir/private_keys"
printf '%s' "$APP_STORE_CONNECT_PRIVATE_KEY" > "$signing_dir/private_keys/AuthKey_$APP_STORE_CONNECT_KEY_ID.p8"
cd "$signing_dir"
xcrun altool --validate-app --type ios --file "${ipa_files[0]}" \
  --apiKey "$APP_STORE_CONNECT_KEY_ID" --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"
xcrun altool --upload-app --type ios --file "${ipa_files[0]}" \
  --apiKey "$APP_STORE_CONNECT_KEY_ID" --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "### LP Sketch uploaded to App Store Connect"
    echo "Version: $APP_VERSION; build: $BUILD_NUMBER."
    echo "Wait for Apple processing, resolve any compliance prompts, then add the build to your internal TestFlight group."
    echo "Upload success does not confirm device installation or runtime behavior."
  } >> "$GITHUB_STEP_SUMMARY"
fi
