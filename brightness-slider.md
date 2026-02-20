# PDF Background Brightness Slider

## Overview

Add a slider control that adjusts the brightness (opacity) of the PDF background image. The effect must be visible both in the live canvas view and in exported documents (image and PDF).

## Setting

Add `pdfBrightness` to `ProjectSettings` in `src/types/project.ts`:

- Type: `number`
- Range: `0` (fully washed out / white) to `1` (full brightness, no dimming)
- Default: `1`
- This value is persisted in the project JSON and participates in undo/redo like other settings.

Update the JSON schema in `src/lib/schema.ts` (or wherever the project schema is validated) to include the new field.

## Implementation: Three Paths

### 1. Live View (CSS opacity on the PDF canvas)

**File:** `src/App.tsx` (or `src/components/CanvasStage.tsx` — wherever `pdfCanvasRef` is rendered)

Apply an inline `opacity` style on the `<canvas>` element that displays the PDF background:

```tsx
<canvas
  ref={setPdfCanvasRef}
  style={{ opacity: project().settings.pdfBrightness }}
/>
```

The canvas already sits on a white page background, so reducing opacity naturally fades the PDF toward white. No re-rendering of the PDF is needed — the slider adjusts in real time via CSS.

### 2. Image Export (canvas globalAlpha)

**File:** `src/lib/export.ts` — inside `renderProjectCanvas()`

Before drawing the background canvas onto the export canvas, set `globalAlpha` to the brightness value, then restore it:

```ts
if (options.includeBackground) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, widthPt, heightPt)

  if (options.backgroundCanvas) {
    ctx.globalAlpha = pdfBrightness   // <-- add this
    ctx.drawImage(options.backgroundCanvas, 0, 0, widthPt, heightPt)
    ctx.globalAlpha = 1.0             // <-- restore
  }
}
```

The `pdfBrightness` value needs to be passed through — either via `options` or by reading it from the `project` that's already passed to `exportProjectImage`.

### 3. PDF Export (pdf-lib white overlay rectangle)

**File:** `src/lib/export.ts` — inside `exportProjectPdf()`

After loading the source PDF document but **before** drawing the annotation overlay image, draw a semi-transparent white rectangle over the entire page:

```ts
if (hasSourcePdf && pdfBrightness < 1) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
    color: rgb(1, 1, 1),                // white
    opacity: 1 - pdfBrightness,         // inverse: 0 brightness = fully opaque white
  })
}
```

`rgb` is imported from `pdf-lib`. The draw order becomes:
1. Existing PDF page content (already in the loaded document)
2. White wash rectangle (new — only if brightness < 1)
3. Annotation overlay image (existing `page.drawImage` call)

## UI: Slider Control

Add a slider to the sidebar. Likely placement: the **Style** panel or the **Project** panel (wherever background/PDF settings live).

```tsx
<div class="slider-row">
  <span class="slider-label">Background</span>
  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={props.project.settings.pdfBrightness}
    onInput={(e) => props.onSetPdfBrightness(parseFloat(e.currentTarget.value))}
  />
</div>
```

Wire up `onSetPdfBrightness` through the props chain like other settings handlers — it should update `project.settings.pdfBrightness` and push to the undo history.

## Math Summary

| pdfBrightness | CSS opacity | canvas globalAlpha | pdf-lib white rect opacity |
|---------------|-------------|--------------------|---------------------------|
| 1.0 (default) | 1.0 | 1.0 | not drawn |
| 0.75 | 0.75 | 0.75 | 0.25 |
| 0.5 | 0.5 | 0.5 | 0.5 |
| 0.25 | 0.25 | 0.25 | 0.75 |
| 0.0 | 0.0 | 0.0 | 1.0 (fully white) |

All three paths produce the same visual result: original content blended toward white by the same ratio.

## Files to Touch

1. `src/types/project.ts` — add `pdfBrightness` to `ProjectSettings`
2. `src/lib/schema.ts` (or equivalent) — update JSON schema validation
3. `src/App.tsx` — apply CSS opacity to `pdfCanvasRef` canvas, add `onSetPdfBrightness` handler
4. `src/lib/export.ts` — `renderProjectCanvas()` for image export, `exportProjectPdf()` for PDF export
5. Sidebar panel component — add the slider UI and prop wiring
6. `src/components/sidebar/types.ts` — add `onSetPdfBrightness` to `AppSidebarProps`
