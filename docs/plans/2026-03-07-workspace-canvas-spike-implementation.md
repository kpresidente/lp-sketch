# Workspace Canvas Spike Implementation Plan

**Goal:** Build a developer-only, read-only canvas workspace spike that renders the full persisted annotation set on the active page while reusing shared canvas drawing code with export.

**Architecture:** Extract annotation canvas drawing from `src/lib/export.ts` into a shared `src/workspace/renderCore/` module, keep export-specific PDF/blob composition in `src/lib/export.ts`, and mount a dev-flagged `WorkspaceCanvas` in `src/App.tsx` in place of the persisted-geometry SVG overlay. Keep pan, zoom, page switching, and the existing PDF background stage intact; do not preserve selection or preview overlays when the spike flag is enabled.

**Tech Stack:** SolidJS, TypeScript, Vite env flags, Canvas 2D, Vitest

---

### Task 1: Extract Shared Canvas Draw Core From Export

**Files:**
- Create: `src/workspace/renderCore/drawProject.ts`
- Create: `src/workspace/renderCore/drawSymbol.ts`
- Create: `src/workspace/renderCore/index.ts`
- Modify: `src/lib/export.ts`
- Test: `src/lib/export.integration.test.ts`
- Test: `src/lib/export.regression.test.ts`
- Test: `src/lib/export.wrappers.test.ts`
- Test: `src/lib/export.pdf.test.ts`

**Step 1: Extend export safety-net tests only if coverage is missing**

Confirm export tests already lock down:

```ts
it('renders all symbol variants and legend label branches', async () => {
  const canvas = await renderProjectCanvas(project, { includeBackground: false })
  expect(canvas.width).toBeGreaterThan(0)
})
```

If a draw path is missing, add the smallest focused test for it before refactoring.

**Step 2: Run the export suites on the unmodified code**

Run:

```bash
npx vitest run src/lib/export.integration.test.ts src/lib/export.regression.test.ts src/lib/export.wrappers.test.ts src/lib/export.pdf.test.ts
```

Expected:
- all export suites pass before extraction

**Step 3: Move reusable draw logic into the shared render core**

Start with the symbol boundary:

```ts
// src/workspace/renderCore/drawSymbol.ts
export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: SymbolElement,
  designScale: number,
) {
  // existing symbol drawing logic moved from export.ts
}
```

Then move project composition:

```ts
// src/workspace/renderCore/drawProject.ts
export function drawProjectToContext(
  ctx: CanvasRenderingContext2D,
  project: LpProject,
  options: { includeMarks: boolean },
) {
  // wires, arcs, curves, arrows, text, dimension text, legends, notes
}
```

**Step 4: Rewire export to call the shared render core**

Keep export-specific canvas creation and PDF composition inside `src/lib/export.ts`:

```ts
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('Unable to create export canvas context.')
drawProjectToContext(ctx, visibleProject, { includeMarks: options.includeMarks ?? false })
```

Do not move `canvasToBlob`, background drawing policy, or PDF composition into `renderCore`.

**Step 5: Re-run export suites**

Run:

```bash
npx vitest run src/lib/export.integration.test.ts src/lib/export.regression.test.ts src/lib/export.wrappers.test.ts src/lib/export.pdf.test.ts
```

Expected:
- all export suites still pass

**Step 6: Commit**

```bash
git add src/workspace/renderCore/drawProject.ts src/workspace/renderCore/drawSymbol.ts src/workspace/renderCore/index.ts src/lib/export.ts src/lib/export.integration.test.ts src/lib/export.regression.test.ts src/lib/export.wrappers.test.ts src/lib/export.pdf.test.ts
git commit -m "refactor: extract shared workspace canvas draw core"
```

### Task 2: Add the Developer-Only Workspace Renderer Flag and Canvas Shell

**Files:**
- Create: `src/config/workspaceRenderer.ts`
- Create: `src/workspace/WorkspaceCanvas.tsx`
- Test: `src/workspace/WorkspaceCanvas.test.tsx`
- Modify: `src/App.tsx`
- Modify: `README.md`

**Step 1: Write failing renderer-selection and mount tests**

Add a focused workspace-canvas test:

```ts
it('sizes the workspace canvas to the active PDF page dimensions', () => {
  render(() => <WorkspaceCanvas project={project} widthPt={480} heightPt={320} />)
  expect(screen.getByLabelText('Workspace canvas overlay')).toHaveAttribute('width', '960')
})
```

Add an app-level flag test proving the renderer swap.

**Step 2: Run the new targeted tests to verify red**

Run:

```bash
npx vitest run src/workspace/WorkspaceCanvas.test.tsx src/App.behavior.test.tsx
```

Expected:
- new workspace-canvas tests fail because the component/flag does not exist yet

**Step 3: Create a dev-only renderer flag helper**

Keep flag logic out of `App.tsx`:

```ts
// src/config/workspaceRenderer.ts
export function workspaceCanvasSpikeEnabled(env: Record<string, unknown> = import.meta.env) {
  return Boolean(import.meta.env.DEV && env.VITE_WORKSPACE_CANVAS_SPIKE === 'true')
}
```

**Step 4: Build the read-only WorkspaceCanvas shell**

Start minimal:

```tsx
export default function WorkspaceCanvas(props: WorkspaceCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined

  createEffect(() => {
    const canvas = canvasRef
    if (!canvas) return
    // resize for DPR, clear, redraw
  })

  return <canvas ref={canvasRef} class="workspace-canvas-layer" aria-label="Workspace canvas overlay" />
}
```

**Step 5: Wire the renderer swap in App**

In `src/App.tsx`, conditionally mount either:

- `OverlayLayer` when the flag is off
- `WorkspaceCanvas` when the flag is on

Leave `CanvasStage` and the PDF background canvas in place.

**Step 6: Document the developer flag**

Add to `README.md`:

```md
- `VITE_WORKSPACE_CANVAS_SPIKE` — developer-only flag to mount the read-only canvas workspace spike
```

**Step 7: Run the targeted tests to verify green**

Run:

```bash
npx vitest run src/workspace/WorkspaceCanvas.test.tsx src/App.behavior.test.tsx
npm run build
```

Expected:
- workspace-canvas and app flag tests pass
- build passes

**Step 8: Commit**

```bash
git add src/config/workspaceRenderer.ts src/workspace/WorkspaceCanvas.tsx src/workspace/WorkspaceCanvas.test.tsx src/App.tsx README.md
git commit -m "feat: add developer-flagged workspace canvas spike shell"
```

### Task 3: Render the Full Persisted Annotation Set on the Active Page

**Files:**
- Modify: `src/workspace/WorkspaceCanvas.tsx`
- Modify: `src/App.tsx`
- Test: `src/workspace/WorkspaceCanvas.test.tsx`
- Test: `src/App.interaction.test.tsx`

**Step 1: Write failing redraw and page-scope tests**

Cover:

```ts
it('redraws when the active project slice changes', async () => {
  const { rerender } = render(() => <WorkspaceCanvas project={projectA} widthPt={480} heightPt={320} />)
  rerender(() => <WorkspaceCanvas project={projectB} widthPt={480} heightPt={320} />)
  expect(drawProjectToContext).toHaveBeenCalledTimes(2)
})
```

Add an app-level test that enables the flag and verifies page switching still changes the rendered page content.

**Step 2: Run the targeted tests to verify red**

Run:

```bash
npx vitest run src/workspace/WorkspaceCanvas.test.tsx src/App.interaction.test.tsx
```

Expected:
- new redraw/page-scope tests fail before the redraw path is complete

**Step 3: Implement invalidation-driven redraw**

In `WorkspaceCanvas.tsx`:

- resize backing canvas for device pixel ratio
- clear existing pixels
- scale the context
- call `drawProjectToContext(...)`
- redraw only when relevant props change

Avoid a perpetual RAF loop.

**Step 4: Keep the renderer scoped to persisted active-page content**

Feed `WorkspaceCanvas` the same active-page/layer-filtered project slice the SVG renderer currently uses for persisted geometry.

Do not render:

- selection state
- tool previews
- snap markers
- debug overlays

**Step 5: Re-run targeted tests and build**

Run:

```bash
npx vitest run src/workspace/WorkspaceCanvas.test.tsx src/App.interaction.test.tsx
npm run build
```

Expected:
- redraw and page-scope tests pass
- build passes

**Step 6: Commit**

```bash
git add src/workspace/WorkspaceCanvas.tsx src/App.tsx src/workspace/WorkspaceCanvas.test.tsx src/App.interaction.test.tsx
git commit -m "feat: render persisted workspace geometry on canvas spike"
```

### Task 4: Soft-Fail Rendering and Final Verification

**Files:**
- Modify: `src/workspace/WorkspaceCanvas.tsx`
- Modify: `src/lib/telemetry.ts` only if a new handled event type is required
- Test: `src/workspace/WorkspaceCanvas.test.tsx`
- Test: `src/lib/telemetry.test.ts`

**Step 1: Write failing failure-path tests**

Cover:

```ts
it('reports a handled failure when the canvas context cannot be created', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  render(() => <WorkspaceCanvas project={project} widthPt={480} heightPt={320} />)
  expect(reportHandledOperationError).toHaveBeenCalled()
})
```

**Step 2: Run the targeted failure-path tests to verify red**

Run:

```bash
npx vitest run src/workspace/WorkspaceCanvas.test.tsx src/lib/telemetry.test.ts
```

Expected:
- the new failure-path test fails before error reporting is wired

**Step 3: Add soft-fail rendering diagnostics**

In `WorkspaceCanvas.tsx`:

- catch draw/setup failures
- emit the existing handled telemetry event helper with a `workspace_canvas_render_failed` style event
- log a concise `console.warn(...)`
- do not crash the app shell

**Step 4: Run the spike verification set**

Run:

```bash
npx vitest run src/lib/export.integration.test.ts src/lib/export.regression.test.ts src/lib/export.wrappers.test.ts src/lib/export.pdf.test.ts src/workspace/WorkspaceCanvas.test.tsx src/App.behavior.test.tsx src/App.interaction.test.tsx src/lib/telemetry.test.ts
npm run build
```

Expected:
- export suites pass
- workspace canvas tests pass
- app tests pass
- telemetry tests pass
- build passes

**Step 5: Commit**

```bash
git add src/workspace/WorkspaceCanvas.tsx src/workspace/WorkspaceCanvas.test.tsx src/lib/telemetry.ts src/lib/telemetry.test.ts src/App.behavior.test.tsx src/App.interaction.test.tsx
git commit -m "feat: harden workspace canvas spike rendering"
```
