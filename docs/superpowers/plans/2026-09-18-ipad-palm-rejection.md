# iPad Palm Rejection Implementation Plan

> **For agentic workers:** Use the existing mobile feature branch. Execute the steps inline using the executing-plans and test-driven-development skills, then request an independent code review before delivery.

**Goal:** Allow pen editing with reliable rejection of touch editing, while keeping two-finger pan/zoom and finger-operated controls.

**Architecture:** The shared editor accepts an optional `touchDrawingEnabled` property, defaulting to existing browser behavior. The mobile entry disables touch editing. A small editor input guard tracks pen contacts and excludes touches that overlap pen contact for the remainder of each touch's lifetime. Existing geometry and gesture controllers remain shared.

**Tech Stack:** SolidJS, TypeScript, Pointer Events, Vitest, Playwright, Capacitor.

**Spec:** The behavior contract below records the user's September 18 decisions.

## Behavior contract

- The mobile canvas accepts pen and mouse editing. A single touch cannot draw, select, drag, long-press to place, or finish a construction with a synthetic double-click.
- Two fingers pan/zoom when there is no pen contact. One remaining finger cannot fall through into editing.
- Pen contact takes precedence over navigation. Touches present when the pen lands, or arriving while it is down, remain excluded until their own up/cancel event, including after the pen lifts.
- Pointer cancellation, capture loss, and app backgrounding must not leave navigation permanently blocked or commit a cancelled drag.
- Finger taps on controls continue to work. The browser app's existing input behavior remains the default.
- Identify pens through their reported pointer type, without brand checks or pressure/tilt requirements. A stylus that reports as touch cannot edit in this mode.
- This does not change line construction to drag-to-draw, modify project format, or claim physical palm rejection is verified by desktop tests. Multiple touch contacts before pen contact can still be interpreted as navigation.
- Continue the authorized TestFlight workflow; leave browser production and the draft PR unmerged.

## Task 1: Implement and verify the input policy

**Files:** Create `packages/editor/src/controllers/pointer/penInputGuard.ts`; modify `packages/editor/src/App.tsx`, `packages/editor/src/components/CanvasStage.tsx`, `packages/editor/src/App.interaction.test.tsx`, and `apps/mobile/src/main.tsx`.

**Interface:** `createPenInputGuard()` exposes `pointerDown`, `allowsMove`, and `pointerEnd` using `Pick<PointerEvent, 'pointerId' | 'pointerType'>`; these return whether input may reach the existing pointer controllers. `suppressTouches()` quarantines held contacts, `reset()` clears interrupted streams, and `allowsDoubleClick()` rejects compatibility events from touch. Touches allowed through this guard may navigate but never edit when `touchDrawingEnabled` is false.

- [x] Add failing integration tests using the real App: touch-first line placement, pen dragging interrupted by palms, held palms after pen lift, preserved two-finger navigation, touch double-click suppression, and interruption recovery. Verify line geometry, camera transforms, and undo/redo rather than mock calls.

```tsx
const { container } = render(() => <App touchDrawingEnabled={false} />)
const stage = requireDrawingStage(container)
await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
await fireEvent.pointerDown(stage, { pointerId: 1, pointerType: 'touch', button: 0, clientX: 220, clientY: 220 })
await fireEvent.pointerUp(stage, { pointerId: 1, pointerType: 'touch', button: 0, clientX: 220, clientY: 220 })
await fireEvent.pointerDown(stage, { pointerId: 2, pointerType: 'pen', button: 0, clientX: 420, clientY: 220 })
expect(container.querySelectorAll('svg.overlay-layer line[stroke="#2e8b57"][stroke-linecap="round"]')).toHaveLength(0)
```

- [x] Run `npm test -- packages/editor/src/App.interaction.test.tsx -t "pen canvas input"`; confirm functional failures before implementing.
- [x] Add the input guard and gate each pointer phase before it can alter drawing state. Stop admitted touch events after gesture handling. On pen down, remove held touches from the gesture map; preserve the pen drag from subsequent touch events. Track contact endings for compatibility double-clicks.
- [x] Handle lost capture and background interruption as cancellation, and clear contact state on unmount. Preserve held-contact quarantine across ordinary tool changes.
- [x] Set `<App touchDrawingEnabled={false} ... />` in the mobile entry, including its browser preview, so the bundled policy can be exercised without Xcode.
- [x] Re-run the focused tests and the complete interaction test file. Fix regressions before broader checks.

## Task 2: Verify the packaged app and deliver to TestFlight

**Files:** Add mobile-specific browser regression coverage under `e2e/`; update Playwright configuration to include it only in the mobile suite; update `apps/mobile/README.md` and `docs/TESTFLIGHT.md` with the input behavior and physical-device checklist.

- [x] Exercise the actual mobile entry in Chromium: touch cannot place a line, pen can place a line, and two touch points change the camera. Use real browser input where supported; desktop simulation is not an iPad palm test.
- [x] Run `npm run build`, `npm run mobile:build`, `npm test`, `npm run test:e2e`, and `npm run test:e2e:mobile` serially.
- [x] Request a focused independent review of the change against this contract, fix substantive findings, and repeat affected checks.
- [ ] Commit and push the feature branch; manually dispatch the existing iOS workflow with `upload_to_testflight=true` and `app_version=0.1.0`.
- [ ] Verify signed upload, Apple processing, and assignment to the existing iPad Development group. Report the actual build number and ask for physical Apple Pencil checks, with Insignia as an additional compatibility test.

## Evidence

- Seven new integration cases failed on the original behavior before implementation. An additional mouse capture-loss case reproduced the independent review finding before its fix. All 88 editor interaction tests now pass, including ten input-policy cases.
- Browser and mobile builds passed. All six packaged-mobile Chromium cases passed, including pen input, finger-operated tools/Undo/Redo, and two-finger navigation. Chromium's raw injected touch gestures swallow the next simulated tap even on a plain HTML button without app event handlers; the regression checks toolbar taps before injecting navigation gestures. This simulation limitation requires no application workaround.
- The full local suites passed: 395 unit/integration tests across 50 files and all 26 browser E2E cases. Existing help-glossary/chunk-size build warnings and the existing jsdom canvas warning remain unrelated to this change.
- The reviewer verified the capture-loss fix and found no remaining actionable issues. Physical Apple Pencil and Insignia behavior is still unverified.
