# Workspace Flag Badge Implementation Plan

**Goal:** Add a small `on` badge beside the sidebar title when the workspace canvas feature flag is enabled, and render nothing when it is disabled.

**Architecture:** Keep the change local to the sidebar header. `AppSidebar.tsx` will read the existing `workspaceCanvasSpikeEnabled()` helper and conditionally render a compact badge next to `LP Sketch`, while `App.css` provides the minimal styling needed to keep the badge visually secondary and layout-stable.

**Tech Stack:** SolidJS, TypeScript, Vitest, Vite CSS

---

### Task 1: Add the failing sidebar badge test

**Files:**
- Modify: `src/App.accessibility.test.tsx`
- Reference: `src/components/AppSidebar.tsx`
- Reference: `src/config/workspaceRenderer.ts`

**Step 1: Write the failing test for the enabled flag**

Add a test that mocks `workspaceCanvasSpikeEnabled()` to `true`, renders `<App />`, and asserts the sidebar header shows the `on` badge next to the app title.

```tsx
it('shows the workspace flag badge in the sidebar header when enabled', () => {
  vi.spyOn(workspaceRenderer, 'workspaceCanvasSpikeEnabled').mockReturnValue(true)
  render(() => <App />)
  expect(screen.getByText('on')).toBeTruthy()
})
```

**Step 2: Write the failing test for the disabled flag**

Add the inverse test that mocks the helper to `false` and asserts the badge is absent.

```tsx
it('does not show the workspace flag badge when disabled', () => {
  vi.spyOn(workspaceRenderer, 'workspaceCanvasSpikeEnabled').mockReturnValue(false)
  render(() => <App />)
  expect(screen.queryByText('on')).toBeNull()
})
```

**Step 3: Run the targeted test to verify RED**

Run:

```bash
npx vitest run src/App.accessibility.test.tsx --pool=threads --maxWorkers=1
```

Expected: FAIL because the sidebar currently renders no badge in either case.

**Step 4: Commit the failing test**

```bash
git add src/App.accessibility.test.tsx
git commit -m "test: define workspace flag badge behavior"
```

### Task 2: Implement the badge in the sidebar header

**Files:**
- Modify: `src/components/AppSidebar.tsx`
- Modify: `src/App.css`
- Test: `src/App.accessibility.test.tsx`

**Step 1: Add the minimal conditional rendering**

In `src/components/AppSidebar.tsx`, import `workspaceCanvasSpikeEnabled`, compute the boolean once, and render a badge only when it is true.

```tsx
const workspaceCanvasSpike = workspaceCanvasSpikeEnabled()

<div class="app-name-row">
  <div class="app-name">LP Sketch</div>
  <Show when={workspaceCanvasSpike}>
    <span class="feature-flag-badge">on</span>
  </Show>
</div>
```

**Step 2: Add the minimal CSS**

In `src/App.css`, add styles for the row and badge.

```css
.app-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-flag-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
```

Keep the badge clearly secondary to the title and do not affect the subtitle layout.

**Step 3: Run the targeted test to verify GREEN**

Run:

```bash
npx vitest run src/App.accessibility.test.tsx --pool=threads --maxWorkers=1
```

Expected: PASS.

**Step 4: Commit the implementation**

```bash
git add src/components/AppSidebar.tsx src/App.css src/App.accessibility.test.tsx
git commit -m "feat: show workspace flag badge in sidebar"
```

### Task 3: Run final verification

**Files:**
- Modify if needed: `src/components/AppSidebar.tsx`
- Modify if needed: `src/App.css`
- Modify if needed: `src/App.accessibility.test.tsx`

**Step 1: Run focused verification**

Run:

```bash
npx vitest run src/App.accessibility.test.tsx --pool=threads --maxWorkers=1
npm run build
```

Expected: PASS.

**Step 2: Run the full test suite if focused verification is green**

Run:

```bash
npm test
```

Expected: PASS, or if the default worker pool hits the known environment timeout, rerun with:

```bash
npx vitest run --pool=threads --maxWorkers=1
```

**Step 3: Manual UI check**

Run:

```bash
npm run dev
```

With `VITE_WORKSPACE_CANVAS_SPIKE=true`, confirm the sidebar title shows the `on` badge.

With the flag removed or false, confirm the badge disappears and header spacing still looks correct.
