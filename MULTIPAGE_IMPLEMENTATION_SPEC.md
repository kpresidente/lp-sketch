# Multi-Page PDF Implementation Spec

## Target Scope

1. True multi-page project editing with page switching.
2. All geometry and annotation placements are page-local.
3. Legend and Notes data scope is globally configurable (`page` vs `global`) via toggles in their existing editors.
4. Scale, zoom/pan, and brightness are per-page.
5. Export outputs only the current page (PNG/JPG/PDF).
6. Max import page count is configurable (default `3`).

## Key UI Requirement (Page Navigator)

Place page navigation inside the **Project** group using inline controls:

- `[Back] [Forward]`
- Current page text: `X of Y` (where `X` is current page and `Y` is total pages)

This control should be simple and always reflect current project page state.

## Current Single-Page Constraints

1. Import rejects multi-page PDFs (`src/hooks/useProjectFileActions.ts`).
2. PDF renderer enforces one page (`src/hooks/usePdfCanvasRenderer.ts`).
3. Schema currently hardcodes PDF page to `1` (`vision/project-schema-v1.json`).
4. Types currently encode `page: 1` literal (`src/types/project.ts`).
5. Stage sizing assumes one global page width/height (`src/components/CanvasStage.tsx`).
6. PDF export draws overlay to first page only (`src/lib/export.ts`).

## Phased Plan

### Phase 1: Foundations and Config

Scope:

1. Add page-limit config and shared page helper primitives.

Implementation:

1. Add `MAX_PDF_IMPORT_PAGES` in `src/config/runtimeLimits.ts` (default `3`).
2. Add helper utilities for current-page lookup and per-page state access.

Exit criteria:

1. Existing single-page behavior remains unchanged.
2. New config is wired and tested.

### Phase 2: Schema, Types, and Migration (v1.9.0)

Scope:

1. Introduce multi-page-capable model.
2. Keep backward compatibility for existing saved projects.

Implementation:

1. Update `src/types/project.ts`.
2. Update `vision/project-schema-v1.json`.
3. Update `src/model/migration.ts`.
4. Update `src/model/defaultProject.ts`.

Recommended data shape:

1. `pdf.pageCount` and `pdf.pages[]` (page number + dimensions).
2. `view.currentPage`.
3. Per-page state map for `zoom`, `pan`, `scale`, and `pdfBrightness`.
4. `page` on all page-bound entities:
   - lines, arcs, curves, symbols, texts, arrows, dimension texts, marks, legend placements, general-notes placements.
5. Global scope toggles:
   - `legendDataScope: 'page' | 'global'`
   - `notesDataScope: 'page' | 'global'`

Exit criteria:

1. Old projects load and migrate cleanly.
2. New projects validate against updated schema.

### Phase 3: Import and PDF Rendering by Current Page

Scope:

1. Import up to configured page max.
2. Render selected page only.

Implementation:

1. Update `src/hooks/useProjectFileActions.ts`:
   - Parse page count.
   - Reject if `numPages > MAX_PDF_IMPORT_PAGES`.
   - Show explicit in-app error when rejected, e.g.
     - `This PDF has {numPages} pages. The maximum supported is {MAX_PDF_IMPORT_PAGES}.`
   - Do not rely on OS/browser-level error messaging for this case.
   - Store page metadata for all imported pages.
   - Initialize per-page view/scale/brightness state.
2. Update `src/hooks/usePdfCanvasRenderer.ts`:
   - Render `getPage(currentPage)` instead of always page 1.

Exit criteria:

1. 2-3 page PDFs import successfully.
2. Switching active page updates background rendering correctly.
3. Over-limit imports always produce clear, actionable in-app error text.

### Phase 4: Sidebar Page Switching UX

Scope:

1. Add page switch controls and page state restore behavior.

Implementation:

1. Add inline navigator in Project group:
   - `[Back] [Forward]`
   - `X of Y` text.
2. Wire controls to `view.currentPage`.
3. On page switch:
   - Clear transient tool state (previews/drag targets/etc.).
   - Restore page-local zoom/pan/scale/brightness.

Exit criteria:

1. Page switching is stable and stateful.
2. No cross-page transient state leaks.

### Phase 5: Page-Local Annotation Runtime

Scope:

1. Ensure all editing/selection/snap behavior is page-local.

Implementation:

1. Assign `page = currentPage` for newly created page-bound elements.
2. Filter working sets by `currentPage` in:
   - overlay rendering
   - selection/hit testing
   - snapping
   - manipulation controllers
3. Validate undo/redo behavior across page switches.

Exit criteria:

1. Users only interact with current page annotations.
2. No snapping/selection across page boundaries.

### Phase 6: Legend and Notes Scope Toggles

Scope:

1. Add global data-scope toggles while keeping placements page-local.

Implementation:

1. Legend:
   - Keep placements page-local.
   - In `page` mode, derive rows/counts from the placement page only.
   - In `global` mode, derive rows/counts from all pages.
2. Notes:
   - Keep placements page-local.
   - In `page` mode, use page-specific notes data.
   - In `global` mode, use shared notes data.
3. Add toggles in existing Legend/Notes editor UIs.
4. Toggle values are global and affect all placements immediately.

Exit criteria:

1. Any toggle change updates all legends/notes across pages.
2. Behavior matches selected scope mode.

### Phase 7: Current-Page-Only Export

Scope:

1. Export only active page for PNG/JPG/PDF.

Implementation:

1. PNG/JPG:
   - Render current page dimensions + current-page annotations.
2. PDF:
   - Use selected source page as background.
   - Overlay current-page annotations only.
3. Update `src/lib/export.ts` to be page-index-aware.

Exit criteria:

1. All exports match active page viewport/content only.
2. No additional pages included in exported output.

### Phase 8: Autosave, Validation, and Regression Hardening

Scope:

1. Final compatibility and reliability hardening.

Implementation:

1. Update autosave normalization/degradation paths for multi-page data (`src/lib/autosave.ts`).
2. Extend tests:
   - unit
   - integration
   - e2e
3. Cover:
   - import limits
   - page switching
   - page-local tools/selection/snap
   - legend/notes scope behavior
   - current-page export output

Exit criteria:

1. CI green.
2. No regressions in existing single-page workflows.

## Risk Focus Areas

1. Hidden single-page assumptions in selection, snapping, and export.
2. Undo/redo semantics during page switching.
3. Legend global aggregation correctness/performance.
4. Autosave size growth with embedded multi-page PDFs.

## Recommendation

1. Keep default max pages at `3`, configurable via one constant.
2. Implement strictly in phase order:
   - model first
   - then import/render
   - then runtime page-local behavior
   - then legend/notes scope
   - then export
   - then hardening.
