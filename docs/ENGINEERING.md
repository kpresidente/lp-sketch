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

Root scripts preserve the existing development workflow. Vite loads environment files from the repository root and emits root `dist/`, keeping the Azure deployment configuration valid. Help is built from the shared manual into the consuming application's public directory.

### Render Model

1. PDF page is rendered to an off-screen canvas via a shared PDF.js worker.
2. Annotation geometry is rendered in SVG overlays (one per element type).
3. Export pipelines flatten visible project state to image or PDF.

### Core Modules

- `packages/editor/src/App.tsx`
  - App orchestration, tool state, pointer workflows
- `packages/editor/src/components/`
  - Sidebar panels, quick-access toolbar, canvas stage, overlay branches, dialogs, help drawer
- `packages/core/src/lib/`
  - Geometry, snapping, spacing, legend, layer filtering, text layout, project calculations
- `packages/editor/src/lib/`
  - Font measurement, annotation hit testing, export, browser files/autosave, telemetry, reporting
- `packages/core/src/model/`
  - Default project creation, schema migration, validation, history transactions
- `packages/editor/src/controllers/pointer/`
  - Pointer event controllers: placement, select, measure, gesture
- `packages/editor/src/hooks/`
  - SolidJS reactive hooks (autosave, PDF renderer, file actions, shortcuts)
- `packages/editor/src/context/`
  - Context providers: AppControllerContext (sidebar), HelpContext (help drawer)
- `packages/core/src/config/` and `packages/editor/src/config/`
  - Domain constants in core; runtime limits and icon registry in editor
- `packages/core/src/types/`
  - TypeScript types (project schema, app runtime)
- `packages/editor/src/help/`
  - User manual source (Markdown), Vite plugin for Markdown-to-HTML build

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
- Keep decorative dividers (`--border`) quieter than control boundaries (`--border-btn`). Shared styles apply to browser and iPad; selected materials also use a checkmark, and disabled controls use explicit colors rather than reducing whole-control opacity.
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

Recommended local validation before merge:

```bash
npm run build
npm test
npm run test:e2e
npm run audit:prod:gate
npm run audit:contrast
```
