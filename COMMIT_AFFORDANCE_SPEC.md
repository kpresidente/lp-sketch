# Commit Affordance Specification

Date: 2026-02-26
Status: Draft (consolidated from initial audit + independent second review)

## Overview

Actions across the application lack consistent commit affordances. Users cannot reliably predict how to confirm an action — Enter, Ctrl+Enter, Escape, clicking a button, or simply navigating away all serve as "commit" depending on context, with no unifying convention.

This document defines a canonical commit model, inventories every interaction that deviates from it, and specifies the fixes.

## Canonical Commit Model

Four commit patterns exist in the application. Each is appropriate in a specific context:

| Pattern | When it applies | Commit action | Cancel action |
|---------|----------------|---------------|---------------|
| **Reactive** | Single-value toggles and selectors (material, class, layer, snap, annotation size) | Immediate on click/change. Reversible via undo. | N/A |
| **Reactive input** | Single-value text/number fields (max interval, target distance, project name) | Immediate on keystroke via `onInput`. Enter blurs the field as visual confirmation. | N/A |
| **Explicit button** | Multi-input compound actions where partial state is meaningless (manual scale, auto-spacing finish) | Click Apply/Finish button, or press Enter when applicable. | Escape or Reset button. |
| **Dialog** | Multi-field editors where the user builds up a compound change (legend labels, general notes, text annotations, report) | Click Apply/Submit button, or press keyboard shortcut. | Click Cancel button, or press Escape. |

**Keyboard conventions within the model:**
- **Single-line `<input>` fields:** Enter applies/commits.
- **Multi-line `<textarea>` fields:** Ctrl/Cmd+Enter applies/commits. Enter inserts newline.
- **Escape:** Always means cancel/discard. Never means finish/confirm.

---

## 1) Edit-Context Shortcut Guard

### Problem

Global keyboard shortcuts (`Delete`, `Backspace`, `Undo`, `Redo`) are blocked when a text input is focused, but can still fire when an editing dialog is open and focus is on a non-text control within it (e.g., a button, radio, or the dialog container itself). This can cause destructive canvas mutations while the user is actively editing.

Additionally, the quick-access Escape handler does not call `stopPropagation()`, so pressing Escape while the customizer is open can simultaneously close the customizer and clear drawing tool state.

### Design

1. Introduce a shared `isEditingContextActive` signal that is `true` whenever any commit UI surface is open:
   - Annotation edit dialog
   - Legend label dialog
   - General notes dialog
   - Report dialog
   - Quick-access customizer or any open flyout
2. While `isEditingContextActive` is true, suppress global project-level destructive shortcuts (`Delete`, `Backspace`) and scope `Escape` to the active editing surface only.
3. While `isEditingContextActive` is true, suppress global project-level `Undo`/`Redo` shortcuts as well, so focus on non-text controls inside dialogs cannot mutate canvas history.
4. Native text editing undo/redo inside focused `<input>`/`<textarea>` fields remains unchanged.
5. Quick-access Escape handler should call `stopPropagation()` to prevent cascading to the global tool-state reset.

### Acceptance

1. Pressing Delete/Backspace while any editing context is open does not delete canvas elements.
2. Pressing Ctrl/Cmd+Z or Ctrl/Cmd+Y while any editing context is open does not trigger project undo/redo unless focus is in a text field performing native text undo/redo.
3. Pressing Escape while the quick-access customizer is open closes the customizer without clearing drawing tool state.
4. No regressions to existing shortcut behavior when no editing context is active.

---

## 2) Click-Away Policy for Editing Surfaces

### Problem

Pointer-down on the canvas stage can close editing UIs immediately, discarding in-progress edits with no warning.

### Design

1. Define explicit click-away behavior per surface type:
   - **Dialogs (annotation editor, legend labels, general notes, report):** Clicking the canvas does not close the dialog. User must explicitly Apply or Cancel.
   - **Lightweight flyouts (quick-access settings, scale flyout):** Clicking outside closes the flyout. These surfaces have no pending editable text that would be lost.
2. Never silently discard typed text content. If a dialog has unsaved changes and the user triggers a close action (other than Cancel/Escape), either keep the dialog open or show a confirmation.

### Acceptance

1. Clicking the canvas while an editing dialog is open does not close or discard the dialog.
2. Clicking outside a lightweight flyout closes it without data loss.
3. No path exists where typed text content is silently discarded.

---

## 3) Enter-to-Blur on Reactive Inputs

### Problem

12 text/number inputs update state reactively via `onInput`, but pressing Enter does nothing visible. Users expect Enter to confirm their input with visual feedback.

### Design

1. Add `onKeyDown` handler to all affected inputs.
2. On Enter key press, call `event.currentTarget.blur()`.
3. After blur, explicitly focus the canvas/stage element to restore keyboard shortcut functionality. `blur()` alone sends focus to `document.body`, not the canvas.
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
2. After blur, focus moves to the canvas and keyboard shortcuts are active.
3. No change to reactive value-apply-on-keystroke behavior.

---

## 4) Enter-to-Finish for Multi-Step Drawing Tools

### Problem

Multi-step drawing tools have no keyboard path to say "I'm done":

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

For click-to-complete tools (arc, curve, arrow, dimension), the commit is inherently the final click — no keyboard alternative is needed. But for tools with explicit finish buttons and for continuous-mode line drawing, there is no keyboard finish.

This gap is what causes users to reach for Escape as "I'm done," which then fails destructively in tools where Escape discards real work (e.g., an arc after 2 of 3 clicks).

