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

## Step 4. Tokenize and add themes

Visible change by design: a Theme control in the Project panel, bundled fonts, and a dark theme. The light theme otherwise renders as before (see the screenshot section).

### What changed

- `packages/editor/src/themes/light.css` (new): the complete token set on `:root`, moved out of `App.css`, plus new tokens for values that used to be literals (`--bg-subtle`, `--border-subtle`, `--text-on-accent`, `--switch-thumb`, `--accent-bright`, `--accent-tint`, `--focus-ring`, `--focus-ring-strong`, `--danger`, `--highlight`, `--tooltip-bg`, `--tooltip-text`, `--backdrop`, `--swatch-outline`, `--shadow-lg`, `--pdf-page`) and eighteen `--ws-*` workspace interaction tokens. `App.css` keeps only layout metrics in `:root`.
- `packages/editor/src/themes/dark.css` (new): `:root[data-theme="dark"]` overriding every light token, built from the Nightshift prototype palette: near-black surfaces, cool grey text, amber accent, dark text on amber fills.
- `packages/editor/src/themes/fonts.css` (new) and `styles.css`: Plus Jakarta Sans and Fira Code are bundled from `@fontsource-variable/plus-jakarta-sans` and `@fontsource-variable/fira-code` (editor package dependencies), the same pattern as the Tabler icon font. The Google Fonts links left `apps/web/index.html`; both builds emit the same woff2 files.
- `packages/editor/src/themes/registry.ts` (new): `THEMES`, `THEME_PREFERENCE_KEY` (`lp-sketch.theme.v1`), `readThemePreference` (a theme id or `system`), `writeThemePreference` (`system` removes the key), `systemThemeId`, `resolveThemeId`.
- `packages/editor/src/context/ThemeContext.tsx` (new): `createThemeState` (preference, resolved theme, `prefers-color-scheme` subscription), `ThemeProvider` (sets `data-theme` on the document root and updates `meta[name="theme-color"]`), `useTheme`. `App.tsx` creates the state once and mounts the provider between `HelpProvider` and `AppControllerProvider`.
- `packages/editor/src/components/ThemePicker.tsx` (new block): System, Light, Dark as a radiogroup named "Theme" with its own section label and `help-theme` anchor. Classic places it at the bottom of the Project panel. Registered in `blocks/registry.ts`, so the coverage test requires it of every shell.
- `App.css`: every color literal outside `:root` replaced with a token: fifteen `color: #fff` on accent fills, twelve white surfaces, two switch thumbs, the PDF page and wash, three subtle surfaces, the hover blue, the danger red, the badge and focus tints, the dialog backdrop, the swatch outline, and the page drop shadow. The help drawer and content stylesheets lost their four literals the same way.
- Overlays: `components/overlay/overlay.css` (new) maps `ov-*` classes to the `--ws-*` tokens, and the overlay components carry those classes instead of stroke and fill attributes: selection and hover outlines on every element type and the symbol ring, construction marks, measure and mark and auto-spacing previews, snap markers, selection handles and guides, placement ghosts, the debug readout, and the preview arrow marker.
- `scripts/contrast-audit.mjs`: reads `themes/light.css` as the base and every other theme file as an override set, requires each theme to define every light token, and runs the checks per theme. Three checks were added for on-page interaction strokes against `--pdf-page`, and the hard-coded white foreground became `--text-on-accent` and `--switch-thumb`.
- `scripts/ui-parity.mjs`: `UI_PARITY_THEME` stores a theme preference before capture, so theme sets can be captured and compared.
- Help: `help-theme` joined the required anchors (39 now) and the manual gained section 2.9 "Theme".
- Tests: `themes/themes.test.ts` (token completeness, page and material invariants, preference round trips), `context/ThemeContext.test.tsx` (root attribute, OS scheme following, persistence). Selector updates in `App.interaction.test.tsx`, `OverlayBranches.test.tsx`, `SymbolGlyph.test.tsx`, and `e2e/geometry-tools.spec.ts` where assertions keyed on the old stroke literals now key on the `ov-*` classes. No assertions changed meaning.
- `AGENTS.md` and `docs/ENGINEERING.md` list `themes/` and the theme context.

