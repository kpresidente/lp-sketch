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

## Step 5. Build the Tempered shell and make it the default

Visible change by design: the app opens in the Tempered layout. The Classic layout is one radio click away in the Setup tab and keeps every control it had.

### What changed

- `packages/editor/src/blocks/` (new components): the six panels became 23 fine blocks, each owning its caption, its `help-*` anchor, and a landmark: `ModeSwitch` (group "Mode"), `HistoryControls` ("History"), `SnappingControls` ("Snapping"), `AnnotationTools` ("Annotation"), `ConductorTools` ("Conductors"), `AirTerminalTools` ("Air Terminals"), `ConnectionTools` ("Connections"), `DownleadTools` ("Downleads"), `PenetrationTools` ("Penetrations"), `GroundingTools` ("Grounding"), `ClassPicker` ("Class"), `MaterialPicker` (radiogroup "Material"), `AnnotationSizePicker` (radiogroup "Annotation size"), `StrokeSummary` ("Stroke", new), `LayerList` ("Layers"), `ProjectName` ("Project name"), `FileActions` ("File"), `ExportActions` ("Export"), `ReportActions` ("Report"), `PageNavigation` ("Pages"), `PdfBackground` ("PDF background"), `DrawingScale` ("Drawing scale"), `Readouts` ("Readouts", new), plus `ShellPicker` (radiogroup "Layout", new). `ThemePicker` and `StatusMessages` moved in beside them; `toolButtons.tsx` holds the shared `ToolButton` and `SymbolButton` tiles and `labels.ts` the shared user-facing names. Every block root carries `data-block="<id>"` so a shell can restyle one without reaching into it.
- `blocks/registry.ts`: 28 required blocks (the 25 above plus properties, quick-access, and status). The role and name pairs are the contract the coverage test, the e2e helpers, and the manual use.
- `shells/classic/panels/` (moved from `components/sidebar/`): the six Classic panels now compose blocks and nothing else; `Panel.tsx` and `PanelPresentationContext` moved with them. Classic waives `stroke-summary` and `readouts` with reasons in the registry. `classic.css` separates blocks inside a panel with the rule-above-caption that the panel sections had.
- `shells/tempered/` (new): `TemperedShell` (grid of sidebar and workspace column; context bar, stage with the quick rail, status strip), `TemperedSidebar` (header with the project name, sticky stroke widget, Draw / Annotate / Setup tablist with arrow-key navigation, three tab panels, collapsed rail with one section button per tab, flyout, footer status), `useTemperedLayout` (`lp-sketch.shell.tempered.sidebar.collapsed.v1`, `lp-sketch.shell.tempered.tab.v1`, transient flyout), and `tempered.css` (theme tokens only). Tab placement: Draw holds mode, the six component groups, snapping, and history; Annotate holds the annotation tools and layers; Setup holds project name, file, export, report, pages, PDF background, drawing scale, theme, and layout.
- `shells/shared/DismissBackdrop.tsx` (new): the outside-tap pointer sink both shells use; its class is `shell-dismiss-backdrop`.
- `shells/ShellContext.tsx` (new) and `ShellHost.tsx`: the host owns a shell signal and provides it; `ShellPicker` calls `setShell`, which stores the preference and re-mounts the chrome and the slots under the new shell. `shells/registry.ts` registers Tempered first and as the default; both shells stay eager.
- `components/PropertiesToolOptions.tsx`: `layout?: 'horizontal' | 'vertical' | 'strip'` sets `data-layout` on the options root; `App.css` lays out vertical (column, full-width separators) and strip (no wrap, horizontal scroll). `PropertiesBar` passes `horizontal`.
- `App.css`: base styles for the two new blocks (`.stroke-summary*`, `.readouts`), the layout-hint rules, the shared backdrop class; the panel-section rule it no longer needs is gone.
- `config/iconRegistry.ts`: `TEMPERED_TAB_ICON` (pencil, writing, settings).
- e2e: `helpers.ts` gains `openBlock(page, name, role)` (finds a block by landmark and clicks the tab that holds it when a shell hides it), `gotoApp(page, { shell })`, and `expectStatus` / `expectError` query `.status-msg` without a shell prefix; `panelRegion` is gone. The behavior specs use block names. `sidebar.spec.ts` pins Classic as its shell spec; `tempered.spec.ts` (new, 5 tests) covers tabs and arrow keys, the stroke widget, the collapsed rail with flyouts, iPad portrait and landscape, and the live layout switch.
- Unit tests: `shells.coverage.test.tsx` wraps shells in the shell provider and queries mounted blocks with `hidden: true`; `ShellHost.test.tsx` covers the default and the state switch; `shells/tempered/TemperedShell.test.tsx` (new, 6 tests) renders `App` and covers the default shell, tabs and persistence, the stroke summary, the collapsed rail with Escape and tool-close behavior, restart behavior, and switching to Classic and back. The five App suites pin Classic in their `beforeEach`.
- `scripts/ui-parity.mjs`: `UI_PARITY_SHELL` (default tempered) stores the shell preference; Tempered sets add `tab-annotate` and `tab-setup`; the flyout state opens the first section of whichever shell is under test (`flyout`, was `flyout-tools`).
- Help: `help-layout` joined the required anchors (40); the manual gained 2.10 "Layout" and 1.4 now describes the tabs and both rails.
- `AGENTS.md` and `docs/ENGINEERING.md` describe `blocks/` as the block components and `shells/` as both shells.

