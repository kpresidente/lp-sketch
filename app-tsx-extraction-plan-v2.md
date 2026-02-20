# App.tsx Extraction Plan v2

## Snapshot (2026-02-18)

- `src/App.tsx`: **6,183 lines**
- Refactor objective: reduce orchestration complexity without changing runtime behavior.
- Success target: bring `App.tsx` to roughly **2,800–3,400 lines** in staged passes.

## Current Hotspots

1. `134–637`: module constants, local runtime types, pure helpers (still embedded in `App.tsx`).
2. `638–1070`: signal block and core mutators (`commitProjectChange`, `replaceProject`, transient clears).
3. `1070–1192`: PDF render/cancel lifecycle.
4. `1222–1700`: snap + input resolution (`resolveSnapPoint`, `resolveInputPoint`, angle/target-distance behavior).
5. `1875–2492`: selection handle math + hit-testing + move/edit mutations.
6. `2493–3017`: three floating editors (annotation, legend labels, general notes).
7. `3018–3570`: undo/redo, import/export/load/save, auto-spacing orchestration.
8. `3571–4645`: pointer down/move/up/cancel + wheel + double-click (largest risk block).
9. `4646–5528`: preview memos, selection-derived memos, and many sidebar action wrappers.
10. `5528–6183`: very large JSX return with duplicated prop plumbing.

## Guiding Constraints

- Preserve all behavior and test expectations while extracting.
- Prefer extraction by **cohesive subsystem**, not by arbitrary line count.
- Keep state ownership in `App.tsx` until late phases; extract compute/IO/UI first.
- Require test gates at every phase before moving on.

## Phase Plan

### Phase 0: Baseline Freeze and Safety Net

Deliverables:
- Record baseline behavior and run full suite.
- Add/expand focused tests where extraction risk is highest:
  - snap priority / nearest override behavior
  - selection handle editing for line/arrow/arc/curve
  - dialog edit flows (annotation, legend labels, general notes)
  - pointer pan/zoom interaction smoke

Gate:
- `npm run build`
- `npm run test`
- `npm run test:e2e -- e2e/smoke.spec.ts`

### Phase 1: Move Runtime Types and Pure Helpers out of App

Create/move:
- `src/types/appRuntime.ts`
  - `SelectionHandleTarget`, `DragState`, touch/snap/dialog edit state types.
- `src/lib/appUiHelpers.ts`
  - `normalizePointerEvent`, input normalization, dialog clamping, formatting helpers.
- `src/lib/legendDisplay.ts` / `src/lib/legend.ts` additions
  - move legend editor helper functions currently local to `App.tsx`.
- `src/model/projectSync.ts`
  - `syncLegendItems`, `syncAutoConnectors`.

Notes:
- No logic changes; only imports/exports + call-site rewiring.

Expected impact:
- `App.tsx` reduction: ~250–450 lines.

### Phase 2: Extract Floating Editor Dialog Components

Create:
- `src/components/dialogs/AnnotationEditDialog.tsx`
- `src/components/dialogs/LegendLabelDialog.tsx`
- `src/components/dialogs/GeneralNotesDialog.tsx`
- optional shared utility: `src/components/dialogs/useDraggableDialog.ts`

Move from `App.tsx`:
- dialog JSX blocks
- dialog-local drag handlers
- editor input row actions (general notes)

Keep in `App.tsx`:
- `commitProjectChange` mutation callbacks invoked by dialogs.

Expected impact:
- `App.tsx` reduction: ~450–700 lines.

### Phase 3: Extract PDF Rendering Lifecycle

Create:
- `src/hooks/usePdfCanvasRenderer.ts`

Move from `App.tsx`:
- `isPdfRenderCancellation`
- active render-task cancellation lifecycle
- `renderPdfIntoCanvas`
- `createEffect(on(pdfSignature,...))` + cleanup for renderer

Hook API target:
- inputs: `pdfSignature`, `getPdfState`, `setError`
- outputs: `setPdfCanvasRef`

Expected impact:
- `App.tsx` reduction: ~120–220 lines.

