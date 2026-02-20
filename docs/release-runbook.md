# Release Runbook

This runbook defines the minimum release + rollback workflow for LP Sketch.

## Scope

- Frontend app bundle release.
- Static host deployment (single artifact).
- Covers normal deploy and emergency rollback.

## Pre-Release Checklist

1. Sync latest `main` locally.
2. Verify no pending hardening gates block release.
3. Run required quality gates:
   - `npm run build`
   - `npm test`
   - `npm run test:e2e`
   - `npm run audit:prod:gate`
4. Confirm telemetry configuration for target environment:
   - `VITE_TELEMETRY_ENABLED`
   - `VITE_TELEMETRY_ENDPOINT`
   - `VITE_APP_VERSION`
   - `VITE_APP_ENV`
5. Update release notes/changelog with user-facing changes.
6. Set release version (semver) and tag the commit.

## Release Procedure

1. Create release branch/tag from `main`.
2. Build production artifact:
   - `npm ci`
   - `npm run build`
3. Deploy artifact to production target.
4. Execute `docs/prod-smoke-checklist.md`.
5. Monitor telemetry/errors for first 30-60 minutes.
6. If stable, mark release complete.

## Rollback Procedure

1. Declare rollback decision (owner + timestamp).
2. Re-deploy previous known-good artifact/version tag.
3. Run smoke checklist again on rolled-back version.
4. Validate telemetry error rate returns to baseline.
5. Document incident:
   - trigger
   - impact window
   - rollback version
   - follow-up fix owner

## Release Record Template

- Version:
- Commit/tag:
- Deployed by:
- Deploy time:
- Smoke result:
- Rollback needed: yes/no
- Notes:
