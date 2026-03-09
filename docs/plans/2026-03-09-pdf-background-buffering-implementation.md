# PDF Background Buffering Implementation Plan

**Goal:** Eliminate visible PDF background flicker during pan and zoom by keeping the current PDF bitmap visible during interaction and swapping in newly rendered pixels only after a buffered render completes.

**Architecture:** Keep the existing PDF.js page renderer, but change `usePdfCanvasRenderer` from direct-to-visible rendering to a buffered front/back surface model. Wire a small interaction-state signal from the app so pan and zoom bursts defer sharp rerenders until interaction settles, and add the missing `.pdf-layer { will-change: transform; }` hint on `main`.

**Tech Stack:** SolidJS, TypeScript, Vitest, pdfjs-dist, Vite

---

### Task 1: Lock the Hook Contract with Failing Tests

**Files:**
- Modify: `src/hooks/usePdfCanvasRenderer.test.ts`
- Reference: `src/hooks/usePdfCanvasRenderer.ts`

**Step 1: Write the failing test for retained front buffer during interaction**

Add a focused test that binds the hook to a canvas stub, performs an initial successful render, then simulates an interaction-active update and asserts the visible context is not cleared before the next render is ready.

```ts
it('keeps the last rendered front buffer visible during interaction updates', async () => {
  // Arrange initial successful render
  // Mark interaction as active
  // Trigger a new render request
  // Assert clearRect was not called on the visible front buffer again
})
```

**Step 2: Run the test to verify RED**

Run:

```bash
npx vitest run src/hooks/usePdfCanvasRenderer.test.ts --pool=threads --maxWorkers=1
```

Expected: FAIL because the current hook clears and redraws the visible canvas directly.

**Step 3: Write the failing test for superseded settle renders**

Add a test that triggers two settle renders in sequence and asserts only the latest generation is promoted to the visible surface.

```ts
it('drops superseded buffered renders and only promotes the latest generation', async () => {
  // Queue render A
  // Queue render B before A settles
  // Assert A is cancelled or ignored and B becomes visible
})
```

**Step 4: Run the test suite again to verify RED**

Run:

```bash
npx vitest run src/hooks/usePdfCanvasRenderer.test.ts --pool=threads --maxWorkers=1
```

Expected: FAIL with assertions showing the hook does not yet buffer or gate promotions by generation.

**Step 5: Commit the red tests**

```bash
git add src/hooks/usePdfCanvasRenderer.test.ts
git commit -m "test: define buffered pdf renderer contract"
```

### Task 2: Add Minimal Buffered Rendering State to the Hook

**Files:**
- Modify: `src/hooks/usePdfCanvasRenderer.ts`
- Test: `src/hooks/usePdfCanvasRenderer.test.ts`

**Step 1: Implement minimal front/back buffer state**

Add only the state needed to make the new tests pass:

- track the visible front canvas
- create a hidden back canvas or in-memory canvas surface
- track render generation IDs
- track whether background interaction is active
- add a settle timer for deferred rerenders

Sketch:

```ts
let frontCanvasRef: HTMLCanvasElement | undefined
let backCanvas: HTMLCanvasElement | OffscreenCanvas | null = null
let renderGeneration = 0
let settledRenderTimer: number | null = null
let interactionActive = false
```

**Step 2: Route PDF.js renders into the back buffer**

Update the render path so `page.render(...)` targets the back surface first, then copy or swap the pixels into the visible front canvas only after success.

Sketch:

```ts
const backContext = ensureBackBuffer(viewport.width, viewport.height)
await renderInto(backContext, page, viewport)
promoteBackBufferToFront()
```

**Step 3: Handle superseded requests minimally**

Increment generation IDs for new requests and ignore stale completions.

```ts
const generation = ++renderGeneration
if (generation !== renderGeneration) return
```

**Step 4: Run the hook tests to verify GREEN**

Run:

```bash
npx vitest run src/hooks/usePdfCanvasRenderer.test.ts --pool=threads --maxWorkers=1
```

Expected: PASS for the new buffered-render tests.

**Step 5: Commit**

```bash
git add src/hooks/usePdfCanvasRenderer.ts src/hooks/usePdfCanvasRenderer.test.ts
git commit -m "feat: buffer pdf background rendering"
```

### Task 3: Wire Interaction Active vs Settled State from the App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/hooks/usePdfCanvasRenderer.ts`
- Test: `src/App.behavior.test.tsx`

**Step 1: Write the failing app-level behavior test**

Add a behavior test that simulates wheel zoom or pan bursts and verifies the app does not request immediate visible PDF replacement on every movement tick.

```ts
it('defers sharp pdf rerenders until pan or zoom settles', async () => {
  // Render app with PDF
  // Dispatch rapid wheel events
  // Assert the background renderer stays in interaction mode until debounce expires
})
```

**Step 2: Run the targeted behavior test to verify RED**

Run:

```bash
npx vitest run src/App.behavior.test.tsx --pool=threads --maxWorkers=1
```

Expected: FAIL because the app does not yet communicate interaction-active versus settled state to the hook.

**Step 3: Add the minimal wiring**

- Extend the hook options with an interaction-state accessor or explicit notifier.
- In `App.tsx`, mark background interaction active during wheel bursts and pointer-driven pan updates.
- Reset to settled mode through a short debounce after interaction stops.

Sketch:

```ts
const [pdfInteractionActive, setPdfInteractionActive] = createSignal(false)

usePdfCanvasRenderer({
  ...,
  interactionActive: pdfInteractionActive,
})
```

**Step 4: Run the targeted tests to verify GREEN**

Run:

```bash
npx vitest run src/hooks/usePdfCanvasRenderer.test.ts src/App.behavior.test.tsx --pool=threads --maxWorkers=1
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.tsx src/components/CanvasStage.tsx src/hooks/usePdfCanvasRenderer.ts src/App.behavior.test.tsx
git commit -m "feat: defer pdf rerenders until interaction settles"
```

### Task 4: Add the Missing Main-Branch Compositing Hint

**Files:**
- Modify: `src/App.css`
- Reference: `performance-enhancements.md`

**Step 1: Write the smallest possible change**

Add:

```css
.pdf-layer {
  will-change: transform;
}
```

to the existing `.pdf-layer` block in `src/App.css`.

**Step 2: Run build to verify no regressions**

Run:

```bash
npm run build
```

Expected: PASS.

**Step 3: Commit**

```bash
git add src/App.css
git commit -m "style: isolate pdf layer compositing"
```

### Task 5: Final Verification and Manual Browser Check

**Files:**
- Modify if needed: `src/hooks/usePdfCanvasRenderer.test.ts`
- Modify if needed: `src/App.behavior.test.tsx`

**Step 1: Run the focused automated verification**

Run:

```bash
npx vitest run src/hooks/usePdfCanvasRenderer.test.ts src/App.behavior.test.tsx --pool=threads --maxWorkers=1
npm run build
```

Expected: PASS.

**Step 2: Run full unit/integration suite if focused tests are green**

Run:

```bash
npm test
```

Expected: PASS.

**Step 3: Manual browser verification**

Run:

```bash
npm run dev
```

Then verify:

- pan no longer flickers
- wheel zoom no longer flashes white frames
- fast zoom bursts settle to a sharp background
- page switching still renders the correct page

**Step 4: Final commit if follow-up fixes were needed**

```bash
git add src/hooks/usePdfCanvasRenderer.ts src/hooks/usePdfCanvasRenderer.test.ts src/App.tsx src/components/CanvasStage.tsx src/App.behavior.test.tsx src/App.css
git commit -m "fix: stabilize pdf background during pan and zoom"
```
