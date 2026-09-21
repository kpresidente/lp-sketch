# 2026-09-20 UI Shells and Themes Implementation Notes

Companion to `2026-09-20-ui-shells-and-themes-design.md`. One section per step, appended as each step lands. The design document keeps the checklists and the tracking table; this file records what actually changed and why.

## Step 1. Consolidate the controller

Pure refactor, no visual change, no test changes.

### What changed

- `packages/editor/src/context/AppController.ts` (new): the `AppController` interface, formerly `AppSidebarProps` in `components/sidebar/types.ts`. 132 fields, up from 119. `CornerKind` now comes from `@lp-sketch/core/lib/spacing` instead of a duplicate definition next to the interface.
- `packages/editor/src/context/AppControllerContext.tsx`: typed against `AppController` and re-exports the type so consumers need one import.
- `packages/editor/src/App.tsx`: builds `appController: AppController` as a plain typed object literal. The identity factory `createSidebarController` is deleted; contextual typing on the annotated literal gives the same getter checking. The `CanvasStage` element passes 11 props, down from 74.
- `packages/editor/src/components/CanvasStage.tsx`: reads the controller for the view transform, PDF size and presence, PDF transparency, stage cursor, `supportsNativeFileDialogs`, and the import placeholder actions. Renders `<PropertiesBar />` and `<QuickAccessBar />` with no props.
- `packages/editor/src/components/PropertiesBar.tsx`: no props, reads the controller. Renders `<PropertiesToolOptions />` directly instead of receiving it through a `toolOptionsSlot` prop.
- `packages/editor/src/components/QuickAccessBar.tsx`: no props, down from 50. Settings, layers, and scale are read through `props.project` the same way the sidebar panels already do. The editing-context callback is the controller's `onSetQuickAccessEditingContextActive`.
- Deleted `packages/editor/src/components/sidebar/types.ts` and `packages/editor/src/components/sidebar/createSidebarController.ts`.

### Controller additions

State: `canDeleteSelection`, `stageCursor`, `calibrationPreview`, `lineSegmentDistanceLabel`, `linePathTotalDistanceLabel`, `measureDistanceLabel`, `markSpanDistanceLabel`, `linearAutoSpacingPathDistanceLabel`, `selectionDebugEnabled`.

Actions: `onImportPdfDrop`, `onDeleteSelection`, `onSetSelectionDebugEnabled`, `onSetQuickAccessEditingContextActive`.

Everything else the stage and the two bars used to receive as props was already on the controller under the same name.

### Decisions worth knowing

1. PDF transparency is read from the controller rather than passed to the stage. The design document's step 1 acceptance listed it as a stage prop; it was already a controller field and a second path would drift, so the acceptance text was updated to match.
2. `PropertiesBar` owns `PropertiesToolOptions` for now. The old slot's fallback text was unreachable because `App.tsx` always passed the slot and `PropertiesToolOptions` renders its own "No tool-specific properties." fallback. The slot getter was also evaluated twice, once by `Show`'s `when` and once by its children, so two component instances were created per mount. Step 5 adds the layout hint and lets inspector-style shells place the options elsewhere.
3. File and export actions unified on the controller's existing `handleImportPdfUi` and `handleLoadProjectUi` wrappers. They are the same `void handle...(event)` lambdas the stage passed inline.
4. Naming: blocks keep `const props = useAppController()` to match the existing panels and keep the diff reviewable. `CanvasStage` calls it `controller` because it also has real props.

### Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` | 50 files, 433 tests, pass |
| `npm run build` | pass |
| `npm run test:e2e` | 35 tests, pass |

No files under `e2e/` or any `*.test.ts(x)` changed.

### Left for later steps

- `inert` on the stage still derives from the sidebar flyout state (`sidebarLayout.activeSection() !== null`). Step 2 replaces it with the shell's `chromeModalOpen` signal.
- `PropertiesBar` and `QuickAccessBar` are still mounted inside `CanvasStage`. Step 2 moves their placement to `App.tsx` and leaves the stage with only the `drawing-stage` region.

## Step 2. Extract the Workspace

Pure refactor, no visual change, no test changes.

### What changed

