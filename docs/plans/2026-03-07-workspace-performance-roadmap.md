# Workspace Performance Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve workspace performance in phases so the team can capture reusable near-term wins now, then make an informed go/no-go decision on a full canvas workspace redesign.

**Architecture:** Keep the current SolidJS + SVG workspace for the first phase, focusing on hot-path reductions that also carry forward into a future renderer swap. For the redesign path, do not build a second unrelated drawing stack; extract shared canvas drawing primitives from the existing export renderer in `src/lib/export.ts`, prove them in a feature-flagged workspace spike, and only then decide whether to cut over the live renderer.

**Tech Stack:** SolidJS, TypeScript, Vite, SVG, Canvas 2D, Vitest, Playwright, pdfjs-dist, pdf-lib

---

## Roadmap Summary

### Phase A: Reusable Targeted Enhancements

Purpose:
- Deliver immediate user-visible improvement on the current workspace.
- Only do work that remains useful even if `workspace_v2` happens later.

Expected effort:
- Roughly 3-6 focused development days, including verification.

Primary outputs:
- Pointer-move throttling
- Deferred drag commit / transient drag render state
- Measured before/after benchmark numbers
- Optional low-risk compositor tweak

### Phase B: Canvas Workspace Spike

Purpose:
- Answer the real architecture question with code, not speculation.
- Prove whether a canvas renderer meaningfully outperforms the current SVG path without destabilizing export or interaction logic.

Expected effort:
- Roughly 1-2 weeks for a serious spike with parity checks.

Primary outputs:
- Shared canvas draw core extracted from export
- Feature-flagged read-only or mostly-read-only workspace canvas
- Measured comparison against the SVG renderer

### Phase C: Full Canvas Cutover

Purpose:
- Replace the interactive SVG renderer only if the spike proves enough benefit.

Expected effort:
- Roughly 3-6 additional weeks after a successful spike.

Primary outputs:
- Canvas-based interactive renderer
- Reworked test strategy
- SVG overlay removal

### Recommendation

- Execute Phase A now.
- Limit Phase A to reusable work; do not spend much time on SVG-only polish.
- Start Phase B only after Phase A benchmark results are in hand.
- Do not commit to Phase C until the Phase B spike proves renderer parity, export alignment, and a testable path forward.

---

## Decision Gates

### Gate 1: After Phase A

Proceed to Phase B if one or more are true:
- Drag flicker is still visible in real usage.
- Pointer-heavy interactions still feel sluggish on representative drawings.
- Benchmarks show Phase A helped, but not enough.

Stop after Phase A if all are true:
- Drag flicker is effectively gone.
- Move/edit interactions are acceptably smooth on representative files.
- Memory and CPU behavior are acceptable for expected project sizes.

### Gate 2: After Phase B

Proceed to Phase C only if all are true:
- The canvas spike clearly improves frame stability or CPU cost on representative drawings.
- Export can share draw primitives rather than diverging into a second canvas implementation.
- Interactive parity gaps are understood and bounded.
- A replacement test strategy is practical.

Stop at Phase B if any are true:
- Gains are small relative to complexity.
- Shared draw-core extraction is awkward or fragile.
- Too many interaction or testing concerns remain open.

---

## Phase A: Reusable Targeted Enhancements

### Task 1: Define Performance Baseline and Success Criteria

**Files:**
- Modify: `performance-enhancements.md`
- Create: `docs/plans/2026-03-07-workspace-performance-benchmark-notes.md`

**Step 1: Record benchmark scenarios**

Document 3 reproducible scenarios:
- medium drawing with drag/move edits
- dense drawing with hover/snap activity
- multi-page PDF with common page changes and zoom

**Step 2: Define what to measure**

Capture:
- visible drag flicker: yes/no
- pointermove frame pacing: subjective plus DevTools profile
- main-thread time during drag
- project clone frequency during drag
- tab memory before/after 5 minutes of interaction

**Step 3: Define success criteria**

Write down explicit thresholds, for example:
- no obvious PDF flicker during drag
- at most one project commit per drag, not per frame
- pointermove processing capped to one visual frame

**Step 4: Save baseline notes**

Write the results before touching code.

**Step 5: Commit**

```bash
git add performance-enhancements.md docs/plans/2026-03-07-workspace-performance-benchmark-notes.md
git commit -m "docs: record workspace performance benchmark baseline"
```

### Task 2: Apply the Low-Risk Compositing Isolation Experiment

