# LP Sketch v1 Feature Contract

Status: Draft v1.0
Owner: Product + Engineering
Source: `vision/vision.md`

## 1. Purpose

This document turns the vision into a build contract for v1. It defines what must ship, how core behaviors work, and what acceptance criteria must pass before release.

## 2. Contract Language

- MUST: required for v1 release.
- SHOULD: intended for v1, may slip only with explicit decision.
- MAY: optional and non-blocking.

## 3. v1 Outcome (Release Definition)

A lightning protection contractor can:

1. Create a project from a single-page PDF plan.
2. Set drawing scale.
3. Draw LP sketch geometry and symbols with snap/angle aids.
4. Use spacing/measurement tools to place and verify elements.
5. Save/reopen the project with full editability.
6. Export a flattened sketch for CAD handoff (PDF and PNG/JPG).

## 4. Scope

### 4.1 P0 (Must Ship)

- Single-page PDF import as locked background.
- Pan/zoom viewport.
- Scale setup:
  - Manual scale entry.
  - Two-point calibration.
- Drawing tools:
  - Line tool (single-segment and continuous).
  - Arc tool (3-point arc).
  - Symbol stamp tool (including directional symbols).
  - Selection/move/delete.
  - Undo/redo.
- Snap/constraint system:
  - Endpoint, intersection, nearest-on-line/arc, symbol basepoint.
  - Global snap toggle.
  - 15-degree angular toggle.
  - Shift temporary override (disable all snaps/constraints).
- Measuring tool (non-drawing): line/polyline/arc distance.
- Auto-spacing tool (air terminal placement).
- Measure & mark tool (temporary snap marks).
- Legend/key stamp (auto-populated, with symbol counts).
- Project save/load in versioned JSON format.
- Export:
  - Flattened PDF over original page.
  - PNG/JPG image export.

### 4.2 P1 (Should Ship If Schedule Allows)

- Text note tool.
- Arrow tool.
- Touch-first gesture parity for all tools (desktop parity is still required for v1).

### 4.3 Out of Scope (v1)

- Multi-page PDFs.
- Collaboration / multi-user editing.
- Title blocks and professional sheet formatting.
- Grid snap.
- Snap to PDF geometry.
- Detailed callout systems.
- Symbol scaling options beyond default behavior.

## 5. Product Invariants

- This is a communication sketch tool, not production CAD.
- PDF layer is always non-editable and never a snap target.
- Render order is fixed:
  1. PDF background
  2. Lines/arcs
  3. Symbols
  4. Temporary construction marks and active tool previews
- Symbol selection precedence is above lines/arcs.
- All persisted geometric data is stored in document coordinates, never screen coordinates.

## 6. Coordinate, View, and Rendering Contract

### 6.1 Coordinate Spaces

- Document space (canonical): PDF page coordinates in points (1/72 inch), page origin at top-left.
- View space: document space transformed by pan and zoom.
- Screen space: actual pixels.

All model entities (lines/arcs/symbols/marks/text/arrows) MUST persist in document space.

### 6.2 View Transform

- Zoom range MUST be clamped (default 25% to 800%).
- Pan is unrestricted but resettable.
- Hit testing and snapping use a screen-space tolerance (default 10 px) projected into document space.

### 6.3 Symbol Size Behavior

- In-editor symbols MUST render at fixed visual size across zoom for legibility.
- Symbol basepoint remains geometrically stable in document coordinates.
- Export uses canonical symbol size in document units so output is stable and predictable.

## 7. Tool Behavior Contracts

### 7.1 Line Tool

- Single mode: click A, click B -> one segment.
- Continuous mode: click chain to create connected segments. Double-click or Escape to end the chain.
- Each segment is a separate element in storage.
- Segment style uses active material color + active class style.

Undo/redo boundary:

- Each committed segment is one undo unit.

### 7.2 Arc Tool

- Three clicks: point 1, point 2 (on-arc), point 3.
- Resulting arc MUST intersect all three clicked points.
- Arc previews after second click and commits on third.
- Arc inherits active color/class.

Undo/redo boundary:

- One completed arc is one undo unit.

### 7.3 Symbol Stamp Tool

- Symmetric symbols: one-click placement.
- Directional symbols: two-click placement (basepoint then direction).
- Direction angle obeys angular constraint toggle.
- Symbol style inherits active material color (`settings.activeColor`) and active class (`settings.activeClass`) at placement.
- For class-aware symbols, class is persisted per symbol (`class1|class2`) and does not change when `settings.activeClass` changes later.
- The Class 1 / Class 2 toggle (`settings.activeClass`) sets the default class for newly placed lines and class-aware symbols.
- Symbols marked "NO CLASS" ignore the class toggle and render in a single style.
- Steel bond symbol is always ground color (red), regardless of active color.

