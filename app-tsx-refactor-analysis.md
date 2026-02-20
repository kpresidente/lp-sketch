# App.tsx Refactor Analysis

## Overview

`src/App.tsx` is **5,497 lines** — the entire application brain. It holds all reactive state, all event handlers, all tool interaction logic, all memos, two floating dialog components, and the root JSX tree. Everything that doesn't fit neatly into a pure lib function ended up here.

The good news: the surrounding architecture is already well-structured. The `lib/`, `model/`, `components/overlay/`, and `components/sidebar/` directories are clean. App.tsx is the one monolith in an otherwise organized codebase.

---

## Current Internal Structure

The file has a clear internal shape even if it's never been split:

| Lines | Content |
|-------|---------|
| 1–122 | Imports |
| 123–187 | Module-level constants (`TOOL_OPTIONS`, `SYMBOL_OPTIONS`, snap constants, dialog constants) |
| 188–323 | Module-level types (internal App state shapes) |
| 324–581 | Module-level pure functions |
| 583–645 | `App()` begins: ~60 signal declarations |
| 638–645 | Mutable ref variables |
| 647–816 | Derived memos |
| 818–960 | Core helpers: `commitProjectChange`, `replaceProject`, `clearTransientToolState`, etc. |
| 970–1092 | PDF rendering subsystem (async, versioned, with effects & cleanup) |
| 1094–1120 | Coordinate conversion helpers |
| 1122–1800 | Snap resolution: `resolveSnapPoint`, `resolveInputPoint` |
| ~1800–2400 | Drag/edit-handle logic: `handleDragEditHandle`, `hitTest` |
| ~2400–2600 | Annotation editor logic + legend label dialog logic |
| ~2600–2800 | File I/O handlers: import PDF, load/save project, export image/PDF |
| ~2800–3200 | Auto-spacing subsystem: linear AT, arc AT, mark clearing |
| ~3200–4200 | Pointer event handlers: `handleToolPointerDown/Move/Up/Cancel`, wheel, double-click |
| ~4400–4700 | Preview memos (one per tool) + `createEffect` hooks for selection sync |
| 4700–4718 | `stageCursor` memo |
| 4719–~5200 | Sidebar action handlers (all the `handle*` wrappers passed to AppSidebar) |
| ~5200–5495 | JSX return: AppSidebar, CanvasStage, OverlayLayer, floating dialogs |

---

## What's Already Well-Separated

Before recommending changes, it's worth noting what's already clean:

- **`src/lib/`** — Pure computation (geometry, spacing, scale, legend, export, auto-connectors, dimension text, etc.). No reactive code.
- **`src/model/`** — Project creation, validation, migration, undo history.
- **`src/components/overlay/`** — One file per SVG element type (lines, arcs, curves, symbols, etc.). Well-decomposed.
- **`src/components/sidebar/`** — One file per panel. All receive props via `AppSidebarProps`.
- **`src/components/sidebar/tools/`** — One file per tool's options panel.
- **`CanvasStage.tsx`** — Thin layout wrapper with no internal state.

---

## Problems with the Current Structure

### 1. Flat signal sprawl (60+ signals in one block)
All reactive state lives in one undifferentiated list. Signals for PDF rendering, snap state, tool placement, touch gestures, dialogs, measurement, and UI inputs are all adjacent. This makes it hard to understand which signals belong to which subsystem, and hard to find the right state when reading a specific feature.

### 2. `commitProjectChange` context required everywhere
Every handler that modifies the project calls `commitProjectChange`. Since this function closes over `project()`, `setProject`, and `setHistory`, any extracted hook will need it passed in or shared via context. This is the main coupling force that keeps logic inside App.

### 3. Two floating dialogs inline
The annotation editor (`<Show when={annotationEdit()}>`) and legend label dialog (`<Show when={legendLabelEdit()}>`) are rendered in the JSX return but their logic, state, and handlers are scattered throughout the function body. These should be self-contained components.

### 4. Module-level types and pure functions mixed with imports
Types like `DragState`, `SnapPointPreview`, `AnnotationEditState` are defined at module level in App.tsx. Pure functions like `formatDistance`, `pointHitsText`, `legendBoxSize`, `base64ToBytes` are also defined here. Both categories belong in other files.

### 5. ~100-prop `AppSidebarProps` interface
The sidebar communication model works, but it requires threading every data value and callback through a single massive interface. Adding any new setting requires touching: App.tsx (signal + handler + prop), sidebar/types.ts (interface), and the consuming panel component. This is a lot of friction.

