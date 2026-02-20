# Production Smoke Checklist

Run this after every production deploy (and after rollback).

## Environment

- URL:
- Build version (`VITE_APP_VERSION`):
- Browser:
- Tester:
- Time:

## Core App Load

1. Open app URL.
2. Verify landing skeleton is visible before import.
3. Confirm no blocking console errors on first load.

## Import and Editing

1. Import a known sample PDF.
2. Draw one line, one arc, one curve, and one directional symbol.
3. Verify snapping cues appear and cursor location matches drawing placement.
4. Switch between Select, Multi, and Pan modes.
5. Confirm pan cursor behavior (tool and middle-click pan).

## Selection and Property Edits

1. Select a line and move an endpoint.
2. Select an arc and confirm all expected handles are editable.
3. Open text/annotation edit dialog with double-click.
4. Change layer assignment on annotation elements and verify visibility toggles.

## Save/Load and Autosave

1. Save project JSON.
2. Reload app and load saved project.
3. Confirm drawing, symbols, and legend restore correctly.
4. Make a change, refresh tab, and confirm autosave recovery prompt/message.

## Export Validation

1. Export PNG, JPG, and PDF.
2. Verify overlay alignment vs workspace for each export.
3. Verify annotation-size setting affects export output as expected.
4. Verify construction-only visuals (snaps/marks) are not present in export.

## Sidebar and Quick Tools

1. Confirm tooltips exist for core sidebar controls.
2. Add/remove several quick tools and verify local persistence.
3. Confirm missing/disabled actions are intentionally unavailable.

## Pass/Fail

- Result: PASS / FAIL
- Blocking issues:
- Non-blocking issues:
