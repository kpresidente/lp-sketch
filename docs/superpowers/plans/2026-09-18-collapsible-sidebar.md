# Collapsible Sidebar Implementation Plan

> Execute inline with test-first interaction coverage and an independent final code review.

**Goal:** Give browser and iPad users more canvas space through a collapsed section-icon sidebar and dismissible section flyouts.

**Architecture:** Keep one mounted instance of each existing panel. A shared editor layout hook owns the collapsed preference and active section. The sidebar presents those panels either in their normal scrolling column or in a single overlay, with a pointer-blocking backdrop. Accepted tool selection closes the flyout explicitly; setting changes do not.

**Tech Stack:** SolidJS, TypeScript, bundled Tabler webfont, CSS, Vitest, Playwright.

**Spec:** User-approved design in this task: header collapse/expand control; six section icons; one flyout immediately right of the collapsed rail; outside taps dismiss without reaching the canvas; tool/component selection dismisses; settings remain open. Apply to web and mobile.

## Constraints

- Baseline `680334f` is committed and pushed; work stays on `codex/monorepo-foundation`.
- Icons: Project `building`, Tools `tools`, Components `cube`, Material `layout-list`, Scale `ruler`, Layers `stack-front`.
- Preserve pending conductor endpoints, pen/palm filtering, one/two-finger navigation, project format, undo history, and existing panel controls.
- Start expanded on first use and remember the user's collapse choice locally. The open flyout is transient and is not saved.
- Rail buttons have accessible names, visible focus, tooltips, and at least 44-pixel targets. Escape closes the flyout and returns focus without cancelling the drawing beneath it.
- Opening a flyout does not resize the canvas. The collapsed rail stays vertical in portrait layouts; flyouts fit within the viewport and scroll internally.

## Task 1: Shared sidebar behavior

**Files:** `packages/editor/src/hooks/useSidebarLayout.ts`, `packages/editor/src/components/AppSidebar.tsx`, `packages/editor/src/components/sidebar/Panel.tsx`, `packages/editor/src/config/iconRegistry.ts`, `packages/editor/src/App.tsx`, `packages/editor/src/App.css`, `packages/editor/src/hooks/useGlobalAppShortcuts.ts`, `packages/editor/src/App.interaction.test.tsx`.

**Interfaces:** `SidebarSection` is `project | tools | components | material | scale | layers`. `useSidebarLayout()` returns `collapsed()`, `activeSection()`, `toggleCollapsed()`, `toggleSection(section)`, and `closeFlyout(): boolean`. `closeFlyout()` reports whether it closed a section so Escape can consume the key before drawing cancellation. A panel presentation context supplies `isFlyout()` and `closeFlyout()` without duplicating panel children.

- [x] Add real-App interaction tests: collapsed sections, accordion state restoration, settings retained across section/layout switches, tool and component dismissal including reselecting the current tool, disabled tools remaining open, and Escape preserving a pending conductor endpoint. Run the focused suite and confirm missing collapse controls fail.
- [x] Implement the layout hook and presentation. Add the six approved icons to the icon registry. Render the full panels once, with hidden inactive sections and an expanded body/close button in flyout mode.
- [x] Add the transparent outside-event barrier. Consume pointer down/move/up and compatibility click; close on click after the pointer sequence so the dismissal cannot become a canvas action. Keep higher-level dialogs usable above the flyout.
- [x] Add header/rail/flyout styles and collapsed status-message presentation. Preserve the normal expanded layout, and ensure collapsed portrait layout uses a vertical rail beside the canvas.
- [x] Close the flyout after an accepted `handleSelectTool` action. Handle Escape before the canvas shortcut without changing settings behavior. Run the focused interaction tests and typecheck.

## Task 2: Browser evidence and delivery

**Files:** `e2e/sidebar.spec.ts`, `playwright.mobile.config.ts`, `packages/editor/src/help/USER_MANUAL.md`, `docs/TESTFLIGHT.md`.

**Interfaces:** Use the existing browser and packaged-mobile servers, with the same sidebar E2E spec included in both. Assert rendered stage bounds, visible section controls, camera transforms, and actual overlay geometry.

- [x] Add browser scenarios covering rail width, unchanged canvas bounds when flyouts open, section switching, settings staying open, selecting tools/components, outside mouse/touch/pen dismissal without drawing or panning, persistence, and portrait scrolling.
- [x] Run `npm run build`, `npm test`, `npm run test:e2e`, `npm run mobile:build`, and the mobile Playwright suite. Inspect landscape and portrait screenshots and console health. Store temporary visual evidence outside tracked source.
- [x] Request an independent read-only diff review and fix actionable regressions with targeted verification.
- [ ] Update help and TestFlight notes, commit the feature separately, and push the existing draft PR branch. Keep the native release state explicit; local browser checks do not establish physical iPad behavior.

## Verification record

- Seven new real-App interaction cases failed before implementation and passed afterward. The full suite passed all 418 cases in 50 files; the final Quick Access focus correction also passed all 111 editor interaction cases.
- Full browser E2E passed 33 cases. The final keyboard overlap regression failed first, then the eight sidebar cases plus the existing Quick Access case passed. All 15 packaged-mobile Chromium cases passed with the final source.
- Both final application builds, production dependency gate (zero advisories), and contrast audit passed. Rendered checks covered 1180 x 820 and 820 x 1180, expanded and collapsed layouts, and a clean browser console.
- Independent review identified input commits returning focus behind the flyout and Quick Access retaining keyboard editing state. An inert workspace boundary and dismissal of Quick Access on outside focus fixed the issues; browser regressions reproduced both before the fixes. Follow-up review found no remaining actionable issues.
