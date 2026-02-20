# Legend Contract v2

Status: Draft implementation contract for next legend refactor.

## Table Format

Legend uses a 3-column table:

1. `Symbol`
2. `Description`
3. `Count`

## Ordering

1. Conductor footage section appears first.
2. Remaining rows are grouped by material type (`Copper`, `Aluminum`, `Grounding`, `Bimetallic`, `Tinned`).
3. Within each material group, rows follow sidebar component order (left-to-right, top-to-bottom).
4. Same-symbol class variants stack above/below one another.

## Count Rules

1. Display units for conductor footage are feet (`ft`) only.
2. Displayed values are whole numbers (no decimals).
3. If drawing scale is unset, affected conductor count entries show `unscaled`.

## Label Rules

1. Custom labels use `system prefix + user suffix`.
2. Prefix includes known fields (minimum class and material).
3. User suffix max length is `24` characters.

## Visibility Rules

1. Construction-only indicators/marks are excluded from legend.
2. Auto-layer visibility filtering applies where layer mode is active.

## Acceptance

1. Legend order is deterministic for same project data.
2. Material grouping and sidebar-order sorting are stable across save/load.
3. `unscaled` appears only when scale is unset and only in affected rows.
