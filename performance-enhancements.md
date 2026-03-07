# Performance Enhancements

Running notes on performance investigation and improvements for LP Sketch.

---

## Completed: PDF.js Worker Leak (March 2026)

### Problem
Browser tab RAM growing to 2–4 GB during a session. PDF.js workers accumulating (49 instances observed).

### Root Cause
`usePdfCanvasRenderer.ts` called `pdf.destroy()` in only one of four exit paths (the pre-page stale check). Every successful render left a live PDF.js worker behind. Over a session with many renders — page changes, zoom, PDF reloads — these accumulated without bound.

A secondary issue: each `getDocument()` call spawned a fresh worker process because PDF.js does not automatically share workers when `GlobalWorkerOptions.workerSrc` is set. An explicit `PDFWorker` instance must be passed to enable reuse.

### Fix
1. Wrapped the post-`getDocument()` block in `try/finally` so `pdf.destroy()` is always called regardless of exit path.
2. Created a `PDFWorker` singleton inside `usePdfCanvasRenderer` and passed it to every `getDocument()` call, reducing worker spawns from 49 to 3 per session (the remaining 3 are legitimate: initial load + actual PDF render).

### Result
- JS heap: 316 MB → 24 MB (92% reduction)
- Tab RAM: 2–4 GB → ~750 MB
- Worker instances: 49 → 3

### Files Changed
- `src/hooks/usePdfCanvasRenderer.ts`
- `src/hooks/usePdfCanvasRenderer.test.ts`
- Test mock updates in `App.*.test.tsx` and `useProjectFileActions.test.ts`

---

## Completed: Viewport Culling and Overlay Memoization (March 2026)

### Viewport Culling
Elements outside the current pan/zoom viewport are filtered before being passed to `OverlayLayer`, so only visible elements exist in the SVG DOM. Implemented in `src/lib/viewportCulling.ts`, wired in `App.tsx` as `viewportVisibleProject`. A `ResizeObserver` tracks stage dimensions reactively to keep the viewport rect accurate.

### DimensionTextsOverlay Memoization
`extensionSegments` and `barSegments` were plain inline functions recomputing geometry on every reactive pass. Converted to `createMemo()` so geometry is only recalculated when inputs change.

### Legend Layer Filter Memoization
`legendEntriesForPlacement` was calling `filterProjectByVisibleLayers(project())` inline on each call. Extracted as `layerFilteredProject = createMemo(...)` to prevent redundant filtering.

---

## Under Investigation: Canvas/SVG Compositing Flicker

### Symptom
When selecting an element and dragging it, the PDF background visibly flickers. Based on the signal audit below, the same pressure exists during any pointer movement (cursor hover, snap preview), not just drag.

### Architecture Context

The drawing workspace is structured as:

```
div.stage
  └── div.camera-layer  (CSS transform: pan + zoom — already on own GPU layer)
        ├── canvas.pdf-layer     ← imperative, PDF.js renders pixels here
        ├── div.pdf-brightness-wash
        └── <OverlayLayer>       ← reactive SolidJS SVG (all drawn annotations)
              ├── <LinesOverlay>
              ├── <SymbolsOverlay>
              ├── ... (10 more overlay components)
              └── <ToolPreviewsOverlay>
```

The SVG overlay is **fully within SolidJS's reactive system** — the same reactive signals and memos that drive the sidebar and properties bar also drive every annotation on the canvas. There is no separate imperative drawing surface for annotations.

### Signal Audit: What Fires on Every `pointermove`

**Always, even without any drag active:**
- `setCursorDoc()` — cursor position in document coordinates
- `setSnapPointPreview()` — snap indicator position/type
- `setHoveredSelection(null)` — clears hover highlight

**Additionally, during an element drag (move or handle edit):**
```ts
const nextProject = cloneProject(drag.sourceProject)  // full structuredClone()
moveSelectionsByDelta(nextProject, drag.selections, delta)
syncLegendItems(nextProject)
setProject(nextProject)  // cascades ALL project-dependent memos
```

`setProject()` invalidates `visibleProject` → `viewportVisibleProject` → all 10+ overlay components. This is the full reactive cascade, at 60+ fps during drag.

Note: `drag.sourceProject` is captured once at drag start and never changes. The clone is computing `sourceProject + currentDelta` on every frame — the source itself is stable.

### Why Flickering Occurs

The `.camera-layer` div has a CSS `transform` applied inline (pan/zoom), which already promotes it to its own GPU compositing layer. However, the canvas (`.pdf-layer`) and the SVG overlay share the same bitmap *within* that layer. When SolidJS patches the SVG DOM, the browser must repaint the camera-layer's bitmap — re-rasterizing both the SVG and the canvas pixels together — even though the canvas is unchanged. The GPU then re-composites this with other layers, producing the visible flicker.

