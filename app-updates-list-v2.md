1. Dividing Lines
    - Add horizontal dividing lines between subheading/subgroups in sidebar

2. Downlead Buttons
    - Rename Label: ”Con > Gnd” to “Conduit to Ground”
    - Rename Label: ”Con > Roof” to “Conduit to Roof”
    - Rename Label: ”Sfc > Gnd” to “Surface to Ground”
    - Rename Label: ”Sfc > Roof” to “Surface to Roof”
    - This will force a two-line label - button height should increase to accomodate it
    - All downleads symbol components should have an input in the properties bar for setting vertical distance. Furthermore...
        - Remove the double-click popup input - user can change the value in the properties bar 
        - This should appear in both selection and placement mode
        - It should set the default value in placement mode 
        - It should update the current value when in selection mode
        - Validation: values must be zero or positive integers
        - Undo behavior: Use the existing "local signal + commit on action" pattern (same as AT spacing/scale inputs). Store typed value in a local signal; call commitProjectChange once on blur/Enter. In placement mode, no undo entry needed — it's just setting a default. In selection mode, one undo entry per confirmed edit.

3. On the right side of the properties bar, I would like a quick tools section that is always visible.  
    - On smaller screens, it will wrap to the line below but still align right  
    - It will contain these tool buttons (with icon only):
        - Selection mode
        - Multi-selection mode
        - Pan-mode
        - Undo
        - Redo

4. Cursors:
    - Selection mode should use a pointer cursor (CSS `cursor: pointer`).
    - Multi-selection mode should use the same pointer cursor as selection mode (no custom cursor asset needed).
    - Button icons: Use Tabler icons for the toolbar buttons.
        - Select button: Use the Tabler pointer icon (IconPointer).
        - Multi-select button: Use a customized Tabler pointer icon with a small "+" symbol in the top-right whitespace area. This is a button icon only — it does not affect the actual mouse cursor.

5. Spinner on Number Input Fields - number should increment by 1, not decimals, on these inputs:
    - Linear AT distance, 
    - Arc AT distance, 
    - Measure and mark target distance, and 
    - Scale inputs
    - NOTE: Typed decimals should be allowed on scale inputs.  All others should be integer only.

6. Legend Label Editor 
    - It should never appear off-screen
    - Needs to be movable 

7. Selection Mode: 
    - When you move a selected item, the endpoint circles don’t move with it.  You have to reselect it to be able to move endpoints.

8. Letters Feature
    - Class 2 air terminals (include Linear AT, ArcAT, and Bonded AT) should be use white text color for their letters because the circle is a filled circle, and the black text is hard to read.

9. Set Component Buttons to 'Disabled' when Specific Material Types are Selected:
    - Aluminum: Cadweld, Ground Rod
    - Copper: Ground Rod
    - Bimetallic: Linear Conductor, Arc Conductor, Curve Conductor, Air Terminal, Linear AT, Arc AT, Bonded AT, Steel Bond, Ground Rod, Cadweld Connector, Continued
    - Grounding: Air Terminal, Linear AT, Arc AT, Bonded AT

10. Steel-Bond & Through-Roof Symbols 
    - The "asterisk" inside the symbol in the drawings do not look like proper asterisks.  Please view the "workspace-symbols.png" file in the root directory and compare it to "tabler-steel-bond.png" and "tabler-through-roof.png" (both also in root directory).


#### Deferred Items

1. Measure tool 
    - Brings up “measure and mark” toolbar in property bar, which doesn't seem appropriate
    - I Can’t figure out how to “enter” or "register" a measurement
    - Probably needs general review of the user experience

2. Z-Order Management: 
    - Allow z-ordering (bring forward/send back) as part of the selection mode.