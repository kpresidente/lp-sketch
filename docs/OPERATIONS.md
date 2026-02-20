# Operations Guide

## CI and Merge Policy

- CI workflow: `.github/workflows/ci.yml`
- Required CI jobs:
  - `Build + Unit`
  - `E2E (Chromium)`
- Branch protection target: `main`

Required branch settings:

1. Pull request required before merge
2. Required status checks enabled (`Build + Unit`, `E2E (Chromium)`)
3. Branch must be up to date before merge (`strict`)
4. Force pushes disabled
5. Deletions disabled

Current repository protection status: configure in GitHub branch protection/rulesets for `main`.

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

1. Build production artifacts.
2. Deploy to hosting target.
3. Execute smoke checks (below).
4. Monitor telemetry and error rates for at least 30 minutes.

### Rollback

1. Declare rollback decision and timestamp.
2. Re-deploy previous known-good artifact/tag.
3. Re-run smoke checks.
4. Record incident details and follow-up owner.

## Smoke Checklist (Post-deploy)

1. App opens with no blocking console/runtime errors.
2. PDF import works.
3. Core tools function: line, arc, curve, symbols, select, pan.
4. Snapping and selection handles behave as expected.
5. Save/load project works.
6. Export PNG/JPG/PDF works and alignment is correct.
7. Construction-only visuals are excluded from export.
8. Key quick-tools/sidebar controls are present and responsive.

## Security and Dependency Hygiene

Audit commands:

```bash
npm run audit:prod
npm run audit:full
npm run audit:prod:gate
```

Policy:

- CI must fail on unapproved high/critical production vulnerabilities.
- Allowlist exceptions are tracked in `security/audit-allowlist.json`.
- Re-run baseline audit after dependency graph changes.

## Telemetry

Environment variables:

- `VITE_TELEMETRY_ENABLED`
- `VITE_TELEMETRY_ENDPOINT`
- `VITE_APP_VERSION`
- `VITE_APP_ENV`

Rules:

- Client telemetry events must be redacted.
- Release/version metadata must be attached to production events.
