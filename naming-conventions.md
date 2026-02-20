# Naming Conventions (Phase 12)

## Canonical UI Terms
- `Component`: any placeable symbol/glyph (air terminal, downlead, bond, connector, etc).
- `Conductor`: line/arc/curve paths.
- `Legend`: table showing component and conductor entries.

## Legacy Internal Terms Kept Intentionally
- `symbol` (tool id, selection kind, element collection key) is retained for save/schema compatibility.
- `elements.symbols` remains the persisted project key.

These legacy names are now documented in `src/types/project.ts` and should not be renamed without a schema migration.

## Phase 12 Terminology Alignment Applied
- User-facing labels updated from `Symbol` to `Component` where applicable.
- Empty legend copy updated from `No symbols used yet.` to `No components used yet.` in app overlay and export output.
- Legend tool hint copy updated to refer to component counts.

## Follow-up (Optional, Requires Migration Work)
- Full schema rename from `symbol*` to `component*` if desired in a future major version.
- This would require migration updates, fixture updates, and backward-compat handling for imported projects.
