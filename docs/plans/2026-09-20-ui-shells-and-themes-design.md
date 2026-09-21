# 2026-09-20 UI Shells and Themes Design

- Status: draft, ready for implementation. Update the tracking table and the per-step checklists as work lands.
- Goal: make the editor chrome swappable (shells) and skinnable (themes) without touching the workspace, so the Tempered direction can ship first and other directions can be added over time, with every theme applying to every shell.
- Visual reference: `prototypes/ui-refresh/` (six static directions plus `index.html`). Tempered is the first shell; Nightshift dark and Hi-Vis are the first alternate themes.
- Scope of this document: the six refactor and delivery steps agreed on 2026-09-20. Per-step implementation notes go in sibling `-implementation.md` files as usual.

## Decisions

1. Three layers, strictly separated:
   - Workspace: drawing stage, PDF canvas, SVG overlays, pointer controllers, geometry, export. Shell-agnostic. Theme-aware only through a small token set.
   - Shell: an arrangement of blocks around the workspace, plus shell-owned layout state (collapsed rails, open flyouts, dock popovers). A shell decides placement and nothing else.
   - Theme: design tokens and fonts applied to the whole app. A theme never changes layout or behavior.
2. The block rule: shells may place and style blocks; they may never define what a tool does, which options exist, or what a control is called. All behavior lives in blocks and the controller.
3. Shell and theme are device preferences stored in local storage. They never enter project JSON, autosave, or history.
4. The current UI becomes the first shell ("Classic") purely as scaffolding to prove the seam. Tempered replaces it as the default in step 5. Whether Classic stays available afterwards is an open decision (see Open questions).
5. First themes: `light` (Tempered palette, default), `dark` (Nightshift palette), `hivis` (black, white, safety yellow, heavier rules). Vellum paper and Ledger cream are candidates for later.
6. Every shell must mount every required block or explicitly waive it. A test enforces this so a second shell cannot silently fall behind the first.

## Non-goals

- No change to project schema, file format, export output, or the canvas renderer. The Canvas 2D spike in `workspace-redesign.md` continues independently and shares the Workspace boundary defined in step 2.
- No per-project shell or theme.
- No user-customizable layouts beyond what a shell itself offers (for example the existing quick-access customizer).
- Not all six prototype directions are being built now. Only Tempered is in scope; the others are documented as future shells with their known requirements.

## Vocabulary

| Term | Meaning | Today |
| --- | --- | --- |
| Controller | The single object every block reads state and actions from, delivered by context. | `AppController` in `packages/editor/src/context/AppController.ts` (132 fields after step 1; was `AppSidebarProps` with 119), provided by `AppControllerProvider` |
| Block | A self-contained piece of chrome with stable accessible names and no layout opinion. | The six panels in `components/sidebar/`, `PropertiesBar`, `PropertiesToolOptions`, `QuickAccessBar` |
| Workspace | The stage and everything rendered inside it. | The stage portion of `components/CanvasStage.tsx` plus `OverlayLayer` |
| Shell | A component that arranges blocks and slots into a full screen. | Hard-coded in `App.tsx` lines around the `app-shell` div |
| Slot | A piece of UI the shell must place but does not own: workspace, tool options, dialogs, help drawer. | Rendered directly by `App.tsx` |
| Theme | A named token set plus fonts. | The `:root` block in `App.css` and the font link in `apps/web/index.html` |

Since step 5 the blocks are the components under `packages/editor/src/blocks/` (28 of them, each with a `group`, `radiogroup`, `toolbar`, or `status` landmark), the shells are `shells/tempered/` (default) and `shells/classic/` (whose panels compose the blocks), and the slot list is unchanged.

## Target architecture

```
App.tsx
  builds state, hooks, and the controller
  └─ ThemeProvider            sets data-theme on the app root, loads fonts
     └─ ShellHost             resolves the shell from preference, lazy-loads it
        └─ <Shell>            Classic | Tempered | (future) Hover | Vellum | Ledger | Nightshift
             blocks           read the controller via useAppController()
             <Workspace/>     slot, pointer and PDF concerns only
             <ToolOptions/>   slot, shell passes a layout hint
             dialogs          slot
             <HelpDrawer/>    slot
```

Registries make the contracts explicit and testable:

- `shells/registry.ts`: `{ id, label, load(), waivedBlocks }` per shell.
- `blocks/registry.ts`: the list of required block ids and the accessible landmark each one exposes.
- `themes/registry.ts`: `{ id, label, tokens, fonts }` per theme.

## Contracts

### Controller

- One object, one context. Everything a block or a shell needs comes from `useAppController()`.
- Fields still passed as props to chrome today move into the controller: stage cursor, calibration preview, the distance readouts (line segment, path total, measure, mark span, auto-spacing path), selection debug flag, quick-access editing context, `canDeleteSelection`, `supportsNativeFileDialogs`, and the file, export, and history actions that `CanvasStage` currently re-receives.
- Rename `AppSidebarProps` to `AppController` once nothing else references the old name. Keep `createSidebarController` as a thin factory or delete it.

### Block

- Renders semantic controls with the accessible names tests already use (`Collapse sidebar`, `Snap to points`, `Linear`, `Scale inches`, and so on). Names are part of the contract; changing one is a breaking change for every shell and test.
- Owns its help anchors. The `SectionHelp` buttons and their `help-*` anchors move with the block, never with the shell.
- No grid or column assumptions. Presentation variants are a prop: `variant: 'tile' | 'row' | 'icon'`. Shells choose the variant; blocks render the same controls in each.
- Reports nothing to the shell except through the controller. A block never reaches into the DOM of the shell.

### Shell

- Receives slots and renders the whole chrome. Reads the controller for state, never App internals.
- Owns its layout state (collapsed rail, active flyout, open popover) and persists it under its own storage namespace.
- Exposes one signal to the app: `chromeModalOpen`. The workspace uses it for `inert` and focus return, replacing today's sidebar-specific `activeSection() !== null` check.
- Must mount every block in the required list or declare it in `waivedBlocks` with a reason.
- Owns platform framing such as the iPad status bar inset and safe areas.

### Theme

- A theme is a complete token set. Missing tokens fall back to `light`, never to raw colors.
- Tokens cover chrome and the workspace-facing interaction set: canvas surround, selection stroke and handle fill, hover stroke, snap marker, mark stroke, path and placement previews. Material colors, legend and notes chrome, dimension text, and symbol labels stay fixed across themes because they are exported drawing content. On-page interaction strokes must keep 3:1 against the white page in every theme; the audit checks this.
- Fonts are self-hosted per theme so the iPad bundle renders identically offline. Since step 4 both apps bundle Plus Jakarta Sans and Fira Code as variable fonts from `@fontsource-variable` packages through `themes/fonts.css`; before that the web entry loaded them from Google Fonts and the mobile entry loaded nothing.
- Each theme passes `npm run audit:contrast`. The audit reads `:root` from `App.css` today and must learn to read one theme block at a time.

### Preferences

| Key | Scope | Owner |
| --- | --- | --- |
| `lp-sketch.theme.v1` | global | ThemeProvider |
| `lp-sketch.shell.v1` | global | ShellHost |
| `lp-sketch.quick-access.v1` | global | QuickAccessBar block (unchanged) |
| `lp-sketch.help.*.v1` | global | Help context (unchanged) |
| `lp-sketch.shell.<id>.*` | per shell | that shell (for example the collapsed-rail flag now stored under `lp-sketch.sidebar.collapsed.v1`) |

## Steps

### Step 1. Consolidate the controller

Pure refactor. No visual change. Tests stay green throughout.

Scope:

- Extend the controller with the fields listed in the Controller contract.
- Make `PropertiesBar`, `QuickAccessBar`, and the stage chrome read `useAppController()` instead of props. `QuickAccessBar` drops from 50 props to none; `CanvasStage` drops most of its 74.
- `PropertiesToolOptions` already reads the controller; leave it.

