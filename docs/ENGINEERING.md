# Engineering Guide

## Stack

- SolidJS + TypeScript + Vite
- `pdfjs-dist` for background PDF rendering (shared worker, single instance)
- SVG overlay for interactive annotation geometry
- `pdf-lib` for flattened PDF export composition
- Kobalte for accessible UI primitives, Tabler Icons (webfont)
- Ajv for project schema validation

## Architecture

### Workspaces

- `apps/web`: browser startup, HTML, public assets, and Vite configuration.
- `apps/mobile`: Capacitor iPad application, separate bundled web assets, and native Xcode project. The first package reuses the existing editor; native file/storage services and Pencil behavior remain separate work.
- `packages/core`: shared project format and pure domain calculations.
- `packages/editor`: shared SolidJS editor, browser rendering, and reactive workflows.

Dependencies flow from applications to editor to core. Cross-package imports use `@lp-sketch/editor` and `@lp-sketch/core` package exports. Private packages export TypeScript source for Vite to compile; they do not require separate publishing or JavaScript builds.

Browser file dialogs and local-storage autosave remain in editor for this structural migration. Native storage, file handling, and lifecycle services will be introduced at the application boundary during mobile implementation. Mouse/pen/touch behavior is shared and should not be selected solely by browser versus native packaging.

The mobile entry point opts into `penSelectionDragThresholdPx={8}`. Pencil selection is immediate, but object/group/handle previews wait for 8 CSS pixels of displacement from contact. The gate uses raw screen coordinates before snapping and animation-frame coalescing, then stays active for fine positioning until the gesture ends. Existing drag cleanup clears pending activation; taps do not change geometry or history. The prop defaults to zero, preserving browser pen/touch/mouse behavior, and does not affect mouse input in the mobile app.

Root scripts preserve the existing development workflow. Vite loads environment files from the repository root and emits root `dist/`, keeping the Azure deployment configuration valid. Help is built from the shared manual into the consuming application's public directory.

### Render Model

1. PDF page is rendered to an off-screen canvas via a shared PDF.js worker.
2. Annotation geometry is rendered in SVG overlays (one per element type).
3. Export pipelines flatten visible project state to image or PDF.

### Core Modules

- `packages/editor/src/App.tsx`
  - App orchestration, tool state, pointer workflows
- `packages/editor/src/components/`
  - Sidebar panels, quick-access toolbar, properties bar, overlay branches, dialogs, help drawer: the blocks a shell arranges
- `packages/core/src/lib/`
  - Geometry, snapping, spacing, legend, layer filtering, text layout, project calculations
- `packages/editor/src/lib/`
  - Font measurement, annotation hit testing, export, browser files/autosave, telemetry, reporting
- `packages/core/src/model/`
  - Default project creation, schema migration, validation, history transactions
- `packages/editor/src/controllers/pointer/`
  - Pointer event controllers: placement, select, measure, gesture
- `packages/editor/src/shells/` and `packages/editor/src/blocks/`
  - Shell registry, `ShellHost` and the shell context (live switching), the Tempered shell (default), the Classic shell and its panels, and the block components with the required-block registry every shell must mount or waive
- `packages/editor/src/workspace/`
  - Drawing stage component and the shared canvas export renderer
- `packages/editor/src/themes/`
  - Theme registry and token stylesheets; `light.css` is the complete set, other themes override it on `[data-theme]`
- `packages/editor/src/hooks/`
  - SolidJS reactive hooks (autosave, PDF renderer, file actions, shortcuts)
- `packages/editor/src/context/`
  - Context providers: AppControllerContext (the controller every block reads), HelpContext (help drawer), ThemeContext (theme preference and `data-theme`)
- `packages/core/src/config/` and `packages/editor/src/config/`
  - Domain constants in core; runtime limits and icon registry in editor
- `packages/core/src/types/`
  - TypeScript types (project schema, app runtime)
- `packages/editor/src/help/`
  - User manual source (Markdown), Vite plugin for Markdown-to-HTML build

### Shells, Blocks, and Themes

The chrome is three layers (design: `docs/plans/2026-09-20-ui-shells-and-themes-design.md`): blocks own behavior and accessible names, shells place blocks and slots, themes color everything. A shell never defines what a control does or what it is called.

**Adding a shell**

1. Create `packages/editor/src/shells/<id>/` with a component of type `ShellComponent`. Read state through `useAppController()`, mount every block in `blocks/registry.ts` or waive it with a reason, render the three slots (`workspace`, `dialogs`, `helpDrawer`) exactly once, and call `onChromeReady` during setup with `chromeModalOpen` and `closeChromeModal`. Wrap the workspace slot in a `main.workspace` that is `inert` while the shell's modal chrome is open, and use `shells/shared/DismissBackdrop` behind that chrome.
2. Keep layout state (collapsed rail, open flyout, active tab) inside the shell and persist it under `lp-sketch.shell.<id>.*`. Restyle blocks under the shell's root class; do not change their markup.
3. Register it in `shells/registry.ts` and add the id to `ShellId`: `eager` for the default shell, `lazy` for the rest. The Layout block lists registered shells automatically.
4. Gates: `shells/shells.coverage.test.tsx` mounts every registered shell with a fixture controller and fails on a missing block or slot; one e2e spec for the shell's own chrome, pinned with `gotoApp(page, { shell: '<id>' })` (see `e2e/tempered.spec.ts`); a screenshot set with `UI_PARITY_SHELL=<id> node scripts/ui-parity.mjs capture <tag>`; a manual note if the shell adds a control the manual does not describe.

**Adding a theme**

