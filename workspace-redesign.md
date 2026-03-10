# Workspace Redesign: Canvas 2D Renderer

Design document for replacing the SVG overlay with an imperative Canvas 2D renderer.

---

## Motivation

The current drawing workspace renders all annotations as reactive SVG elements managed by SolidJS. While SolidJS's fine-grained reactivity is well-suited to the sidebar, panels, and dialogs, it introduces framework overhead in the drawing hot path — pointer events at 60fps flow through signal updates, memo chains, and SVG DOM patches on every frame.

The visible symptoms:
- PDF background flickers during element drag (compositing layer shared between canvas and SVG)
- Reactive overhead in the pointer move path even when nothing meaningful has changed
- Every project signal update cascades through all overlay components

The root architectural mismatch: reactive UI frameworks are designed for data-driven DOM updates triggered by user actions. A drawing surface is the opposite — it wants a tight loop that reads state and draws, decoupled from how often state changes.

---

## Proposed Architecture

### Current

```
pointermove event
  → setProject() / setCursorDoc() / setSnapPointPreview()
  → SolidJS reactive chain evaluates
  → visibleProject → viewportVisibleProject memos re-run
  → OverlayLayer receives new props
  → 11 overlay components diff and patch SVG DOM
  → browser layout + paint (PDF canvas repaints too)
```

### Proposed

```
pointermove event
  → write to renderState (plain JS object, no signals)
  → SolidJS signals update UI panels only

RAF loop (independent, ~16ms)
  → read renderState
  → ctx.clearRect()
  → draw functions write pixels
  → GPU presents frame
```

The drawing surface and the reactive UI become fully independent. Signals never touch the hot path.

---

## Scope: What Changes, What Doesn't

### Replaced

| Current | Replacement |
|---|---|
| `src/components/overlay/*.tsx` (11 files) | `src/workspace/render/*.ts` — canvas draw functions |
| `src/components/OverlayLayer.tsx` | `src/workspace/WorkspaceCanvas.tsx` — canvas element + RAF loop |
| `src/components/SymbolGlyph.tsx` | `src/workspace/render/symbols.ts` — Path2D geometry, cached |
| SVG-based selection/hover highlights | Second draw pass over selected elements |
| SVG-based snap marker, handle overlays | Canvas draw functions, same geometry |

### Unchanged

Everything else stays exactly as-is. The redesign is purely a rendering output replacement.

| Layer | Status |
|---|---|
| `src/lib/` — all geometry, hit testing, snapping, spacing, legend, scale logic | **Unchanged** |
| `src/controllers/` — pointer handlers, drag, tool logic | **Unchanged** |
| `src/model/` — project state, history, migration, validation | **Unchanged** |
| `src/types/` — all TypeScript types | **Unchanged** |
| `src/components/` sidebar, panels, dialogs, properties bar | **Unchanged** |
| `App.tsx` — signals, memos, event wiring, business logic | **Largely unchanged** |

This is not an application rewrite. It is a rendering layer replacement.

---

## Key Design Decisions

### 1. RenderState: Plain Object, Not Signals

The canvas renderer reads from a plain JS object reference — not SolidJS signals. App.tsx writes to this object inside its existing signal update paths, but the canvas loop reads it directly without going through reactivity.

```ts
// src/workspace/renderState.ts
export interface RenderState {
  project: LpProject
  selected: Selection | null
  multiSelectedKeys: ReadonlySet<string>
  hovered: Selection | null
  snapPointPreview: SnapPointPreview | null
  selectionHandlePreview: SelectionHandlePreview | null
  dragState: DragState | null
  annotationScale: number
  textFontSizePx: number
  // ... tool preview state
}
```

App.tsx holds a ref to this object and writes to it. The RAF loop holds the same ref and reads from it. No signals cross the boundary.

### 2. RequestAnimationFrame Loop

The canvas component starts a RAF loop on mount and cancels it on cleanup. It does not re-render in response to signals — it renders continuously at display refresh rate, reading whatever is currently in `renderState`.

```ts
// Pseudocode
onMount(() => {
  let frameId: number
  function frame() {
    renderFrame(ctx, renderState)
    frameId = requestAnimationFrame(frame)
  }
  frameId = requestAnimationFrame(frame)
  onCleanup(() => cancelAnimationFrame(frameId))
})
```

