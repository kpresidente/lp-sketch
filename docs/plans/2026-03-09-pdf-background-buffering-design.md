# PDF Background Buffering Design

## Goal

Eliminate visible PDF background flicker during pan and zoom by keeping a stable bitmap on screen throughout interaction and only swapping in newly rendered PDF pixels after they are fully ready.

## Current Problem

The workspace now renders annotation geometry efficiently, but the PDF background still flickers in Edge during pan and zoom. The current PDF renderer draws directly into the visible canvas in `src/hooks/usePdfCanvasRenderer.ts`. While the hook only rerenders on PDF/page changes, the visible surface can still be exposed to browser compositing instability and visible clears during background updates.

The existing `will-change: transform` hint on `.pdf-layer` is complementary and should remain part of the solution, but it does not solve the core presentation problem by itself.

## Chosen Approach

Use buffered PDF background rendering with a persistent front buffer and a hidden back buffer.

- The front buffer remains visible at all times.
- The back buffer receives new PDF renders.
- During active pan and zoom, the UI only transforms the already visible front buffer.
- When interaction settles, the renderer produces an updated raster in the back buffer and swaps it into view atomically.

This intentionally allows temporary softness during interaction in exchange for eliminating flicker and white flashes.

## Rendering Model

The buffered renderer should follow these rules:

1. The visible PDF canvas must never be cleared until replacement pixels are ready.
2. PDF.js renders should target a hidden surface first.
3. Front/back swap should happen in one step after a successful render completes.
4. If a render is superseded by a newer request, it should be cancelled and discarded silently.
5. If a render fails and a previously rendered front buffer exists, the last good image should remain visible.

## Interaction Timing

Background quality operates in two modes:

- `interactive`: active panning or wheel-zoom bursts
- `settled`: after interaction pauses long enough to justify a sharper rerender

Behavior:

- In `interactive` mode, the app reuses the existing front-buffer bitmap and applies only CSS transforms.
- In `settled` mode, the app starts a PDF render into the back buffer using the final target state.
- The back buffer swaps into the visible surface only after completion.
- Superseded renders are cancelled using generation IDs so rapid wheel zoom does not queue stale work.

## Implementation Shape

The initial implementation should stay narrowly scoped:

- Extend `src/hooks/usePdfCanvasRenderer.ts` to manage:
  - visible front buffer
  - hidden back buffer or offscreen render surface
  - render generation IDs
  - interaction settle timer
- Add a minimal interaction signal from the app/stage layer so the PDF renderer knows when pan or zoom is active versus settled.
- Keep `src/components/CanvasStage.tsx` mostly intact, with only the structural changes needed to host a hidden render surface if required.
- Route current-page changes and PDF changes through the same buffered swap path.
- Add `will-change: transform` to `src/App.css` on `main`, since the branch that introduced it was never merged.

This approach deliberately does not include multi-resolution caching or tiling yet.

## Error Handling

- Cancelled renders are expected and should not surface as errors.
- Failed renders should preserve the last good front buffer when available.
- Only surface a user-facing error if there is no valid PDF bitmap to display at all.
- Page changes and PDF replacements should invalidate pending work and start fresh buffered renders.

## Verification

Automated verification should cover:

- initial PDF render still paints correctly
- superseded renders are cancelled cleanly
- the visible front buffer is not cleared during interaction updates
- buffer swap occurs only after the new render completes

Manual browser verification should cover:

- panning no longer flickers
- wheel zoom no longer flashes blank white frames
- rapid zoom bursts do not accumulate stale background renders
- page changes still render the correct page

## Non-Goals

- multi-resolution PDF cache
- viewport tiling
- changing annotation rendering behavior
- changing export behavior
