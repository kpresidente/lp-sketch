# Engineering Guide

## Stack

- SolidJS + TypeScript + Vite
- `pdfjs-dist` for background PDF rendering (shared worker, single instance)
- SVG overlay for interactive annotation geometry
- `pdf-lib` for flattened PDF export composition
- Kobalte for accessible UI primitives, Tabler Icons (webfont)
- Ajv for project schema validation

## Architecture

### Render Model

1. PDF page is rendered to an off-screen canvas via a shared PDF.js worker.
2. Annotation geometry is rendered in SVG overlays (one per element type).
3. Export pipelines flatten visible project state to image or PDF.

### Core Modules

- `src/App.tsx`
  - App orchestration, tool state, pointer workflows
- `src/components/`
  - Sidebar panels, quick-access toolbar, canvas stage, overlay branches, dialogs, help drawer
- `src/lib/`
  - Geometry, snapping, spacing, export, legend, telemetry, reporting, layer filtering, text layout
- `src/model/`
  - Default project creation, schema migration, validation, history transactions
- `src/controllers/pointer/`
  - Pointer event controllers: placement, select, measure, gesture
- `src/hooks/`
  - SolidJS reactive hooks (autosave, PDF renderer, file actions, shortcuts)
- `src/context/`
  - Context providers: AppControllerContext (sidebar), HelpContext (help drawer)
- `src/config/`
  - Constants, runtime limits, icon registry
- `src/types/`
  - TypeScript types (project schema, app runtime)
- `src/help/`
  - User manual source (Markdown), Vite plugin for Markdown-to-HTML build

## Project Schema and Migration

- Canonical schema: `src/model/project-schema-v1.json`
- Current schema version: 1.9.0
- Runtime validator: `src/model/validation.ts`
- Migration pipeline: `src/model/migration.ts`

Compatibility guarantees:

- Supported `1.x` projects are normalized before validation.
- Invalid/missing legacy fields are clamped/defaulted to schema-safe values.
- Migration output is deterministic for identical input.
- Multi-page structures (per-page view, scale, brightness) are auto-normalized.

## Reliability and Performance

### Runtime Reliability

- Autosave + startup recovery with safe fallback behavior
- Defensive import/load limits (`src/config/runtimeLimits.ts`)
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
- WCAG AA contrast checks automated by `scripts/contrast-audit.mjs` (11 color pairs)

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

- Unit and integration: `npm test` (Vitest, node environment)
- E2E: `npm run test:e2e` (Playwright, Chromium)
- Export regression: `src/lib/export.regression.test.ts` with snapshots
- Coverage thresholds: 30% lines/functions/statements, 25% branches

Recommended local validation before merge:

```bash
npm run build
npm test
npm run test:e2e
npm run audit:prod:gate
npm run audit:contrast
```
