# Mobile application

The initial Capacitor iPad application mounts the shared LP Sketch editor. Its interface and help are bundled locally; it does not load the browser deployment or a development server.

Run `npm run mobile:dev`, `npm run mobile:build`, or `npm run mobile:sync` from the repository root. Sync builds the interface and updates the checked-in iOS project. Windows can prepare these files; macOS and Xcode are required for native compilation and signing. The root `npm run build` still builds the browser deployment.

The Xcode scheme is `App`, device family is iPad, and preview bundle identifier is `app.lpsketch.preview`. TestFlight requires your registered `IOS_BUNDLE_ID` and Apple Team ID. Native dependencies use Capacitor 8.5.2 and Swift Package Manager.

See [the TestFlight guide](../../docs/TESTFLIGHT.md) for account setup, signing from Windows, GitHub credentials, installation, and update testing.

Pencil gestures, palm rejection, native file services, durable field storage, and Android packaging remain separate work. File import/export and recovery need physical-iPad verification. Mobile environment files live in this directory and are separate from the browser's root environment files.