- `packages/editor/src/workspace/Workspace.tsx` (new): the `drawing-stage` region with the camera layer, PDF canvas, transparency wash, and import placeholder. Eleven stage-only props: `setStageRef`, `onStageResize`, `setPdfCanvasRef`, the five pointer handlers, wheel, double-click, and children. The `ResizeObserver` that reports the stage size moved in from `App.tsx` and is now disconnected on cleanup, which the old inline version never did.
- `packages/editor/src/App.tsx`: renders the `main.workspace` wrapper, `PropertiesBar`, the `workspace-stage-shell` wrapper, `Workspace`, and `QuickAccessBar` directly, in the same DOM order as before. A `chromeModalOpen` memo, currently `sidebarLayout.activeSection() !== null`, drives `inert`.
- Deleted `packages/editor/src/components/CanvasStage.tsx`.

### Decisions worth knowing

1. `inert` stays on the `main.workspace` wrapper rather than on the stage. `e2e/sidebar.spec.ts` tabs past an open flyout and asserts that nothing inside `.workspace` receives focus, so the properties bar and the quick-access rail must be inert along with the stage. The wrapper is shell-owned layout, so the shell decides what a chrome modal covers; Step 3 makes that explicit. The design document's Step 2 scope line was updated to match.
2. `Workspace` reads the controller for the view transform, PDF page, transparency, cursor, and the import placeholder actions. The controller is app state rather than chrome, so this keeps the "no knowledge of any panel, bar, or rail" rule intact.
3. The `.workspace` and `.workspace-stage-shell` class names are kept even though they now name shell layout rather than the workspace, because the sidebar e2e spec queries `.workspace`. Renaming belongs with the helper cleanup in Step 6.
4. The Canvas 2D spike flag today only shows a badge in the sidebar header; nothing swaps renderers yet. `Workspace`'s `children` is the swap point: `OverlayLayer` renders there today and a `WorkspaceCanvas` would render there under the flag.

### Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` | 50 files, 433 tests, pass |
| `npm run build` | pass |
| `npm run test:e2e` | 35 tests, pass |

No files under `e2e/` or any `*.test.ts(x)` changed.

### Left for later steps

- `chromeModalOpen` is still computed in `App.tsx` from the sidebar layout hook, and `handleSelectTool` and the global shortcuts still call `sidebarLayout.closeFlyout()` directly. Step 3 moves both behind the shell contract.
- The `main.workspace` and `workspace-stage-shell` wrappers live in `App.tsx` until the Classic shell takes them in Step 3.

## Step 3. Introduce the shell boundary with Classic

Refactor with zero visual change. One existing test file changed a storage key constant (see decision 7).

### What changed

- `packages/editor/src/blocks/registry.ts` (new): `REQUIRED_BLOCKS`, nine entries with the role and accessible name each block exposes: the six sidebar panels (`region` named Project, Tools, Components, Material, Scale, Layers), status messages (`status`), the properties bar (`toolbar` named Properties), and the quick-access rail (`toolbar` named Quick access).
- `packages/editor/src/shells/types.ts` (new): `ShellSlots` (workspace, dialogs, help drawer, each a render function), `ShellChrome` (`chromeModalOpen` accessor and `closeChromeModal` action), `ShellProps`, `ShellComponent`.
- `packages/editor/src/shells/registry.ts` (new): `SHELLS`, `DEFAULT_SHELL`, `SHELL_PREFERENCE_KEY` (`lp-sketch.shell.v1`), `readShellPreference`, `writeShellPreference`, `findShell`. A registration is `kind: 'eager'` with a bundled component or `kind: 'lazy'` with a `load()` function, and carries `waivedBlocks`.
- `packages/editor/src/shells/ShellHost.tsx` (new): resolves the preferred shell once at mount. Eager shells mount directly; lazy shells mount through `lazy()` behind a `Suspense` fallback.
- `packages/editor/src/shells/classic/ClassicShell.tsx` (new): the `app-shell` grid, `ClassicSidebar`, the `main.workspace` column with `PropertiesBar`, the workspace slot, and `QuickAccessBar`, then the dialogs and help drawer slots, in the same DOM order as before. Registers `chromeModalOpen` (a flyout is open) and `closeChromeModal` (close it) through `onChromeReady`.
- `packages/editor/src/shells/classic/ClassicSidebar.tsx`: moved from `components/AppSidebar.tsx`; only the import paths and the component name changed.
- `packages/editor/src/shells/classic/useSidebarLayout.ts`: moved from `hooks/`. The storage key is now `lp-sketch.shell.classic.sidebar.collapsed.v1`. The old key is read once, copied forward, and removed.
- `packages/editor/src/shells/classic/classic.css` (new): the `.app-shell` and `.app-shell.sidebar-collapsed` rules, removed from `App.css`.
- `packages/editor/src/App.tsx`: the render tree is now providers plus `ShellHost` with three slots. `App` keeps the `ShellChrome` handle the shell registers, and `handleSelectTool` and the global shortcuts close modal chrome through it. 4,428 lines, from 4,466 at the start of Step 1.
- `packages/editor/src/hooks/useGlobalAppShortcuts.ts`: the option is `dismissChromeModal`, formerly `dismissSidebarFlyout`.
- `PropertiesBar` and `QuickAccessBar` gained `role="toolbar"` with accessible names so they expose the landmark the block registry requires. No visual effect.
- Tests: `shells/shells.coverage.test.tsx` (the block coverage gate, one case per registered shell), `shells/ShellHost.test.tsx` (eager mount, lazy mount behind the fallback, preference fallback), `shells/testing/createFixtureController.ts` (a static controller with no-op actions for mounting shells outside `App`).
- `scripts/ui-parity.mjs` (new): captures eighteen screenshots (three viewports by six chrome states) against a running dev server and compares two sets byte for byte. Sets land in `test-results/ui-parity/`, which git ignores.
- `AGENTS.md` and `docs/ENGINEERING.md`: the module lists gained `shells/` and `blocks/` and describe `workspace/` as the stage component plus the export renderer.

