# TestFlight Bootstrap Implementation Plan

> **For agentic workers:** Execute the tasks in order and verify the native build on a hosted Mac. Keep the existing editor behavior intact.

**Goal:** Package the shared LP Sketch editor as an iPad Capacitor app, prepare manual TestFlight delivery, and document the user's Apple account setup.

**Architecture:** `apps/mobile` builds its own bundled web assets from `@lp-sketch/editor`. A checked-in Capacitor iOS project consumes those assets. GitHub validates an unsigned iOS archive on pull requests; a separate manual job signs and uploads a build using configured Apple credentials.

**Tech Stack:** Existing SolidJS/Vite/npm workspaces, Capacitor 8.5.2 with Swift Package Manager, Node 24, Xcode 26, GitHub Actions, Apple command-line signing/upload tools.

**Spec:** The user approved preparing everything possible for a first TestFlight install and listing the remaining account setup. The first app opens the existing editor; Pencil changes and native file/storage services are separate work.

## Global constraints

- Preserve the uncommitted monorepo foundation and browser behavior.
- Work on the existing `codex/monorepo-foundation` branch; do not merge or deploy to production.
- Bundle the web interface locally. Do not configure a development server URL in distributable builds.
- Do not expose Apple keys, signing identities, provisioning profiles, or local environment files in source control or logs.
- Require a real bundle ID and Apple Team ID for a TestFlight upload; a clearly documented preview ID is allowed for unsigned validation.
- Use iPad device family and a manual upload action. Do not submit the app for App Store review or invite other people.
- Verify native compilation on macOS if repository access permits it. Windows build checks alone do not prove an iOS build works.

## Task 1: Create the mobile application

Files: `apps/mobile/{package.json,capacitor.config.ts,index.html,vite.config.ts,tsconfig.json,src/main.tsx,ios/}`, root package/TypeScript configuration and lockfile.

- [x] Add pinned Capacitor dependencies and mobile commands while retaining the browser commands.
- [x] Mount the existing shared editor from the mobile entry point; bundle help and assets without external font loading.
- [x] Generate an iOS project with Swift Package Manager, iPad targeting, an LP Sketch app icon, and shared build scheme.
- [x] Build and sync the mobile assets; typecheck both app entry points.
- [x] Exercise the built mobile entry point in a browser to catch missing assets and startup errors. This does not claim native device validation.

## Task 2: Prepare native validation and TestFlight delivery

Files: `.github/workflows/ios.yml`, `scripts/ios/`, `.github/workflows/ci.yml`, `.gitignore`.

- [x] Add an unsigned archive build for pull requests and manual runs on a hosted macOS runner.
- [x] Add a separate manual signed upload job with explicit Apple settings and credentials.
- [x] Validate bundle/version/team/profile inputs before signing; create an ephemeral keychain and clean up credentials on success or failure.
- [x] Use Apple tools to export and upload the IPA; report that Apple processing and TestFlight installation are subsequent checks.
- [x] Cover meaningful input/profile validation with tests, including mismatched and expired profiles; do not add tests that simply mirror YAML or folder structure.
- [x] Update CI to a Node version supported by Capacitor and build the mobile web assets in regular validation.

## Task 3: Account handoff and verification

Files: `docs/TESTFLIGHT.md`, `apps/mobile/README.md`, root/current architecture documentation.

- [x] Document exact Apple and GitHub setup, including creating a signing request and P12 from Windows, app registration, API key, variables, secrets, and internal testing.
- [x] Document first-install and second-build update checks and the current prototype limitations.
- [x] Run browser/mobile builds, relevant tests, production audit, and diff checks serially to avoid the machine's prior memory pressure.
- [x] Obtain an independent review of build/signing changes and resolve actionable findings.
- [x] Commit/push the prepared branch and create a draft pull request for native validation if authorized repository access works; do not merge.
- [x] Observe the hosted Mac result and report any remaining account-dependent work accurately.

## Verification evidence

- Browser and mobile builds pass; both editor bundles retain the baseline JS/CSS content hashes.
- 49 unit/integration files and 368 tests pass; all 26 browser E2E cases and all 5 packaged-mobile smoke cases pass.
- Six signing configuration tests, actionlint, script syntax checks, production/full dependency audits, contrast audit, and staged diff checks pass.
- Independent review identified an OpenSSL/Apple PKCS12 compatibility issue. The export helper now uses compatible algorithms, and the macOS workflow exercises the real helper before Security import.
- [Draft PR #27](https://github.com/kpresidente/lp-sketch/pull/27) contains the implementation. All checks passed for implementation commit `59987e5ad47167f1966b452472e808dc18048a4c`, including browser CI and its Azure preview.
- [Hosted Mac run 35269419754](https://github.com/kpresidente/lp-sketch/actions/runs/35269419754) passed the unsigned iPad archive on Xcode 26.3 and imported the P12 produced by the Windows certificate helper into a macOS keychain. The signed upload job was skipped as intended.
- A certificate request was generated in the ignored, user-restricted .local-signing directory and its self-signature verified. No signing material is tracked.
- Apple membership is active. The permanent bundle ID is `app.sslr.lpsketch`; the app record, distribution certificate, App Store provisioning profile, and Developer-role upload key are configured. GitHub's `testflight` environment contains the four required variables and four signing/upload secrets.
- [Signed workflow run 35276439885](https://github.com/kpresidente/lp-sketch/actions/runs/35276439885) passed from commit `d2766006669e131e152c837583ae1fd7bcdb84d6`. It archived and exported the signed IPA, passed Apple's validation, and uploaded version `0.1.0 (5.1)` with no errors. App Store Connect completed processing, and the user-approved encryption declaration cleared Missing Compliance.
- Build `0.1.0 (5.1)` is assigned to the `iPad Development` internal group with manual build assignment and the account owner as its sole tester. App Store Connect confirmed 1 Tester, 1 Build, and the tester invitation.
- On September 17, 2026, the user confirmed opening build `0.1.0 (5.1)` on a physical iPad, importing a PDF, and drawing elements over it. Reopening in Airplane Mode restored the PDF and all drawing elements. All three export buttons appeared to do nothing; native file delivery is addressed in `2026-09-17-ipad-exports.md`. Rotation and updating to a subsequent build remain unverified.