**Files:**
- Modify: `src/App.css`
- Test: visual verification only, plus existing workspace tests

**Step 1: Add the smallest compositor tweak**

Add the isolated `pdf-layer` styling experiment described in `performance-enhancements.md`.

**Step 2: Verify no visual regression**

Run:

```bash
npm run build
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx
```

Expected:
- build passes
- interaction suites still pass

**Step 3: Compare against baseline**

Repeat the drag flicker scenario and record whether the symptom improved.

**Step 4: Keep or drop the tweak**

If it has no measurable effect, remove it instead of carrying dead CSS forward.

**Step 5: Commit**

```bash
git add src/App.css performance-enhancements.md docs/plans/2026-03-07-workspace-performance-benchmark-notes.md
git commit -m "perf: test compositor isolation for workspace pdf layer"
```

### Task 3: Throttle Pointer-Move Work to Animation Frames

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/CanvasStage.tsx`
- Test: `src/App.behavior.test.tsx`
- Test: `src/App.interaction.test.tsx`

**Step 1: Write failing regression tests**

Add tests covering:
- drag behavior still updates correctly under throttled pointer move
- snap preview still resolves correctly under throttled pointer move
- pan/zoom pointer behavior still works

**Step 2: Run the targeted tests to verify red**

Run:

```bash
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx
```

Expected:
- at least the newly added tests fail for the right reason

**Step 3: Implement RAF scheduling**

Split the current pointer-move logic in `src/App.tsx` into:
- event capture
- one-frame-later processing

Do not change business logic yet; only reduce event frequency.

**Step 4: Run tests to verify green**

Run:

```bash
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx
npm run build
```

Expected:
- targeted tests pass
- build passes

**Step 5: Re-run benchmark scenarios**

Compare pointer-heavy interactions to baseline and record the results.

**Step 6: Commit**

```bash
git add src/App.tsx src/components/CanvasStage.tsx src/App.behavior.test.tsx src/App.interaction.test.tsx docs/plans/2026-03-07-workspace-performance-benchmark-notes.md
git commit -m "perf: throttle workspace pointer move updates to animation frames"
```

### Task 4: Remove Per-Frame Project Cloning During Drag

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/controllers/pointer/handleSelectPointer.ts`
- Modify: `src/components/overlay/*.tsx` as needed
- Modify: `src/components/overlay/types.ts`
- Test: `src/App.behavior.test.tsx`
- Test: `src/App.interaction.test.tsx`

**Step 1: Write failing drag-regression tests**

Cover:
- move drag commits the final geometry once on pointer-up
- handle-edit drag commits final geometry once on pointer-up
- undo/redo semantics remain unchanged
- legends/general notes stay visually aligned while dragging affected selections

**Step 2: Run the targeted tests to verify red**

Run:

```bash
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx
```

Expected:
- newly added drag tests fail before implementation

**Step 3: Introduce transient drag render state**

Implement a lightweight drag-time visual state in `src/App.tsx`, for example:
- `dragDelta`
- optional transient selection-handle preview state

Do not mutate `project()` on every frame.

**Step 4: Render transient drag state without committing project**

Keep the persisted project stable during drag, and only commit once on `pointerup`.

**Step 5: Run tests to verify green**

Run:

```bash
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx
npm run build
```

Expected:
- targeted tests pass
- build passes

**Step 6: Re-run benchmark scenarios**

Confirm:
- no full-project clone on every move
- interaction feels smoother
- flicker is reduced or eliminated

**Step 7: Commit**

```bash
git add src/App.tsx src/controllers/pointer/handleSelectPointer.ts src/components/overlay src/App.behavior.test.tsx src/App.interaction.test.tsx docs/plans/2026-03-07-workspace-performance-benchmark-notes.md
git commit -m "perf: defer workspace drag commits until pointer release"
```

### Task 5: Tune History Cost Only If Still Needed

**Files:**
- Modify: `src/App.tsx`
- Modify: `performance-enhancements.md`
- Test: `src/model/history.transactions.integration.test.ts`

**Step 1: Decide whether memory still justifies this task**

Only continue if Phase A measurements still show unacceptable memory cost.

**Step 2: Write a small regression test if history limits change**

Verify undo/redo depth behaves as expected after a smaller history cap.

**Step 3: Implement the minimum viable change**

Prefer a smaller `MAX_HISTORY` first.

Do not start diff-based history in this phase.

**Step 4: Verify**

Run:

```bash
npx vitest run src/model/history.transactions.integration.test.ts src/App.behavior.test.tsx
npm run build
```

