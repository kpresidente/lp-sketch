# Workspace Performance Benchmark Notes

Date: 2026-03-07
Branch: `phase-a-workspace-performance`
Scope: Phase A reusable workspace performance enhancements

## Baseline Verification

Automated baseline before any Phase A code changes:

- `npm run build` passed on 2026-03-07
- `npm test` passed on 2026-03-07
- Vitest result: 44 files, 332 tests passed

This establishes a clean pre-change baseline for the Phase A work. Browser performance profiling below still needs to be run manually in a real browser session because it depends on interactive drag smoothness, repaint behavior, and DevTools timeline data.

## Benchmark Scenarios

### Scenario 1: Medium Drawing Drag And Move Edit

Fixture characteristics:

- single-page PDF loaded
- representative mix of linework, symbols, legend items, and general notes
- at least one selectable line/arrow/symbol with visible handles

Interaction sequence:

1. Select a line or symbol and drag it for 3-5 seconds.
2. Drag one selection handle for 3-5 seconds.
3. Repeat at 100% and 150% zoom.
4. Undo and redo the completed drag.

Primary observations:

- visible PDF flicker during drag
- pointer responsiveness while dragging
- history transaction count per completed drag
- whether legends/general notes stay visually aligned during drag

### Scenario 2: Dense Drawing Hover And Snap Activity

Fixture characteristics:

- dense rooftop/downlead drawing with overlapping snap candidates
- enough nearby geometry to stress hover hit testing and snap preview updates

Interaction sequence:

1. Move the pointer continuously across dense geometry in Select mode.
2. Move the pointer continuously across dense geometry in Line mode.
3. Drag a selected endpoint through several nearby snap targets.

Primary observations:

- hover highlight stability
- snap marker stability
- pointermove frame pacing and subjective smoothness
- main-thread pressure while hover/snap work is active

### Scenario 3: Multi-Page PDF Page Changes And Zoom

Fixture characteristics:

- multi-page PDF project with a representative annotation set

Interaction sequence:

1. Switch pages several times in succession.
2. Zoom in, pan, zoom out, and pan again.
3. Perform a drag on each of two different pages after navigation.

Primary observations:

- page-change responsiveness
- zoom/pan smoothness
- whether drag flicker changes after page switches
- tab memory behavior over a 5-minute mixed interaction session

## Measurement Plan

For each scenario, capture:

- visible drag flicker: `yes` / `no`
- pointermove frame pacing: subjective rating plus DevTools Performance trace when available
- main-thread time during drag: DevTools Performance trace
- project clone frequency during drag: code-path inspection and targeted instrumentation if needed
- tab memory before and after 5 minutes of interaction: browser task manager or memory panel

## Success Criteria

Phase A is successful if all of the following are true:

- no obvious PDF flicker during representative drag operations
- pointermove processing is capped to at most one visual frame
- move and handle-edit drags do not commit project state on every pointermove
- each completed drag produces exactly one undoable history transaction
- hover, snap preview, pan, and zoom behavior remain correct
- 5-minute interaction sessions do not show obvious monotonic memory growth caused by workspace interaction

## Pre-Change Baseline Observations

Current code-path observations before Phase A implementation:

- `handleToolPointerMove()` in `src/App.tsx` performs `cloneProject(drag.sourceProject)` on every move/edit drag frame.
- The same drag path calls `setProject(nextProject)` on every move/edit drag frame.
- This implies project clone frequency is currently one clone plus one full project signal update per processed pointermove during active element drag.

Manual browser-profile baseline still to capture after opening the workspace in a real interactive session:

- visible PDF flicker presence/absence
- DevTools main-thread time during drag
- tab memory before/after 5 minutes

Those manual measurements should be recorded in this file after Task 2, Task 3, and Task 4 so the before/after comparison stays in one place.

## Task 2 Result: PDF Layer Compositing Experiment

Change applied:

- added `will-change: transform` to `.pdf-layer` in `src/App.css`

Automated verification after the change:

- `npm run build` passed on 2026-03-07
- `npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx` passed on 2026-03-07

Browser-effect assessment:

- not yet measured in this headless environment
- keep temporarily pending manual flicker comparison in a real browser session

## Task 3 Result: Pointer-Move RAF Throttling

Behavior change:

- mouse and pen `pointermove` work now queues to `requestAnimationFrame`
- touch move handling stays immediate to avoid regressing gesture and long-press flows
- `pointerup` flushes any queued move for the active pointer before commit logic runs

Regression coverage added:

- pan drag does not update camera state until the next animation frame
- move drag does not mutate line geometry until the next animation frame
- queued move drag flushes the latest pointer position on `pointerup`
- handle-drag snap preview does not appear until the next animation frame

Automated verification after the change:

- `npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx` passed on 2026-03-07
- `npm run build` passed on 2026-03-07

Expected runtime effect:

- pointer-driven workspace updates are capped to one processed move per visual frame for mouse and pen input
- redundant same-frame pointer processing is dropped in favor of the most recent position

## Task 4 Result: Deferred Drag Commit

Behavior change:

- move drags and handle-edit drags now render against a transient preview project instead of committing canonical project state on each move frame
- the preview project is created lazily on the first actual drag frame, not on pointer down
- canonical project state and undo history are updated once on pointer up
- pointer cancel, touch gesture takeover, and transient-state cleanup all clear the preview state

Regression coverage added:

- move-drag frames do not repeatedly clone project state before pointer up
- handle-edit frames do not repeatedly clone project state before pointer up
- legend placement stays visually aligned while drag preview is active

Automated verification after the change:

- `npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx` passed on 2026-03-07
- `npm run build` passed on 2026-03-07

Expected runtime effect:

- active drag no longer performs a full `cloneProject(...)` plus `setProject(...)` on every processed pointermove frame
- drag-time reactive pressure is limited to transient preview updates, with a single canonical commit at drag completion
- each completed drag still produces a single undoable history transaction

## Final Phase A Verification

Fresh verification after completing all Phase A tasks:

- `npm run build` passed on 2026-03-07
- `npm test` passed on 2026-03-07
- Vitest result: 44 files, 338 tests passed

Remaining manual verification still to run in a real browser session:

- visible PDF flicker comparison before/after the `.pdf-layer` compositing change
- DevTools drag trace comparison for main-thread time and frame pacing
- 5-minute interaction memory check under representative workflow
