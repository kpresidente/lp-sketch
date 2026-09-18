# Mobile application

The initial Capacitor iPad application mounts the shared LP Sketch editor. Its interface and help are bundled locally; it does not load the browser deployment or a development server.

Run `npm run mobile:dev`, `npm run mobile:build`, or `npm run mobile:sync` from the repository root. Sync builds the interface and updates the checked-in iOS project. Windows can prepare these files; macOS and Xcode are required for native compilation and signing. The root `npm run build` still builds the browser deployment.

The Xcode scheme is `App`, device family is iPad, and preview bundle identifier is `app.lpsketch.preview`. TestFlight requires your registered `IOS_BUNDLE_ID` and Apple Team ID. Native dependencies use Capacitor 8.5.2 and Swift Package Manager.

See [the TestFlight guide](../../docs/TESTFLIGHT.md) for account setup, signing from Windows, GitHub credentials, installation, and update testing.

On native platforms, the mobile entry supplies a file exporter to the shared editor. PDF, PNG, JPG, and `.lps` project Save use Capacitor Filesystem and Share to offer the native share sheet, including **Save to Files**. Files are staged in a private export cache; completed shares are retained for receiving apps and directories older than one day are cleaned up during later exports. Browser previews retain browser file delivery. The iOS privacy manifest declares the Filesystem plugin's file timestamp access.

The mobile entry enables pen and mouse editing with touch reserved for two-finger pan/zoom. Single-finger canvas contacts cannot draw, select, or drag. Pen contact suspends navigation and excludes overlapping touches until they are lifted; finger taps on controls still work. This also applies to the mobile browser preview. The browser application's default input behavior is unchanged. Styluses must report as `pen`; a capacitive stylus that reports as `touch` cannot edit in this mode. On September 18, 2026, the owner reported that the palm-filtering update in `0.1.0 (13.1)` worked well on the iPad. Insignia compatibility remains unverified. Changes to two-tap conductor drawing are deferred at the owner's request while field testing continues.

The shared quick-access bar includes a Delete trash button below Undo/Redo. It stays visible and is disabled unless Select or Multi-Select has an active selection and no editing dialog or quick-access editor is open. Pencil or finger activation deletes the selection through the existing undo history; deleting multiple selected objects is one undoable operation.

The account owner verified PDF import, drawing, and offline reopening with the PDF and annotations restored in TestFlight build `0.1.0 (5.1)`. That build's exports failed. Build `0.1.0 (9.1)` adds native export delivery. Following that delivery, the owner confirmed on September 18, 2026 that PDF export succeeded on the iPad with all drawing elements present. The owner subsequently confirmed JPG and PNG exports also worked. Project Save/reload, cancellation, and offline export still need device checks. Drag-to-draw Pencil gestures, durable field storage, and Android packaging remain separate work. Mobile environment files live in this directory and are separate from the browser's root environment files.