**Step 5: Commit**

```bash
git add src/App.tsx src/model/history.transactions.integration.test.ts performance-enhancements.md docs/plans/2026-03-07-workspace-performance-benchmark-notes.md
git commit -m "perf: tune workspace history retention"
```

---

## Phase B: Canvas Workspace Spike

### Task 6: Extract Shared Canvas Drawing Primitives From Export

**Files:**
- Create: `src/workspace/renderCore/*.ts`
- Modify: `src/lib/export.ts`
- Test: `src/lib/export.integration.test.ts`
- Test: `src/lib/export.regression.test.ts`
- Test: `src/lib/export.wrappers.test.ts`
- Test: `src/lib/export.pdf.test.ts`

**Step 1: Write a no-behavior-change test safety net**

Add or extend export tests to lock down:
- symbols
- text
- dimensions
- legends
- general notes

**Step 2: Run export tests to verify baseline**

Run:

```bash
npx vitest run src/lib/export.integration.test.ts src/lib/export.regression.test.ts src/lib/export.wrappers.test.ts src/lib/export.pdf.test.ts
```

Expected:
- all pass before refactor

**Step 3: Extract shared draw functions**

Move reusable draw logic out of `src/lib/export.ts` into a shared canvas render core.

Important constraint:
- export must continue to own PDF composition rules
- workspace and export must share draw primitives, not duplicate them

**Step 4: Re-run export tests**

Run the same command as Step 2.

Expected:
- all export tests still pass

**Step 5: Commit**

```bash
git add src/lib/export.ts src/workspace/renderCore src/lib/export.integration.test.ts src/lib/export.regression.test.ts src/lib/export.wrappers.test.ts src/lib/export.pdf.test.ts
git commit -m "refactor: extract shared canvas draw core from export renderer"
```

### Task 7: Build a Feature-Flagged Read-Only Workspace Canvas

**Files:**
- Create: `src/workspace/WorkspaceCanvas.tsx`
- Create: `src/workspace/renderState.ts`
- Create: `src/workspace/renderFrame.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/config/*` or feature-flag location
- Test: `src/App.file-actions.test.tsx`
- Test: create `src/workspace/WorkspaceCanvas.test.tsx`

**Step 1: Write failing renderer-mount tests**

Cover:
- feature flag swaps the workspace renderer
- the canvas mounts at the correct PDF dimensions
- pan/zoom transform still affects the workspace view correctly

**Step 2: Run targeted tests to verify red**

Run:

```bash
npx vitest run src/App.file-actions.test.tsx src/workspace/WorkspaceCanvas.test.tsx
```

**Step 3: Implement invalidation-driven rendering**

Do not run a perpetual idle repaint loop.

Instead:
- schedule RAF only when render state changes
- cancel/reuse pending RAF work when more state arrives

**Step 4: Use shared draw core for read-only project rendering**

Render persisted geometry only.
Do not move previews or selection chrome yet.

**Step 5: Re-run tests**

Run the same command as Step 2 plus:

```bash
npm run build
```

**Step 6: Manual parity check**

Use the feature flag to compare:
- SVG workspace
- canvas workspace

on the same files and pages.

**Step 7: Commit**

```bash
git add src/workspace src/App.tsx src/components/CanvasStage.tsx src/App.file-actions.test.tsx
git commit -m "feat: add feature-flagged read-only workspace canvas spike"
```

### Task 8: Add Selection, Hover, and Preview Layers to the Spike

**Files:**
- Modify: `src/workspace/renderFrame.ts`
- Create: `src/workspace/render/selection.ts`
- Create: `src/workspace/render/toolPreviews.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/overlay/types.ts` or replace with workspace renderer types
- Test: `src/App.behavior.test.tsx`
- Test: `src/App.interaction.test.tsx`

**Step 1: Write failing interaction tests for the spike**

Cover the minimum viable parity set:
- selected element highlight
- hover highlight
- snap marker
- selection handles
- line/arrow preview
- dimension preview

**Step 2: Run targeted tests to verify red**

Run:

```bash
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx
```

**Step 3: Implement canvas overlay passes**

Add explicit draw passes for:
- selection/hover
- handles
- snap marker
- tool previews

**Step 4: Re-run tests and benchmark**

Run:

```bash
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx
npm run build
```

Then compare frame stability against the SVG renderer.

**Step 5: Commit**

```bash
git add src/workspace src/App.tsx src/App.behavior.test.tsx src/App.interaction.test.tsx docs/plans/2026-03-07-workspace-performance-benchmark-notes.md
git commit -m "feat: extend workspace canvas spike with interactive overlays"
```

### Task 9: Decide Whether the Spike Justifies Full Replacement

**Files:**
- Modify: `workspace-redesign.md`
- Modify: `docs/plans/2026-03-07-workspace-performance-benchmark-notes.md`

**Step 1: Compare SVG and canvas against the same scenarios**

Record:
- frame pacing
- CPU cost
- visual parity gaps
- code complexity observations
- testing pain points

**Step 2: Write the go/no-go decision**

Be explicit:
- continue to Phase C
- or stop after Phase B and keep SVG plus Phase A wins

**Step 3: Commit**

```bash
git add workspace-redesign.md docs/plans/2026-03-07-workspace-performance-benchmark-notes.md
git commit -m "docs: record workspace canvas spike decision"
```

---

## Phase C: Full Canvas Cutover

### Task 10: Replace SVG-Coupled Tests With Renderer-Agnostic Coverage

**Files:**
- Modify: `src/App.behavior.test.tsx`
- Modify: `src/App.interaction.test.tsx`
- Delete: `src/components/overlay/OverlayBranches.test.tsx`
- Delete or rewrite: `src/components/SymbolGlyph.test.tsx`
- Create: `src/workspace/*.test.ts`
- Create or extend: Playwright visual parity tests under `tests/` or existing e2e locations

**Step 1: Identify SVG-only assertions**

Replace DOM-shape assertions with:
- geometry or state assertions
- canvas-op assertions where practical
- visual/e2e checks where DOM assertions no longer make sense

**Step 2: Land the new tests before deleting old ones**

Do not remove the SVG tests until equivalent coverage exists.

**Step 3: Verify**

Run:

```bash
npm test
npm run test:e2e
```

**Step 4: Commit**

```bash
git add src/App.behavior.test.tsx src/App.interaction.test.tsx src/workspace tests
git rm src/components/overlay/OverlayBranches.test.tsx src/components/SymbolGlyph.test.tsx
git commit -m "test: migrate workspace renderer coverage away from svg-specific assertions"
```

### Task 11: Cut Over the Live Workspace Renderer

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/CanvasStage.tsx`
- Delete: `src/components/OverlayLayer.tsx`
- Delete: `src/components/overlay/*.tsx`
- Delete: `src/components/SymbolGlyph.tsx`
- Modify: any renderer-flag configuration

**Step 1: Remove the feature flag**

Make `WorkspaceCanvas` the live renderer.

**Step 2: Remove dead SVG code**

Delete overlay branches only after the canvas path is verified.

**Step 3: Verify full app behavior**

Run:

```bash
npm run build
npm test
npm run test:e2e
```

Expected:
- all pass

**Step 4: Commit**

```bash
git add src/App.tsx src/components/CanvasStage.tsx src/workspace
git rm src/components/OverlayLayer.tsx src/components/overlay/*.tsx src/components/SymbolGlyph.tsx
git commit -m "feat: replace svg workspace overlay with canvas renderer"
```

### Task 12: Reconcile Export and Workspace Rendering Contracts

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/workspace/renderCore/*.ts`
- Modify: export tests as needed

**Step 1: Confirm one shared draw core remains**

Ensure export and live workspace still share the same geometry drawing functions.

**Step 2: Verify no interactive chrome leaks into export**

Specifically confirm exports exclude:
- selection highlight
- handles
- snap marker
- tool previews

**Step 3: Verify**

Run:

```bash
npx vitest run src/lib/export.integration.test.ts src/lib/export.regression.test.ts src/lib/export.wrappers.test.ts src/lib/export.pdf.test.ts
npm run build
```

**Step 4: Commit**

```bash
git add src/lib/export.ts src/workspace/renderCore src/lib/export.integration.test.ts src/lib/export.regression.test.ts src/lib/export.wrappers.test.ts src/lib/export.pdf.test.ts
git commit -m "refactor: finalize shared draw core for workspace and export"
```

---

## Practical Guidance

- If the priority is immediate relief with low risk, stop after Tasks 1-4.
- If the priority is answering the architecture question with evidence, do Tasks 1-9.
- Do not start Tasks 10-12 unless Task 9 concludes that the canvas spike is clearly worth it.
- The most reusable work is Task 3 and Task 4.
- The most likely throwaway work is the CSS-only compositor tweak in Task 2.

