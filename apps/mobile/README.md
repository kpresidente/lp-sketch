# Mobile application

The initial Capacitor iPad application mounts the shared LP Sketch editor. Its interface and help are bundled locally; it does not load the browser deployment or a development server.

Run `npm run mobile:dev`, `npm run mobile:build`, or `npm run mobile:sync` from the repository root. Sync builds the interface and updates the checked-in iOS project. Windows can prepare these files; macOS and Xcode are required for native compilation and signing. The root `npm run build` still builds the browser deployment.

The Xcode scheme is `App`, device family is iPad, and preview bundle identifier is `app.lpsketch.preview`. TestFlight requires your registered `IOS_BUNDLE_ID` and Apple Team ID. Native dependencies use Capacitor 8.5.2 and Swift Package Manager.

See [the TestFlight guide](../../docs/TESTFLIGHT.md) for account setup, signing from Windows, GitHub credentials, installation, and update testing.

On native platforms, the mobile entry supplies a file exporter to the shared editor. PDF, PNG, JPG, and `.lps` project Save use Capacitor Filesystem and Share to offer the native share sheet, including **Save to Files**. Files are staged in a private export cache; completed shares are retained for receiving apps and directories older than one day are cleaned up during later exports. Browser previews retain browser file delivery. The iOS privacy manifest declares the Filesystem plugin's file timestamp access.

The account owner verified PDF import, drawing, and offline reopening with the PDF and annotations restored in TestFlight build `0.1.0 (5.1)`. That build's exports failed. Build `0.1.0 (9.1)` adds native export delivery. Following that delivery, the owner confirmed on September 18, 2026 that PDF export succeeded on the iPad with all drawing elements present. PNG/JPG export, project Save/reload, cancellation, and offline export still need device checks. Pencil gestures, palm rejection, durable field storage, and Android packaging remain separate work. Mobile environment files live in this directory and are separate from the browser's root environment files.
