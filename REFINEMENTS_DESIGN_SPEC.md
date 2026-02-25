# LP Sketch Refinements Design Spec (Draft v1)

Date: 2026-02-25
Status: Draft with resolved scope decisions
Scope: User-provided refinement backlog (22 items)

## Objectives

1. Fix editing UX regressions (focus loss, dimension label alignment).
2. Rework auto-connectors from display-regeneration behavior to true placement behavior.
3. Align connector/downlead/ground-rod symbols with intended drafting semantics.
4. Improve discoverability and guardrails (disabled reasons, tool guidance, slider affordance).
5. Define a practical v1 for bug/feature reporting with lightweight backend storage.

## Visual References

1. `dim-horizontal-current.png`
2. `dim-horiontal-proper.png`
3. `dim-vertical-current.png`
4. `dim-vertical-proper.png`
5. `extra-white-space.png`
6. `crossrun-connector.png`
7. `class-2-gr.png`
8. `annotation-subsection.png`
9. `connection-subsection.png`
10. `drawing-scale.png`

## Proposed Changes

### 1) Legend/Notes input focus loss

Problem:
Typing in legend and notes editors drops focus after each keypress.

Root cause (likely):
Rows are recreated during reactive updates, so active input elements remount.

Design:
1. General notes editor: switch row rendering to index-stable iteration for input rows.
2. Legend labels editor: stop rebuilding row structure on each keystroke; maintain stable row list for the active edit session.
3. Preserve cursor and focus through updates.

Acceptance:
1. Typing continuously in any legend/notes input keeps focus.
2. Caret position stays stable during typing.

### 2) Dimension text centering and right-side whitespace

Problem:
1. Dimension label placement is off-center.
2. The label block includes extra empty width on the right side (see `extra-white-space.png`).

Design:
1. Interpret dimension label anchor point as text center, not left edge.
2. Render dimension text with centered horizontal anchoring.
3. Replace character-count approximation for dimension-label width with rendered text measurement for this tool path.
4. Update bar-gap geometry to use centered label anchor and measured label width.
5. Update selection box/hit-test geometry to the same centered + measured model.
6. Keep behavior consistent in both overlay and export.

Acceptance:
1. Horizontal dimensions match `dim-horiontal-proper.png` behavior.
2. Vertical dimensions match `dim-vertical-proper.png` behavior.
3. No extra right-side whitespace in label box/gap geometry.
4. Gap around text is symmetric within visual tolerance.

### 3) Auto-connectors behavior (core redesign)

Problem:
Auto-connectors currently behave like generated display overlays, not independently placed components.

Target behavior:
When auto-connector mode is enabled, drawing a conductor that creates a qualifying intersection adds connector symbols as normal symbol elements.

Design:
1. Remove global regeneration model for auto-connectors.
2. On conductor placement commit, compute intersections between new segment and existing geometry on the same page.
3. Geometry scope in v1 includes lines, arcs, and curves immediately.
4. For each qualifying node:
   - classify junction type (`T` vs `+`)
   - resolve connector material and class
   - place connector symbol as a normal symbol element
   - deduplicate near-existing connectors.
5. Toggle semantics:
   - `ON`: create new connectors during future draw actions
   - `OFF`: stop creating new connectors
   - existing connectors remain.

Acceptance:
1. Turning off auto-connector no longer deletes existing connectors.
2. New intersections create individual connector symbols immediately after line placement.
3. Manual and auto-created connectors behave identically in selection/move/export.

### 4) Swap conduit vs surface downlead glyph mappings

Target:
1. Conduit-to-ground and conduit-to-roof use chevrons inside squares.
2. Surface-to-ground and surface-to-roof use chevrons inside circles.

Design:
1. Swap shape assignments in overlay glyph renderer.
2. Swap corresponding export renderer symbols.
3. Update sidebar button icon mapping for consistency.

Acceptance:
1. Button icon, overlay symbol, and export symbol all match the same mapping.

### 5) Disable scale-required tools when drawing scale is unset

Design:
1. Add centralized disable-reason resolver for tools/components.
2. For scale-required tools, disable when current page scale is unset.
3. Tooltip message includes reason: requires scale.

Initial scale-required scope:
1. `linear_auto_spacing`
2. `arc_auto_spacing`
3. `measure`
4. `measure_mark`
5. `dimension_text`

Note:
Native `title` tooltips cannot style text color. Red tooltip text requires a custom tooltip component.

Acceptance:
1. Tools are non-clickable while unscaled.
2. Tooltip clearly states why.

### 6) Extend disabled-tooltip reasons for all disabled tools

Design:
1. Use one resolver that can return multiple reasons:
   - scale unset
   - material incompatibility
   - feature state dependency.
2. Tooltip format: `Disabled: <reason>`.

Acceptance:
1. Every disabled tool/component has an explicit reason in tooltip text.

### 7) Cadweld connector symbol update

Target:
Cadweld connector becomes a small square matching the mechanical connector size exactly.

Design:
1. Replace current cadweld glyph with small square variant.
2. Class behavior:
   - Class I: outlined small square
   - Class II: filled small square.
3. Square dimensions must match mechanical connector diameter one-to-one:
   - cadweld square side length = mechanical connector circle diameter at the same annotation scale.
4. Keep placement/hit area consistent with existing connector behavior.

Acceptance:
1. Cadweld appears as small square in overlay/export/legend and component button.
2. At equal scale, cadweld and mechanical connector occupy equal visual footprint.

### 8) New connector symbols: crossrun variants

Add symbol types:
1. `mechanical_crossrun_connection`
2. `cadweld_crossrun_connection`

Visual design:
1. Mechanical crossrun: small connector-sized circle inside air-terminal-sized circle.
2. Cadweld crossrun: square-inside-square equivalent.

Design:
1. Add symbol types to schema/types/layer mapping/legend mapping/icon registry.
2. Add overlay glyphs and export render paths.
3. Add component buttons under Connections.

Acceptance:
1. Both new connectors are placeable manually and appear correctly in overlay/export/legend.

### 9) Auto-connectors use crossrun at `+`, regular at `T`

Design:
1. Junction classification:
   - `T` node: 3 branch contributions
   - `+` node: 4+ branch contributions with through-branches.
2. Symbol selection:
   - auto type `mechanical`:
     - `T` -> `cable_to_cable_connection`
     - `+` -> `mechanical_crossrun_connection`
   - auto type `cadweld`:
     - `T` -> `cadweld_connection`
     - `+` -> `cadweld_crossrun_connection`

Acceptance:
1. `T` and `+` intersections receive different connector families as specified.

### 10) Ground rod class-2 symbol redesign

Target:
Remove diamond class marker. Class 2 uses a fourth horizontal bar (per `class-2-gr.png`).

Design:
1. Ground rod glyph:
   - Class I: 3 horizontal bars
   - Class II: 4 horizontal bars
2. Remove mixed-class indicator logic tied to ground rod class labels.

Acceptance:
1. Ground rod class distinction is purely via 3-bar vs 4-bar geometry.

### 11) Tinned (`cyan`) material cleanup

Current state:
`cyan` still exists in types/legend/auto-connector resolution.

Recommended v1 approach (safe pre-release):
1. Remove `cyan` from active material/runtime domains (types, settings, connector resolution output, and legend material ordering).
2. Remove UI references to tinned.
3. Migration path for legacy project data:
   - map legacy `cyan` materials to `green` during load migration
   - persist only non-`cyan` values after save.

Acceptance:
1. Runtime and saved data no longer contain `cyan`.
2. Legacy projects with `cyan` migrate deterministically and load successfully.

### 12) Linear conductor live distance counter

Target:
While drawing linear conductors, show live distance feedback similar to measurement tools.

Design:
1. Show current segment distance in properties bar after first click.
2. In continuous mode, also show running path total.
3. If unscaled, show `unscaled` state instead of computed feet.

Acceptance:
1. Counter updates in real time during pointer move.
2. Values reset correctly when line operation resets/completes.

### 13) Bug/feature reporting (simple file-based)

Recommended v1:
1. Add `Report` action in sidebar.
2. Open lightweight dialog:
   - type: bug/feature
   - title
   - details
   - repro steps (optional).
3. Submit POSTs timestamped JSON report to Azure backend:
   - report fields
   - app version/build metadata
   - optional current project summary (no PDF bytes by default).

Backend:
1. SWA managed Azure Function at `api/report` receives POST and writes JSON blob.
2. Storage: Azure Blob Storage container `reports` in account `sslrlpsketchstorage` (East US 2).
3. Connection string provided via SWA app setting `AZURE_STORAGE_CONNECTION_STRING`.

Acceptance:
1. Submit sends report to backend and confirms success to the user.
2. Reports are persisted as JSON blobs in Azure Blob Storage.

### 14) Ground rod legend sizing and alignment

Problem:
Ground rods are undersized and visually off-center in legend rows.

Design:
1. Increase legend scale factor for ground rod.
2. Add legend-only positional offset to center by visual centroid, not basepoint.
3. Match stroke weight to other legend symbols.
4. Allow expanded symbol cell width for ground rod rows if needed.

Acceptance:
1. Ground rod legend rows are visually centered and proportionate to neighboring symbols.

### 15) Replace calibrate browser prompt with properties-bar input

Design:
1. Calibrate flow:
   - click point 1
   - click point 2
   - properties bar shows real-distance input + Apply/Cancel.
2. Enter key applies; Escape cancels.
3. Validation message shown inline for invalid input.

Acceptance:
1. No `window.prompt` usage remains.
2. Calibrate is fully controllable from properties bar.

### 16) Brief step instructions in properties bar

Design:
1. Provide step-specific hints for all multi-step tools.
2. Directional symbols:
   - before first click: `Click to place`
   - after first click: `Click to set direction`.

Acceptance:
1. Active tool always shows concise next-step guidance.

### 17) Background slider UX polish

Design:
1. Add explicit tooltip/title to brightness slider.
2. Add pointer cursor when enabled; not-allowed cursor when disabled.

Acceptance:
1. Slider affordance is clear and consistent.

### 18) Components panel reorganization (remove Miscellaneous)

Target:
1. Remove the `Miscellaneous` subsection under Components.
2. Move `continued` from Components/Miscellaneous into the `Annotation` subsection.
3. Move `connect_existing` from Components/Miscellaneous into the `Connections` subsection.
4. Reorder connection buttons to match the intended structure in `connection-subsection.png`.

Design:
1. Update component subsection mapping so no component is assigned to `Miscellaneous`.
2. Update subsection order and symbol order in the Components panel renderer.
3. Keep component availability logic unchanged; this is layout/information-architecture only.
4. For the proposed two-word connection labels (second row in `connection-subsection.png`):
   - render as two lines (one word per line) instead of abbreviation
   - increase button height for that row to preserve readability and avoid truncation.

Acceptance:
1. Components panel contains no `Miscellaneous` subsection.
2. `Continued` appears under `Annotation`.
3. `Connect Existing` appears under `Connections`.
4. Connection subsection ordering and label formatting matches the provided references.

### 19) Custom connection button icons (replace Tabler for specific connectors)

Problem:
Tabler icons do not visually match drafting symbols for several connection components.

Target:
Use custom icons for component buttons (and any shared icon surfaces) for:
1. `cadweld_connection`
2. `mechanical_crossrun_connection`
3. `cadweld_crossrun_connection` (`cad-crossrun` label context)

Design:
1. Add purpose-built custom icon glyphs that visually mirror the drawing-space symbol forms.
2. Wire these components to custom icon keys in icon registry/button rendering paths.
3. Preserve existing drawing/export symbol behavior; this change is for UI icon representation.

Acceptance:
1. The three specified connection buttons no longer use Tabler icons.
2. Their icons are visually consistent with their corresponding drafting symbols.
3. Icon rendering remains consistent in sidebar and quick-access contexts.

### 20) Drawing Scale subsection control layout and icon updates

Target:
1. Convert `Apply Scale` to a compact square action button placed to the right of the two scale inputs.
2. Shorten input widths as needed so both inputs + square apply button fit on one row.
3. Rearrange current-scale readout and calibrate action on a separate row that supports variable-width content.
4. Update calibrate icon to Tabler `IconFocus2`.

Design:
1. Apply button:
   - square footprint
   - uses Tabler `IconCheck`
   - row alignment with the two scale inputs.
2. Input row:
   - reduce horizontal input width
   - preserve placeholders and `=` separator behavior.
3. Current scale + calibrate row:
   - both controls can grow/shrink with content
   - calibrate button uses overflow hidden (defensive) if text exceeds available width.
4. Preserve existing scale behavior and validation; this is a layout and icon refinement only.

Acceptance:
1. Drawing scale row visually matches `drawing-scale.png` intent.
2. `Apply Scale` is compact, right-aligned to inputs, and uses `IconCheck`.
3. `Calibrate` uses `IconFocus2`.
4. Current-scale and calibrate controls resize gracefully without layout breakage.

### 21) Reporting controls visibility split (Bug + Feature buttons)

Target:
1. Rename project subsection from `Support` to `Report`.
2. Replace single `Report` button with two visible actions:
   - `Bug` (bug icon)
   - `Feature` (Tabler `IconPencilStar`)
3. Keep one dialog and one submit backend path; only initial tab/type changes by entrypoint.

Design:
1. Add two report actions in the sidebar report subsection.
2. Button behavior:
   - `Bug` opens report dialog with `type = bug` preselected.
   - `Feature` opens report dialog with `type = feature` preselected.
3. Do not add any new feature-specific backend or storage flow in this step.

Acceptance:
1. Report subsection header reads `Report`.
2. Both `Bug` and `Feature` buttons are visible and clickable.
3. Clicking `Bug` opens dialog with Bug tab active.
4. Clicking `Feature` opens dialog with Feature tab active.

### 22) Continued reclassification as annotation-only element

Target:
1. Keep `Continued` in the Annotation subsection UI.
2. Treat `continued` as annotation behavior, not component/material behavior.

Design:
1. Styling/appearance:
   - always render `continued` in neutral annotation black (same family as dimension text),
   - ignore active material color for visual output.
2. Semantics:
   - remove material-based disable behavior for `continued`.
   - keep class-independent behavior (`none` class semantics).
3. Layering:
   - map `continued` to the `annotation` layer for visibility filtering.
4. Legend:
   - exclude `continued` from legend item generation and display.

Acceptance:
1. Changing active material does not change `continued` visual output.
2. `continued` remains selectable/placeable regardless of material mode.
3. Hiding the annotation layer hides `continued`.
4. `continued` never appears as a legend row.

## Data Model and Schema Impact

Proposed additions:
1. New symbol types:
   - `mechanical_crossrun_connection`
   - `cadweld_crossrun_connection`

Potential transitional behavior:
1. Existing `autoConnector` flag may become legacy-only.
2. Existing `cyan` color remains tolerated for migration compatibility in this phase.

## Implementation Sequence

### Phase A: UX correctness

1. Item 1 (focus retention)
2. Item 2 (dimension centering)
3. Item 17 (brightness slider polish)

### Phase B: Tool gating and guidance

1. Item 5 (scale-required disables)
2. Item 6 (disabled reason unification)
3. Item 16 (properties guidance)
4. Item 15 (calibrate input in properties bar)

### Phase C: Symbol set updates

1. Item 4 (downlead swap)
2. Item 7 (cadweld small square)
3. Item 10 (ground rod class-2 redesign)
4. Item 14 (ground rod legend alignment/sizing)

### Phase D: Connector architecture

1. Item 8 (new crossrun connector types)
2. Item 3 (auto-connector placement model rewrite)
3. Item 9 (T vs + routing logic)
4. Item 11 (tinned cleanup in resolver path)

### Phase E: Additional productivity and reporting

1. Item 12 (line live distance counter)
2. Item 13 (file-based reporting)

### Phase F: Components panel IA and icon fidelity

1. Item 18 (remove Miscellaneous, move/reorder component buttons, two-line connection labels)
2. Item 19 (custom connection button icons for cadweld and crossrun variants)
3. Item 20 (drawing scale subsection layout and icon refinements)
4. Item 21 (split report entrypoints into Bug + Feature under Report subsection)
5. Item 22 (reclassify `continued` as annotation-only behavior)

## Testing Plan

1. Unit tests:
   - connector classification (`T` vs `+`)
   - connector material/class resolution
   - line/arc/curve intersection connector placement
   - dimension center/gap calculations
   - disable-reason resolver.
2. Component tests:
   - dialog focus retention through multi-character input
   - calibrate properties-bar input flow
   - tooltip reason text rendering.
3. Integration/E2E tests:
   - auto-connector placement on new intersections
   - no mass deletion on auto-connector toggle off
   - arc/curve intersection connector placement
   - crossrun placement at `+` intersections
   - downlead/ground-rod visual parity between overlay and export.
   - components panel subsection placement and ordering (`Annotation` + `Connections` expectations).
   - custom icon rendering checks for cadweld and crossrun connection buttons.
   - drawing scale subsection layout and icon assertions (`IconCheck` apply, `IconFocus2` calibrate).
   - report subsection button split and default-type behavior (`Bug` => bug tab, `Feature` => feature tab).
   - continued annotation behavior checks (black rendering, annotation-layer visibility, legend exclusion).

## Resolved Scope Decisions

1. Auto-connector scope includes arcs/curves immediately.
2. Existing connectors are unchanged; new behavior applies only to future edits/placements.
3. Tinned (`cyan`) is hard-removed from active/runtime model; migration maps legacy values.
4. Reporting export defaults to metadata only.
