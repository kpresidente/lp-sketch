# Field Contrast Implementation Plan

> **For agentic workers:** Execute this scoped visual refinement inline, checking the rendered result before completion.

**Goal:** Make the shared browser/iPad interface easier to distinguish in field use while preserving its layout and identity.

**Architecture:** Adjust shared CSS tokens and control styles. Extend the existing color audit to cover control cues; project data, drawing colors, and interaction handlers stay outside this change.

**Tech Stack:** SolidJS, CSS, Vite, existing Playwright and contrast-audit tooling.

**Spec:** The user approved the preceding contrast recommendation: clearer controls and states, stronger panel separation, modest increases to small labels/icons, and one shared default.

## Design constraints

- Preserve the light palette, Plus Jakarta Sans, blue accent, sidebar dimensions, and material color meanings.
- Functional controls use slate outlines; decorative dividers remain quieter.
- Core colors: white surfaces `#ffffff`, panel headers `#e2e8f0`, control borders `#748196`, primary text `#111827`, secondary text `#27364b`, selected controls `#2c4f8a`.
- Selected material retains its swatch and gains a checkmark. Disabled controls retain readable content with a muted background and outline.
- The flow under test is: editor loads -> open a sidebar flyout -> select a tool or change a setting -> clear visual state, preserved dismissal behavior, and no clipping at desktop/tablet sizes.
- Browser plugin not available; use the existing Playwright installation/CLI. Save visual artifacts outside the repository.

## Task 1: Shared control contrast

**Files:** `packages/editor/src/App.css`, `packages/editor/src/components/help/help-drawer.css`, `scripts/contrast-audit.mjs`, `.github/workflows/ci.yml`, `docs/ENGINEERING.md`, `docs/TESTFLIGHT.md`.

- [x] Capture the existing desktop and flyout appearance.
- [x] Expand the audit with control-border/background pairs at 3:1 and important text/icon pairs at 4.5:1; run against the original palette to confirm the gap.
- [x] Update shared palette and functional outlines; increase grid labels from 10px to 11px and icons from 17px to 20px.
- [x] Replace faded disabled-button styling with explicit text/background/border colors and suppress enabled hover effects on disabled controls.
- [x] Use solid blue active rail buttons, a selected-material checkmark, opaque floating panels, visible switch tracks/thumbs, and solid keyboard focus rings.
- [x] Replace unresolved toolbar background/font references with the existing shared tokens.
- [x] Validate the audit, web/mobile builds, existing tests, and desktop/tablet rendered interactions, including all six flyouts and disabled/selected controls.
- [x] Review before/after screenshots and record the physical iPad sunlight check as remaining acceptance work.

## Validation

Run `npm run audit:contrast`, `npm run build`, `npm test`, `npm run test:e2e`, and `npm run test:e2e:mobile` (includes the mobile build). Inspect console errors and screenshots at 1440x1000, 1366x1024, and 820x1180. This verifies packaged web assets, not outdoor iPad readability.

Results: 25 contrast checks passed (five outline checks failed against the original palette), both builds passed, all 418 unit/integration tests and 34 browser + 15 packaged-mobile E2E cases passed. Production dependency audit passed with zero findings. Rendered checks verified all six flyout bounds and button text, stable selected/disabled hover appearance, visible material checkmark, switches, tool dismissal, Escape/focus restoration, and no console errors. The contrast audit now runs in CI.

Physical iPad testing remains: compare controls indoors and outdoors, especially available versus disabled actions, switch positions, and material/tool selection. No automated or screenshot check establishes sunlight readability.
