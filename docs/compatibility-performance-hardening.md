# Compatibility and Performance Hardening Notes

Date: `2026-02-19`

This document records Gate 7 hardening focused on schema compatibility and geometry-runtime performance paths.

## 1) Migration Normalization Coverage

- Project load migration accepts supported `1.x` payloads and normalizes legacy/invalid values to schema-safe equivalents.
- Normalized areas include:
  - layer visibility map defaults/invalid values
  - annotation element layer fields (`texts`, `arrows`, `dimensionTexts`)
  - auto-connector settings and symbol metadata
  - PDF brightness clamping
- Migration output is deterministic for identical input payloads.

### Files

- `src/model/migration.ts`
- `src/model/migration.test.ts`

## 2) Auto-Connector Geometry Performance

- Arc-to-line intersection logic reuses a single sampled polyline per arc rather than re-sampling repeatedly.
- Bounding-box overlap checks run before expensive segment intersection checks.
- Node clustering and branch-count logic are retained for connector correctness while reducing unnecessary geometric work.

### Files

- `src/lib/autoConnectors.ts`
- `src/lib/autoConnectors.test.ts`

## 3) Layer-Filtering Fast Path

- Rendering/export layer filtering returns the original project reference when all layers are visible.
- This avoids avoidable clones and array filtering allocations on the common "all layers enabled" path.

### Files

- `src/lib/layers.ts`
- `src/lib/layers.test.ts`

## Validation Commands

- `npx vitest run src/model/migration.test.ts src/lib/autoConnectors.test.ts src/lib/layers.test.ts`

