# LP Sketch

LP Sketch is a single-page lightning protection sketching app for quickly annotating imported PDF plans and exporting clean handoff documents.

## Workspace Structure

This repository uses npm workspaces. Run the commands below from the repository root.

| Workspace | Responsibility |
| --- | --- |
| [`apps/web`](apps/web/README.md) | Working browser application, static assets, and Vite build |
| [`apps/mobile`](apps/mobile/README.md) | Capacitor iPad application and native Xcode project |
| [`packages/core`](packages/core/README.md) | Shared project format, validation, migration, history, geometry, and snapping |
| [`packages/editor`](packages/editor/README.md) | Shared SolidJS editor, drawing tools, PDF rendering, and exports |

Both applications depend on the shared editor, and the editor depends on core. The browser build remains at the root `dist/` path, and the reporting API remains in `api/`. The mobile application bundles its own assets. See [the TestFlight guide](docs/TESTFLIGHT.md) for the first iPad installation.

## Quick Start

```bash
npm install
npm run dev
```

## Build and Test

```bash
npm run build
npm run typecheck
npm test
npm run test:e2e
npm run mobile:build
npm run mobile:sync
npm run test:ios-config
```

Install Playwright browser binaries once:

```bash
npx playwright install chromium
```

## Audit Commands

```bash
npm run audit:prod
npm run audit:full
npm run audit:prod:gate
npm run audit:contrast
```

## Documentation

- Product behavior and scope: `docs/PRODUCT.md`
- Engineering architecture and quality guarantees: `docs/ENGINEERING.md`
- CI/release/security/branch policy operations: `docs/OPERATIONS.md`
- Documentation index: `docs/README.md`

## Schema

The canonical project schema used by runtime validation is:

- `packages/core/src/model/project-schema-v1.json`

## Telemetry Environment Variables

Environment files such as `.env.local` remain at the repository root.

- `VITE_TELEMETRY_ENABLED`
- `VITE_TELEMETRY_ENDPOINT`
- `VITE_APP_VERSION`
- `VITE_APP_ENV`
