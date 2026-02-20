# LP Sketch

LP Sketch is a lightweight lightning protection sketching app. This repository now contains the Milestone 1 foundation implementation from the v1 feature contract.

## Milestone 1 Implemented

- SolidJS + TypeScript app scaffold (Vite).
- Layered drawing surface:
  - PDF background rendered with `pdf.js` on a canvas.
  - SVG overlay for editable lines, symbols, and previews.
- Core project model aligned with `vision/project-schema-v1.json`.
- Project JSON validation with Ajv.
- Single-page PDF import workflow (embedded into project data).
- View controls: pan and wheel zoom.
- Tool foundation:
  - Select/move/delete.
  - Line drawing.
  - Arc drawing (3-point arc through points 1 -> 2 -> 3).
  - Auto-spacing tool (outside/inside corners, open or closed path terminal placement).
  - Symbol stamp (including directional symbols).
  - Legend stamp tool (auto-populated symbol counts with editable labels).
  - Text note tool (place + double-click edit in Select mode).
  - Arrow tool (two-click tail/head placement).
  - Measure path tool (non-drawing, with live distance).
  - Measure & Mark tool (temporary marks with inside-corner input and clear-all marks).
  - Calibrate tool (two-point scale setup).
- Manual scale setup.
- Layer visibility controls:
  - Rooftop / Downleads / Grounding / Annotation visibility toggles.
  - Legend and exports reflect only visible layer content.
- Annotation layer editing:
  - Double-click text, dimension text, or arrow in Select mode to open custom edit dialog.
  - Text + dimension text support content and layer editing.
  - Arrow supports layer editing in the same dialog flow (text input hidden).
- Undo/redo framework.
- Save/load project JSON.
- Export outputs:
  - PNG / JPG flattened image exports.
  - PDF export with drawing overlay.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## E2E Smoke (Playwright)

Install browser binaries once:

```bash
npx playwright install chromium
```

Run smoke tests:

```bash
npm run test:e2e
```

## CI + Node Version

- CI workflow is defined in `.github/workflows/ci.yml`.
- CI uses Node `20` LTS.
- CI gates `build`, `vitest`, and Playwright tests on pull requests.

## Security Audit Commands

```bash
npm run audit:prod
npm run audit:full
npm run audit:prod:gate
npm run audit:contrast
```

## Telemetry Environment Variables

- `VITE_TELEMETRY_ENABLED`: `true`/`false` client telemetry toggle.
- `VITE_TELEMETRY_ENDPOINT`: HTTPS endpoint for redacted client error events.
- `VITE_APP_VERSION`: release/version tag attached to telemetry payloads.
- `VITE_APP_ENV`: deployment environment label (for example: `production`, `staging`).

## Contract + Schema

- Feature contract: `vision/feature-contract-v1.md`
- Validation schema: `vision/project-schema-v1.json`

## Current Notes

- This is the first implementation milestone and not full v1 scope yet.
- Touch long-press + corner-mode fallback are implemented for spacing tools.
- Touch gesture parity now includes pinch zoom and two-finger pan on the canvas.
- Auto-connector v1 is implemented for line-line, line-arc, and endpoint-coincidence nodes.
- Auto-connector deferred intersection types (arc-arc, curve-involved) are tracked in `AUTO_CONNECTOR_TODO.md`.
- Runtime hardening includes:
  - local autosave + startup recovery (`src/hooks/useProjectAutosave.ts`)
  - defensive file import/load limits (`src/config/runtimeLimits.ts`)
  - root runtime error boundary (`src/components/AppErrorBoundary.tsx`)
  - redacted client error telemetry hooks (`src/lib/telemetry.ts`)
- Operations documentation:
  - release + rollback runbook (`docs/release-runbook.md`)
  - production smoke checklist (`docs/prod-smoke-checklist.md`)
  - accessibility audit notes (`docs/accessibility-audit-notes.md`)
  - color contrast audit report (`docs/color-contrast-audit.md`)
  - compatibility/performance hardening notes (`docs/compatibility-performance-hardening.md`)
- Phase 7 hardening includes migration normalization for layer fields and a performance pass:
  - Arc sampling is reused in auto-connector intersection checks.
  - Bounding-box culling is applied before geometric intersection checks.
  - Layer filtering fast-path returns original project when all layers are visible.
- Test coverage now includes:
  - Unit tests (auto-spacing + legend aggregation).
  - Integration tests (save/load roundtrip, spacing->legend pipeline, undo/redo transactions).
  - Export alignment regression tests (canvas draw coordinate checks, mark exclusion, background alignment).
  - UI interaction integration tests (line creation, Alt+click inside-corner flow, touch corner-mode fallback).
