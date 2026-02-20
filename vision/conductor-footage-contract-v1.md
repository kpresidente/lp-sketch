# Conductor Footage Contract v1

Status: Draft implementation contract for Phase 2.

## Scope

1. Compute conductor distances for line, arc, and curve geometry.
2. Include vertical distance inputs for downlead-related symbols.
3. Feed aggregated results into legend `Count` column according to legend contract.

## Geometry Rules

1. Line length: exact Euclidean distance.
2. Arc length: exact from resolved arc geometry.
3. Curve length: adaptive subdivision approximation.
4. Curve approximation target: typically within +/-5%, allowed up to +/-10% on edge geometry.
5. Curve subdivision depth must be capped for interactive performance.

## Precision and Display

1. Accumulate in full precision internally.
2. Render final displayed values as whole feet (`ft`) only.
3. If drawing scale is unset, show `unscaled` in affected legend count cells.

## Vertical Input UI

1. Vertical input opens from near-element popup on double-click.
2. Input accepts feet-only numeric value with 3-digit maximum.
3. Vertical value is shown as construction-only indicator near element.
4. Construction indicator uses snap-color family.
5. If value not entered, indicator displays `0`.
6. Vertical construction indicators are excluded from export output.

## Persistence and Migration

1. Vertical input values must persist in save/load.
2. Schema updates must include migration defaults for legacy project files.

## Acceptance

1. Geometry totals are deterministic for identical project input.
2. Undo/redo updates totals consistently.
3. Export output excludes construction-only indicators.
4. Tests cover mixed geometry, mixed material/class, and unset-scale behavior.
