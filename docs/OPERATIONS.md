# Operations Guide

## CI and Merge Policy

- CI workflow: `.github/workflows/ci.yml`
- Required CI jobs:
  - `Validate` (build + unit tests + prod audit gate)
  - `E2E` (Chromium, depends on Validate)
- Branch protection target: `main`

Required branch settings:

1. Pull request required before merge
2. Required status checks enabled (`Validate`, `E2E`)
3. Branch must be up to date before merge (`strict`)
4. Force pushes disabled
5. Deletions disabled

## Dependency Automation

- Dependabot: `.github/dependabot.yml`
  - npm updates: weekly, max 10 open PRs, prefix `deps`
  - GitHub Actions updates: weekly, max 5 open PRs, prefix `ci`

## Release Process

### Pre-release

1. Sync latest `main`.
2. Run:
   - `npm run build`
   - `npm test`
   - `npm run test:e2e`
   - `npm run audit:prod:gate`
   - `npm run audit:contrast`
3. Confirm telemetry env vars for target environment.
4. Tag/version release commit.

### Deploy

- Hosting: Azure Static Web Apps (`.github/workflows/azure-static-web-apps-*.yml`)
- Automatic deploy on push to `main`; staging environments on PRs.
- Post-deploy: execute smoke checks (below) and monitor telemetry for at least 30 minutes.

### Rollback

1. Declare rollback decision and timestamp.
2. Re-deploy previous known-good artifact/tag.
3. Re-run smoke checks.
4. Record incident details and follow-up owner.

## Smoke Checklist (Post-deploy)

1. App opens with no blocking console/runtime errors.
2. PDF import works (single and multi-page).
3. Core tools function: line, arc, curve, symbols, select, pan.
4. Snapping and selection handles behave as expected.
5. Save/load project works.
6. Export PNG/JPG/PDF works and alignment is correct.
7. Construction-only visuals are excluded from export.
8. Page navigation works for multi-page PDFs.
9. Help drawer opens and navigates sections.

## Security and Dependency Hygiene

Audit commands:

```bash
npm run audit:prod         # Prod-only advisory listing
npm run audit:full         # All dependencies
npm run audit:prod:gate    # CI gate (fails on unapproved high/critical)
```

Policy:

- CI fails on unapproved high/critical production vulnerabilities.
- Allowlist exceptions tracked in `security/audit-allowlist.json`.
- Re-run baseline audit after dependency graph changes.

## Telemetry

Environment variables:

- `VITE_TELEMETRY_ENABLED` — boolean (accepts `1`, `true`, `yes`, `on`)
- `VITE_TELEMETRY_ENDPOINT` — URL for event submission
- `VITE_APP_VERSION` — release identifier (defaults to `dev`)
- `VITE_APP_ENV` — environment label (defaults to Vite mode)

Rules:

- Client telemetry events are redacted (emails, tokens, long numbers, URLs).
- Transport: `navigator.sendBeacon()` with `fetch` keepalive fallback.
- Release/version metadata attached to all production events.

## User Reporting

- In-app bug/feature reporting via `src/lib/reporting.ts`.
- Submits to `/api/report` endpoint with title, description, and project summary metadata.
- No PDF or drawing data included by default.

## Scripts Reference

```bash
npm run dev              # Vite dev server
npm run build            # TypeScript check + Vite build
npm run preview          # Preview production build
npm test                 # Vitest unit/integration
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with coverage report
npm run test:e2e         # Playwright e2e (Chromium)
npm run test:e2e:headed  # Playwright e2e (headed, for debugging)
npm run audit:prod       # npm audit (prod only)
npm run audit:full       # npm audit (all)
npm run audit:prod:gate  # Policy gate (CI)
npm run audit:contrast   # WCAG AA contrast check
```
