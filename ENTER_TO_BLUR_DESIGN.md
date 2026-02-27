# Commit Affordance Audit

Date: 2026-02-26
Status: Draft

## Overview

Actions across the application lack consistent commit affordances. Users cannot reliably predict how to confirm an action — Enter, Ctrl+Enter, Escape, clicking a button, or simply navigating away all serve as "commit" depending on context, with no unifying convention. This document audits every commit interaction and proposes a standardized model.

### Codex Annotations (2026-02-26)

- The overall direction is correct: `Enter = finish/confirm`, `Escape = cancel`.
- One correction: `blur()` confirms visually but does not automatically focus the canvas; keyboard target may become `document.body` unless explicitly refocused.
- Add a global safety rule: app-level `Delete`/`Backspace`/`Undo`/`Redo` shortcuts must not fire while any editable control is focused.

---

## Part 1: Input Fields Missing Enter-to-Blur

### Problem

12 text/number inputs update state reactively via `onInput` but pressing Enter does nothing visible. Users expect Enter to confirm their input with visual feedback (blur/defocus).

### Design

1. Add `onKeyDown` handler to all affected inputs.
2. On `Enter` key press, call `event.currentTarget.blur()`.
3. Blurring provides visual confirmation (field deselects).
4. If canvas-focus restoration is desired, explicitly focus stage/canvas after blur; do not assume browser focus returns there automatically.
4. No changes to existing `onInput` reactive behavior.

### Affected Inputs

#### Properties Bar (`src/components/PropertiesToolOptions.tsx`)

| Line | Input | Type |
|------|-------|------|
| 184 | Linear auto-spacing max interval | `number` |
| 277 | Arc auto-spacing max interval | `number` |
| 341 | Measure target distance | `number` |
| 369 | Measure mark target distance | `number` |
| 594 | Default downlead vertical feet | `number` |
| 635 | Legend custom suffix | `text` |

#### Sidebar Panels

| Line | Input | Type | File |
|------|-------|------|------|
| 16 | Project name | `text` | `src/components/sidebar/ProjectPanel.tsx` |
| 26 | Scale inches | `number` | `src/components/sidebar/ScalePanel.tsx` |
| 43 | Scale feet | `number` | `src/components/sidebar/ScalePanel.tsx` |

#### Quick Access Flyout (`src/components/QuickAccessBar.tsx`)

| Line | Input | Type |
|------|-------|------|
| 1036 | Manual scale inches | `number` |
| 1053 | Manual scale feet | `number` |
| 1148 | Customizer search | `search` |

### Existing Correct Implementations (Reference)

- `PropertiesToolOptions.tsx:539` — Selected downlead vertical (Enter commits)
- `PropertiesToolOptions.tsx:670` — Calibration distance (Enter applies, Escape cancels)
- `AnnotationEditDialog.tsx:67` — Dimension text editor (Enter applies, Escape cancels)
- `GeneralNotesDialog.tsx:84` — General notes row (Ctrl+Enter applies, Escape cancels)
- `LegendLabelDialog.tsx:83` — Legend label (Enter applies, Escape cancels)

### Note

The linear auto-spacing input at line 560 displays the status message "Press Enter or blur to apply." but has no Enter handler — the most visible instance of this inconsistency.

### Acceptance

1. Pressing Enter in any of the 12 listed inputs blurs the field.
2. While an editable control is focused, global delete/selection shortcuts do not fire.
3. If explicit canvas refocus is implemented, keyboard shortcuts resume on canvas after blur.
3. No change to reactive value-apply-on-keystroke behavior.

---

## Part 2: No Keyboard Finish for Multi-Step Drawing Tools

### Problem

Multi-step drawing tools have no Enter key to finish. The only way to complete them is clicking the final point or a UI button.

| Tool | How to finish | Keyboard finish? |
|------|---------------|-----------------|
| Line (continuous) | Click next point, or Escape to discard pending segment | No |
| Arc | Click 3rd point | No |
| Curve | Click 3rd point | No |
| Arrow | Click 2nd point | No |
| Dimension text | Click 3rd point | No |
| Linear auto-spacing | "Finish Open" / "Close + Finish" button | No |
| Arc auto-spacing | "Apply Spacing" button | No |
| Calibrate | "Apply" button | Yes (Enter in distance input) |

For click-to-complete tools (arc, curve, arrow, dimension), the commit is inherently the final click — no keyboard alternative is needed. But for tools with explicit finish buttons (linear auto-spacing, arc auto-spacing), and for continuous-mode line drawing, there is no keyboard path to say "I'm done."

### Design

1. **Line (continuous mode):** Enter key commits the pending segment (if any) and exits continuous drawing, returning to the select tool. If no pending segment, just exit.
2. **Linear auto-spacing:** Enter key triggers "Finish Open" (the default finish action) when 2+ vertices exist.
3. **Arc auto-spacing:** Enter key triggers "Apply Spacing" when a target arc is selected.
4. These shortcuts only fire when focus is on the canvas/stage and no text-edit dialog input is active.
5. Keep click-to-complete tools (arc/curve/arrow/dimension) unchanged unless explicitly expanded in scope.

