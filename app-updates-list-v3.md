## App Updates V3

1.	Icon/Symbol Updates:
    - Arc-AT Icon:
        - Make it slightly more curved, aka, move the center dot out/up a pixel or two
        - See @updated-arc-AT.png (difficult to tell the difference but it's there)
    - Class 2 Ground Rod Symbol:
        - See @classed-ground-rod.png for an example of how it should look.  Don't copy this pixel for pixel, it is an example made in MS Paint.
        - Only add numerical indicator if both classes are used in the drawing.
    - Multi-Selection Icon:
        - I don't like our current custom icon
        - Just use "IconPointerFilled" from Tabler.  It doesn't indicate "multi" in any way but at least it's different from single selection, which is what matters most.
2.	Downlead Certical Height Number:
    - Move to above and to the right of the symbol
    - See @updated-downlead.png
    - This change will be for all downlead symbols
3.	Move "brightness slider" to Project group in sidebar
4.	Switching connectors from mechanical to cadweld should not alter existing connection points, only new ones going forward
5.	Symbol size is not changing with annotation size.  The intention is that the symbols should scale with the annotation size, but their basepoint position not change.
6.	Rearrange AT symbols
    - See screenshot @v3-at-rearrange.png
7.	AT letters 
    - Should be required
    - Default for new additions should be whatever the last used letter was
    - If no previous AT, default to "A".
    - Linear-AT and Arc-AT should also have letters, with the same required and default rules.
    - User cannot add an AT symbol without a letter
8.	Dimension Text Tool Refinements
    - The tool works but the linework output needs visual corrections:
        a. Extension lines (the two vertical lines at each end) should overshoot the dimension line slightly, not stop flush with it.
        b. The dimension line (the horizontal connecting line) should have a break/gap where the text sits, rather than running continuously behind it.
        c. No arrows on extension lines or dimension line.
    - Rename the linework toggle from "End Lines + Bar" to "Extension Lines".
    - "Extension Lines" toggle should default to ON.
    - See @v3-dimension-text-intention.png for visual reference (not pixel-exact, just intent).
9.	New "General Notes" Feature:
    - A placeable stamp, identical in behavior to the Legend stamp (drag to place on drawing, move, resize).
    - Content is user-entered (not auto-generated). User double-clicks the placed stamp to open an editor.
    - Editor works like the Legend label editor: a list of text entries that can be added, removed, and reordered.
    - Multiple placements are allowed, but they all display the same shared list of notes.
    - Model the implementation on the existing Legend feature (data model, overlay rendering, editor dialog, placement tool).
10. Landing Skeleton Page:
    - Should be updated to become functional.
    - See @v3-landing-skeleton.png - this should explain everything.
11.	Z-Index Management
    - Establish a sensible default render order for canvas element categories (current order: Arcs → Curves → Lines → Symbols → Legends → Texts → DimensionTexts → Arrows → Marks). Adjust if needed.
    - Add per-element "Bring to Front" and "Send to Back" controls in the properties bar when a single element is selected.
    - Reordering is within the element's own category (e.g., a symbol relative to other symbols), not across categories.
    - Element order is saved in the project file.
12. Quick-Access Toolbar Feature Updates/Additions
    - Move from the top properties bar to a dedicated right-side vertical sidebar. Just icons, arranged vertically.
    - Fixed icons (top, non-removable, non-reorderable):
        1. Gear icon (opens customization UI)
        2. Select
        3. Multi-Select
        4. Pan
        5. Undo
        6. Redo
    - Below the fixed icons, users can add any sidebar tool as a quick-access icon.
    - Separator lines (small horizontal dividers) can be added, removed, and reordered among the user-added icons.
    - No group headers — just icons and optional separators.
    - Flyout behavior: tools that need multiple inputs (e.g., manual scaling, annotation size, brightness slider) show a flyout panel to the left when clicked. One flyout open at a time. Dismiss on click-outside or Escape.
    - Some tools may need new single-icon representations for use in quick-access.
    - Customization UI:
        - Opened via the gear icon at the top of the bar.
        - Popup with two list boxes side by side: "All Tools" (left) and "Quick-Access Tools" (right).
        - "Add >>" and "<< Remove" buttons between the lists, enabled/disabled based on which list has a selection. Only one list can have an active selection at a time.
        - Right list is orderable (move up/move down buttons, or drag-to-reorder).
        - Separators can be added/removed/reordered in the right list alongside tool entries.
    - Quick-access configuration persists to localStorage.