This is a browser paint pipeline issue, not a SolidJS bug.

---

## Phase A Benchmark Baseline (March 2026)

Phase A execution is being tracked in `docs/plans/2026-03-07-workspace-performance-benchmark-notes.md`.

Baseline recorded before any Phase A code changes:

- `npm run build` passed
- `npm test` passed
- drag currently performs `cloneProject(drag.sourceProject)` plus `setProject(nextProject)` on every processed move/edit frame in `src/App.tsx`

The benchmark notes document defines the three comparison scenarios, the measurements to capture, and the success criteria for the Phase A work.

---

## Targeted Fixes: Canvas/SVG Compositing (Ready to Implement)

Three fixes, ordered by effort and impact. All are independent and can be applied incrementally.

### Fix 1: CSS Compositing Layer Isolation
**Effort:** Trivial (1 line of CSS) | **Impact:** Eliminates the visual flicker symptom

Add `will-change: transform` to `.pdf-layer` in `App.css`. This promotes the canvas to its own GPU compositing layer, isolated from the SVG. SVG repaints no longer touch the canvas pixels — the GPU composites them independently at the end.

```css
.pdf-layer {
  /* existing styles... */
  will-change: transform;
}
```

No logic changes. No risk to rendering correctness.

### Fix 2: RAF Throttling
**Effort:** Low | **Impact:** Caps all pointer-driven reactive updates at 60/sec

Browsers fire `pointermove` at hardware rate — on a 120Hz display or high-precision mouse, well above 60 events per second. Every extra event beyond one per frame is wasted work. Throttling to `requestAnimationFrame` ensures at most one full reactive cycle per visual frame:

```ts
let rafPending = false
let latestMoveEvent: PointerEvent | null = null

function handleToolPointerMove(event) {
  latestMoveEvent = event
  if (rafPending) return
  rafPending = true
  requestAnimationFrame(() => {
    rafPending = false
    processPointerMove(latestMoveEvent!)
  })
}
```

Applies broadly to all interactive operations, not just drag.

### Fix 3: Deferred Project Commit During Drag
**Effort:** Medium | **Impact:** Eliminates the `cloneProject` + full reactive cascade during drag

The core insight: `drag.sourceProject` is captured at drag start and never changes. There is no reason to deep-clone it and call `setProject()` on every frame — the only thing that changes frame-to-frame is the delta from the start position.

**Proposed approach:**
- Introduce a lightweight `dragDelta` signal (`{ x: number, y: number } | null`)
- During drag, only update `dragDelta` — a tiny signal update that only affects overlay rendering of selected elements
- The overlay renders selected elements at `storedPosition + dragDelta` without touching the rest of the project
- On `pointerup`, do the single `cloneProject` + `setProject()` to commit the final position, then clear `dragDelta`

This reduces the per-frame reactive cascade from "everything depending on `project()`" to "only selected-element rendering." Unselected elements, overlays, previews, the sidebar — none of them re-evaluate during drag.

**Alternative SVG-level approach:** Wrap selected elements in an SVG `<g>` during drag and update only its `transform` attribute each frame. The browser handles the visual offset at the GPU level with zero DOM diffing on element contents. Requires restructuring how the overlay renders selected vs. unselected elements.

Fix 3 is the most impactful but also requires the most care — the overlay structure would need to support the distinction between "where the element actually is" and "where it currently appears during an active drag."

---

## Noted, Not Yet Addressed: History Buffer Memory

`MAX_HISTORY = 100` in `App.tsx` keeps up to 100 full deep clones of the project state in memory simultaneously via `structuredClone()`. At scale this is the dominant remaining memory consumer — potentially 5+ GB at the theoretical maximum element count with embedded PDFs.

The PDF.js fix addressed the more acute leak. The history buffer is the next memory target if further reduction is needed.

**Options:**
1. Reduce `MAX_HISTORY` (e.g., 20–30) — simple, immediate
2. Store diffs/patches between states instead of full clones — large effort, ~95% reduction in history memory

---

## Strategic Context: Framework Fit

LP Sketch uses SolidJS for both the standard UI (sidebar, panels, dialogs) and the drawing canvas annotations (reactive SVG). This is a reasonable choice given bounded element counts and the value of browser-native SVG hit testing, but it means the reactive system sits in the pointer event hot path during interaction.

High-performance drawing tools (Figma, Excalidraw, Miro) universally separate concerns:
- **Drawing surface**: imperative canvas (2D or WebGL), driven by a `requestAnimationFrame` render loop, outside any UI framework
- **UI panels**: reactive framework of choice

A future `workspace_v2` redesign along these lines is under consideration. The targeted fixes above make sense regardless — they improve the current architecture and some of the patterns (drag delta, RAF throttling) would carry forward into a redesigned workspace as well.
