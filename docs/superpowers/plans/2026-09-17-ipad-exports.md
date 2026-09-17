# iPad File Export Implementation Plan

> **For agentic workers:** Execute the tasks in order, using the existing bootstrap branch and a focused review before delivery.

**Goal:** Make PDF, PNG, JPG, and project-file exports accessible from the installed iPad app through the native share sheet.

**Architecture:** The editor accepts an optional asynchronous file exporter. The mobile entry point supplies a Capacitor implementation that writes a private cache file and presents the native share sheet. Browser file pickers and download delivery remain the default when no exporter is supplied.

**Tech Stack:** SolidJS, TypeScript, Capacitor 8.5.2, official Filesystem 8.1.3 and Share 8.0.2 plugins, Vitest, Playwright, hosted Xcode 26.3.

**Spec:** The user reports that all three export buttons do nothing in build 0.1.0 (5.1). Static tracing shows PNG/JPG/PDF all call the browser-only `downloadBlob` helper and the mobile entry point supplies no native delivery. The user also verified offline reopening restored the PDF and drawing elements.

## Global constraints

- Continue on `codex/monorepo-foundation`; do not merge or deploy the browser to production.
- Capacitor dependencies and native file operations belong in `apps/mobile`.
- Preserve PDF/image generation, project format, autosave, and pointer behavior.
- Await native delivery, distinguish cancellation, and report real failures in the editor.
- Cache filenames must not allow project names to escape the export directory. Retain successful share files long enough for receiving apps to read them; clear stale export cache only within the application's export namespace.
- Reuse the configured Apple signing credentials without printing or committing them.

## Task 1: Add the editor delivery boundary

**Files:** `packages/editor/src/lib/fileExport.ts`, `packages/editor/src/index.ts`, `packages/editor/src/App.tsx`, `packages/editor/src/hooks/useProjectFileActions.ts`, and `packages/editor/src/App.file-actions.test.tsx`.

**Interface:**

```ts
export type FileExportResult = 'completed' | 'cancelled'
export type FileExporter = (filename: string, blob: Blob) => Promise<FileExportResult>
```

- [x] Add failing App integration tests covering all four filenames, pending completion, cancellation, and delivery failure. Run `npm test -- packages/editor/src/App.file-actions.test.tsx` and verify the supplied exporter is never called before the fix.
- [x] Add optional `exportFile?: FileExporter` to App props and file-action options. Pass the prop from App to the hook.
- [x] For each export, prefer the supplied exporter, then the existing browser picker/download branch. Apply this result handling before setting success:

```ts
if (await options.exportFile(filename, blob) === 'cancelled') {
  options.setStatus('Export cancelled.')
  return
}
```

- [x] Put project serialization and asynchronous delivery inside the existing save error handling; use a JSON Blob with its `.lps` filename for native delivery.
- [x] Run the App tests again, including the existing browser fallback checks.

## Task 2: Implement native file delivery

**Files:** `apps/mobile/src/nativeFileExport.ts`, its adjacent tests, `apps/mobile/src/main.tsx`, `apps/mobile/package.json`, lockfile, generated SPM configuration, and iOS privacy manifest/project resources.

**Interface:** `exportNativeFile: FileExporter`, injected only when `Capacitor.isNativePlatform()` returns true.

- [x] Install exact compatible plugin versions and inspect the installed Share implementation's iPad presentation and cancellation behavior.
- [x] Test binary content fidelity, safe filenames, awaiting the share sheet, cancellation versus real failures, and stale-cache cleanup using mocked native plugin boundaries.
- [x] Convert each Blob to base64, stage it under a unique directory in `Directory.Cache`, and present the returned native URI:

```ts
const { uri } = await Filesystem.writeFile({
  path, data, directory: Directory.Cache, recursive: true,
})
await Share.share({ files: [uri], title: filename, dialogTitle: 'Export file' })
```

- [x] Normalize documented/plugin-source cancellation into `cancelled`; propagate other errors. Clean up cancelled/failed staging and remove only export directories older than one day during later exports.
- [x] Add the required `NSPrivacyAccessedAPICategoryFileTimestamp` / `C617.1` manifest and include it in the Xcode resource phase. Run `npm run mobile:sync` to register both native plugins.

## Task 3: Validate and deliver the next test build

- [x] Run focused tests, browser/mobile builds, complete unit tests, browser E2E, mobile preview smoke tests, signing configuration tests, dependency audit, and diff checks. Keep heavy local checks serial.
- [x] Obtain focused code review of native delivery, cache scope, cancellation, editor integration, and native plugin packaging; address material findings.
- [x] Record the reported offline/PDF recovery success and the failed exports in the TestFlight guide, distinguishing user-observed results from automated checks.
- [ ] Commit and push the patch, run the signed workflow for version `0.1.0`, verify Apple processing, and assign the new build to the existing internal group.
- [ ] Give the user the actual build number and ask them to test Save to Files for all three output formats, reopening the resulting files. Device confirmation remains pending until the user reports it.

## Verification evidence

- New editor integration cases failed before the delivery boundary was added; all nine initial native adapter cases failed before implementation. Five further filename regressions failed before the review fix. The combined focused run now passes all 26 cases, including existing browser file actions.
- Browser build, mobile build, and Capacitor sync pass. Sync registers Filesystem 8.1.3 and Share 8.0.2 in the native SPM package.
- All 385 unit/integration tests across 50 files pass after the filename correction. All 26 browser E2E cases and all five packaged-mobile browser smoke cases pass.
- Six signing configuration tests, the production dependency audit (zero vulnerabilities), and working-tree diff checks pass.
- Independent review found that whitespace/dot-only project names could lose their extensions. The exporter now extracts the extension before sanitizing the stem. The reviewer verified the fix and reported no outstanding findings.
- Native archive/signing/upload and physical-iPad share-sheet confirmation are separate from browser and mocked-plugin tests; their results will be recorded after delivery.
