# Engineering Guide

## Stack

- SolidJS + TypeScript + Vite
- `pdfjs-dist` for background PDF rendering
- SVG overlay for interactive annotation geometry
- `pdf-lib` for flattened PDF export composition
- Ajv for project schema validation

## Architecture

### Render Model

1. PDF page is rendered to canvas.
2. Annotation geometry is rendered in SVG overlay.
3. Export pipelines flatten visible project state to image/PDF.

### Core Modules

- `src/App.tsx`
  - App orchestration, tool state, pointer workflows
- `src/components/`
  - Sidebar panels, quick tools, canvas stage, overlay branches, dialogs
- `src/lib/`
  - Geometry, snapping, spacing, export, legend, telemetry, layer filtering, autosave
- `src/model/`
  - Default project creation, schema migration, validation, history transactions, sync helpers
- `src/config/`
  - Constants, runtime limits, icon registry

## Project Schema and Migration

- Canonical schema: `vision/project-schema-v1.json`
- Runtime validator: `src/model/validation.ts`
- Migration pipeline for legacy compatible payloads: `src/model/migration.ts`

Compatibility guarantees:

- Supported `1.x` projects are normalized before validation.
- Invalid/missing legacy fields are clamped/defaulted to schema-safe values.
- Migration output is deterministic for identical input.

## Reliability and Performance Guarantees

### Runtime Reliability

- Autosave + startup recovery with safe fallback behavior
- Defensive import/load limits (`src/config/runtimeLimits.ts`)
- Root error boundary for graceful failure UI

### Performance

- Arc sampling reuse in auto-connector intersection checks
- Bounding-box culling before expensive geometric intersection checks
- Layer-filter fast path returns original project when all layers are visible

## Accessibility and UX Baseline

- Keyboard-operable critical controls
- Consistent ARIA roles/states for panels/dialogs/status updates
- Focus-visible styles across primary interactive controls
- WCAG AA contrast checks automated by `scripts/contrast-audit.mjs`

## Test Strategy

Primary suites:

- Unit and integration: `npm test`
- E2E smoke: `npm run test:e2e`
- Export regression and wrappers: `src/lib/export.*.test.ts`
- Accessibility semantics: `src/App.accessibility.test.tsx`, dialog semantics tests

Recommended local validation before merge:

```bash
npm run build
npm test
npm run test:e2e
npm run audit:prod:gate
npm run audit:contrast
```

