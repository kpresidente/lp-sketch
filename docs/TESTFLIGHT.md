# First iPad build through TestFlight

This initial iPad package opens the existing LP Sketch editor. Its purpose is to verify building, signing, installing, launching, and updating before changing tablet interactions.

## What is prepared

- `apps/mobile`: a separate Vite entry point that mounts the shared editor and bundles its assets and help locally.
- `apps/mobile/ios`: Capacitor 8.5.2, Swift Package Manager, iPad device family, shared Xcode scheme, and an LP Sketch app icon.
- `.github/workflows/ios.yml`: an unsigned iOS archive check on pull requests and a manual TestFlight upload job.
- `scripts/ios`: Windows certificate helpers and hosted-Mac build/signing scripts.
- The identifier `app.lpsketch.preview` is only for unsigned validation. Uploading requires your registered `IOS_BUNDLE_ID`.

An unsigned build proves native compilation. It cannot be installed through TestFlight and does not prove iPad runtime behavior. The signed upload remains unverified until Apple activates the membership and credentials are configured.

## 1. Wait for membership activation

Sign in to [Apple Developer](https://developer.apple.com/account/) and confirm that the paid **Apple Developer Program** membership is active. Creating a developer login or submitting enrollment is not sufficient. Complete any enrollment or agreement steps Apple presents.

Confirm access to [App Store Connect](https://appstoreconnect.apple.com/). Record the 10-character **Team ID** in your membership details. You can share the Team ID and bundle ID with Codex; keep passwords, private keys, and P12 files out of chat.

## 2. Register the app identity

In Apple Developer, open **Certificates, Identifiers & Profiles → Identifiers**, add an **App ID** for an app, and choose an **Explicit** bundle identifier:

- Description: `LP Sketch`.
- Bundle ID: a reverse-domain identifier under a domain you control. Decide this before uploading; it becomes the app's durable identity.
- No optional capabilities are required for this first build.

In App Store Connect, open **Apps → + → New App**:

- Platform: **iOS**, which includes iPad.
- Name: `LP Sketch`, or another available name you choose.
- Primary language: your preferred language.
- Bundle ID: the exact identifier registered above.
- SKU: a unique internal value, for example `LP-SKETCH-IPAD`.
- User access: select the access appropriate to your account.

Apple requires an app record before the first upload. See [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/).

## 3. Create the distribution certificate from Windows

Use PowerShell in the repository. Git for Windows supplies the OpenSSL executable used by these helpers. If a request has already been created for you, reuse it. Otherwise run:

```powershell
.\scripts\ios\new-signing-request.ps1
```

The script creates:

- `.local-signing/LP-Sketch-Distribution.certSigningRequest` — upload this request to Apple.
- `.local-signing/distribution-private-key.pem` — keep this private; it is needed for the next step.

The directory is excluded from Git and its Windows permissions are restricted to your user. The helper refuses to replace an existing key. Retain the key securely; Apple's downloaded certificate alone cannot recreate the signing identity.

In Apple Developer, open **Certificates → + → Apple Distribution**. Upload the request and download Apple's `.cer` file. Then run, substituting the actual downloaded path:

```powershell
.\scripts\ios\export-signing-certificate.ps1 -CertificatePath "$env:USERPROFILE\Downloads\distribution.cer"
```

OpenSSL prompts for an export password. Save it in your password manager. The result is `.local-signing/distribution.p12`, containing the certificate and matching private key.

If you already have a suitable Apple Distribution P12 and its password, reuse them instead of creating another certificate. The provisioning profile must include that certificate.

## 4. Create an App Store Connect provisioning profile

In Apple Developer, open **Profiles → +**, select the **App Store Connect** distribution profile type, choose the explicit LP Sketch App ID, and select the distribution certificate from step 3. Name the profile `LP Sketch TestFlight` and download it.

Save it as `.local-signing/LP-Sketch.mobileprovision`. No device registration or iPad UDID is needed for TestFlight. Do not choose a development or Ad Hoc profile. See [Apple's provisioning instructions](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/).

## 5. Create the App Store Connect upload key

In App Store Connect, open **Users and Access → Integrations → App Store Connect API → Team Keys**. The Account Holder may first need to request API access.

Generate a team key named `LP Sketch GitHub Upload` with **App Manager** access. Record its **Key ID** and **Issuer ID** and download the `.p8` private key. Apple permits downloading the key only once; store it securely. This workflow uses a team key, not an individual key. See [Apple's API access instructions](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/).

## 6. Connect GitHub to Apple

In the [repository settings](https://github.com/kpresidente/lp-sketch/settings/environments), open the prepared environment named **`testflight`** (create it if setting up another repository). Put these values in that environment.

Environment variables:

| Name | Value |
| --- | --- |
| `IOS_BUNDLE_ID` | Exact registered bundle identifier |
| `APPLE_TEAM_ID` | 10-character Apple Team ID |
| `APP_STORE_CONNECT_KEY_ID` | Key ID from step 5 |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID from step 5 |

Environment secrets:

| Name | Value |
| --- | --- |
| `APPLE_DISTRIBUTION_P12_BASE64` | Base64 contents of the P12 |
| `APPLE_DISTRIBUTION_P12_PASSWORD` | P12 export password |
| `APPLE_PROVISIONING_PROFILE_BASE64` | Base64 contents of the provisioning profile |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Raw `.p8` contents, including BEGIN/END lines |

The GitHub CLI uploads file contents without printing them or putting them in command history. Run from this repository after signing in with `gh auth login` and creating the environment:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path '.local-signing/distribution.p12'))) |
  gh secret set APPLE_DISTRIBUTION_P12_BASE64 --env testflight

[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path '.local-signing/LP-Sketch.mobileprovision'))) |
  gh secret set APPLE_PROVISIONING_PROFILE_BASE64 --env testflight