### Decisions worth knowing

1. The default shell is eager. `lazy()` defers the first paint by at least a microtask, which would blank the first frame and break every test that queries synchronously after rendering `App`. Classic is registered `kind: 'eager'`; lazy loading is implemented for future shells and covered by a test with a fixture shell.
2. No `Suspense` boundary around eager shells. A boundary would also catch any `createResource` in slot content and hide the whole chrome while it resolves. Nothing uses one today, but only the lazy path carries a boundary.
3. `inert` stays on the shell-owned `main.workspace` wrapper, as in Step 2. The shell now owns that state and exposes `chromeModalOpen`, instead of `App` deriving it from sidebar internals.
4. Slots are render functions rather than pre-built elements, so the shell creates slot content under its own reactive owner. A future runtime shell switch then re-creates the workspace instead of moving DOM nodes between owners.
5. The iPad status bar inset is native configuration, not CSS. The design document's scope line was corrected.
6. `ClassicSidebar` moved under the shell folder because it is Classic chrome (collapse toggle, section rail, flyouts) that composes the panel blocks. Leaving it under `components/` would have made a component depend on a shell module for its layout type.
7. `App.interaction.test.tsx` removes the collapsed-sidebar key before and after each test in its "collapsible sidebar" group. That constant now names the new key; without the change, one test's collapsed state leaked into the next through storage. No assertions changed.

### Screenshot comparison

Procedure: with the dev server on `localhost:5173`, `node scripts/ui-parity.mjs capture before` on the Step 2 tree, `capture after` on this tree, then `compare before after`. Chromium through Playwright, device scale factor 1, CSS animations disabled, pointer parked over the stage. Every file was byte-identical, so before and after share one hash. The first twelve characters of each SHA-256:

| State | Desktop 1440 by 900 | iPad landscape 1180 by 820 | iPad portrait 820 by 1180 |
| --- | --- | --- | --- |
| Default | `52cc2804b53f` | `b77791a35d0f` | `4ea10ef056a4` |
| Linear tool active | `f0d587a2d33e` | `15a469432c25` | `175ea9d859e3` |
| Sidebar collapsed | `5e3ce443fde5` | `785ab810af9d` | `76d3586f2471` |
| Collapsed, Tools flyout open | `def96bf4d4c1` | `9a273cb7b029` | `94367b11448c` |
| Quick-access customizer open | `98db5c7b1a36` | `f9195e50ee74` | `3cc777014ea0` |
| Help drawer open | `2102066b2dad` | `06d361daee4b` | `03401db558ea` |

Result: 18 of 18 identical.

### Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` | 52 files, 437 tests, pass (2 files and 4 tests added) |
| `npm run build` | pass |
| `npm run test:e2e` | rerun alone: 35 passed, 0 failed. The first run, alongside the unit suite and the screenshot capture, had 34 passed and 1 failed at page load (`.drawing-stage` not visible within 5 s), a load-time timeout under CPU contention rather than a behavior failure |
| Screenshot parity | 18 of 18 identical |

### Left for later steps

- `ShellHost` reads the shell preference once at mount. Runtime switching arrives with the shell picker in Step 5.
- Sidebar, panel, bar, and rail CSS still live in `App.css`; Classic's stylesheet holds only the grid. Step 5 decides what moves when the fine-grained blocks are extracted.
- The `.workspace` and `.workspace-stage-shell` class names and the `.sidebar .status-msg` e2e helpers are Step 6 work.
