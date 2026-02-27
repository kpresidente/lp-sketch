# LP Sketch

Lightning protection design sketch tool. Users draw annotations over a locked PDF and export flattened results for CAD handoff.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build
npm test             # Vitest unit/integration tests
npm run test:e2e     # Playwright e2e (Chromium)
npm run audit:prod:gate  # npm audit policy gate (prod deps only)
npm run audit:contrast   # WCAG AA contrast check
```

Validate before merge: `npm run build && npm test && npm run test:e2e`

## Stack

- SolidJS + TypeScript + Vite
- SVG overlay for annotation geometry
- pdfjs-dist (background PDF rendering), pdf-lib (flattened PDF export)
- Kobalte (accessible UI primitives), Tabler Icons (webfont)
- Ajv (project schema validation)
- Vitest (unit/integration), Playwright (e2e)

## Architecture

- `src/App.tsx` — App orchestration, tool state, pointer workflows
- `src/components/` — UI: sidebar panels, canvas stage, overlay branches, dialogs
- `src/lib/` — Pure logic: geometry, snapping, spacing, export, legend, layers, autosave
- `src/model/` — Project state: schema validation, migration, history, sync
- `src/controllers/` — Pointer event controllers
- `src/hooks/` — SolidJS reactive hooks (autosave, PDF renderer, dialogs, shortcuts)
- `src/context/` — Context providers (app controller, help drawer)
- `src/config/` — Constants, runtime limits, icon registry
- `src/types/` — TypeScript types (project schema, app runtime)
- `src/help/` — User manual source and Vite build plugin

## Conventions

- SolidJS reactive patterns: signals, stores, createEffect, createMemo
- Prefer fine-grained reactivity over re-renders
- Pure logic in `src/lib/`, reactive wrappers in `src/hooks/`
- Tests co-located with source files (`foo.test.ts` next to `foo.ts`)
- Domain colors: green=Copper, blue=Aluminum, red=Grounding, purple=Bimetallic, cyan=Tinned
- Layers: rooftop, downleads, grounding, annotation

## Documentation

- [docs/ENGINEERING.md](docs/ENGINEERING.md) — Detailed architecture and test strategy
- [docs/PRODUCT.md](docs/PRODUCT.md) — Product spec and domain conventions
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — CI, deployment, release, and security policy
