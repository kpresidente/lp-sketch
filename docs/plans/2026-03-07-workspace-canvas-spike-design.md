# Workspace Canvas Spike Design

Date: 2026-03-07
Branch: `phase-b-workspace-canvas-spike`
Status: Approved for implementation

## Goal

Build a developer-only, read-only canvas workspace spike that renders the full persisted annotation set on the active PDF page so we can compare it against the current SVG workspace and decide whether a full renderer cutover is justified.

## Scope

Included:

- extract reusable canvas drawing primitives from the export renderer
- keep export behavior intact while reusing the shared draw core
- add a developer-only flag to switch the workspace renderer
- render the full persisted annotation set for the current page:
  - conductors
  - arrows
  - symbols
  - text notes
  - dimension texts and optional linework
  - legend placements
  - general notes placements
- preserve existing pan, zoom, and page-switch behavior

Excluded:

- selection rendering
- hover rendering
- snap markers
- tool previews
- debug overlays
- editing parity
- export UX changes

## Architecture

The spike will reuse the existing canvas export renderer rather than introducing a second independent drawing implementation.

Reusable drawing code currently lives inside `src/lib/export.ts`. That file mixes three responsibilities:

- project-to-canvas drawing
- export-only canvas/blob serialization
- export-only PDF composition

The spike will separate those concerns by moving reusable project drawing code into a shared canvas render core under `src/workspace/renderCore/`. Export will continue to own output policy, PDF composition, and blob serialization, but it will call the shared draw-core functions instead of keeping a private copy.

The interactive workspace will remain SolidJS-driven at the app shell level. The new `WorkspaceCanvas` component will be imperative only at the final rendering edge: it will receive the current-page persisted project slice and redraw a `<canvas>` when its inputs change. There will be no perpetual render loop.

## Renderer Selection

Renderer selection will be controlled by a developer-only flag. The intended behavior is:

- production and normal development builds continue to use the current SVG overlay by default
- when the developer flag is enabled, the stage mounts the new read-only canvas renderer instead of the persisted-geometry SVG overlay

This keeps the spike surface area small and avoids adding experimental UI controls to the app.

## Data Flow

`App.tsx` remains the orchestrator for project state, page navigation, layer visibility, zoom, pan, and PDF stage dimensions.

The active workspace path under the flag will be:

1. `App.tsx` derives the same active-page project view it already uses for the SVG overlay.
2. `CanvasStage` still owns the stage shell, PDF background canvas, camera transform, pointer wiring, and quick-access UI.
3. `WorkspaceCanvas` mounts inside the camera layer and receives:
   - the active-page persisted project slice
   - document-space page width and height
   - any drawing options needed by the shared render core
4. `WorkspaceCanvas` resizes its backing canvas for device pixel ratio, clears, and redraws on invalidation.
5. Shared draw-core functions render the project contents into the canvas.

Selection, previews, hover, snap, and other transient interaction layers are intentionally omitted while the flag is enabled.

## Render Core Boundaries

The shared render core should cover project drawing primitives and composition only. That includes:

- wire, arc, curve, and arrow drawing
- symbol drawing
- text rendering
- dimension label and linework rendering
- legend drawing
- general notes drawing
- optional construction mark rendering when requested by callers

Export-specific responsibilities remain in `src/lib/export.ts`:

- creating export canvases
- choosing output pixel ratios
- drawing the PDF/background image for export
- composing PDF output
- converting canvases to blobs

This keeps one source of truth for annotation drawing without coupling the workspace spike to export-only concerns.

## Error Handling

The spike should fail softly.

- If the developer flag is off, behavior is unchanged.
- If the developer flag is on and the workspace canvas cannot obtain a 2D context or render successfully, the app shell should not crash.
- The failure should emit a handled telemetry event and log a concise developer-facing console warning.
- The spike does not need a user-facing fallback UI beyond the existing stage shell.

Because the spike is intentionally read-only, missing selection or preview behavior under the flag is not a bug.

## Testing Strategy

Testing will focus on renderer correctness and mount behavior rather than interaction parity.

1. Lock export behavior before the extraction:
   - use the existing export integration/regression/wrapper/pdf suites
   - extend them only if a draw path is not already covered
2. Add shared render-core tests where a pure helper boundary exists and the test adds signal
3. Add `WorkspaceCanvas` tests that verify:
   - the dev flag swaps the persisted-geometry renderer
   - canvas dimensions follow the active PDF page dimensions
   - redraw occurs when the active project slice changes
4. Add an app-level test that verifies pan, zoom, and page navigation still mount and flow correctly with the spike flag enabled

The spike will not attempt to preserve or test editing interactions while the flag is enabled.

## Success Criteria

Phase B is successful if all of the following are true:

- export tests remain green after render-core extraction
- the workspace canvas shows the full persisted annotation set for the active page
- pan, zoom, and page changes still behave correctly under the flag
- the workspace canvas reuses the extracted draw core instead of duplicating export drawing logic
- the resulting build allows a credible browser-side comparison between the canvas spike and the existing SVG renderer

## Non-Goals

The spike is not intended to prove full cutover readiness. It is intended to answer one question: whether a shared canvas renderer is promising enough to justify a larger interactive rewrite.

It does not try to:

- preserve selection affordances
- support editing
- replace transient overlays
- change export semantics
- commit the team to Phase C
