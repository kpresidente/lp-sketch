# Pencil Selection Implementation Plan

**Goal:** Prevent small Pencil slides from moving a selected element in the mobile app.

**Architecture:** The mobile entry point opts into an 8 CSS-pixel selection-drag threshold through an editor prop that defaults to zero. Selection stays immediate. The threshold applies to object, group, and handle dragging, uses raw screen coordinates before snapping, and latches once crossed. Existing drag-preview cleanup also clears pending activation.

**Tech stack:** SolidJS, TypeScript, Vitest interaction tests, Playwright Chromium, Capacitor/TestFlight.

**Spec:** The user reports unintended movement while tapping with Pencil, permits an alternative to a time delay, and requires the browser version to stay unchanged.

## Constraints

- Browser mouse, pen, and touch behavior remains unchanged.
- Mouse input on mobile also remains immediate.
- No timed delay, new setting, or change to two-tap placement, palm filtering, finger navigation, snapping, or project format.
- Pending taps create no geometry change or undo entry; intentional drags retain one undo step.
- Use screen distance, independent of zoom. Once active, allow precise movements back inside the initial threshold.
- Pointer cancellation, capture loss, blur, and tool changes must clear pending activation.

## Task: Guard mobile Pencil selection drags

Files: `packages/editor/src/App.tsx`, `apps/mobile/src/main.tsx`, `packages/editor/src/App.interaction.test.tsx`, `e2e/pen-input.mobile.spec.ts`, `docs/ENGINEERING.md`, `docs/TESTFLIGHT.md`.

- [x] Add interaction regressions for tiny movement, zoom, selected handles/groups, immediate mouse/browser input, cancellation, and activation across animation frames. Assert real SVG coordinates, selection state, and undo behavior.
- [x] Run `npm test -- packages/editor/src/App.interaction.test.tsx -t "selection drag"`; confirm the jitter cases fail against unchanged production code.
- [x] Add `penSelectionDragThresholdPx?: number` to editor props, defaulting to zero. Set it to 8 in the mobile entry point. Record the pen's screen point when selection begins; ignore matching pointer moves below the threshold before scheduling a preview. Clear the pending point on activation and through existing drag cleanup.
- [x] Run the focused tests, then both builds, the full unit suite, browser E2E, and packaged-mobile E2E. Add a real browser-dispatched Pencil regression to the mobile suite.
- [x] Review the scoped change independently, record verification, commit, and upload the next TestFlight build through the existing workflow. Keep the browser production merge separate.
- [x] After Apple sign-in is restored, save the approved encryption answers, assign build 30.1 to the existing testing group, and verify availability.
- [x] Document the physical iPad acceptance check: tap/select repeatedly, deliberately drag, edit endpoints, and compare at several zoom levels. Build 30.1 is now available for this device check.

Verification: 15 focused selection-drag tests, 433 total unit/integration tests, 35 browser E2E cases, and 16 packaged-mobile cases passed. Both builds, production audit (zero findings), and 25 contrast pairs passed. Independent review found no actionable issues. Browser plugin not available; repository Playwright provided the rendered check at 1366 x 1024, with no console errors. Browser validation revealed selection changes toolbar height, so the gate uses client coordinates rather than stage-relative coordinates; an additional red-first layout-shift regression now passes. Physical Pencil feel remains a device check.

Release: implementation `ca42205` passed all hosted PR checks. Manual workflow 35383711604 uploaded 0.1.0 (30.1) successfully. After sign-in was restored, compliance and group assignment were completed in App Store Connect. Its public API verified `VALID` and `IN_BETA_TESTING` in the existing iPad Development group on September 18 at 21:29 UTC. Physical Pencil acceptance remains a user device check.