### Phase 4: Extract Snap/Input Resolution Engine

Create:
- `src/lib/snapping/resolveSnapPoint.ts`
- `src/lib/snapping/resolveInputPoint.ts`
- `src/lib/snapping/types.ts`

Move from `App.tsx`:
- `resolveSnapPoint`, `snapPoint`
- `resolveTargetDistanceSnap`
- `resolveInputPoint`
- related helper functions (`applyLineAngleConstraint`, event snap toggles, anchor helpers)

Approach:
- Pass a dependency object rather than reading direct signals inside lib functions.
- Keep state writes (`setSnapPointPreview`, lock state updates) centralized in adapter code.

Expected impact:
- `App.tsx` reduction: ~500–800 lines.

### Phase 5: Extract Selection/Hit-Test/Drag Mutation Core

Create:
- `src/lib/selection/hitTest.ts`
- `src/lib/selection/selectionHandles.ts`
- `src/lib/selection/moveSelection.ts`
- `src/lib/selection/zOrder.ts`

Move from `App.tsx`:
- `hitTest`, `hitTestSelectedHandle`
- `selectionHandlePointForProject`, `directionalSymbolHandlePoint`
- `moveSelectionByDelta`, `moveSelectionsByDelta`, handle-edit movement logic
- selection collection + z-order edge checks

Expected impact:
- `App.tsx` reduction: ~650–1,000 lines.

### Phase 6: Decompose Pointer Event Pipeline by Tool Group

Create:
- `src/controllers/pointer/`
  - `handleSelectPointer.ts`
  - `handlePlacementPointer.ts` (line/arc/curve/symbol/text/arrow)
  - `handleMeasurePointer.ts` (measure/mark/auto-spacing)
  - `handleGesturePointer.ts` (touch pan/zoom)

Move from `App.tsx`:
- `handleToolPointerDown/Move/Up/Cancel` branch internals.

Pattern:
- Keep one App-level dispatcher.
- Each module receives explicit `ctx` (signals accessors + mutators + helper fns).

Expected impact:
- `App.tsx` reduction: ~1,000–1,600 lines.

### Phase 7: Extract Project File + Keyboard/Window Effects

Create:
- `src/hooks/useProjectFileActions.ts` (import/export/load/save)
- `src/hooks/useGlobalAppShortcuts.ts` (undo/redo/delete/escape)
- `src/hooks/useDialogResizeSync.ts` (dialog reposition on resize)

Move from `App.tsx`:
- file handlers, drop handler
- `onMount` keyboard/resize wiring

Expected impact:
- `App.tsx` reduction: ~250–500 lines.

### Phase 8: Remove Prop Duplication in UI Composition

Current issue:
- Large duplicate prop blocks passed to both `AppSidebar` and `PropertiesToolOptions`.

Create:
- `src/components/sidebar/createSidebarController.ts` (single object factory)

Apply:
- Build one `sidebarController` object once and spread into both consumers.
- Keep type safety with a shared exported interface.

Expected impact:
- `App.tsx` reduction: ~250–450 lines.
- Lower future churn when adding features.

### Phase 9 (Optional): Context-Based App Controller

Only after Phases 1–8 are stable.

Create:
- `src/context/AppControllerContext.tsx`

Outcome:
- Replace long prop chains across sidebar/property components.

Risk:
- High churn across many components/tests; defer unless maintenance pain remains high.

## Suggested Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8
10. Phase 9 (optional)

## Checkpoints

- After Phase 3: target `App.tsx` <= ~5,000 lines
- After Phase 5: target `App.tsx` <= ~4,000 lines
- After Phase 8: target `App.tsx` <= ~3,000 lines (range 2,800–3,400)

## Out of Scope for v2

- Domain behavior changes (tool UX, snapping rules, connector logic).
- Data schema changes unless required by extraction correctness.
- Visual redesign work.

## Immediate Next Increment

Start with **Phase 1** and keep it behavior-neutral. This yields fast structural wins and minimizes merge risk before touching pointer logic.