This means drag previews are always current — the loop picks up new state on the next frame (≤16ms), with no signal propagation delay.

### 3. Symbol Geometry: Cached Path2D

`SymbolGlyph.tsx` currently generates SVG path data for ~15 symbol types, evaluated on every reactive pass. In the canvas version, symbol geometry becomes `Path2D` objects cached by `(symbolType, annotationScale)`. The cache is computed once and reused every frame.

```ts
const symbolPathCache = new Map<string, Path2D>()

function getSymbolPath(type: SymbolType, scale: number): Path2D {
  const key = `${type}:${scale}`
  if (!symbolPathCache.has(key)) {
    symbolPathCache.set(key, buildSymbolPath(type, scale))
  }
  return symbolPathCache.get(key)!
}
```

This is a meaningful performance gain over the current approach: geometry is computed once per (type, scale) combination for the lifetime of the session, versus on every reactive update.

### 4. Hit Testing

SVG currently provides browser-native hit testing. Canvas does not — you own it. However, `src/lib/selection/hitTest.ts` already implements geometric hit testing in JS, and `src/lib/annotationHitTest.ts` already does manual AABB and distance checks. The infrastructure is already there and already used. No new hit testing logic is needed.

### 5. Device Pixel Ratio

Canvas must be sized at `width * devicePixelRatio` internally while displaying at CSS pixel dimensions, otherwise lines appear blurry at high DPI. The canvas element width/height attributes are set in physical pixels; CSS width/height are set in logical pixels; `ctx.scale(dpr, dpr)` is called at the start of each frame.

```ts
const dpr = window.devicePixelRatio ?? 1
canvas.width = cssWidth * dpr
canvas.height = cssHeight * dpr
ctx.scale(dpr, dpr)
```

### 6. Text Rendering

Canvas `ctx.fillText()` replaces SVG text elements. Alignment offsets that SVG handles via `dominant-baseline` and `text-anchor` must be computed manually — but `src/lib/textLayout.ts` already approximates text dimensions, so the codebase is already somewhat insulated from SVG text specifics. Text rendering on canvas is generally faster than SVG for many elements.

### 7. Pan/Zoom Transform

Currently applied as a CSS `transform` on `.camera-layer`. In the canvas version, the same pan/zoom is applied as a canvas context transform at the start of each frame:

```ts
ctx.translate(view.pan.x * dpr, view.pan.y * dpr)
ctx.scale(view.zoom, view.zoom)
```

All draw functions then work in document coordinates, same as now.

### 8. Draw Order / Layering

The current SVG overlay renders in component order. The canvas version makes layering explicit:

```
1. Lines
2. Arcs
3. Curves
4. Arrows
5. Symbols
6. Marks
7. Texts
8. Dimension texts
9. Legends
10. General notes
--- selection/hover pass ---
11. Selection highlights (re-draw selected elements with highlight style)
12. Selection handles
13. Snap marker
14. Tool previews (line preview, arc chord, path previews, etc.)
```

Layers 11–14 are always drawn on top regardless of element type, which is cleaner than the current per-element `isSelected()` checks.

---

## What You Gain

- **No compositing flicker** — the canvas element is its own GPU compositing layer by definition, isolated from all DOM repaints
- **Consistent 60fps** — RAF loop draws at display refresh rate regardless of signal churn
- **Path2D symbol caching** — geometry computed once per (type, scale), reused every frame
- **Simpler selection rendering** — one draw pass for all elements, one pass for highlights, no per-element conditional branches
- **Foundation for scale** — Canvas 2D handles thousands of elements with stable frame times; WebGL is a further step if ever needed

## What You Give Up

- **SVG accessibility** — SVG elements can carry ARIA roles; a canvas is a pixel black box to screen readers. Acceptable for a technical drawing tool; a separate accessible summary of the drawing could be offered if needed.
- **Browser-native crisp scaling** — SVG is resolution-independent; canvas requires explicit DPI handling (addressed in design decision 5 above)
- **Free CSS styling of elements** — SVG strokes/fills are styleable via CSS; canvas uses imperative draw calls. Not currently used in meaningful ways in the overlay.

