# Accessibility Audit Notes

Date: 2026-02-19

Scope: Gate 6 keyboard + semantics review of sidebar controls, toolbar controls, dialogs, and status messaging.

## Keyboard Operability Sweep

- Sidebar panel headers are keyboard-operable toggle buttons with `aria-expanded` + `aria-controls`.
- Core tools/components/material/layer controls are native buttons or radios and are reachable via Tab.
- Quick-access rail controls are keyboard-operable and expose active state via `aria-pressed`.
- Skeleton landing view supports keyboard-triggered PDF import from both:
  - dedicated import button
  - drop-zone button fallback
- Dialog action flows support keyboard commit/cancel:
  - `Enter` / `Ctrl+Enter` apply in supported dialogs
  - `Escape` cancels

## Screen Reader Semantics Review

- Sidebar landmark is labeled (`aria-label="Primary controls"`).
- Collapsible panel content is mapped as named regions (`role="region"`, `aria-labelledby`).
- Drawing surface is labeled as a region (`aria-label="Drawing canvas"`).
- Floating editors expose dialog semantics (`role="dialog"` + labels):
  - annotation editor
  - legend labels editor
  - general notes editor
- Status messaging uses live semantics:
  - success/ready: `role="status"` (`aria-live="polite"`)
  - error: `role="alert"` (`aria-live="assertive"`)

## Focus Visibility

Focus-visible styles were added/verified for key interactive controls:

- quick-access icon buttons
- toolbar action/toggle/select controls (`.tb-btn`, `.tb-toggle-btn`, `.tb-switch`, `.tb-select`)
- landing drop-zone import button

## Automated Evidence

- `src/App.accessibility.test.tsx`
- `src/components/dialogs/DialogSemantics.test.tsx`
- Existing semantics coverage retained in `src/App.behavior.test.tsx`