### 6. Snap resolution complexity
`resolveSnapPoint` (~lines 1200–1600) and `resolveInputPoint` (~lines 1600–1800) together are ~600 lines of complex logic. They're called from pointer handlers. They close over many signals, which prevents easy extraction as pure functions.

---

## Proposed Extraction Plan

Ordered from lowest risk / highest benefit to highest risk / most structural:

---

### Step 1: Move module-level types to `src/types/appState.ts`
**~135 lines freed from App.tsx**

Move these types out of App.tsx:
- `SelectionHandleTarget`
- `DragState`
- `TouchSpacingPending`
- `TouchGestureState`
- `SnapMarkerKind`, `SnapPointPreview`, `SnapResolution`, `ResolvedInputPoint`, `ResolveSnapPointOptions`
- `AnnotationEditState`
- `TargetDistanceSnapLock`
- `LegendLabelEditState`
- `LegendLabelDialogDragState`

These are pure data shapes with no runtime dependencies. Moving them is zero-risk and makes the types importable from other files if needed later.

Also move related constants that are pure data:
- `ANNOTATION_LAYER_OPTIONS`
- `SNAP_KIND_PRIORITY`
- `LETTERED_SYMBOL_TYPES` (duplicate of `LEGEND_LETTERED_SYMBOL_TYPES` — consolidate)

---

### Step 2: Move module-level pure functions to appropriate lib files
**~200 lines freed from App.tsx**

| Function(s) | Destination |
|---|---|
| `formatDistance`, `formatScaleFeet`, `scaleFeetPerInch` | `src/lib/scale.ts` |
| `base64ToBytes` | `src/lib/files.ts` |
| `clampPdfBrightness` | `src/lib/export.ts` (a version already exists there as `normalizedPdfBrightness` — consolidate) |
| `normalizeNonNegativeIntegerInput`, `normalizeVerticalFootageInput` | `src/lib/inputNormalize.ts` (new, small file) |
| `pointHitsText`, `pointHitsDimensionText` | `src/lib/hitTest.ts` (new) |
| `legendBoxSize`, `legendEditorItemName`, `legendEditorBaseLabel`, `legendLineText` | `src/lib/legendDisplay.ts` (already exists, these belong there) |
| `approximateTextWidth`, `approximateLegendLineWidth` | These are already thin wrappers — inline them at call sites |
| `clampDialogPositionToViewport` | `src/lib/dialog.ts` (new, small file) |
| `syncLegendItems`, `syncAutoConnectors` | `src/model/project.ts` (new, or add to `defaultProject.ts`) |
| `legendSuffixKeyForVariant`, `normalizeSymbolLetter` | `src/lib/legend.ts` (already exists) |

Note: `cloneProject` (a one-liner wrapping `structuredClone`) is only called twice — just inline it.

---

### Step 3: Extract PDF rendering to `src/hooks/usePdfRenderer.ts`
**~120 lines freed from App.tsx**

The PDF rendering subsystem is self-contained: it manages its own versioning, cancellation, and lifecycle. It only needs the `pdfSignature` derived signal and a canvas ref.

```ts
// src/hooks/usePdfRenderer.ts
export function usePdfRenderer(pdfSignature: Accessor<string>, getPdf: () => PdfState) {
  let pdfCanvasRef: HTMLCanvasElement | undefined
  let pdfRenderRequestVersion = 0
  let activePdfRenderTask: { cancel: () => void; promise: Promise<unknown> } | null = null

  // ... renderPdfIntoCanvas, cancelActivePdfRenderTask, createEffect, onCleanup

  return {
    pdfCanvasRef: () => pdfCanvasRef,
    setPdfCanvasRef: (el: HTMLCanvasElement) => { pdfCanvasRef = el },
  }
}
```

App.tsx retains ownership of the `pdfSignature` memo and calls `usePdfRenderer(pdfSignature, () => project().pdf)`.

---

### Step 4: Extract hit testing to `src/lib/hitTest.ts`
**~300 lines freed from App.tsx**

The `hitTest` function is nearly pure — it takes a doc point and the project (plus some tolerance constants) and returns a selection or null. It doesn't depend on signals; it's called with already-resolved values.

Extract `hitTest` and all its helper sub-functions to `src/lib/hitTest.ts`. The pointer handler imports and calls it with explicit arguments.

Also extract `handleDragEditHandle` — which computes what the project looks like during a drag, given the current pointer position and `DragState` — to `src/lib/dragEdit.ts` as a pure function that takes all its inputs explicitly and returns the mutated-project result.

Combined, this removes ~400+ lines of complex logic from App.tsx and makes it independently testable.

---

### Step 5: Extract annotation editor to `src/components/AnnotationEditDialog.tsx`
**~150 lines freed from App.tsx (JSX + logic)**

The annotation editor floating dialog is fully self-contained:
- `annotationEdit` signal (define inside the dialog component or lifted out)
- `applyAnnotationEditor` function
- The `<Show when={annotationEdit()}>` JSX block

```tsx
// src/components/AnnotationEditDialog.tsx
interface AnnotationEditDialogProps {
  edit: AnnotationEditState | null
  onApply: (edit: AnnotationEditState) => void
  onClose: () => void
}
```

The `AnnotationEditState` (position, type, current input) is passed in from App. The dialog manages its own local input signal. On Apply, it calls `onApply` with the final state; App.tsx handles the `commitProjectChange`.

---

### Step 6: Extract legend label editor to `src/components/LegendLabelDialog.tsx`
**~150 lines freed from App.tsx (JSX + logic)**

Same pattern as the annotation editor. This dialog has additional complexity (draggable titlebar, table of entries), but it's still self-contained:
- `legendLabelEdit` signal, `legendLabelDialogDrag` signal
- Dialog drag handlers (`handleLegendLabelDialogPointerDown/Move/Up`)
- `setLegendLabelEditorInput`, `setLegendLabelEditorScreen`, `applyLegendLabelEditor`
- The `<Show when={legendLabelEdit()}>` JSX block

```tsx
// src/components/LegendLabelDialog.tsx
interface LegendLabelDialogProps {
  edit: LegendLabelEditState | null
  project: LpProject
  onApply: (placementId: string, editedLabels: Record<string, string>) => void
  onClose: () => void
}
```

---

### Step 7: Extract file I/O handlers to `src/hooks/useFileHandlers.ts`
**~150 lines freed from App.tsx**

Group `handleImportPdf`, `handleLoadProject`, `handleSaveProject`, `handleExportImage`, `handleExportPdf` into a hook. These share a consistent pattern: read state, mutate via `commitProjectChange` or `replaceProject`, and call lib functions.

```ts
// src/hooks/useFileHandlers.ts
export function useFileHandlers(
  project: Accessor<LpProject>,
  commitProjectChange: (mutator: (draft: LpProject) => void) => void,
  replaceProject: (next: LpProject, resetHistory?: boolean) => void,
  setStatus: (msg: string) => void,
  setError: (msg: string) => void,
  pdfCanvasRef: () => HTMLCanvasElement | undefined,
) {
  return {
    handleImportPdf,
    handleLoadProject,
    handleSaveProject,
    handleExportImage,
    handleExportPdf,
  }
}
```

---

### Step 8: Extract auto-spacing subsystem to `src/hooks/useAutoSpacing.ts`
**~250 lines freed from App.tsx**

The linear auto-spacing and arc auto-spacing code forms a coherent subsystem:
- `linearAutoSpacingVertices`, `linearAutoSpacingCorners`, `arcAutoSpacingTargetId` signals
- `resetLinearAutoSpacingTrace`
- `resolveLinearAutoSpacingMaxIntervalPt`
- `computeAutoSpacedAirTerminalsToPlace`
- `placeAutoSpacedAirTerminals`
- `finishLinearAutoSpacing` (including closed-path variant)
- `applyArcAutoSpacing`
- The distance/label memos: `linearAutoSpacingPathDistancePt`, `linearAutoSpacingPathDistanceLabel`

This hook takes `project()`, `commitProjectChange`, `linearAutoSpacingMaxInput`, `arcAutoSpacingMaxInput`, and returns the signals and handlers.

---

### Step 9: Extract preview memos to `src/hooks/usePreviews.ts`
**~300 lines freed from App.tsx**

All tool-active preview memos are computed from current signal values and project state:
- `curveChordPreview`
- `arcChordPreview`
- `directionPreview`
- `arrowPreview`
- `calibrationLinePreview`
- `measurePathPreview`
- `markPathPreview`
- `linearAutoSpacingPathPreview`

These memos are consumed by `OverlayLayer`. Extracting them as a hook keeps the preview computation out of App and makes each preview independently readable.

---

### Step 10 (Advanced): Replace `AppSidebarProps` with SolidJS Context
**Most structural change; breaks the 100-prop interface**

Currently, every data value and callback in the sidebar flows through `AppSidebarProps`. This works, but it means:
- Adding one setting requires touching 3–4 files
- All panel components are tightly coupled to the full interface

With SolidJS Context:
1. Create `src/context/AppContext.tsx` with a `createContext` holding all shared state
2. Provide the context once at the App level
3. Each sidebar panel reads only the signals it needs via `useAppContext()`