Undo/redo boundary:

- Each placed symbol is one undo unit.

### 7.4 Selection, Move, Delete

- Click selects topmost candidate by precedence:
  1. Symbols
  2. Lines/arcs
  3. Marks (when mark operations are active)
- If overlap remains ambiguous, most recently placed element wins.
- Drag move updates selected element(s).
- Delete removes selected element(s).

Undo/redo boundary:

- One drag move (mouse/touch down to up) is one undo unit.
- One delete command is one undo unit.

### 7.5 Measuring Tool (Non-Drawing)

- Supports straight segment, multi-segment path, and arc measurement.
- Displays total path distance using current scale.
- Does not create persisted drawing elements.
- If scale is unset, tool is disabled and user gets clear prompt to set scale.

### 7.6 Auto-Spacing Tool

Prerequisites:

- If scale is unset, tool MUST be disabled with a clear prompt to set scale (same as §7.5).

Input behavior:

- User sets max interval distance (> 0).
- User traces polyline/polygon vertices.
- Outside corner input (primary click) and inside corner input (secondary click) are distinct actions. Input mapping follows §9 (right-click on desktop, `Alt+click` fallback, long-press on touch, toolbar toggle on touch).

Anchor rules:

- Open path anchors: start + end + all outside corners.
- Closed path anchors: all outside corners.
- Inside corners do not receive terminals and are pass-through bends.

Placement algorithm:

1. For each anchor-to-anchor span, measure path length through intermediate inside corners.
2. Compute N = ceil(spanLength / maxInterval).
3. Place terminals at equal spacing along the span endpoints and interior split points.
4. Deduplicate terminals using a fixed document-space tolerance (`dedupeEpsilonPt`, default `0.5 pt`), independent of zoom/pan.

Output:

- Places air-terminal symbols only.
- Uses active color/class.
- Draws no lines.

Undo/redo boundary:

- One completed auto-spacing run is one undo unit.

### 7.7 Measure & Mark Tool

- If scale is unset, tool MUST be disabled with a clear prompt to set scale (same as §7.5).
- User traces path similarly to auto-spacing. Same primary/secondary click distinction for outside/inside corners applies (input mapping per §9).
- Live readout shows cumulative distance from last anchor/mark.
- User drops temporary marks at chosen distances.
- Marks are snap targets for other tools.
- Marks are excluded from legend and export.
- User can delete individual marks or clear all marks.

Undo/redo boundary:

- Each mark placement is one undo unit.
- "Clear all marks" is one undo unit.

### 7.8 Text and Arrow (P1)

- Text: click to place, edit on double-click.
- Arrow: two-click tail/head placement.
- Text and arrow are independent elements.

## 8. Snap & Constraint Contract

### 8.1 Snap Targets

- Endpoint of lines/arcs.
- Line/arc intersections.
- Nearest point on line/arc.
- Symbol basepoints.
- Construction marks.

### 8.2 Controls

- Snap toggle (global on/off).
- Angular toggle (15-degree increments).
- Shift override disables snap and angular constraints while held.

### 8.3 Exclusions

- PDF background geometry is never snap-enabled.
- No per-snap-type toggles in v1.

## 9. Input Mapping Contract

### 9.1 Desktop

- Primary click: default placement action.
- Secondary click: alternate corner type for spacing tools.
- Browser context menu MUST be suppressed on drawing surface.
- Fallback for alternate corner type MUST exist (`Alt+click`) for devices with no right-click.

### 9.2 Touch / Tablet

- Tap = primary click.
- Long press (300-400 ms) = secondary click.
- Toolbar toggle for corner type MUST be available on touch as a fallback to long-press.
- Pinch to zoom and two-finger drag to pan MUST be supported.

## 10. Legend Contract

- Legend is a placeable object.
- Legend content auto-populates from currently used symbols/colors.
- Each entry includes count.
- User can edit legend text after placement.
- Construction marks never appear in legend.

## 11. Save/Load Contract

### 11.1 File Format

- Project format is JSON with explicit `schemaVersion`.
- v1 starts at `schemaVersion: "1.0.0"`.
- Save includes all editable state required to reopen losslessly.
- Canonical validation source of truth is `vision/project-schema-v1.json` (JSON Schema Draft 2020-12).
- The JSON block in §11.2 is an illustrative example; schema rules in `vision/project-schema-v1.json` are authoritative for validation.

### 11.2 Required Top-Level Fields

```json
{
  "schemaVersion": "1.0.0",
  "projectMeta": {
    "id": "uuid",
    "name": "string",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  },
  "pdf": {
    "sourceType": "embedded",
    "name": "example.pdf",
    "sha256": "abc123",
    "page": 1,
    "widthPt": 1224,
    "heightPt": 792,
    "dataBase64": null,
    "path": "/path/to/example.pdf"
  },
  "scale": {
    "isSet": true,
    "method": "manual",
    "realUnitsPerPoint": 0.1666666667,
    "displayUnits": "ft-in"
  },
  "settings": {
    "activeColor": "green|blue|red|cyan|purple",
    "activeClass": "class1|class2",
    "snapEnabled": true,
    "angleSnapEnabled": true,
    "angleIncrementDeg": 15
  },
  "view": {
    "zoom": 1,
    "pan": { "x": 0, "y": 0 }
  },
  "elements": {
    "lines": [],
    "arcs": [],
    "symbols": [],
    "texts": [],
    "arrows": []
  },
  "construction": {
    "marks": []
  },
  "legend": {
    "items": [],
    "placements": []
  }
}
```

- `elements.texts` and `elements.arrows` are P1-reserved and MUST exist as empty arrays in P0-only builds.
- `legend.items` is auto-generated from unique `symbolType + color + class` combinations in use.
- `legend.placements` stores stamped legend instances (position plus per-placement text edits).

### 11.3 Versioning and Migration

- Loader MUST reject unknown major versions.
- Loader MUST support migration within major version (e.g., 1.0.x -> latest 1.x).
- Migration functions MUST be deterministic and covered by tests.

## 12. Export Contract

### 12.1 PDF Export

- Output page size MUST match source PDF page exactly.
- Drawing overlay MUST align with original coordinates at all zoom/pan states.
- Symbols MUST render at canonical document-unit size (not the fixed-screen-size used in-editor). See §6.3.
- Export includes legend but excludes temporary marks.

### 12.2 Image Export (PNG/JPG)

- Exports current project page with background + overlays flattened.
- Symbols MUST render at canonical document-unit size (same as PDF export). See §6.3.
- Export resolution preset options SHOULD include at least 1x and 2x.
- Export includes legend but excludes temporary marks.

## 13. Undo/Redo Transaction Table

| Action | Undo Unit |
|---|---|
| Place line segment | 1 segment |
| Place arc | 1 arc |
| Place symbol | 1 symbol |
| Move selection | 1 drag gesture |
| Delete selection | 1 delete command |
| Auto-spacing run | all terminals from that run |
| Place mark | 1 mark |
| Clear all marks | all marks cleared in one command |
| Legend stamp | 1 legend placement |
| Text edit (P1) | 1 edit commit |

## 14. Acceptance Criteria (Release Gate)

### 14.1 Core Workflow

1. Given a valid single-page PDF, user can import and view it as locked background.
2. User can set scale by manual entry or two-point calibration.
3. Line/arc/symbol tools produce expected geometry with snapping and angular constraints.
4. User can select, move, delete, and undo/redo without data corruption.
5. Save/load roundtrip preserves geometry, style, scale, legend, and marks.
6. PDF export overlays all non-temporary geometry in correct alignment.
7. PNG/JPG export succeeds and matches visible project content (excluding temporary marks).

### 14.2 Domain Tools

1. Auto-spacing places terminals at anchor points and equalized intervals not exceeding max interval.
2. Inside corners never get terminals unless explicitly marked outside.
3. Measuring tool reports path distances consistent with calibration.
4. Measure & mark marks are snap targets and never appear in legend/export.

### 14.3 Input Robustness

1. Right-click/secondary action works without opening browser context menu on canvas.
2. `Alt+click` fallback performs secondary action on desktop.
3. Touch long-press and toolbar fallback both support inside-corner input.

## 15. Test Minimums

- Unit tests:
  - Auto-spacing algorithm (open/closed paths, inside/outside corner combinations, dedupe).
  - Scale calibration math.
  - Coordinate transforms (doc/view/screen).
  - Project migration functions.
- Integration tests:
  - Save/load roundtrip.
  - Undo/redo transactions for all P0 tools.
  - Export alignment regression.
- Manual QA:
  - Mouse and touch pass for spacing tools.
  - Performance sanity with >= 500 elements.

## 16. Deferred Decisions (Track, Not Blockers)

- Embedded vs. referenced PDF default for saved projects.
- PWA offline caching strategy and storage limits.
- Tauri packaging timeline.

## 17. Change Control

Any change that expands P0 scope or alters a MUST behavior in this contract requires explicit sign-off from product and engineering before implementation.
