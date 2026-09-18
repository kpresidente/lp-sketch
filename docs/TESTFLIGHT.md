# iPad builds through TestFlight

The Capacitor iPad package uses the shared LP Sketch editor with native file delivery and a mobile input policy. This guide covers setup, signing, installation, updates, and device verification.

## What is prepared

- `apps/mobile`: a separate Vite entry point that mounts the shared editor and bundles its assets and help locally.
- `apps/mobile/ios`: Capacitor 8.5.2, Swift Package Manager, iPad device family, shared Xcode scheme, and an LP Sketch app icon.
- `.github/workflows/ios.yml`: an unsigned iOS archive check on pull requests and a manual TestFlight upload job.
- `scripts/ios`: Windows certificate helpers and hosted-Mac build/signing scripts.
- The identifier `app.lpsketch.preview` is only for unsigned validation. Uploading requires your registered `IOS_BUNDLE_ID`.

Apple membership and signing credentials are configured for the permanent bundle ID `app.sslr.lpsketch`. The [first signed TestFlight workflow](https://github.com/kpresidente/lp-sketch/actions/runs/35276439885) passed on September 17, 2026, uploading version **0.1.0 (5.1)** from commit `d2766006669e131e152c837583ae1fd7bcdb84d6`. The signed archive, IPA export, Apple validation, and upload all succeeded.

Apple processing and the initial export-compliance declaration are complete. Build `0.1.0 (5.1)` is assigned to the `iPad Development` internal group, with the account owner as its sole tester and manual build assignment.

On September 17, 2026, the account owner confirmed opening build `0.1.0 (5.1)` on a physical iPad, importing a PDF, and drawing elements over it. Reopening in Airplane Mode restored the previous PDF and all drawing elements. This verifies those specific installation, editing, and offline recovery scenarios; it does not establish every storage or recovery case. All three output buttons (PDF, PNG, and JPG) appeared to do nothing in that build because delivery still used browser downloads.

Build **0.1.0 (9.1)** adds a native share sheet for PDF, PNG, JPG, and project Save (`.lps`). Choose **Save to Files** to select a destination, or another share destination. Cancelling the sheet reports cancellation; write/share failures report an error. Native exports are staged in the app's private cache, with completed files retained for receiving apps and old export directories cleaned up during later exports. Browser exports keep their existing behavior. Project Save/reload, cancellation, and rotation still need device checks. An unsigned build proves native compilation; it cannot be installed through TestFlight.

The [native export update workflow](https://github.com/kpresidente/lp-sketch/actions/runs/35285508431) passed on September 17, 2026, from commit `6a47d47363cd0c2dc88223aa8022f9bb2f154fc5`. Both native archives, IPA export, Apple validation, and upload passed. The archive includes the Filesystem/Share plugins and the app's required file timestamp privacy manifest. Apple completed processing, the previously approved encryption answers cleared Missing Compliance, and build `0.1.0 (9.1)` is **Testing** in the existing `iPad Development` group. The group has one tester and both builds available. On September 18, following this delivery, the account owner confirmed that PDF export on the iPad succeeded with all drawing elements present. The owner subsequently confirmed that JPG and PNG exports also worked. Project Save/reload and offline export remain unverified.

The [palm-rejection workflow](https://github.com/kpresidente/lp-sketch/actions/runs/35335767694) passed on September 18, 2026, uploading **0.1.0 (13.1)** from `b8e092e5392b99615d38d325a1276504c88168c2`. Both archives, IPA export, Apple validation, and upload succeeded. Apple processed the build successfully, and the previously approved standard-encryption/no-France answers cleared Missing Compliance. Build `0.1.0 (13.1)` is **Testing** in the existing `iPad Development` group, verified in App Store Connect and through its API (`IN_BETA_TESTING`). At delivery, the group had one tester and three builds. The owner subsequently reported that the palm-filtering update worked well on the iPad and requested deferring changes to two-tap conductor drawing while field testing continues. Insignia compatibility remains unverified.

Build **0.1.0 (17.1)** adds a fixed Delete trash button below Undo/Redo in the shared quick-access bar. It stays visible and is disabled unless there is an active selection in Select or Multi-Select mode and no editing dialog or quick-access editor is open. Deleting one or several selected objects uses the existing undo history. Browser/mobile builds, all 398 unit/integration tests, 26 browser E2E cases, and six packaged-mobile Chromium cases passed. Independent review caught a stale selected-mark reference after Clear All Marks; the focused fix passed all 91 interaction tests, both builds, and the mobile E2E suite, and the reviewer confirmed no remaining findings. A rendered check at 1180 × 820 verified button placement, selection, deletion, Undo, and a clean console. The owner subsequently confirmed that the control worked well on the iPad.

The [Delete-control workflow](https://github.com/kpresidente/lp-sketch/actions/runs/35347797330) passed on September 18, 2026, from `038f1225a47bcb31bc04d66b96b544cb1614c026`. Both native archives, IPA export, Apple validation, and upload succeeded. Apple processed build `17.1`, the previously approved standard-encryption/no-France answers cleared Missing Compliance, and the build is **Testing** in the existing `iPad Development` group. App Store Connect shows one tester and four builds; its API confirms `IN_BETA_TESTING`. All PR checks passed for the implementation commit. The PR remains a draft and is not merged into browser production.

The optional one-finger pan update adds a mobile-only **Tools → One-finger pan** switch, initially off and persisted on the device. It preserves Pencil editing, two-finger pan/zoom, pending conductor endpoints, and browser touch editing. Both application builds, all 413 unit/integration tests, 26 browser E2E cases, and seven packaged-mobile Chromium cases passed. Independent review identified one cancelled-pinch continuation issue; red-first regression tests reproduced it, the fix passed all 106 interaction tests and the full suite, and focused review confirmed no remaining blocker. A rendered check at 1180 × 820 verified switch placement, persistence after reload, and a clean console. Physical finger/thumb and palm interaction testing remains pending for this update.

The [first hosted Mac validation](https://github.com/kpresidente/lp-sketch/actions/runs/35269419754) passed on September 17, 2026, using Xcode 26.3. It compiled the unsigned iPad archive and verified that a P12 generated by the Windows helper can be imported by macOS.

## 1. Confirm membership activation

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

Generate a team key named `LP Sketch GitHub Upload` with **Developer** access, which is sufficient for [uploading builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/). Record its **Key ID** and **Issuer ID** and download the `.p8` private key. Apple permits downloading the key only once; store it securely. This workflow uses a team key, whose role applies across the account's apps. See [Apple's API access instructions](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/).

If the in-app browser blocks Apple downloads, use your regular browser and save the key in `.local-signing/` with its original filename. Do not generate another key merely because its download has not been completed.

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

GitHub's **Run workflow** button requires the workflow on the default branch. For this repository, manual dispatch by the already-registered workflow ID has also been verified from the initial feature branch. The first TestFlight upload can therefore run before the pull request is merged:

```powershell
gh workflow run 360845343 --repo kpresidente/lp-sketch `
  --ref codex/monorepo-foundation `
  -f upload_to_testflight=true -f app_version=0.1.0
```

Review and merge the prepared pull request through the normal review process. Merging `main` also follows this repository's existing browser deployment process.

Once the workflow is on the default branch, open **Actions → iOS / TestFlight → Run workflow**:

1. Select the branch to test, normally `main`.
2. Set `app_version` to `0.1.0`.
3. Enable **Sign and upload to TestFlight**.
4. Run the workflow.

The unsigned build runs first. The upload job then checks the profile against your app/team, imports the certificate into a temporary keychain, archives, exports the IPA, validates it with Apple, and uploads it. It does not submit the app for App Store review or invite testers.

Build numbers use the workflow run number and attempt, for example `12.1`. Re-running changes the attempt, allowing another upload for the same version. If the numeric format is exhausted, validation stops rather than creating an invalid version.

Upload success means Apple accepted the upload, not that processing has finished. Check App Store Connect for processing status and any required export-compliance answers. The app does not pre-answer Apple's encryption declarations.

For the initial build `0.1.0 (5.1)`, the account owner approved **standard encryption outside the Apple operating system** (included in the bundled PDF reader) and **no distribution in France**. Those answers cleared Missing Compliance. Reassess the answers if encryption or distribution changes; do not describe the bundled PDF reader as using only operating-system encryption.

## 8. Install on your iPad

Install Apple's **TestFlight** app. In App Store Connect, open **LP Sketch → TestFlight → Internal Testing**, create a group, add your own eligible App Store Connect user, and assign the processed build. Accept the invitation on the iPad and install LP Sketch. See [Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/).

First-install checks:

- App opens to the editor in landscape and portrait.
- Controls, help, icons, and an imported PDF background load.
- Drawing and selection work at least as well as the browser implementation.
- After an initial launch, enable Airplane Mode and reopen the app to confirm the bundled interface launches.
- Try a disposable PDF import and export; record file-handling limitations for the next iteration.

Use disposable projects for this initial test. Autosave remains the existing implementation, with the offline reopening scenario above verified by the account owner. Native export delivery is separate from durable project/PDF storage; broader storage recovery remains future work. The browser `/api/report` endpoint is not configured in this installed app. Report findings in this development task.

For native export testing, tap each of **PDF**, **PNG**, and **JPG**, choose **Save to Files**, then open the saved result in Files to check the background and drawing elements. Also try project **Save** and reload the resulting `.lps` file. Dismiss one share sheet to confirm cancellation leaves the editor usable. Choose **On My iPad** when checking offline file export.

For palm-rejection testing, use Apple Pencil first:

- Rest your hand on the canvas before touching down with the pen. Place line endpoints and symbols; the hand must not create or select elements.
- Drag a selected element or endpoint while resting your hand. Check that the edit continues without accidental zooming and that Undo reverses it once.
- Lift the pen while keeping your hand down, then move your hand. Held contacts must remain ignored until lifted.
- Lift your hand, then use two fingers to pan and pinch to zoom. Try this between line endpoints and with the Pan tool selected. A single finger should not move or edit the canvas.
- Tap tools and Undo/Redo with a finger. Background and reopen the app during a gesture, then check that navigation and drawing recover.
- Repeat with the Insignia stylus if available. An active stylus reporting pen input should use the same policy; a stylus reporting finger touch cannot draw. Record the model if behavior differs.

The mobile browser preview exercises the same input policy, but Chromium tests cannot establish hardware palm rejection. Multiple hand contacts arriving before a pen contact may still look like a two-finger gesture; record any resulting movement during the device check. Line construction remains the existing endpoint-tap workflow in this build.

For Delete regression testing, select an object with the Pencil, then tap the trash button below Undo/Redo with a finger. Check that the object disappears, Delete becomes disabled, and one Undo restores it. Repeat with several objects in Multi-Select. With no selection, the trash button must remain visible and disabled.

For optional one-finger pan testing:

- In **Tools**, enable **One-finger pan**. It defaults off and is remembered locally on the device, separately from project files and Undo history.
- Lift the Pencil and your resting hand, then drag the drawing with a finger or thumb. Small movements should not move the view; a deliberate drag should pan without zooming, selecting, or editing.
- Add a second finger to pinch or pan, then lift one finger and continue panning. Check for jumps at both transitions. Two-finger navigation remains available with the setting off.
- Place a conductor's first endpoint with the Pencil, pan with a finger, and place the second endpoint. The first endpoint must stay anchored to the plan; Undo should remove the conductor in one step.
- Put the Pencil down during a finger gesture. The pen should take over immediately. Held hand contacts and additional contacts while that hand remains down must stay ignored until lifted, including after pen lift.
- Background and reopen the app, or interrupt an active gesture, then check that held contacts do not resume movement and fresh gestures work. Check the setting survives an app restart.
- Try resting and repositioning your hand **before** the Pencil touches down. That contact can still look like an intentional finger drag; if it causes accidental movement, disable the setting and report the sequence.

The last known working checkpoint before one-finger panning is `cb21eab02f975d46598261d9b06ffbb33098b091` (TestFlight `17.1`). The panning feature is kept in a separate commit so it can be reverted independently; switching the setting off is the immediate device-side fallback.

For the update check, run the workflow again with version `0.1.0`. Assign the new processed build to the internal group, update through TestFlight, and verify the installed build number changed and the editor still opens.

## Local development

```powershell
npm run mobile:dev -- --host 0.0.0.0
npm run mobile:build
npm run mobile:sync
npm run test:ios-config
```

The development URL can be opened in the iPad browser for layout checks; it does not exercise Capacitor. `mobile:sync` prepares files on Windows; native compilation and signing happen on the hosted Mac. A Mac can open `apps/mobile/ios/App/App.xcodeproj` and use the shared `App` scheme.
