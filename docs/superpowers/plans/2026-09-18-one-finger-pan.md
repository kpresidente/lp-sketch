# Optional One-Finger Pan Implementation Plan

> **For agentic workers:** Execute inline with test-first changes and an independent final code review. Steps use checkbox syntax for tracking.

**Goal:** Let iPad users opt into finger/thumb panning while Pencil editing and two-finger navigation remain available.

**Architecture:** Keep the preference local to the device, outside the project format and undo history. Add a small single-contact gesture controller beside the existing two-contact controller, coordinated by the shared editor's existing pen guard. Expose the switch only when touch editing is disabled (the mobile entry point).

**Tech Stack:** SolidJS, TypeScript, Pointer Events, Vitest, Playwright, Capacitor.

**Spec:** The user's approved discussion in this task: optional mobile setting, off initially; deliberate finger drag pans; Pencil takes priority; suppressed contacts stay ignored until lifted; two fingers continue panning/zooming. Two-tap conductor construction is unchanged.

## Global Constraints

- Baseline is committed and pushed at `cb21eab`; preserve it and keep this feature in a separate commit.
- Preserve the shared project format, browser touch editing, and all existing export behavior.
- Keep Apple signing material out of source control. The existing manual TestFlight workflow supplies the device build.
- Device testing is required before claiming real palm/thumb behavior is verified.

## Task 1: Preference and gesture behavior

**Files:** `packages/editor/src/App.tsx`, `packages/editor/src/App.interaction.test.tsx`, `packages/editor/src/controllers/pointer/singleFingerPan.ts`, `packages/editor/src/controllers/pointer/penInputGuard.ts`, `packages/editor/src/hooks/useTouchNavigationPreferences.ts`, `packages/editor/src/components/sidebar/{ToolsPanel.tsx,types.ts}`.

**Interfaces:** `createSingleFingerPan()` exposes `begin(pointerId, screenPoint, pan)`, `move(pointerId, screenPoint): Point | null`, and `clear()`. `useTouchNavigationPreferences()` exposes the reactive boolean `oneFingerPanEnabled` and its persistent setter.

- [x] Add integration cases that drive actual canvas pointer events and assert the rendered camera transform, geometry, and undo behavior. Include persistence, threshold, one/two-contact transitions, pen takeover, suppressed contacts, cancellation, and browser isolation.
- [x] Run `npm test -- packages/editor/src/App.interaction.test.tsx -t "one-finger"`; verify failure because the setting is missing.
- [x] Implement the mobile-only switch in Tools, default false. Read/write the preference with storage-error handling. Reset active touch navigation when toggled, without discarding a pending conductor endpoint.
- [x] Implement panning after 8 CSS pixels of motion, preserving zoom. Rebase when switching between one and two contacts. Clear on pen takeover, tool change, cancellation, and app interruption. Suppress new touches while an already-suppressed hand contact remains down.
- [x] Run the focused tests, then the complete interaction suite. Fix failures before continuing.

## Task 2: Rendered verification and delivery

**Files:** `e2e/pen-input.mobile.spec.ts`, `docs/TESTFLIGHT.md`.

**Interfaces:** Use the existing mobile preview build, browser CDP touch/pen input, and manual iOS workflow `360845343`.

- [x] Add a packaged-mobile case: enable the setting, drag one finger, verify a camera change with unchanged zoom and geometry, reload, and verify persistence.
- [x] Run `npm run build`, `npm test`, `npm run test:e2e`, and `npm run test:e2e:mobile`. Inspect tablet UI, relevant console output, and a screenshot. Both builds, 413 unit/integration tests, 26 browser E2E, seven mobile E2E, and 1180 × 820 rendered checks passed. The cancellation fix was independently re-reviewed.
- [x] Request an independent read-only review of the diff against `cb21eab`; resolve actionable findings.
- [x] Update device-testing instructions and record the user's successful Delete control test.
- [ ] Commit this feature separately, push the feature branch, and run the existing TestFlight upload. Verify processing and group availability; report any account step that requires the user.
