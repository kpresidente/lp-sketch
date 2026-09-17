"""Checks that signing setup cannot silently target the wrong app or profile."""

import copy
import unittest
from datetime import datetime, timedelta, timezone

from ios_config import export_options, validate_settings


class SigningConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.settings = {
            "IOS_BUNDLE_ID": "com.example.drawing",
            "APPLE_TEAM_ID": "ABCDEFGHIJ",
            "APP_VERSION": "0.1.0",
            "BUILD_NUMBER": "12.2",
        }
        self.now = datetime(2026, 9, 17, tzinfo=timezone.utc)
        self.profile = {
            "UUID": "12345678-1234-1234-1234-123456789ABC",
            "TeamIdentifier": ["ABCDEFGHIJ"],
            "ApplicationIdentifierPrefix": ["ABCDEFGHIJ"],
            "ExpirationDate": self.now + timedelta(days=90),
            "Entitlements": {
                "application-identifier": "ABCDEFGHIJ.com.example.drawing",
                "com.apple.developer.team-identifier": "ABCDEFGHIJ",
                "get-task-allow": False,
            },
        }

    def test_exports_the_matching_app_store_profile_without_changing_build_number(self):
        result = export_options(self.profile, self.settings, self.now)
        self.assertEqual(result["method"], "app-store-connect")
        self.assertEqual(result["signingStyle"], "manual")
        self.assertEqual(result["teamID"], "ABCDEFGHIJ")
        self.assertEqual(result["provisioningProfiles"], {
            "com.example.drawing": "12345678-1234-1234-1234-123456789ABC"
        })
        self.assertFalse(result["manageAppVersionAndBuildNumber"])

    def test_rejects_missing_or_preview_bundle_identifiers(self):
        for value in ("", "app.lpsketch.preview", "com.*.drawing", "com.bad id"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_settings({**self.settings, "IOS_BUNDLE_ID": value})

    def test_rejects_invalid_team_versions_and_build_numbers(self):
        for key, value in (("APPLE_TEAM_ID", "short"), ("APP_VERSION", "beta"),
                           ("APP_VERSION", "1.0;echo bad"), ("BUILD_NUMBER", "12.100")):
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                validate_settings({**self.settings, key: value})

    def test_rejects_another_app_or_team(self):
        cases = []
        wrong_app = copy.deepcopy(self.profile)
        wrong_app["Entitlements"]["application-identifier"] = "ABCDEFGHIJ.com.other.app"
        cases.append(wrong_app)
        wrong_team = copy.deepcopy(self.profile)
        wrong_team["TeamIdentifier"] = ["OTHERTEAM1A"]
        cases.append(wrong_team)
        for profile in cases:
            with self.subTest(profile=profile), self.assertRaises(ValueError):
                export_options(profile, self.settings, self.now)

    def test_rejects_expired_development_adhoc_and_enterprise_profiles(self):
        for changes in (
            {"ExpirationDate": self.now - timedelta(seconds=1)},
            {"ProvisionedDevices": ["some-device"]},
            {"ProvisionsAllDevices": True},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                export_options({**self.profile, **changes}, self.settings, self.now)
        development = copy.deepcopy(self.profile)
        development["Entitlements"]["get-task-allow"] = True
        with self.assertRaises(ValueError):
            export_options(development, self.settings, self.now)

    def test_accepts_the_naive_utc_dates_returned_by_plistlib(self):
        self.profile["ExpirationDate"] = self.profile["ExpirationDate"].replace(tzinfo=None)
        self.assertEqual(export_options(self.profile, self.settings, self.now)["teamID"], "ABCDEFGHIJ")


if __name__ == "__main__":
    unittest.main()
