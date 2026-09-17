"""Validate TestFlight signing inputs and create Xcode export options."""

import argparse
import os
import plistlib
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def validate_settings(settings):
    bundle_id = settings.get("IOS_BUNDLE_ID", "")
    if not re.fullmatch(r"[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+", bundle_id):
        raise ValueError("Set IOS_BUNDLE_ID to the explicit identifier registered with Apple.")
    if bundle_id == "app.lpsketch.preview":
        raise ValueError("The preview bundle ID cannot be uploaded to TestFlight.")
    if not re.fullmatch(r"[A-Z0-9]{10}", settings.get("APPLE_TEAM_ID", "")):
        raise ValueError("Set APPLE_TEAM_ID to your 10-character Apple Team ID.")
    if not re.fullmatch(r"\d{1,4}\.\d{1,2}\.\d{1,2}", settings.get("APP_VERSION", "")):
        raise ValueError("APP_VERSION must contain three numeric components, for example 0.1.0.")
    if not re.fullmatch(r"[1-9]\d{0,3}(?:\.\d{1,2}){0,2}", settings.get("BUILD_NUMBER", "")):
        raise ValueError("BUILD_NUMBER must use Apple's numeric bundle version format.")


def export_options(profile, settings, now=None):
    validate_settings(settings)
    now = now or datetime.now(timezone.utc)
    expiration = profile.get("ExpirationDate")
    if not isinstance(expiration, datetime):
        raise ValueError("The provisioning profile has no expiration date.")
    if expiration.tzinfo is None:
        expiration = expiration.replace(tzinfo=timezone.utc)
    if expiration <= now:
        raise ValueError("The provisioning profile has expired. Create a new App Store Connect profile.")

    team_id = settings["APPLE_TEAM_ID"]
    bundle_id = settings["IOS_BUNDLE_ID"]
    entitlements = profile.get("Entitlements", {})
    if team_id not in profile.get("TeamIdentifier", []):
        raise ValueError("The provisioning profile belongs to a different Apple team.")
    if entitlements.get("com.apple.developer.team-identifier") != team_id:
        raise ValueError("The provisioning profile's team entitlement does not match APPLE_TEAM_ID.")
    app_ids = {f"{prefix}.{bundle_id}" for prefix in profile.get("ApplicationIdentifierPrefix", [])}
    if entitlements.get("application-identifier") not in app_ids:
        raise ValueError("The provisioning profile does not match IOS_BUNDLE_ID.")
    if (entitlements.get("get-task-allow") or "ProvisionedDevices" in profile
            or profile.get("ProvisionsAllDevices")):
        raise ValueError("Use an App Store Connect distribution profile, not development, Ad Hoc, or enterprise.")
    profile_uuid = profile.get("UUID", "")
    if not re.fullmatch(r"[A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12}", profile_uuid):
        raise ValueError("The provisioning profile UUID is invalid.")

    return {
        "method": "app-store-connect",
        "destination": "export",
        "signingStyle": "manual",
        "signingCertificate": "Apple Distribution",
        "teamID": team_id,
        "provisioningProfiles": {bundle_id: profile_uuid},
        "manageAppVersionAndBuildNumber": False,
        "uploadSymbols": True,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", type=Path)
    parser.add_argument("--export-options", type=Path)
    args = parser.parse_args()
    validate_settings(os.environ)
    if args.profile:
        if not args.export_options:
            parser.error("--profile requires --export-options")
        with args.profile.open("rb") as source:
            profile = plistlib.load(source)
        options = export_options(profile, os.environ)
        with args.export_options.open("wb") as destination:
            plistlib.dump(options, destination)
        # The UUID is used as a filename and build setting, never as a secret.
        print(options["provisioningProfiles"][os.environ["IOS_BUNDLE_ID"]])


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, plistlib.InvalidFileException) as error:
        print(f"iOS signing configuration: {error}", file=sys.stderr)
        sys.exit(1)
