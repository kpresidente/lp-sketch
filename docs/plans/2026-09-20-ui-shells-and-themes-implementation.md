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
