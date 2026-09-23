# Operations Guide

## CI and Merge Policy

- CI workflow: `.github/workflows/ci.yml`
- CI jobs:
  - `Build + Unit` (build + unit tests + prod audit gate)
  - `E2E (Chromium)` (depends on Build + Unit)
  - `Build + Test` (required aggregate check; passes only when both jobs succeed)
- Branch protection target: `main`

Required branch settings:

1. Pull request required before merge
2. Required status checks enabled (`Build + Test`)
3. Branch must be up to date before merge (`strict`)
4. Force pushes disabled
5. Deletions disabled

## Dependency Automation

- Development and CI use Node 24, at least 24.15 (jsdom 30 declares that floor). Capacitor CLI requires Node 22 or newer.
- The root `xcode → uuid` override pins `uuid` to `11.1.1` for GHSA-w5hq-g745-h8pq. Capacitor's CLI uses xcode's UUID v4 generation, which remains compatible. Remove the scoped override when upstream adopts a patched version.

- Dependabot: `.github/dependabot.yml`
  - npm updates: weekly, max 10 open PRs, prefix `deps`. Grouped: `vitest` with `@vitest/*` (they pin each other as peers), and every minor and patch bump in one PR. Major bumps get a PR each, so one breaking upgrade never blocks the rest.
  - GitHub Actions updates: weekly, max 5 open PRs, prefix `ci`, one grouped PR.
  - Dependabot's workflow runs cannot read repository secrets, so the Azure workflow builds its PRs without deploying them (`skip_deploy_on_missing_secrets`) and skips the close job when Dependabot closes a PR itself.
- `pdfjs-dist` is pinned exactly (`6.3.289`), not given a caret range. [GHSA-hq66-cqwq-w95j](https://github.com/advisories/GHSA-hq66-cqwq-w95j) (CVE-2026-16633) affects `>= 5.6.83, < 6.2.108`, and the pin sits past the patched `6.2.108`. Keep the exact pin so every bump is a deliberate step: run the full validation and import a PDF in the browser before moving it. pdf.js 6 names Chrome 125 and Safari 18 as its minimum browsers, which is newer than the iPad build's iOS 15 deployment target.
- `jsdom` must stay at 30.1.1 or newer. 30.1.0 fires a spurious window `blur` when an element is focused after the previously focused element was removed, which is exactly what testing-library's cleanup followed by the next test's stage focus does. The App's window `blur` listener then resets the pen input guard, and two pen-and-touch suppression tests in `App.interaction.test.tsx` fail.

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
- Build from the repository root: npm installs all workspaces and `npm run build` builds `apps/web` into root `dist/`. Keep `app_location: "/"`, `api_location: "api"`, and `output_location: "dist"` in the deployment workflow.
- Browser environment files remain at the repository root; mobile environment files live in `apps/mobile`. Mobile builds are separate from browser deployment. See [TestFlight setup](TESTFLIGHT.md) for iOS build and signing instructions.
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
- Telemetry covers both uncaught runtime failures and selected handled operational failures such as project load/import, autosave, and export errors.

## User Reporting

- In-app bug/feature reporting via `packages/editor/src/lib/reporting.ts`.
- Submits to `/api/report` endpoint with title, description, and project summary metadata.
- No PDF or drawing data included by default.

## Scripts Reference

```bash
npm run dev              # Vite dev server
npm run build            # TypeScript check + Vite build
npm run typecheck        # Shared packages, browser app, and build/test configuration
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
