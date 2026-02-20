##App Updates/Changes/Additions

1. The following error description shows up in notification are after importing PDF:
- "Cannot use the same canvas during multiple render() operations. Use different canvas or ensure previous operations were cancelled or completed."

2. Properties Bar: 
- Top bar above the workspace seems to be functioning, somewhat, as a "properties" or "options" bar.  We should formalize this.
- Most (all?) symbols, tools, etc that have options or properties that appear when you select the tool or symbol should have those appear in the "properties" bar instead of in the sidebar.  
- Have agent look for problems/conflicts/considerations with implementation of this behavior.

3. Right-click Selection Behavior:
- Right-click successfully selects an item, but once an item is selected, the application doesn’t go into "selection" mode, so you can’t do anything with your selection.  Right-clicking an item should formally put the app in selection mode.

4. Measure and Mark Tool:
- Measure and mark should have a in input in the new "properties bar" where users can set a "target" distance in feet.  This target distance will become like a snap.  Any time the distance counter reaches the target distance, the tool should "hang" for a second, possibly displaying a snap shape.  If the user continues moving the mouse, it’s possible to move away from this target distance snap, just like any other snap.
- Need a "Clear Marks" button, that can clear all marks on the page.  This can appear in the properties bar when Mark tool is in use, or when a mark is selected in selection mode.

5. Annotations:
- Changing the "Annotation Size" should change the size of symbols, scaling them from their basepoint.  It just shouldn’t change the location of their basepoints, and it shouldn’t change the length of any lines or anything, but symbols should scale up or down in size.

6. Linear AT:
- At each left-click (which effectively completes a measured segment, we should go ahead and add the Air Terminal symbols for that segment.  We don’t need to wait until the user has completed the entire measurement.
- A corollary to that, and a general rule as well, should be that if an Air Terminal is already at a point where the linear AT needs to put one, it should not put a second.  There is no real-world reason why two air terminals could possibly be at the same location.  There is not tolerance allowance here, it only applies at exact points.  Two air terminals can be very near each other.

7. Downlead Symbols:
- Downlead heights should be regular annotations that show on the final output, not just construction marks
- However, unlike other annotations, they should not be selectable by themselves, as they are tied to the downlead symbol.  They should move and delete with the downlead symbol
- They should be black colored text like all other text annotations.
- They should appear closer to symbol than they currently do.

8. Cadweld Symbols:
- Cadwelds are a second type of conductor connection
- Existing conductor-connection should be renamed "mechanical-connection" to distinguish from "cadweld-connection"
- Auto-connection should have a option buttons with "mechanical" or "cadweld" connections.
- The option buttons should appear inline just below auto-connection in the UI, but be disabled if auto-connection is off.

9. Dimensional Text:
- Should have an option in the properties bar to display end-lines and a bar between them, which can be placed by a 3rd-click in a given direction.  The intention is to replicate dimensional text you might find on a formal architectural drawing.

10. Multi-Select Mode:
- Need to add a "Multi-Select mode.
- Only actions possible in multi-select mode are deleting and moving - no other features of select mode are active 
- Put new button between select and pan in the sidebar.

11. Small Changes/Fixes:
- Auto connect should be on by default
- Snap to grid label should say "snap to points". angle snap should be just below "snap to points", followed by auto-connections.
- Conductor curve tool should have continuous line mode.
- Put a small "in" and "ft" into top-right corner of the text inputs for the maual scaling.
- Conductor lines with "grounding" set as the material-type (aka red lines) should be put on grounding layer.
- Legend editor doesn’t include conductors
- In the list of material, Bimetallic should come after Aluminum.  
- Remove tinned material as an option altogether, it’s not necessary.
- Letters in lettered Ats aren’t quite cented vertically, probably due to font properties, we need to adjust for that.
- Ground wire color should color code "Crimson" (hex code DC143C).

12. Code Review:
- As the application has evolved with all the updates, check that internal naming conventions still match labels - though not necessarily exactly. We have renamed things and code should match.  Agent can search through naming conventions used in the code for update candidates.  Symbols and such that originally were named one thing, but that name has changed through evolution of the app.