### Design

1. **Line (continuous mode):** Enter commits the pending segment (if any) and exits continuous drawing, returning to the select tool. If no pending segment, just exit.
2. **Linear auto-spacing:** Enter triggers "Finish Open" (the default finish action) when 2+ vertices exist.
3. **Arc auto-spacing:** Enter triggers "Apply Spacing" when a target arc is selected.
4. These shortcuts only fire when no text-edit input or dialog is active (guarded by `isEditingContextActive` from section 1).
5. Click-to-complete tools (arc, curve, arrow, dimension) remain unchanged.

### Acceptance

1. In continuous line mode, pressing Enter finishes the current drawing operation.
2. In linear auto-spacing with sufficient vertices, pressing Enter finishes the trace.
3. In arc auto-spacing with a selected target, pressing Enter applies spacing.
4. Enter does not fire tool-finish when any editing context is active.

---

## 5) Escape Semantics

### Problem

Escape universally calls `clearTransientToolState()`, discarding incomplete work. This is correct cancel semantics, but for committed-per-click tools (like line in continuous mode), canceling and finishing produce the same visible result — committed segments remain, only the pending segment is discarded. Users learn to use Escape as "I'm done," which then fails destructively in other tools.

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

1. Escape remains "cancel/discard" in all contexts. This is the correct semantic and should not change.
2. The user confusion resolves naturally once Enter-to-finish exists (section 4). Users will reach for Enter instead of Escape.
3. Add hint text to tool status messages when a tool has pending state:
   - Tools with Enter-to-finish: `"Press Enter to finish, Escape to cancel."`
   - Click-to-complete tools: `"Click to place. Escape to cancel."`
4. Centralize hint rendering via a shared helper to prevent divergence across tools.

### Acceptance

1. Escape behavior is unchanged.
2. Tool status hints clearly distinguish finish (Enter) from cancel (Escape) where both apply.

---

## 6) Dialog Keyboard Shortcut Consistency

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

The split follows a reasonable convention: single-line inputs use Enter, multi-line textareas use Ctrl+Enter. This is standard (Slack, GitHub, etc.).

Edge cases flagged in review:

1. General Notes rows are `<input>` elements (single-line) but use Ctrl+Enter for "apply all." This is intentional — General Notes is a multi-row compound editor where Ctrl+Enter means "apply the entire dialog," not "commit this one field." This matches the dialog commit pattern, not the single-input pattern.
2. Report dialog intentionally uses Ctrl/Cmd+Enter to submit at dialog scope. Enter alone remains text-entry behavior and does not submit.

### Design

1. Formalize the convention:
   - **Single-line inputs:** Enter applies/commits.
   - **Multi-line textareas:** Ctrl/Cmd+Enter applies/commits.
2. Display a hint at the bottom of each dialog stating the keyboard shortcut: `"Enter to apply"` or `"Ctrl/Cmd + Enter to apply"`.
3. Verify each dialog actually shows the shortcut hint consistently — some currently do, some don't.
4. For report dialog specifically, hint text must read `"Ctrl/Cmd + Enter to submit"` to match behavior.

### Acceptance

1. Every dialog with an apply/submit action shows the keyboard shortcut hint.
2. No changes to existing keyboard behavior.

---

## 7) Commit Convention Documentation

### Problem

The four commit patterns (reactive, reactive input, explicit button, dialog) are implicit. Future development may introduce new interactions that violate the model.

### Design

1. Document the canonical commit model (defined in the Overview section of this spec) in `docs/ENGINEERING.md` under a "Commit Conventions" heading.
2. Include the rules:
   - Toggles and selectors: reactive, immediate, reversible via undo.
   - Single-value text/number inputs: reactive on keystroke, Enter to blur/confirm, then focus canvas.
   - Multi-input compound actions: explicit Apply button, with Enter shortcut where applicable.
   - Multi-field editors (dialogs): Apply/Cancel buttons, keyboard shortcut per input type, hint text shown.
   - Global project-level destructive shortcuts (`Delete`, `Backspace`, `Undo`, `Redo`) suppressed while editing context is active.
   - Escape always means cancel. Enter always means finish/confirm.
3. No behavior changes — documentation only.

### Acceptance

1. Convention is documented in engineering docs.

---

## Implementation Sequence

### Phase 0: Safety guards (sections 1–2)
1. Introduce `isEditingContextActive` signal and suppress project-level destructive shortcuts (`Delete`, `Backspace`, `Undo`, `Redo`) during editing.
2. Fix quick-access Escape `stopPropagation()` leak.
3. Define and enforce click-away policy for dialogs vs flyouts.

Rationale: Fix destructive bugs before adding new keyboard behaviors.

### Phase 1: Enter-to-blur on reactive inputs (section 3)
Add `onKeyDown` + blur + canvas refocus to 12 inputs. Smallest change, biggest immediate UX improvement.

### Phase 2: Enter-to-finish for multi-step tools (section 4)
Add Enter shortcut for continuous line, linear auto-spacing, arc auto-spacing. Gives users the "I'm done" key they're reaching for.

### Phase 3: Hint text for finish/cancel (section 5)
Add status message hints distinguishing Enter (finish) from Escape (cancel). Makes the model discoverable.

### Phase 4: Dialog keyboard hints (section 6)
Ensure every dialog shows its keyboard shortcut. Polish pass.

### Phase 5: Document conventions (section 7)
No code changes — add commit model to engineering docs.