1. Create `packages/editor/src/themes/<id>.css` with one `:root[data-theme="<id>"]` block that defines every token `light.css` defines: colors, shadows, fonts, `--border-width`, and the three radii. Keep the five material colors and `--pdf-page` unchanged, and keep on-page interaction strokes (`--ws-*`) at 3:1 against the white page.
2. Import it in `context/ThemeContext.tsx` and register it in `themes/registry.ts` (id, label, color scheme, browser theme color). The Theme block lists registered themes automatically.
3. Gates: `npm run audit:contrast` (completeness plus the WCAG pairs, run per theme) and `themes/themes.test.ts` (completeness, fixed page and material tokens). Capture a screenshot set with `UI_PARITY_THEME=<id>`.

**Device preferences** live in local storage and never enter project JSON, autosave, or history:

| Key | Owner |
| --- | --- |
| `lp-sketch.theme.v1` | ThemeProvider (absent means follow the OS) |
| `lp-sketch.shell.v1` | ShellHost |
| `lp-sketch.quick-access.v1` | Quick-access block |
| `lp-sketch.help.pinned.v1`, `lp-sketch.help.scroll.v1`, `lp-sketch.help.last-anchor.v1` | Help context |
| `lp-sketch.shell.classic.sidebar.collapsed.v1` | Classic (migrated once from `lp-sketch.sidebar.collapsed.v1`) |
| `lp-sketch.shell.tempered.sidebar.collapsed.v1`, `lp-sketch.shell.tempered.tab.v1` | Tempered |

## Project Schema and Migration

- Canonical schema: `packages/core/src/model/project-schema-v1.json`
- Current schema version: 1.10.0
- Runtime validator: `packages/core/src/model/validation.ts`
- Migration pipeline: `packages/core/src/model/migration.ts`

Compatibility guarantees:

- Supported `1.x` projects are normalized before validation.
- Invalid/missing legacy fields are clamped/defaulted to schema-safe values.
- Migration output is deterministic for identical input.
- Multi-page structures (per-page view, scale, transparency) are auto-normalized.

## Reliability and Performance

### Runtime Reliability

- Autosave + startup recovery with safe fallback behavior
- Defensive import/load limits (`packages/editor/src/config/runtimeLimits.ts`)
- Root error boundary with telemetry reporting

### Performance

- Shared PDF.js worker reused across document lifecycle; request versioning prevents stale renders
- Viewport culling: only visible elements are rendered in overlays
- Overlay memoization via `createMemo` for expensive computations
- Bounding-box culling before expensive geometric intersection checks
- Layer-filter fast path returns original project when all layers are visible

## Accessibility

- Kobalte primitives provide ARIA roles/states for panels, dialogs, and controls
- Keyboard-operable critical controls with focus-visible styles
- Shared text and functional control color pairs checked by `scripts/contrast-audit.mjs`: text at 4.5:1, essential outlines/focus/selection cues and switch thumbs at 3:1. Disabled labels also target 4.5:1 as a readability choice.
- Keep decorative dividers (`--border`) quieter than control boundaries (`--border-btn`); rule weight comes from `--border-width`, which the Hi-Vis theme doubles. Shared styles apply to browser and iPad; selected materials also use a checkmark, and disabled controls use explicit colors rather than reducing whole-control opacity.
- Token audits do not verify every rendered state or outdoor readability. Review desktop/tablet screenshots and verify field readability on a physical iPad.

## Commit Conventions

Canonical interaction model:

- `Reactive`: toggles/selectors apply immediately and are reversible via undo.
- `Reactive input`: single-value text/number fields apply on keystroke; Enter blurs for visual confirmation and then focus returns to the canvas.
- `Explicit button`: multi-input actions commit on Apply/Finish (with Enter shortcut where implemented).
- `Dialog`: multi-field editors commit via Apply/Submit and cancel via Cancel/Escape.

Keyboard and safety rules:

- Single-line `<input>`: Enter commits/applies.
- Multi-line `<textarea>`: Ctrl/Cmd + Enter commits/applies; Enter inserts newline.
- Escape always means cancel/discard, never finish.
- Enter is the finish/confirm key where a keyboard finish is supported.
- While `isEditingContextActive` is true, project-level `Delete`, `Backspace`, `Undo`, and `Redo` shortcuts are suppressed to prevent destructive canvas changes during editing dialogs/flyouts.
- Editing surfaces must not silently discard typed text on click-away.

## Test Strategy

Primary suites:

- Unit and integration: `npm test` (Vitest, node environment by default and jsdom for UI suites; one worker on Windows for reliable startup)
- E2E: `npm run test:e2e` (Playwright, Chromium)
- Export regression: `packages/editor/src/lib/export.regression.test.ts` with snapshots
- Coverage thresholds: 30% lines/functions/statements, 25% branches

Tests stay beside their implementation in each shared package. The root Vitest configuration discovers tests across all workspaces. Browser E2E tests remain in root `e2e/` and exercise the application through the root dev command. Root `npm run typecheck` checks core, editor, web, and build/test configuration.

Behavior tests are shell-agnostic and run on the default shell; shell tests are one file per shell (`shells/classic/ClassicShell.test.tsx`, `shells/tempered/TemperedShell.test.tsx`, `e2e/sidebar.spec.ts`, `e2e/tempered.spec.ts`) and pin their shell. Behavior tests reach chrome through block landmarks (`blocks/registry.ts`), never through a shell's panels: in jsdom, `screen` from `packages/editor/src/testing/screen.ts` reveals the sidebar tab that holds a control before returning it; in Playwright, `openBlock(page, name)` in `e2e/helpers.ts` does the same, and `expectStatus` and `expectError` query the status and alert roles. The App suites share `shells/testing/installAppTestEnvironment.ts` for the jsdom stubs `App` needs.

Recommended local validation before merge:

```bash
npm run build
npm test
npm run test:e2e
npm run audit:prod:gate
npm run audit:contrast
```
