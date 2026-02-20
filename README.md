# LP Sketch

LP Sketch is a single-page lightning protection sketching app for quickly annotating imported PDF plans and exporting clean handoff documents.

## Quick Start

```bash
npm install
npm run dev
```

## Build and Test

```bash
npm run build
npm test
npm run test:e2e
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

- `vision/project-schema-v1.json`

## Telemetry Environment Variables

- `VITE_TELEMETRY_ENABLED`
- `VITE_TELEMETRY_ENDPOINT`
- `VITE_APP_VERSION`
- `VITE_APP_ENV`