### Acceptance

1. In continuous line mode, pressing Enter finishes the current drawing operation.
2. In linear auto-spacing with sufficient vertices, pressing Enter finishes the trace.
3. In arc auto-spacing with a selected target, pressing Enter applies spacing.
4. Enter does not fire these tool-finishes when focus is in any editable control.

---

## Part 3: Escape Semantics — Cancel vs Finish Confusion

### Problem

Escape universally calls `clearTransientToolState()`, discarding incomplete work. This is correct cancel semantics, but for committed-per-click tools (like line in continuous mode), canceling and finishing produce the same visible result — committed segments remain, only the pending segment is discarded. Users learn to use Escape as "I'm done," which then fails destructively in tools where Escape discards real work (e.g., an arc after 2 of 3 clicks).

### Current Escape behavior by context

| Context | Escape does | Semantics |
|---------|------------|-----------|
| Drawing tools (global) | `clearTransientToolState()` — discard pending state | Cancel |
| Annotation edit dialog | `onCancel()` — close, discard edits | Cancel |
| Legend label dialog | `onCancel()` — close, discard edits | Cancel |
| General notes dialog | `onCancel()` — close, discard edits | Cancel |
| Report dialog | `onCancel()` — close, discard report | Cancel |
| Help drawer | Close drawer | Close |
| Quick access customizer | Close customizer and flyouts | Close |
| Calibration distance input | `onCancelCalibration()` — discard calibration | Cancel |

### Design

1. Escape remains "cancel/discard" in all contexts — this is the correct semantic and should not change.
2. The confusion arises because users lack a "finish" key, so they reach for Escape. Adding Enter-to-finish for multi-step tools (Part 2) resolves this by giving users the key they're actually looking for.
3. Add hint text to tool status messages when a tool has pending state:
   - Tools with Enter-to-finish: `"Press Enter to finish, Escape to cancel."`
   - Click-to-complete tools: `"Click to place. Escape to cancel."`
4. Keep this hint behavior centralized (shared helper) to avoid divergence across tools.

### Acceptance

1. Escape behavior is unchanged.
2. Tool status hints clearly distinguish finish (Enter) from cancel (Escape) where both apply.

---

## Part 4: Inconsistent Enter Key in Dialogs

### Problem

Dialogs use different Enter key conventions for the same conceptual action ("apply my changes"):

| Dialog | Enter | Ctrl+Enter |
|--------|-------|------------|
| Dimension text editor | **Apply** | — |
| Legend label editor | **Apply** | — |
| Calibration distance input | **Apply** | — |
| Downlead vertical input | **Apply** | — |
| Text annotation editor | Insert newline | **Apply** |
| General notes editor | Insert newline | **Apply** |
| Report dialog | Nothing | **Submit** |

### Analysis

The split follows a reasonable convention: **single-line inputs use Enter to apply, multi-line textareas use Ctrl+Enter** (since Enter inserts a newline in textareas). This is a standard pattern used by Slack, GitHub, and others.

### Design

1. Formalize the convention:
   - **Single-line inputs (`<input>`):** Enter applies/commits.
   - **Multi-line inputs (`<textarea>`):** Ctrl/Cmd+Enter applies/commits. Enter inserts newline.
2. Display a hint at the bottom of each dialog stating the keyboard shortcut: `"Enter to apply"` or `"Ctrl/Cmd + Enter to apply"`.
3. Most dialogs already follow this behavior; verify each dialog actually shows the shortcut hint consistently.

### Acceptance

1. Every dialog with an apply/submit action shows the keyboard shortcut hint.
2. No changes to existing keyboard behavior.

---

## Part 5: Reactive vs Explicit Commit — When Does Each Apply?

### Problem

Some controls apply immediately on interaction, others require an explicit button press, with no consistent rule.

| Pattern | Examples |
|---------|----------|
| **Reactive (immediate)** | Material color, class, layer toggles, snap toggles, auto-connector toggle, annotation size, max interval inputs, target distance inputs, project name |
| **Explicit button** | Manual scale (Apply button), linear auto-spacing (Finish button), arc auto-spacing (Apply button) |
| **Enter/blur** | Downlead vertical footage, calibration distance |
| **Dialog button** | Legend labels, general notes, text annotations, report |

### Analysis

The distinction is actually logical when examined:

- **Reactive:** Single-value toggles and selectors where the effect is immediately visible and easily reversible (undo). No confirmation needed.
- **Explicit button:** Operations that batch multiple inputs into one action (scale requires both inches and feet) or produce complex side effects (auto-spacing places many symbols at once).
- **Dialog button:** Multi-field editors where the user is building up a compound change.

### Design