---

## Implementation Strategy

### Phase 0: Worktree Setup
Create a new git worktree (`workspace-v2` or similar). All implementation happens in isolation from main. A feature flag swaps `<OverlayLayer>` for `<WorkspaceCanvas>` so both renderers can coexist during development for visual comparison.

### Phase 1: Infrastructure
- `src/workspace/WorkspaceCanvas.tsx` — canvas element, RAF loop, DPI handling, pan/zoom transform
- `src/workspace/renderState.ts` — RenderState type definition
- `src/workspace/renderFrame.ts` — top-level frame function, calls all draw functions in order
- Wire `renderState` writes into `App.tsx` alongside existing signal updates

### Phase 2: Primitive Elements
Implement draw functions for the simple element types first, establish patterns:
- Lines (`src/workspace/render/lines.ts`)
- Arcs (`src/workspace/render/arcs.ts`)
- Curves (`src/workspace/render/curves.ts`)
- Arrows (`src/workspace/render/arrows.ts`)
- Marks (`src/workspace/render/marks.ts`)

### Phase 3: Complex Elements
- Symbols with Path2D cache (`src/workspace/render/symbols.ts`) — most complex; ~15 symbol types
- Texts and dimension texts (`src/workspace/render/texts.ts`)
- Legends and general notes (`src/workspace/render/legends.ts`)

### Phase 4: Interactive Overlays
- Selection highlights and handles
- Snap marker
- All tool previews (line preview, arc, path previews, calibration line, direction handle)
- Construction overlays (linear auto-spacing, measure path)

### Phase 5: Parity Verification & Cutover
- Visual comparison against SVG renderer (feature flag makes this easy)
- Remove SVG overlay components
- Remove feature flag

---

## Files To Be Created

```
src/workspace/
  WorkspaceCanvas.tsx        — canvas element, RAF loop, resize handling
  renderState.ts             — RenderState type, createRenderState()
  renderFrame.ts             — top-level render orchestration
  render/
    lines.ts
    arcs.ts
    curves.ts
    arrows.ts
    marks.ts
    symbols.ts               — Path2D cache + ~15 symbol draw functions
    texts.ts
    dimensionTexts.ts
    legends.ts
    generalNotes.ts
    selection.ts             — highlight pass, handles
    toolPreviews.ts          — snap marker, line/arc/path previews
    pathPreviews.ts          — measure, mark, linear auto-spacing paths
```

## Files To Be Deleted (after cutover)

```
src/components/overlay/
  OverlayLayer.tsx (replaced by WorkspaceCanvas)
  ArcsOverlay.tsx
  ArrowsOverlay.tsx
  CurvesOverlay.tsx
  DimensionTextsOverlay.tsx
  GeneralNotesOverlay.tsx
  LegendsOverlay.tsx
  LinesOverlay.tsx
  MarksOverlay.tsx
  OverlayBranches.test.tsx
  OverlayDefs.tsx
  PathPreviewsOverlay.tsx
  SymbolsOverlay.tsx
  TextsOverlay.tsx
  ToolPreviewsOverlay.tsx
src/components/SymbolGlyph.tsx (replaced by workspace/render/symbols.ts)
```

---

## Open Questions

1. **Export pipeline**: The current PDF/image export renders the SVG overlay onto a canvas for flattening. With a canvas-based renderer, export becomes simpler — the workspace canvas itself can be used directly. But this needs to be verified against the export pipeline in `src/lib/export.ts`.

2. **OverlayBranches tests**: `src/components/overlay/OverlayBranches.test.tsx` tests SVG rendering behavior. Canvas rendering is harder to unit test at the element level. A strategy for testing the new renderer needs to be decided — likely integration/visual tests rather than DOM assertion tests.

3. **Legend and general notes drag**: These UI elements can be dragged to reposition. Currently they are SVG elements receiving pointer events indirectly via the stage. In the canvas version, their drag handling is already in the pointer controllers — but the visual drag affordance needs consideration.

4. **Annotation edit dialog positioning**: The `AnnotationEditDialog` is positioned relative to the selected element's screen coordinates. This currently works by reading element document coordinates and transforming to screen. This mechanism is unchanged — it doesn't depend on SVG.
