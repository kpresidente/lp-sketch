# Production Hardening Checklist

Status: `In Progress`

This checklist is intended to be executable and auditable. Each item has a clear gate and status.

## Gate 1: CI Merge Protection

| Status | Item | Pass Criteria | Evidence |
| --- | --- | --- | --- |
| DONE | Add CI workflow for pull requests and pushes | CI runs `build`, unit/integration tests, and Playwright smoke tests on every PR/push to `main` | `.github/workflows/ci.yml` |
| DONE | Publish test artifacts from CI | Failed runs retain Playwright report/screenshots for debugging | `.github/workflows/ci.yml` artifact step |
| PENDING (External) | Document required branch protections | Repo has branch rule requiring CI status checks before merge | `docs/branch-protection.md` + repo settings screenshot |

## Gate 2: Security and Dependency Hygiene

| Status | Item | Pass Criteria | Evidence |
| --- | --- | --- | --- |
| DONE | Establish dependency audit baseline | `npm audit` results captured and triaged into actionable follow-ups | `docs/security-audit-baseline.md` |
| DONE | Add Dependabot updates | Weekly npm and GitHub Actions update PRs configured | `.github/dependabot.yml` |
| DONE | Enforce security checks in CI | CI fails on unapproved high/critical vulnerabilities (policy-driven allowlist if needed) | `.github/workflows/ci.yml`, `scripts/audit-prod-gate.mjs`, `security/audit-allowlist.json` |
| DONE | Pin Node and npm strategy | CI and docs use explicit Node LTS version | `.github/workflows/ci.yml`, `README.md` |

## Gate 3: Export/Rendering Regression Safety

| Status | Item | Pass Criteria | Evidence |
| --- | --- | --- | --- |
| DONE | Golden export regression fixtures | Known-good PNG/PDF snapshots compared in automated checks | `src/lib/export.regression.test.ts`, `src/lib/__snapshots__/export.regression.test.ts.snap` |
| DONE | Rotated/cropped PDF export coverage | Automated checks include rotated source PDF alignment cases | `src/lib/export.wrappers.test.ts` |

## Gate 4: Runtime Reliability

| Status | Item | Pass Criteria | Evidence |
| --- | --- | --- | --- |
| DONE | Autosave and recovery flow | Reload after crash/tab close offers recoverable draft | `src/hooks/useProjectAutosave.ts`, `src/lib/autosave.ts`, `src/hooks/useProjectAutosave.test.tsx`, `docs/runtime-reliability.md` |
| DONE | Defensive input limits | PDF/project import size/page limits validated with user-facing errors | `src/hooks/useProjectFileActions.ts`, `src/config/runtimeLimits.ts`, `src/App.file-actions.test.tsx` |
| DONE | Graceful failure boundaries | Unexpected runtime errors surface non-destructive recovery UI | `src/components/AppErrorBoundary.tsx`, `src/components/AppErrorBoundary.test.tsx`, `src/index.tsx` |

## Gate 5: Observability and Operations

| Status | Item | Pass Criteria | Evidence |
| --- | --- | --- | --- |
| DONE | Client error telemetry (redacted) | Production errors captured with release/version tags, no sensitive payloads | `src/lib/telemetry.ts`, `src/lib/telemetry.test.ts`, `src/index.tsx`, `src/components/AppErrorBoundary.tsx` |
| DONE | Release checklist and rollback | Versioning, changelog, and rollback steps are documented and rehearsed | `docs/release-runbook.md` |
| DONE | Post-release smoke protocol | Repeatable manual smoke script for production deploys | `docs/prod-smoke-checklist.md` |

## Gate 6: Accessibility and UX Compliance

| Status | Item | Pass Criteria | Evidence |
| --- | --- | --- | --- |
| DONE | Keyboard accessibility sweep | Core workflows are keyboard-operable and focus-visible | `docs/accessibility-audit-notes.md`, `src/App.accessibility.test.tsx` |
| DONE | Screen-reader semantics review | Critical controls have consistent roles/labels/states | `docs/accessibility-audit-notes.md`, `src/components/dialogs/DialogSemantics.test.tsx`, `src/App.behavior.test.tsx` |
| DONE | Color contrast verification | UI meets target contrast ratios | `scripts/contrast-audit.mjs`, `docs/color-contrast-audit.md` |

## Gate 7: Data Compatibility and Runtime Performance

| Status | Item | Pass Criteria | Evidence |
| --- | --- | --- | --- |
| DONE | Migration normalization for modern layer/config fields | Legacy `1.x` payloads normalize invalid/missing layer and settings fields before schema validation, with deterministic output | `src/model/migration.ts`, `src/model/migration.test.ts` |
| DONE | Auto-connector intersection performance pass | Arc sampling is reused and bounds culling is applied before line/arc intersection checks | `src/lib/autoConnectors.ts`, `src/lib/autoConnectors.test.ts` |
| DONE | Visible-layer filtering fast path | Filtering returns original project reference when all layers are visible to avoid allocation churn on hot paths | `src/lib/layers.ts`, `src/lib/layers.test.ts` |

## Execution Log

| Date | Update |
| --- | --- |
| 2026-02-19 | Checklist created. Execution started with CI and security baseline tasks. |
| 2026-02-19 | Implemented CI workflow and artifact upload, added Dependabot config, captured npm audit baseline, documented Node/CI strategy. |
| 2026-02-19 | Added audit policy gate script, wired CI to fail on unallowlisted high/critical vulnerabilities, and refreshed security baseline after `ajv` upgrade. |
| 2026-02-19 | Added branch protection runbook (`docs/branch-protection.md`); applying/verifying branch rule remains an external repository-admin action. |
| 2026-02-19 | Added export regression snapshot fixtures and expanded wrapper tests to cover both rotated and crop-offset PDF geometry fallback paths. |
| 2026-02-19 | Completed Gate 4 runtime hardening: autosave/recovery, defensive import/load limits, and root runtime error boundary with focused test coverage and docs. |
| 2026-02-19 | Completed Gate 5 observability/operations: redacted client telemetry wiring (boundary + global listeners), release runbook, and production smoke checklist. |
| 2026-02-19 | Completed Gate 6 accessibility/UX compliance: keyboard + semantics pass, focus-visible reinforcement, and scripted WCAG contrast audit with documentation. |
| 2026-02-19 | Completed Gate 7 compatibility/performance hardening: migration normalization coverage, auto-connector intersection culling/sampling reuse, and visible-layer fast-path verification. |