Acceptance:

- `CanvasStage` receives only stage concerns: `inert`, refs, pointer handlers, wheel, double-click, and children. It reads the view transform, PDF transparency, stage cursor, and the import placeholder actions from the controller.
- `npm test` and `npm run test:e2e` pass without test changes.

Checklist:

- [x] Controller fields added and typed
- [x] `QuickAccessBar` reads context
- [x] `PropertiesBar` reads context
- [x] `CanvasStage` prop surface reduced to stage concerns
- [x] `AppSidebarProps` renamed to `AppController`
- [x] Unit and e2e suites green

### Step 2. Extract the Workspace

Scope:

- Split `CanvasStage` into `workspace/Workspace.tsx` (the `drawing-stage` region, camera layer, PDF canvas, transparency wash, import placeholder, resize observation) and two blocks (`PropertiesBar`, `QuickAccessBar`) that the shell places.
- `inert` is driven by a `chromeModalOpen` signal instead of the sidebar flyout state. It stays on the shell-owned wrapper around the bars and the stage, because chrome behind an open flyout must stay unreachable too; the sidebar e2e spec asserts this.
- Keep the `.drawing-stage` class and the `Drawing canvas` region name; e2e helpers depend on both.
- This is the same boundary the Canvas 2D spike swaps behind (`OverlayLayer` versus a future `WorkspaceCanvas`). Coordinate so both efforts use one component.

Acceptance:

- `Workspace` has no knowledge of any panel, bar, or rail.
- The quick-access rail and properties bar render exactly where they do today, but are placed by `App.tsx` rather than by the stage.
- Suites green without test changes.

Checklist:

- [x] `Workspace.tsx` created with stage-only props
- [x] `PropertiesBar` and `QuickAccessBar` placed from outside the workspace
- [x] `inert` driven by `chromeModalOpen`
- [x] Canvas spike flag still works behind the same boundary
- [x] Suites green

### Step 3. Introduce the shell boundary with Classic

Scope:

- Create `shells/registry.ts`, `blocks/registry.ts`, `ShellHost`, and `shells/classic/ClassicShell.tsx`. Classic reproduces today's UI exactly: sidebar, collapsed rail and flyouts, properties bar, quick-access rail, status messages, help drawer placement.
- Move `useSidebarLayout` into the Classic shell. Its storage key becomes `lp-sketch.shell.classic.sidebar.collapsed.v1`, with a one-time read of the old key.
- Move the `app-shell` grid CSS into the Classic shell stylesheet. The iPad status bar inset turned out to be native configuration (`StatusBar.overlaysWebView: false` in `apps/mobile/capacitor.config.ts`), not CSS, so there was nothing to move for it.
- Add the block coverage test: for every registered shell, mount it with a fixture controller and assert every required block landmark is present or waived.
- Add the shell preference and `ShellHost` lazy loading, even though only one shell exists.

Acceptance:

- Zero visual change, verified by comparing screenshots before and after at desktop and iPad landscape sizes.
- Block coverage test passes for Classic with an empty waiver list.
- `App.tsx` no longer contains layout markup beyond the providers and `ShellHost`.

Checklist:

- [x] Registries and `ShellHost` in place
- [x] Classic shell renders today's UI
- [x] Sidebar layout state owned by Classic, storage key migrated
- [x] Block coverage test added
- [x] Screenshot comparison recorded in the implementation notes
- [x] Suites green

### Step 4. Tokenize and add themes

Scope:

- Replace the 45 hard-coded hex values and seven rgba shadows and tints outside `:root` in `App.css` with tokens, including the white fills, the hover blue, and the danger red. The help drawer stylesheets carry four more.
- Replace the hard-coded overlay interaction colors with tokens applied through classes: selection and hover outlines, selection handles, snap markers, construction marks, measure and auto-spacing path previews, placement ghosts and the preview arrow marker. Legend and notes chrome, dimension text, symbol labels, and the arrow-head marker are exported drawing content that the canvas renderer draws with the same fixed colors, so they stay fixed like the material colors and the screen keeps matching the export.
- Add `ThemeProvider`, `themes/registry.ts`, and `data-theme` on the app root. Move the `:root` block into `themes/light.css` and add `themes/dark.css` from the Nightshift prototype palette.
- Self-host fonts through package assets rather than Google Fonts, for both apps.
- Extend `scripts/contrast-audit.mjs` to audit every theme file.
- Add a theme picker block. Respect `prefers-color-scheme` when no preference is stored.

Acceptance:

- Switching theme at runtime changes chrome and workspace accents with no reload and no layout shift.
- The PDF page stays white in every theme; only the surround changes.
- `npm run audit:contrast` passes for light and dark.
- The iPad build renders the same fonts as the web build with no network.

Checklist:

- [x] Chrome colors tokenized
- [x] Overlay colors tokenized
- [x] `ThemeProvider` and registry
- [x] `light` and `dark` themes
- [x] Fonts self-hosted in both apps
- [x] Contrast audit runs per theme
- [x] Theme picker block, with a help anchor
- [x] Suites green

### Step 5. Build the Tempered shell and make it the default

Scope:

- `shells/tempered/TemperedShell.tsx` from `prototypes/ui-refresh/04-tempered.html`: sticky stroke widget (material, class, size, live preview), three sidebar tabs (Draw, Annotate, Setup), context bar, quick-access rail, status strip.
- Split the coarse panels into the finer blocks the shell needs: mode switch, one component per tool group, material picker, class picker, size picker, layer list, page navigation, scale control, history, file actions, export actions, stroke summary, status readouts. Classic keeps working by composing the same blocks into its old panels.
- Give `PropertiesToolOptions` a layout hint (`horizontal | vertical | strip`) so future inspector-style shells can reuse it unchanged.
- Add a shell picker block next to the theme picker. Implemented as the "Layout" block: switching is live through a shell context in `ShellHost`, which re-mounts the chrome and the slots; App state is untouched.
- Add a Tempered e2e spec covering tab switching, the stroke widget, the collapsed state, and iPad landscape and portrait.

Acceptance:

- Block coverage test passes for Tempered with no waivers.
- Every existing behavior e2e spec passes against Tempered as the default shell, with only shell-coupled selectors changed (see step 6). The e2e helpers now address blocks by landmark and reveal the tab that holds one; `sidebar.spec.ts` pins Classic as its shell spec. The App unit suites pin Classic until step 6 splits them, because Tempered keeps two tabs hidden and those suites reach into all of them.
- Tempered matches the prototype within reason at 1440 by 900 and on iPad landscape.

Checklist:

- [x] Fine-grained blocks extracted, Classic re-composed from them
- [x] Tool options layout hint
- [x] Tempered shell built
- [x] Shell picker block, with a help anchor (`help-layout`; the block is named "Layout" for users)
- [x] Tempered e2e spec
- [x] Tempered set as default
- [x] Suites green

### Step 6. Hardening

Scope:

- Split tests into behavior tests (shell-agnostic, run once against the default shell) and shell tests (small, one file per shell). The e2e side landed in step 5 (`openBlock` reveals a block's tab; `expectStatus` queries the block's own class; `sidebar.spec.ts` and `tempered.spec.ts` are the shell specs). What remains is the unit side: the five App suites pin Classic; move the shell-agnostic ones onto the default shell with the same reveal idea, and keep the collapsible-sidebar and panel-region tests as Classic's shell test.
- Rewrite `packages/editor/src/help/USER_MANUAL.md` around blocks and tasks rather than locations. The required anchor list in `build-help.mjs` stays the same; the prose stops saying "in the Tools panel".
- Namespace remaining shell preferences per the Preferences table, with one-time migration of the old keys.
- Add the `hivis` theme from the Hi-Vis prototype palette, including the heavier border and radius tokens it needs, and run the contrast audit on it.
- Document how to add a shell and how to add a theme in `docs/ENGINEERING.md`, including the coverage test and the audit as gates.

Acceptance:

- `npm test`, `npm run test:e2e`, `npm run audit:contrast`, and the help build pass with Tempered default and Classic still registered.
- Adding a shell requires touching only `shells/` and the registry, plus one e2e spec.

Checklist:

- [ ] Behavior and shell test split
- [ ] Shell-coupled e2e helpers replaced
- [ ] Manual rewritten around blocks
- [ ] Preference keys namespaced and migrated
- [ ] `hivis` theme
- [ ] Engineering guide updated
- [ ] Suites and audits green

## Future shells

Each future shell reuses the block registry. The list records what each one needs beyond it, so the estimate is honest when the time comes.

| Shell | Prototype | Shell-owned work beyond blocks |
| --- | --- | --- |
| Nightshift | `01-nightshift.html` | Right inspector with tabs; tool options in `vertical` layout; ships with the `dark` theme by default |
| Vellum | `02-vellum.html` | Ribbon with mixed large and small clusters; title-block strip; CAD status strip; needs a `paper` theme |
| Hover | `03-hover.html` | Floating glass pills; pop-out tool groups; touch-first sizing; likely the iPad default candidate |
| Hi-Vis | `05-hivis.html` | Bottom tray with two-row groups; oversized targets; pairs with the `hivis` theme but is a separate shell |
| Ledger | `06-ledger.html` | Serif header with meta table; labelled rail with grouped pop-outs; specification panel with a searchable component catalog |

Gate for any new shell: block coverage test with documented waivers, one shell e2e spec, a manual note if it introduces a control the manual does not describe, and a screenshot set at desktop and iPad sizes.

## Tracking

| Step | Status | Branch or PR | Notes |
| --- | --- | --- | --- |
| 1. Consolidate the controller | in review | `codex/monorepo-foundation` | Implemented 2026-09-20; see the implementation notes, step 1 |
| 2. Extract the Workspace | in review | `codex/monorepo-foundation` | Implemented 2026-09-21; see the implementation notes, step 2 |
| 3. Shell boundary with Classic | in review | `codex/monorepo-foundation` | Implemented 2026-09-21; 18 of 18 screenshots identical; see the implementation notes, step 3 |
| 4. Tokens and themes | in review | `codex/monorepo-foundation` | Implemented 2026-09-21; light and dark pass the audit; see the implementation notes, step 4 |
| 5. Tempered shell as default | in review | `codex/monorepo-foundation` | Implemented 2026-09-21; 28 blocks, Tempered mounts all, Classic waives two; see the implementation notes, step 5 |
| 6. Hardening | not started | | |

Statuses: not started, in progress, in review, done.

## Risks

- `App.tsx` is 4,466 lines and owns all state. Steps 1 to 3 touch it heavily. Land each step as its own PR with suites green; do not combine steps.
- The Canvas 2D spike and this work both want to own the workspace boundary. Step 2 defines it; the spike should rebase onto it rather than the reverse.
- Screenshot parity in step 3 is the only proof that the seam is real. Record the screenshots in the implementation notes so regressions are visible.
- Theme tokens in SVG overlays rely on CSS custom properties inheriting into inline SVG. This works in every supported browser, but export rendering must keep using fixed colors so exported files do not change with the theme.
- Two shells double the manual surface. The rewrite in step 6 is what keeps that cost flat; do not skip it.

## Open questions

1. Keep Classic after Tempered ships, or retire it once Tempered has been the default for a release? Retiring removes a maintenance surface; keeping it gives cautious users a fallback.
2. Should the mobile app default to a different shell than the web app once a touch-first shell exists? The `App` props already differ per platform, so a per-platform default is cheap.
3. Which theme should the Tempered shell ship with as the default on iPad in bright conditions: `light` or `hivis`?
