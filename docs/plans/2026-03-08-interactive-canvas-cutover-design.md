# Interactive Canvas Cutover Design

Date: 2026-03-08
Branch: `phase-c-interactive-canvas-cutover`
Status: Approved for implementation

## Goal

Build full tool parity for the canvas workspace behind the existing developer flag so the flagged path behaves like the current editor for normal workflows while rendering persisted geometry on canvas instead of SVG.

## Scope

Included:

- keep the Phase B developer flag as the gate for the canvas renderer path
- make the flagged path support normal editing workflows end-to-end
- keep persisted geometry on canvas only in the flagged path
- restore transient interaction visuals needed for editing parity:
  - selection highlight
  - selection handles
  - hover highlight
  - snap marker
  - tool previews
  - debug text if needed
- preserve existing pointer workflows, history semantics, autosave, load/save, and export behavior

Excluded:

- making the canvas path the default renderer
- rewriting the application’s pointer-state ownership model
- replacing the current hit-test and snapping engines
- removing the SVG path entirely

## Architectural Direction

Phase C is an interactive renderer cutover behind a feature flag, not a full application rewrite.

The Phase B spike proved that persisted workspace geometry can be rendered from a shared canvas draw core. Phase C extends that path by making the flagged renderer usable for real editing workflows while preserving the existing application state and controller logic.

Under the flag, the renderer stack becomes:

1. PDF background canvas
2. persisted workspace canvas
3. transient interaction SVG overlay

This is intentionally not a pure-canvas architecture yet. Persisted geometry moves to canvas, but transient interaction affordances remain SVG because they are already correct, testable, and tightly coupled to current tool behavior.

## Renderer Split

The current `OverlayLayer` mixes two categories of rendering:

- persisted annotation geometry
- transient editing visuals

That split becomes explicit in Phase C.

The flagged path should no longer render persisted annotations in SVG:

- lines
- arcs
- curves
- arrows
- symbols
- text annotations
- dimension texts
- marks
- legend placements
- general notes placements

The flagged path should retain only transient interaction visuals in SVG:

- hover highlight
- selection highlight
- selection handles
- snap marker
- preview geometry for active tools
- debug label text

The cleanest implementation is to introduce a dedicated interaction-only overlay component for the flagged renderer, rather than filling the existing `OverlayLayer` branches with renderer conditionals.

## Interaction Model

Phase C keeps the current interaction ownership model in place.

- `CanvasStage` continues to own the stage shell and pointer wiring.
- `App.tsx` continues to orchestrate tool state, drag state, selection state, snapping, and history.
- existing hit-test and snapping engines continue to operate against project state
- new annotation creation remains driven by the current tool/controller logic

The main change is how the results are presented:

- committed persisted geometry renders through the canvas draw core
- in-progress transient previews and affordances render through a reduced SVG overlay

This keeps the risk centered on renderer cutover instead of combining it with a full controller rewrite.

## Data Flow

In the flagged path:

1. `App.tsx` derives the same page-filtered project slice used by the canvas workspace today.
2. `WorkspaceCanvas` renders persisted geometry from that project slice.
3. A new `WorkspaceInteractionOverlay` receives only the transient interaction props it needs.
4. Existing controllers mutate canonical state exactly as they do in the SVG path.
5. Once state changes commit, the canvas redraws and the transient overlay updates independently.

This yields one canonical application state while separating long-lived rendered geometry from short-lived interaction visuals.

## Error Handling

The current canvas soft-fail behavior remains in effect.

- If the developer flag is off, nothing changes.
- If the developer flag is on and canvas render/setup fails, emit handled telemetry and warn in the console.
- Do not silently fall back to the old persisted SVG renderer when the flag is enabled; that would hide cutover defects.
- Missing interaction parity under the flag is a bug in Phase C, unlike in Phase B.

## Testing Strategy

Testing should focus on parity of representative editing flows under the flag.

Keep as hard guardrails:

- export suites for the shared draw core
- existing canvas-spike tests
- build verification

Add flagged-path tests for:

- selection of existing annotations
- move drag and handle edit flows
- snap marker and hover feedback
- line, arc, curve, arrow, symbol, text, dimension, and note placement previews
- undo/redo behavior under the flag
- legend and general notes editing

The goal is not to duplicate every test immediately, but to cover the high-value workflows that prove the flagged path is a credible editor, not just a viewer.

## Success Criteria

Phase C is successful if all of the following are true behind the flag:

- users can perform the normal editing workflows end-to-end
- persisted geometry renders only on canvas
- transient interaction visuals remain present and correct
- undo/redo semantics remain unchanged
- autosave/load/export behavior remains unchanged
- the flagged path is stable enough that enabling it by default becomes a product decision rather than a technical unknown

## Non-Goals

Phase C does not attempt to:

- make canvas the default renderer immediately
- eliminate all SVG usage
- replatform hit testing, snapping, or pointer-state ownership
- build a final pure-canvas interaction architecture

It is a pragmatic cutover phase designed to reduce rendering cost while preserving the existing interaction model.