### Decisions worth knowing

1. Inactive tabs use the `hidden` attribute, as Classic's collapsed panels do, so hidden controls are hidden for tests too. The e2e helpers reveal a block's tab through ARIA (`tabpanel` to its `aria-labelledby` tab), which works on any shell that uses tabs and is a no-op on Classic. The App unit suites reach into all three tabs dozens of times per file, so for this step they pin Classic; step 6 already owned the test split and now has this concrete input.
2. Block landmarks are `group` or `radiogroup` with an explicit `aria-label`, not `aria-labelledby` to the caption, because the caption contains the help button and the computed name would pick up its tooltip.
3. `StrokeSummary` and `Readouts` are display-only blocks rather than shell chrome because the design lists them as blocks and any shell may want them; Classic waives both with reasons instead of duplicating its pickers.
4. Switching shells is live. The slots are render functions, so the Workspace is re-created under the new shell; `bindStage` re-observes and `bindPdfCanvasRef` resets its buffers and re-queues the render, which is why the drawing survives. Both shells are eager because the unit suites render Classic synchronously and a lazy Classic would blank the first frame of a switch.
5. Snapping and history sit at the end of the Draw tab; the prototype did not place them. The status strip shows their state as text with the state word ("Snap on"), not color alone.
6. `ShellPicker` reads `SHELLS` at render time, never at module scope: the registry imports the shells, which import the picker, and a module-scope read would see an uninitialized binding.
7. Classic is not pixel-identical. The Layers panel gained a "Layers" caption with its help button (the block owns them), the "loaded" file line moved under the File caption, and block gaps replaced four inline margins (two pixels here and there). Everything Classic's tests assert still holds.
8. The prototype's zoom widget (zoom out, readout, zoom in, fit) is not built: the controller has no zoom actions yet. It is listed below.

### Screenshot comparison

`node scripts/ui-parity.mjs capture` with `UI_PARITY_DIR` pointed at the scratchpad (Playwright empties `test-results/` on every run, which is where the Step 4 sets went): `step5-tempered` (24 shots: three viewports by default, linear-tool, tab-annotate, tab-setup, collapsed, flyout, quick-customizer, help-open), `step5-tempered-dark` (24), and `step5-classic` (18) against the Step 4 `step4-light` set with a PIL pixel diff split at the sidebar edge.

| Set | Result |
| --- | --- |
| Tempered light, desktop 1440 by 900 | The prototype's arrangement: header with mark and tagline, stroke widget (summary, chips, class, size), Draw / Annotate / Setup tabs, segmented mode, three-column tiles, footer status; context bar with the tool chip and the readouts on one row; quick rail top right; status strip |
| Tempered light, iPad landscape and portrait | Same layout. Below 1420 px the context bar's readouts drop to a second row, which is the existing `App.css` media query and happens in Classic too; the Setup tab fits its nine blocks with the sidebar scrolling |
| Tempered dark | Amber accent on dark cards from the tokens alone; the shell defines no tokens |
| Tempered collapsed and flyout | 64 px rail with Draw, Annotate, Setup buttons; the flyout carries the stroke widget above the tab content; the status floats bottom right as in Classic |
| Classic vs Step 4 | Collapsed: 3 of 3 identical. Workspace column: 0 changed pixels in all 18 shots (the one exception is 950 px of manual text inside the open help drawer at portrait). Expanded sidebar: 2.3% to 9.3% of pixels below y=184 changed, which is the Layers caption, the file line under File, block spacing, and the new Layout picker |

### Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run audit:contrast` | pass for light and dark |
| `npm run build` | pass; help build verifies 40 anchors; fonts emitted as woff2 assets |
| `npm run mobile:build` | pass; same 40 anchors and woff2 assets in the iPad bundle |
| `npm test` | 55 files, 456 tests, pass (1 file and 7 tests added). One earlier full run hit the pre-existing 5 s budget of the PDF export test in `App.file-actions.test.tsx` under load; the file passes alone in 7 s and the final run passed. |
| `npm run test:e2e` | 40 tests, pass, run alone (35 behavior and Classic tests plus 5 Tempered). The first run failed twice: the legend flow clicked a stage point that the import placeholder now covers at 1280 px (the spec's points moved up), and the layout-switch test assumed the Draw tab after switching back when Tempered correctly restores the Setup tab (the spec now reveals the block). |

### Left for later steps

- Step 6 test split: move the App unit suites onto the default shell with a jsdom `openBlock`, keeping the collapsible-sidebar and panel-region tests as Classic's shell test.
- Zoom controls (out, readout, in, fit) need controller actions before a shell can place them; the context bar keeps the zoom readout meanwhile.
- Classic's sidebar and panel styles still live in `App.css`; they can move to `classic.css` now that the panels are Classic-owned.
- The manual still names Classic panels in places ("the Tools panel"); the step 6 rewrite around blocks removes that.

## Step 6. Hardening

Visible change by design: a third theme, Hi-Vis. Everything else is tests, documentation, and the token plumbing the theme needed.

### What changed

- `packages/editor/src/themes/hivis.css` (new): `:root[data-theme="hivis"]` from the Hi-Vis prototype palette: white surfaces, black text and rules, safety yellow for selected and highlighted state, hard offset shadows. Active fills are black with yellow text, so every active state stays far above 7:1, and the selected material chip is yellow with a black outline. Registered in `themes/registry.ts` (label "Hi-Vis", light color scheme, yellow browser theme color) and imported by `ThemeContext`; the Theme block offers it automatically.
- Rule weight and radii became theme tokens: `--border-width` (new) and `--radius`, `--radius-sm`, `--radius-lg` (moved from `App.css`) live in `light.css`, and every `1px solid var(--border...)` in `App.css`, `tempered.css`, `classic.css`, and the two help stylesheets now reads `var(--border-width)`. Light and dark keep 1px and 6/5/8 px; Hi-Vis uses 2px and 10/8/12 px. Because they are tokens, the audit and `themes.test.ts` require every theme to define them.
- `themes/themes.test.ts` now derives the override themes from the registry (every theme but light) instead of naming dark, so a fourth theme needs no test edits; it also pins that only Hi-Vis changes the rule weight.
- Unit test split. `packages/editor/src/testing/screen.ts` (new) exports a `screen` whose `getByRole` reveals the sidebar tab holding a hidden control before returning it and leaves `queryByRole` literal. The five App suites import it, dropped their Classic pin, and now run on the default shell. The collapsible-sidebar tests and the panel-binding assertions moved to `shells/classic/ClassicShell.test.tsx` (new, 8 tests, pins Classic); `shells/testing/installAppTestEnvironment.ts` (new) holds the jsdom stubs both shell tests need, and `TemperedShell.test.tsx` uses it too. Three calibration tests that asserted the scale text with `getByText` now assert the badge by its title, because the Tempered status strip repeats the text.
- e2e helpers: `expectStatus` and `expectError` query the `status` and `alert` roles the status block owns instead of a class, and `ShellId` is any registered id, so a new shell touches nothing under `e2e/` except its own spec.
- Manual: section 1.4 became "Where Controls Live", a table mapping every control group to its place in each layout, with the collapsed-rail behavior below it; every "in the Tools panel" style sentence now names the control ("the **Snapping** controls", "the **Class** control", "the **Layers** switches"), and the collapsed-rail flyout is called a flyout in both layouts. Section 2.9 lists Hi-Vis. The anchor list in `build-help.mjs` is unchanged at 40; the new 1.4 anchor `help-introduction-where` is optional.
- `docs/ENGINEERING.md`: a "Shells, Blocks, and Themes" section with the steps and gates for adding a shell and adding a theme, a table of every device preference key and its owner, and the behavior versus shell test split under Test Strategy.

### Decisions worth knowing

1. Preference keys needed no further migration. The inventory (`lp-sketch.theme.v1`, `lp-sketch.shell.v1`, `lp-sketch.quick-access.v1`, three `lp-sketch.help.*.v1` keys, and the per-shell `lp-sketch.shell.<id>.*` keys) already matched the design table; the only pre-shell key, `lp-sketch.sidebar.collapsed.v1`, is still read once and removed by Classic's step 3 migration. The engineering guide records the inventory so the next key lands in the right namespace.
2. `screen.getByRole` reveals a tab as a side effect rather than requiring an explicit `openBlock` call at every site. A user has to open the tab too, so the behavior is faithful, and the alternative was several hundred call-site edits across suites that already read naturally. Absence checks stay honest because `queryByRole` does not reveal.
3. Hi-Vis inverts the accent convention: `--accent` is black and `--text-on-accent` is yellow, with yellow reserved for `--accent-light` (selected material, scale badge) and the switch thumb. A yellow accent fill with dark text would have passed the text checks but failed the audit's outline-on-tint and switch-thumb pairs, which is the audit doing its job.
4. Borders scale with the theme but layout metrics do not: widths, rail width, toolbar height, and transitions stay in `App.css`. A 2px rule shrinks a control's content box by a pixel per side under `box-sizing: border-box`; the tiles, chips, and segmented controls absorb that without changing size.
5. The manual still has section titles named after the Classic panels (Project, Tools, Components, Material, Scale, Layers) because those anchors are required by the help build and the titles read fine as topics; only the prose changed.

### Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run audit:contrast` | pass for light, dark, and hivis; completeness plus 33 checks each |
| `npm run build` | pass; help build verifies 40 anchors |
| `npm run mobile:build` | pass; same 40 anchors in the iPad bundle |
| `npm test` | 56 files, 461 tests, pass (1 file and 5 tests added: Classic's shell test gained the panel-binding and composition tests, the theme test gained the metrics test). The five App suites ran on Tempered. Two export tests in `App.file-actions.test.tsx` now carry the 10 s budget their sibling had; both timed out at 5 s on a run where the whole suite took twice its usual time. |
| `npm run test:e2e` | 40 tests, pass, run alone |

Hi-Vis was checked in the browser at desktop width: black 2px rules, black active fills with yellow text, yellow selected chip, rounder tiles with hard shadows, and the status strip and footer readable; a `step5-tempered`-style set of 24 shots (`UI_PARITY_THEME=hivis`) covers the three viewports, both tabs, the collapsed rail, the flyout, the customizer, and the help drawer.

### Left for later steps

- Whether Classic stays registered after Tempered has been the default for a release is still open (design document, open question 1). Retiring it would remove `shells/classic/`, its shell test, `e2e/sidebar.spec.ts`, and the Classic column of the manual's table.
- The prototype's zoom widget still needs controller zoom actions before a shell can place it.
- A per-platform default shell (open question 2) is cheap once a touch-first shell exists.

## Hover shell

The first shell built after the plan, through the recipe step 6 wrote into `docs/ENGINEERING.md`. Visible change by design: a third layout, "Hover", offered by the Layout block. Tempered stays the default.

### What changed

- `packages/editor/src/shells/hover/` (new): `HoverShell` (the workspace fills the screen; the chrome floats over it as translucent pills), `useHoverLayout` (one transient open-popover signal; Hover stores no preference), `hover.css`, and `HoverShell.test.tsx` (5 tests). Registered in `shells/registry.ts` as the first `lazy` shell, so its chunk loads on first use and the lazy path in `ShellHost` is now exercised by real code.
- Placement, per `prototypes/ui-refresh/03-hover.html`: a project pill top-left (mark, project name or app name, the status block as its subtitle, and a Setup button that opens a popover with project name, file, export, report, pages, PDF background, drawing scale, annotation size, theme, and layout); a dock top-center (the mode block, icon-only, plus one button per tool group whose popover holds that group's blocks: Conductors, Air Terminals, Connections, Downleads with Penetrations and Grounding, Annotate with the annotation tools and Layers); the history block top-right; the material and class blocks as a rail on the left; the quick-access rail on the right; the properties bar with the readouts under it at the bottom; the snapping block in the bottom-left corner. The stroke summary is waived because the rail shows material and class directly.
- Popovers are the shell's modal chrome, like the other shells' flyouts: one open at a time, the workspace `inert`, the shared `DismissBackdrop` behind them, tool choice and Escape close them, focus returns to the button that opened them, the same button toggles. A dock group lights up while the active tool belongs to it; that mapping is placement knowledge in the shell, the blocks still own the tools.
- The pills use theme tokens only (`color-mix` of `--bg-card` for the glass, `--border-subtle`, `--shadow-lg`, the accent for active state), so light, dark, and Hi-Vis all apply. Below 1240 px the dock drops its labels; below 1000 px it moves to a second row and the side rails start lower, which is how iPad portrait fits.
- Two blocks gained hooks a narrow shell can use without changing their names: `ModeSwitch` wraps its label in `.btn-text`, and `ClassPicker` carries an `aria-hidden` `.btn-text-short` ("I", "II") beside the full label, hidden by a base rule in `App.css`. Hover hides the mode labels and shows the short class labels; the accessible names are unchanged.
- The reveal helpers generalized from tab panels to any hidden container whose opener points at it with `aria-controls`: `testing/screen.ts` (`revealControl`) and `e2e/helpers.ts` (`openBlock`). Tempered's tabs already used `aria-controls`; Hover's dock and Setup buttons do too, so a behavior test that reaches a block inside a popover works on Hover as well.
- `scripts/ui-parity.mjs` keeps a state list per shell (`shellStates`) and rejects an unknown `UI_PARITY_SHELL`; Hover's set opens the Conductors and Setup popovers.
- `e2e/hover.spec.ts` (new, 5 tests): the dock's one-at-a-time popovers with the inert workspace, closing on tool choice, Escape, and an outside tap without drawing, the Setup popover applying a scale and the rail changing the stroke, iPad portrait and landscape keeping every pill inside the viewport, and the switch back to Tempered.
- `playwright.config.ts` takes `LP_E2E_PORT` and starts Vite with `--strictPort`; `gotoApp` asserts the page title before anything else. See decision 2.
- Manual: the layout table in 1.4 gained a Hover column and 2.10 a Hover bullet. `AGENTS.md`, `docs/ENGINEERING.md`, and the design document's future-shells and tracking tables record the shell.

### Decisions worth knowing

1. Every block stays mounted with `hidden` when its popover is closed, as Tempered's tabs do, so the coverage test sees all of them, the reveal helpers can open them, and opening a popover costs no render.
2. Mid-way through, the e2e port was taken by another project's preview server (a different app answered on 4173) and Playwright reused it, since `reuseExistingServer` is on for local runs. The runs against it were meaningless, and telling them apart from real failures took a while. The config now takes `LP_E2E_PORT`, Vite runs with `--strictPort`, and `gotoApp` fails immediately with the foreign title instead of letting specs fail in confusing ways.
3. The Hover spec's last test first reloaded after switching to Tempered and expected Tempered to survive, which it cannot while the test's own init script pins Hover on every load. That was my error, not the shell's; the test now checks the stored preference. The Tempered spec's switch test reloads legitimately because it pins nothing.
4. The material dots keep a fixed white label with a shadow over the swatch, the one non-token color in the shell, because the swatches are fixed drawing colors in every theme.
5. Hover is not made the iPad default. The design document's open question 2 is still the user's call; a per-platform default would be a small change in `App` props now that a touch-first shell exists.

### Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run audit:contrast` | unchanged (no new tokens) |
| `npm run build` | pass; the Hover chunk is emitted separately; 40 help anchors |
| `npm run mobile:build` | pass; same in the iPad bundle |
| `npm test` | 57 files, 467 tests, pass (1 file and 5 tests added; the coverage test now covers three shells) |
| `npm run test:e2e` | 45 tests, pass, run alone on `LP_E2E_PORT=4179` (40 before plus 5 Hover) |

Screenshots: `UI_PARITY_SHELL=hover` captured 18 shots (three viewports by default, linear-tool, popover-conductors, popover-setup, quick-customizer, help-open). Desktop matches the prototype's arrangement with light glass pills on the light theme; at iPad portrait the dock sits on its own row under the project and history pills and the rails start below it, and no pill leaves the viewport (the spec checks every pill's box at both iPad sizes).

### Left for later

- The prototype's zoom pill (out, readout, in, fit) still waits on controller zoom actions; the bottom-right corner is empty.
- The dock could show the active tool's own name and icon instead of the group's while a tool in that group is active, as the prototype does; the mapping already exists.
- Whether the iPad app should open in Hover (open question 2).