### Decisions worth knowing

1. Drawing content is not themed. Legend and notes chrome, dimension text, symbol labels, and the arrow-head marker are drawn in exports by `renderCore` with the same fixed colors, so theming them on screen would make the screen disagree with the export. The design document listed legend and notes chrome as themed; both the scope line and the Theme contract were corrected.
2. Overlay colors go through classes and a stylesheet, not `stroke="var(...)"`. CSS variables inside SVG presentation attributes are not reliable across engines, and CSS properties beat presentation attributes anyway, so an element with an `ov-*` class needs no color attribute. Tests can query the class where they used to query the literal.
3. The audit caught a real defect during the work: the first dark palette used the amber accent for the selection outline and handles, which is 1.86:1 against the white page. Dark now uses a deep amber (`#92400e`, 7:1) for those strokes with white handle fills, and the three page checks stay in the audit so no future theme repeats it.
4. `light.css` is the complete set on `:root` and other themes override on `[data-theme]`, so a token a theme omits falls back to light by the cascade. Completeness is still enforced twice, by the audit and by `themes.test.ts`, so a theme cannot silently ride the fallback.
5. Fonts are variable rather than static per weight: one latin file per family plus the subsets fontsource ships, all bundled. The family names carry fontsource's "Variable" suffix, so `index.css` and the `--font` tokens name `Plus Jakarta Sans Variable` and `Fira Code Variable`.
6. Provider `value` props must be stable objects created once, exactly as `App` does. `value={createThemeState()}` in JSX compiles to a getter that builds a new state on every access; two of my own tests failed that way before the fix and the coverage test was corrected to match.
7. The preference has three states. `system` follows `prefers-color-scheme` and switches live; a stored theme wins over the OS. With nothing stored, the app follows the OS, which is what the design document asked for.

### Screenshot comparison

`node scripts/ui-parity.mjs capture step4-light` against the Step 3 `before` set, then a pixel diff (PIL) split at the sidebar edge:

| Capture | Changed pixels | Where |
| --- | --- | --- |
| Desktop default | 37,527 (2.9%) | Sidebar below y=648 only, where the Theme section pushes Tools down; workspace 160 px at the Zoom readout |
| Desktop collapsed, flyout | 160 (0.01%) | The Zoom readout only |
| Desktop help open | 37,367 (2.9%) | Sidebar below y=648 only; workspace 0 |
| iPad landscape and portrait | same pattern | Sidebar below the new section; Zoom readout |

Above the new section every sidebar pixel is identical, so the bundled Plus Jakarta Sans renders exactly as the Google-served font did. The 160 changed pixels in the workspace are the `Zoom: 100%` readout, where the bundled variable Fira Code differs from the static instance Google served. A dark set (`UI_PARITY_THEME=dark`) was captured and inspected at all three viewports: dark chrome, amber accent, white import placeholder card text, and the workspace surround at `--bg-canvas`.

### Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run audit:contrast` | pass for light and dark, 33 checks each plus completeness |
| `npm run build` | pass; help build verifies 39 anchors; fonts emitted as woff2 assets |
| `npm run mobile:build` | pass; same woff2 assets in the iPad bundle |
| `npm test` | 54 files, 448 tests, pass (2 files and 11 tests added) |
| `npm run test:e2e` | 35 tests, pass, run alone |

### Left for later steps

- The `hivis` theme (Step 6) needs the heavier border and radius tokens the Hi-Vis prototype uses; `light.css` has no border-width token yet.
- The Theme picker sits in Classic's Project panel. Tempered places the same block in its Setup tab in Step 5.
- The `.overlay-layer` dotted grid and the `canvas-watermark` still read chrome tokens directly (`--border`, `--bg-card`); that is fine for two themes and can become `--ws-*` tokens if a theme needs a different surround treatment.