This would eliminate `AppSidebarProps` entirely and make individual panels much more self-contained. However, it's a larger refactor that touches every panel component and changes the testing model.

**Recommendation:** Do this only after Steps 1–9 are complete, as a separate pass.

---

## Estimated Impact by Step

| Step | Lines Removed | Risk | Benefit |
|------|--------------|------|---------|
| 1. Move types to `appState.ts` | ~135 | Very low | Low (code clarity) |
| 2. Move pure functions to lib files | ~200 | Low | Medium (testability) |
| 3. `usePdfRenderer` hook | ~120 | Low | High (PDF subsystem isolated) |
| 4. `hitTest` + `dragEdit` to lib | ~400 | Medium | High (testable, separate) |
| 5. `AnnotationEditDialog` component | ~150 | Low-medium | High (dialog self-contained) |
| 6. `LegendLabelDialog` component | ~150 | Low-medium | High (dialog self-contained) |
| 7. `useFileHandlers` hook | ~150 | Low | Medium |
| 8. `useAutoSpacing` hook | ~250 | Medium | High (subsystem isolated) |
| 9. `usePreviews` hook | ~300 | Medium | Medium |
| 10. SolidJS Context | ~800 (net) | High | Very high |

**Steps 1–7 alone**: App.tsx goes from 5,497 lines to approximately **3,900 lines**, with all removed code in well-tested or independently testable files.

**Steps 1–9**: App.tsx reaches approximately **3,350 lines**.

**Steps 1–10**: App.tsx reaches approximately **2,500 lines**, with the core pointer-handler logic remaining (which is inherently stateful and hard to split further without context).

---

## What Can't Be Easily Extracted

### The pointer handler trio (`handleToolPointerDown/Move/Up`)
Together ~1,000 lines. These are deeply stateful: they read and write many signals in direct response to low-level events. Each tool has a branch in `handleToolPointerDown`. This could theoretically be split into per-tool strategy objects, but that's a fundamentally different architecture (and the current approach works fine).

### The signal block and core helpers
`commitProjectChange`, `replaceProject`, `updateView`, `clearTransientToolState`, and the signal declarations themselves are the backbone of the component. These stay in App.

### Snap resolution
`resolveSnapPoint` and `resolveInputPoint` close over many signals (`project()`, `selected()`, `tool()`, etc.), making them hard to extract as pure functions without significant refactoring of how they receive their inputs. Could be partially extracted into a hook, but the pointer handler would still need to call it inline.

---

## Recommended Implementation Order

Given the risk/benefit profile, a practical sequence would be:

1. **Steps 1 + 2** — Pure refactoring, no behavioral change. Good warm-up.
2. **Step 4** — Extract `hitTest` to `src/lib/hitTest.ts`. High testability value, relatively clean boundary.
3. **Steps 5 + 6** — Extract the two dialogs. Each is a concrete UI improvement.
4. **Step 3** — Extract PDF renderer. Self-contained with clear inputs/outputs.
5. **Steps 7 + 8** — Extract file handlers and auto-spacing. Group related work.
6. **Step 9** — Extract preview memos. Lower priority than dialogs and file handling.
7. **Step 10** — Context API. Do this last as a dedicated architectural pass.

---

## New File List (after full refactor)

```
src/
  types/
    project.ts         (existing)
    appState.ts        (new - internal App state types)
  lib/
    files.ts           (+ base64ToBytes)
    scale.ts           (+ formatDistance, formatScaleFeet, scaleFeetPerInch)
    hitTest.ts         (new - pointHitsText, hitTest and sub-functions)
    dragEdit.ts        (new - handleDragEditHandle as pure function)
    legend.ts          (+ legendSuffixKeyForVariant, normalizeSymbolLetter)
    legendDisplay.ts   (+ legendBoxSize, legendEditorItemName, legendEditorBaseLabel)
    inputNormalize.ts  (new - normalizeNonNegativeIntegerInput, normalizeVerticalFootageInput)
    dialog.ts          (new - clampDialogPositionToViewport)
    export.ts          (consolidate pdfBrightness normalization)
  model/
    project.ts         (new - syncLegendItems, syncAutoConnectors)
  hooks/
    usePdfRenderer.ts  (new)
    useFileHandlers.ts (new)
    useAutoSpacing.ts  (new)
    usePreviews.ts     (new)
  context/
    AppContext.tsx      (new - if Step 10 is done)
  components/
    AnnotationEditDialog.tsx  (new)
    LegendLabelDialog.tsx     (new)
    ... (existing components unchanged)
  App.tsx              (~2,500–3,900 lines depending on steps completed)
```