# Substitute the name of your downloaded private key.
Get-Content -Raw '.local-signing/AuthKey_YOURKEYID.p8' |
  gh secret set APP_STORE_CONNECT_PRIVATE_KEY --env testflight

# Enter the export password at the hidden prompt.
gh secret set APPLE_DISTRIBUTION_P12_PASSWORD --env testflight
```

Only the manual upload job receives Apple secrets. Pull-request builds do not. Temporary signing files and the keychain are removed when the signing script exits; hosted runners are discarded after the job.

## 7. Run the first upload

The workflow must exist on the default branch before GitHub shows **Run workflow**. Review and merge the prepared pull request after its checks pass. Merging `main` also follows this repository's existing browser deployment process.

Open **Actions → iOS / TestFlight → Run workflow**:

1. Select the branch to test, normally `main`.
2. Set `app_version` to `0.1.0`.
3. Enable **Sign and upload to TestFlight**.
4. Run the workflow.

The unsigned build runs first. The upload job then checks the profile against your app/team, imports the certificate into a temporary keychain, archives, exports the IPA, validates it with Apple, and uploads it. It does not submit the app for App Store review or invite testers.

Build numbers use the workflow run number and attempt, for example `12.1`. Re-running changes the attempt, allowing another upload for the same version. If the numeric format is exhausted, validation stops rather than creating an invalid version.

Upload success means Apple accepted the upload, not that processing has finished. Check App Store Connect for processing status and any required export-compliance answers. The app does not pre-answer Apple's encryption declarations.

## 8. Install on your iPad

Install Apple's **TestFlight** app. In App Store Connect, open **LP Sketch → TestFlight → Internal Testing**, create a group, add your own eligible App Store Connect user, and assign the processed build. Accept the invitation on the iPad and install LP Sketch. See [Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/).

First-install checks:

- App opens to the editor in landscape and portrait.
- Controls, help, icons, and an imported PDF background load.
- Drawing and selection work at least as well as the browser implementation.
- After an initial launch, enable Airplane Mode and reopen the app to confirm the bundled interface launches.
- Try a disposable PDF import and export; record file-handling limitations for the next iteration.

Use disposable projects for this initial test. Browser autosave remains the existing implementation; native file services, durable project/PDF storage, and Pencil/palm handling have not been added or verified on a device. The browser `/api/report` endpoint is not configured in this installed app. Report findings in this development task.

For the update check, run the workflow again with version `0.1.0`. Assign the new processed build to the internal group, update through TestFlight, and verify the installed build number changed and the editor still opens.

## Local development

```powershell
npm run mobile:dev -- --host 0.0.0.0
npm run mobile:build
npm run mobile:sync
npm run test:ios-config
```

The development URL can be opened in the iPad browser for layout checks; it does not exercise Capacitor. `mobile:sync` prepares files on Windows; native compilation and signing happen on the hosted Mac. A Mac can open `apps/mobile/ios/App/App.xcodeproj` and use the shared `App` scheme.
