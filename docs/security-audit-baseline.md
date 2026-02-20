# Security Audit Baseline

Date: `2026-02-19`

## Commands Executed

- `npm audit --omit=dev --json`
- `npm audit --json`
- `npm run audit:prod:gate`

## Summary

- Total vulnerabilities: `9`
- Critical: `0`
- High: `9`
- Moderate: `0`
- Low: `0`

## Direct Dependency Findings

1. `ajv` (moderate) - resolved
   - Advisory: GHSA-2g4f-4pwh-qvx6
   - Remediation applied: upgraded to `^8.18.0`
   - Current status: no moderate vulnerabilities reported from `ajv`.

2. `@tabler/icons-webfont` (high, transitive chain through `svgtofont`/`ttf2woff2`)
   - Reported by audit as affecting current installed chain.
   - Current handling: tracked allowlist in `security/audit-allowlist.json`, enforced by CI policy gate.
   - Action: evaluate upgrade/downgrade path and consider replacing webfont package with safer icon delivery strategy if needed.

## Transitive Findings (Current Snapshot)

- `svgtofont`
- `ttf2woff2`
- `node-gyp`
- `make-fetch-happen`
- `cacache`
- `glob`
- `minimatch`
- `tar`

## Risk Notes

- Security policy gate is active in CI via `npm run audit:prod:gate`.
- CI fails for any unallowlisted `high` or `critical` production vulnerability.

## Next Actions

1. Triage `@tabler/icons-webfont` chain and choose remediation path to retire allowlist entries.
2. Re-run and refresh this baseline whenever dependency graph changes materially.