1. Formalize the rule:
   - **Toggles and selectors:** Reactive. Immediate effect, reversible via undo.
   - **Multi-input compound actions:** Explicit Apply button. User must opt in.
   - **Multi-field editors (dialogs):** Apply/Cancel buttons with keyboard shortcuts.
   - **Single-value text/number inputs:** Reactive on keystroke, Enter to blur/confirm.
2. No behavior changes needed — the current implementation already follows this pattern. Document it so future development stays consistent.
3. Add one explicit exception policy: while editing text fields, global destructive shortcuts are suppressed.

### Acceptance

1. Convention is documented for future reference.
2. No existing behavior changes.

---

## Implementation Sequence

### Phase 0: Global shortcut safety guard
Ensure editable-focus guard for global keyboard shortcuts (`Delete/Backspace/Undo/Redo/Escape` behavior scoped appropriately).

### Phase 1: Enter-to-blur on listed reactive inputs (Part 1)
Smallest change, biggest immediate UX improvement.

### Phase 2: Enter-to-finish for multi-step tools (Part 2)
Gives users the "I'm done" key they're reaching for.

### Phase 3: Hint text for finish/cancel (Part 3)
Makes the distinction discoverable.

### Phase 4: Dialog keyboard hints (Part 4)
Polish — formalize what already works.

### Phase 5: Document commit conventions (Part 5)
No code changes — developer-facing documentation.

---

## Part 6: Independent Second-Opinion Addendum

### Summary

The core direction in this document is correct. The largest remaining gap is that keyboard shortcuts are still scoped only to focused inputs, not to broader edit contexts (dialogs/popovers/flyouts). That can still produce destructive side effects while the user is actively editing.

### Additional Findings (Severity Ordered)

1. **High — Global destructive shortcut leakage in edit contexts**
   - `Delete`, `Backspace`, `Undo`, and `Redo` are blocked for focused text controls, but can still fire while a modal/floating editor is open and focus is on a non-text control.
   - Recommendation: block app-level destructive shortcuts whenever any commit UI context is open (annotation editor, legend editor, notes editor, report dialog, quick-access customizer/flyout, help search input context where appropriate).

2. **High — Click-away currently behaves as implicit cancel for active editors**
   - Pointer-down on stage can close editing UIs immediately, discarding in-progress edits.
   - Recommendation: define explicit click-away policy per surface:
     - dialogs: keep open or confirm before discard
     - lightweight flyouts: close without data loss
     - never silently discard edited text without explicit user action.

3. **Medium — No keyboard “finish” for explicit-finish drawing flows**
   - Explicit-finish tools still require button clicks (`Finish Open`, `Close + Finish`, `Apply Spacing`).
   - Recommendation: add `Enter` finish behavior scoped to active canvas tool context, while preserving existing click behavior.

4. **Medium — Enter-to-blur is still missing on many reactive inputs**
   - Several text/number inputs update reactively but provide no explicit Enter confirmation affordance.
   - Recommendation: standardize Enter-to-blur on all reactive single-line fields listed in Part 1.

5. **Medium — General Notes keyboard contract is inconsistent**
   - General Notes rows are single-line inputs but use `Ctrl/Cmd+Enter` for apply.
   - Recommendation: either switch to `Enter` apply (single-line rule) or convert editor rows to multiline textareas if `Ctrl/Cmd+Enter` must remain.

6. **Low — Shortcut hints are not consistently shown where shortcuts exist**
   - Some editors show keyboard hints, others do not.
   - Recommendation: show one-line hint in every editor with keyboard commit/cancel behavior.

7. **Low — Quick-access Escape handler is global and unscoped**
   - Escape closes quick-access surfaces regardless of current focus context.
   - Recommendation: scope Escape handling to active quick-access UI context only.

### Sequence Adjustment (Addendum)

Refine implementation sequence to reduce regression risk:

1. **Phase 0A — Edit-context keyboard lock**
   - Introduce a shared `isEditingContextActive` guard and apply it to global destructive shortcuts.

2. **Phase 0B — Click-away policy**
   - Standardize close behavior for dialogs/flyouts; remove silent-discard paths.

3. **Phase 1 — Enter-to-blur coverage**
   - Complete reactive input coverage from Part 1.

4. **Phase 2 — Enter-to-finish tool flows**
   - Add finish shortcuts for continuous/explicit-finish tool contexts.

5. **Phase 3 — Tool finish/cancel hint consistency**
   - Centralize hint rendering and string standards.

6. **Phase 4 — Dialog shortcut hint consistency**
   - Ensure all applicable dialogs declare keyboard behavior.

7. **Phase 5 — Document canonical conventions**
   - Keep this document as the source of truth for commit semantics.

### Acceptance Addendum

1. Global destructive shortcuts never mutate canvas state while any editing context is active.
2. Click-away behavior is explicit and never silently discards typed content.
3. Single-line fields consistently support Enter confirm semantics.
4. Multi-step tools with explicit finish buttons have an equivalent keyboard finish path.
5. Every editor that supports keyboard apply/cancel documents that shortcut inline.
