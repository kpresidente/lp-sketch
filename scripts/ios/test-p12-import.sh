#!/usr/bin/env bash
set -euo pipefail

# Exercise the actual Windows PowerShell export helper with disposable fixtures,
# then prove that macOS Security can import its P12. No Apple account is needed.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
umask 077
fixture_dir="$(mktemp -d "$RUNNER_TEMP/lp-sketch-p12-test.XXXXXX")"
keychain="$fixture_dir/test.keychain-db"
cleanup() {
  security delete-keychain "$keychain" >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT

mkdir -p "$fixture_dir/scripts/ios" "$fixture_dir/.local-signing"
cp "$repo_root/scripts/ios/export-signing-certificate.ps1" "$fixture_dir/scripts/ios/"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -subj '/CN=LP Sketch P12 compatibility fixture' \
  -keyout "$fixture_dir/.local-signing/distribution-private-key.pem" \
  -out "$fixture_dir/certificate.pem" 2>/dev/null
openssl x509 -in "$fixture_dir/certificate.pem" -outform DER -out "$fixture_dir/certificate.cer"
export LP_SKETCH_P12_PASSWORD="$(openssl rand -base64 32)"
pwsh -NoProfile -File "$fixture_dir/scripts/ios/export-signing-certificate.ps1" \
  -CertificatePath "$fixture_dir/certificate.cer"

security create-keychain -p "$LP_SKETCH_P12_PASSWORD" "$keychain"
security unlock-keychain -p "$LP_SKETCH_P12_PASSWORD" "$keychain"
security import "$fixture_dir/.local-signing/distribution.p12" \
  -P "$LP_SKETCH_P12_PASSWORD" -k "$keychain"
echo 'PowerShell-exported P12 imported successfully by macOS Security.'
