# Interactive Canvas Cutover Implementation Plan

**Goal:** Deliver full editing-tool parity behind the workspace canvas flag while keeping persisted geometry on canvas and transient interaction visuals on a reduced SVG overlay.

**Architecture:** Keep `WorkspaceCanvas` as the renderer for committed geometry in the flagged path, introduce a new interaction-only SVG overlay for transient visuals, and preserve the existing pointer/controller logic in `App.tsx` and related engines. The work is staged so persisted SVG branches are removed from the flagged path only after their transient replacements are proven by tests.

**Tech Stack:** SolidJS, TypeScript, Canvas 2D, SVG, Vite env flags, Vitest

---

### Task 1: Introduce a Flagged Interaction-Only Overlay

**Files:**
- Create: `src/components/WorkspaceInteractionOverlay.tsx`
- Create: `src/components/WorkspaceInteractionOverlay.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/overlay/types.ts`
- Test: `src/App.behavior.test.tsx`

**Step 1: Write the failing overlay-mount tests**

Add a focused test for the new component:

```tsx
it('renders only transient interaction branches', () => {
  render(() => <WorkspaceInteractionOverlay {...props} />)
  expect(screen.getByLabelText('drawing-interaction-overlay')).toBeTruthy()
  expect(screen.queryByLabelText('drawing-overlay')).toBeNull()
})
```

Add an app-level flagged-path test that proves:

- `WorkspaceCanvas` is mounted
- `WorkspaceInteractionOverlay` is mounted
- the old persisted `OverlayLayer` is not mounted

**Step 2: Run the targeted tests to verify red**

Run:

```bash
npx vitest run src/components/WorkspaceInteractionOverlay.test.tsx src/App.behavior.test.tsx
```

Expected:
- the new overlay tests fail because the interaction-only overlay does not exist yet

**Step 3: Implement the reduced overlay component**

Create `WorkspaceInteractionOverlay.tsx` that keeps only:

- `PathPreviewsOverlay`
- `ToolPreviewsOverlay`
- `OverlayDefs`

and any minimal transient branches required immediately for selection/hover visibility.

Do not include persisted branches:

- `LinesOverlay`
- `ArcsOverlay`
- `CurvesOverlay`
- `SymbolsOverlay`
- `TextsOverlay`
- `DimensionTextsOverlay`
- `ArrowsOverlay`
- `MarksOverlay`
- `LegendsOverlay`
- `GeneralNotesOverlay`

**Step 4: Wire the flagged path to use the reduced overlay**

In `src/App.tsx`, update the flagged renderer stack to mount:

- `WorkspaceCanvas`
- `WorkspaceInteractionOverlay`

while the unflagged path still mounts the existing `OverlayLayer`.

**Step 5: Re-run the targeted tests**

Run:

```bash
npx vitest run src/components/WorkspaceInteractionOverlay.test.tsx src/App.behavior.test.tsx
```

Expected:
- the flagged-path renderer-stack tests pass

**Step 6: Commit**

```bash
git add src/components/WorkspaceInteractionOverlay.tsx src/components/WorkspaceInteractionOverlay.test.tsx src/App.tsx src/components/overlay/types.ts src/App.behavior.test.tsx
git commit -m "feat: add interaction-only overlay for canvas workspace"
```

### Task 2: Restore Selection, Hover, and Snap Affordances Behind the Flag

**Files:**
- Modify: `src/components/WorkspaceInteractionOverlay.tsx`
- Modify: `src/components/overlay/ToolPreviewsOverlay.tsx`
- Modify: `src/components/overlay/types.ts`
- Test: `src/App.interaction.test.tsx`
- Test: `src/components/WorkspaceInteractionOverlay.test.tsx`

**Step 1: Write failing flagged-path interaction tests**

Cover:

```tsx
it('shows selection highlight immediately on click with the canvas flag enabled', async () => {
  // select existing geometry, assert transient highlight appears
})
```

Add flagged versions of high-value existing behaviors:

- hover highlight in select mode
- snap marker while drawing/editing
- selection handles for selected geometry

**Step 2: Run the targeted tests to verify red**

Run:

```bash
npx vitest run src/components/WorkspaceInteractionOverlay.test.tsx src/App.interaction.test.tsx
```

Expected:
- new flagged-path interaction tests fail before selection/hover/snap visuals are restored

**Step 3: Move the required transient branches into the reduced overlay**

Extend `WorkspaceInteractionOverlay` to render the minimal transient branches needed for:

- hover highlight
- selection highlight
- selection handles
- snap markers

Keep the rendering sourced from current app state rather than inventing new state containers.

**Step 4: Re-run the targeted tests**

Run:

```bash
npx vitest run src/components/WorkspaceInteractionOverlay.test.tsx src/App.interaction.test.tsx
```

Expected:
- the flagged selection/hover/snap parity tests pass

**Step 5: Commit**

```bash
git add src/components/WorkspaceInteractionOverlay.tsx src/components/overlay/ToolPreviewsOverlay.tsx src/components/overlay/types.ts src/components/WorkspaceInteractionOverlay.test.tsx src/App.interaction.test.tsx
git commit -m "feat: restore selection and snap affordances for canvas workspace"
```

### Task 3: Restore Preview Parity for Drawing and Editing Tools

**Files:**
- Modify: `src/components/WorkspaceInteractionOverlay.tsx`
- Modify: `src/components/overlay/PathPreviewsOverlay.tsx`
- Modify: `src/components/overlay/ToolPreviewsOverlay.tsx`
- Test: `src/App.interaction.test.tsx`

**Step 1: Write failing flagged-path preview tests**

Add flagged versions of representative preview flows:

- line preview
- arc preview
- arrow preview
- calibration preview
- dimension preview
- handle-drag preview

Example:

```tsx
it('shows live line preview with the canvas flag enabled', async () => {
  // activate line tool, click first point, move pointer, assert preview segment exists
})
```

**Step 2: Run the targeted tests to verify red**

Run:

```bash
npx vitest run src/App.interaction.test.tsx
```

Expected:
- the new flagged preview tests fail before the reduced overlay exposes the necessary preview branches

**Step 3: Complete the reduced overlay’s preview surface**

Ensure `WorkspaceInteractionOverlay` passes through the transient preview props needed by:

- path previews
- tool previews
- selection-handle previews
- debug label where relevant

Do not reintroduce persisted geometry branches.

**Step 4: Re-run the targeted tests**

Run:

```bash
npx vitest run src/App.interaction.test.tsx
```

Expected:
- flagged preview workflows pass

**Step 5: Commit**

```bash
git add src/components/WorkspaceInteractionOverlay.tsx src/components/overlay/PathPreviewsOverlay.tsx src/components/overlay/ToolPreviewsOverlay.tsx src/App.interaction.test.tsx
git commit -m "feat: restore tool previews for canvas workspace"
```

### Task 4: Prove Editing Workflow Parity Under the Flag

**Files:**
- Modify: `src/App.interaction.test.tsx`
- Modify: `src/App.behavior.test.tsx`
- Modify: `src/App.file-actions.test.tsx`
- Modify: `src/workspace/WorkspaceCanvas.test.tsx`

**Step 1: Add high-value flagged-path workflow tests**

Use the existing interaction suite as parity anchors and add flag-enabled coverage for:

- selecting existing geometry
- drag move
- handle edit
- placing line, arrow, text, and symbol annotations
- undo/redo after flagged-path edits
- legend/general-notes editing flows

Do not duplicate every single interaction test in one pass; target the workflows that prove the flagged path is a usable editor.

**Step 2: Run the targeted parity suites to verify red where expected**

Run:

```bash
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx src/App.file-actions.test.tsx src/workspace/WorkspaceCanvas.test.tsx
```

Expected:
- any missing flagged-path parity gaps show up as test failures

**Step 3: Implement the minimum app wiring needed to close parity gaps**

This may include:

- ensuring the flagged path passes the right project slice to the interaction overlay
- ensuring redraw timing stays correct after commits
- ensuring selection/preview props are not accidentally filtered out in the flagged path

Keep business logic ownership in existing controllers and app code.

**Step 4: Re-run the targeted parity suites**

Run:

```bash
npx vitest run src/App.behavior.test.tsx src/App.interaction.test.tsx src/App.file-actions.test.tsx src/workspace/WorkspaceCanvas.test.tsx
```

Expected:
- representative flagged editing workflows pass

**Step 5: Commit**

```bash
git add src/App.behavior.test.tsx src/App.interaction.test.tsx src/App.file-actions.test.tsx src/workspace/WorkspaceCanvas.test.tsx src/App.tsx src/components/WorkspaceInteractionOverlay.tsx
git commit -m "feat: reach editing parity for canvas workspace flag"
```

### Task 5: Final Verification and Cleanup

**Files:**
- Modify: `README.md` if Phase 3 behavior notes are needed
- Modify: `docs/plans/2026-03-08-interactive-canvas-cutover-design.md` only if implementation forced a scoped design change

**Step 1: Run the full verification set**

Run:

```bash
npm run build
npm test
```

Expected:
- build passes
- full suite passes

**Step 2: Audit the flagged renderer path for accidental persisted SVG rendering**

Use code inspection to confirm the flagged path no longer mounts persisted SVG branches.

Verify:

- `WorkspaceCanvas` renders committed geometry
- `WorkspaceInteractionOverlay` is transient-only
- the legacy `OverlayLayer` remains only on the unflagged path

**Step 3: Update docs only if behavior notes changed materially**

If the flag description or cutover status changed, update `README.md` minimally.

**Step 4: Commit**

```bash
git add README.md docs/plans/2026-03-08-interactive-canvas-cutover-design.md src/App.tsx src/components/WorkspaceInteractionOverlay.tsx
git commit -m "chore: finalize interactive canvas cutover flag path"
```
