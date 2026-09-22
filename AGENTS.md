# LP Sketch

Lightning protection design sketch tool. Users draw annotations over a locked PDF and export flattened results for CAD handoff.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build
npm run typecheck    # Check shared packages and browser app
npm run mobile:build # TypeScript check + bundled mobile interface
npm run mobile:sync  # Build mobile interface and sync Capacitor iOS assets
npm run test:ios-config # Python signing-input/profile validation tests
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

The repository uses npm workspaces. Run development, build, test, and audit commands from the repository root.

- `apps/web/` — Browser entry point, static public assets, Vite configuration
- `apps/mobile/` — Capacitor iPad entry point, bundled assets, and native Xcode project
- `packages/core/src/model/` — Project schema, validation, migration, history, sync
- `packages/core/src/types/` — Shared project and interaction types
- `packages/core/src/lib/` — Pure geometry, snapping, spacing, legend, layers, and project calculations
- `packages/editor/src/App.tsx` — Shared editor orchestration, tool state, pointer workflows
- `packages/editor/src/components/` — Properties bar, quick-access rail, overlays, dialogs, help drawer
- `packages/editor/src/controllers/` — Pointer event controllers
- `packages/editor/src/shells/` — Shell registry, `ShellHost`, the Tempered shell (default) and the Classic shell (its panels compose the same blocks); a shell places blocks and never defines behavior
- `packages/editor/src/blocks/` — The block components (tool groups, pickers, project actions, readouts, status) and the registry of blocks every shell must mount or waive
- `packages/editor/src/testing/` — Test helpers for behavior suites, such as the shell-aware `screen` that reveals a control's sidebar tab
- `packages/editor/src/themes/` — Theme registry, token stylesheets (`light.css` is the complete set; `dark.css` and `hivis.css` override it, including rule weight and radii), and bundled fonts; every theme passes `npm run audit:contrast`
- `packages/editor/src/hooks/` — SolidJS reactive hooks
- `packages/editor/src/lib/` — Browser-dependent rendering helpers, exports, autosave, file handling, reporting
- `packages/editor/src/workspace/` — Drawing stage component and shared canvas export renderer
- `packages/editor/src/context/` and `config/` — Providers, runtime limits, icon registry
- `packages/editor/src/help/` — Shared manual and help build plugin
- `api/` — Existing browser reporting API
- `scripts/ios/` — Native build/signing scripts and Windows certificate helpers

Native builds use the shared `App` Xcode scheme and Swift Package Manager. Keep Apple signing material out of source control. TestFlight uploads are manual; unsigned PR validation needs no Apple credentials. See `docs/TESTFLIGHT.md`.

Applications consume `@lp-sketch/editor`; the editor consumes `@lp-sketch/core`. Use package exports across workspace boundaries. Core must not depend on editor, applications, SolidJS, or Capacitor. Preserve the shared project format. Existing browser storage and file hooks remain in editor until platform services are introduced with the mobile implementation.

## Conventions

- SolidJS reactive patterns: signals, stores, createEffect, createMemo
- Prefer fine-grained reactivity over re-renders
- Pure domain logic in `packages/core/src/lib/`, reactive wrappers in `packages/editor/src/hooks/`
- Tests co-located with source files (`foo.test.ts` next to `foo.ts`)
- Domain colors: green=Copper, blue=Aluminum, red=Grounding, purple=Bimetallic, cyan=Tinned
- Layers: rooftop, downleads, grounding, annotation

## Documentation

- [docs/ENGINEERING.md](docs/ENGINEERING.md) — Detailed architecture and test strategy
- [docs/PRODUCT.md](docs/PRODUCT.md) — Product spec and domain conventions
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — CI, deployment, release, and security policy
