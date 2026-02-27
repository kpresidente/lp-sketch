# LP Sketch User Manual

## 1. Introduction

LP Sketch is a lightning protection system design communication tool. It allows designers to annotate a building plan PDF with lightning protection components, conductors, and design notes, then export the result for CAD handoff or field reference.

**LP Sketch is not a CAD application.** It is purpose-built for lightning protection design communication. The tools, components, and terminology are organized around LP system design workflows rather than general-purpose drafting. You work by importing a single-page architectural PDF, overlaying your protection system design on top of it, and exporting the finished sketch as a flattened image or PDF.

### What LP Sketch Does

- Import a single-page building plan PDF as a locked background
- Draw rooftop conductors, down conductors, and grounding conductors using material-aware and class-aware tools
- Place LP system components: air terminals, bonds, connections, downleads, penetrations, ground rods, and more
- Auto-space air terminals along roof edges and ridgelines at code-compliant intervals
- Auto-detect and place conductor junction connectors (mechanical or Cadweld)
- Track conductor footage by material and wire class
- Generate legends and general notes
- Export flattened PNG, JPG, or PDF for handoff

### What LP Sketch Does Not Do

- Multi-page PDF editing
- CAD-level production drafting or engineering calculations
- Collaborative multi-user editing
- Structural or electrical load analysis

---

## 2. Getting Started

### Core Workflow

1. **Import a PDF** -- Load a single-page building plan
2. **Set the drawing scale** -- Either manually or by calibrating against a known dimension
3. **Design your protection system** -- Draw conductors, place components, auto-space air terminals
4. **Annotate** -- Add dimension texts, notes, arrows, legend, and general notes
5. **Save your project** -- Save to a `.lpsketch.json` file for future editing
6. **Export** -- Export as PNG, JPG, or flattened PDF for handoff

### Importing a PDF

From the **Project** panel in the sidebar, click **Import PDF** and select a single-page PDF file. You can also drag and drop a PDF file directly onto the canvas.

**Requirements:**
- The PDF must be a single page
- Maximum file size: 25 MB
- Maximum page dimensions: 20,000 points per side

Once imported, the PDF renders as a locked background. You cannot edit the PDF content -- it serves only as a reference layer beneath your annotations.

### Setting the Drawing Scale

Before measurements, dimension texts, and auto-spacing tools will work correctly, you must establish the drawing scale. There are two methods:

#### Manual Scale Entry

In the **Scale** panel, enter the scale ratio as inches-to-feet. For example, if your drawing is at 1/8" = 1'-0", enter `1` in the inches field and `8` in the feet field, then click **Apply Scale**.

#### Calibration

1. Select the **Calibrate** tool from the sidebar or quick-access bar
2. Click two points on the PDF that represent a known real-world distance (for example, the endpoints of a dimensioned wall)
3. A prompt will ask for the real-world distance in feet
4. Enter the distance and confirm

The calibration method is often more accurate because it accounts for any scaling that occurred during PDF generation.

The current scale is displayed as a badge below the scale controls (e.g., "1 in = 8 ft").

---

## 3. Understanding the Interface

### Sidebar

The left sidebar contains all primary controls, organized into collapsible panels:

| Panel | Purpose |
|-------|---------|
| **Project** | Project name, PDF import, save/load, export, PDF brightness |
| **Tools** | Mode selection (Select, Multi-Select, Pan), undo/redo, snap toggles, auto-connector settings, annotation tools |
| **Components** | Conductor drawing tools and LP component placement buttons |
| **Material** | Wire class selection (Class I / Class II) and material selection (Copper, Aluminum, Bimetallic, Grounding) |
| **Scale** | Drawing scale entry, calibration tool, annotation size |
| **Layers** | Layer visibility toggles |

### Quick-Access Toolbar

The horizontal toolbar running along the top of the canvas provides fast access to frequently used tools and settings. It always includes Select, Multi-Select, Pan, Undo, and Redo buttons.

The quick-access toolbar is fully customizable. Click the gear icon on the left end to open the customizer, where you can add or remove any tool, component, setting, toggle, or action button. Your customization is saved per device.

### Properties Bar

The bar below the quick-access toolbar shows context-sensitive information and options for the active tool:

- **Active tool name and icon** -- Always visible
- **Tool-specific options** -- For example, continuous mode toggle for the Linear Conductor tool, max interval setting for Linear AT, letter selector for air terminals
- **Selection info** -- When an element is selected, shows its type
- **Live measurements** -- Path distance for the Measure tool, span distance for the Mark tool, calibration preview
- **Zoom level** -- Current zoom percentage

### Canvas

The main workspace displays the PDF background with your design overlay. Navigation:

- **Scroll wheel** -- Zoom in and out (range: 25% to 800%)
- **Middle mouse button drag** -- Pan the view from any tool
- **Pan tool** -- Click and drag to pan
- **Pinch gesture** -- Two-finger pinch to zoom on touch devices

---

## 4. Materials and Wire Classes

### Materials

LP Sketch uses color to represent conductor and component materials. When you select a material, all new conductors and components you place will be assigned that material.

| Color | Material | Abbreviation | Use |
|-------|----------|--------------|-----|
| Green | Copper | Cu | Standard copper conductors and components |
| Blue | Aluminum | Al | Aluminum conductors and components |
| Red | Grounding | Gnd | Grounding system conductors and components |
| Purple | Bimetallic | Bi | Bimetallic connection components (junctions between dissimilar metals) |

A fifth material, **Tinned** (Cyan / Sn), exists in the data model but is not directly selectable from the material picker. It is used internally by the auto-connector system when resolving junction materials.

Select the active material from the **Material** panel in the sidebar.

### Material Restrictions

Not all tools and components are available with every material. These restrictions mirror standard LP installation rules:

**Bimetallic (Purple):**
- Cannot draw conductors (Linear, Arc, Curve) -- bimetallic fittings are junction connectors for dissimilar-metal splices, not conductor materials
- Cannot use auto-spacing tools
- Cannot place air terminals, bonded air terminals, steel bonds, ground rods, Cadweld connections, or continued symbols

**Grounding (Red):**
- Cannot use auto-spacing tools -- grounding conductors are part of the electrode system, not the rooftop system
- Cannot place air terminals or bonded air terminals

**Copper (Green):**
- Cannot place ground rods -- ground rods are part of the grounding electrode system and are always placed under the Grounding (Red) material. Switch to Red to place ground rods.

**Aluminum (Blue):**
- Cannot place Cadweld connections -- the exothermic weld produces a copper alloy that is galvanically incompatible with aluminum. Use mechanical connections for aluminum.
- Cannot place ground rods -- aluminum cannot contact earth. Aluminum down conductors must transition to copper via a bimetallic fitting before connecting to the grounding system.

### Wire Classes

Class I and Class II are building classifications based on height. Class I covers buildings 75 feet or less; Class II covers buildings taller than 75 feet. Class II requires heavier conductors and components, and crimp-type connectors are not permitted.

For mixed buildings (such as a steeple rising above a lower main roof), Class II requirements apply only to the portion exceeding 75 feet. Class II conductors from the taller portion must run continuous to ground and interconnect with the balance of the system.

Select the active class from the **Material** panel. LP Sketch renders the two classes as:

| Class | Visual | Stroke |
|-------|--------|--------|
| **Class I** | Dashed line | 2px base width, 8-6 dash pattern |
| **Class II** | Solid line | 3px base width |

The class applies to all newly placed conductors and components. Some components always carry a specific class or have no class designation (see the Components section).

---

## 5. Drawing Conductors

Conductors represent the physical cable runs in your LP system. LP Sketch provides three conductor drawing tools for different routing situations.

### Linear Conductor

The **Linear** tool draws straight conductor segments -- the most common tool for rooftop and grounding conductor runs.

**How to use:**
1. Click to set the start point
2. Click again to place a straight segment to the second point

**Continuous mode:** When enabled (toggle in the properties bar), the endpoint of each segment automatically becomes the start of the next. This lets you trace a conductor path without re-clicking the start of each run. Double-click or press Escape to end a continuous sequence.

### Arc Conductor

The **Arc** tool draws circular arc conductor segments -- useful for tracing curved roof features, tank edges, or other circular building elements.

**How to use:**
1. Click to set the first endpoint of the arc
2. Click to set the second endpoint (this defines the chord)
3. Move the cursor to define the arc curvature, then click to set the "pull" point that the arc passes through

The result is a geometrically precise circular arc segment. Click **Reset Arc** in the properties bar to start over.

### Curve Conductor

The **Curve** tool draws smooth curve segments using a three-point definition -- useful for non-circular curved paths.

**How to use:**
1. Click to set the start point
2. Click to set a point that the curve will pass through
3. Click to set the endpoint

**Continuous mode:** Like the Linear tool, the Curve tool supports continuous chaining. Click **Reset Curve** in the properties bar to start over.

### Conductor Layer Assignment

Conductors are automatically assigned to layers based on their material:
- **Red (Grounding)** conductors go to the **Grounding** layer
- All other material conductors go to the **Rooftop** layer

---

## 6. Placing Components

Components represent the physical devices and connection points in your LP system. Select a component type from the **Components** panel in the sidebar, then click on the canvas to place it.

Components are organized into functional groups:

### Air Terminals

| Component | Description | Placement | Properties |
|-----------|-------------|-----------|------------|
| **Air Terminal (AT)** | Standard air terminal (lightning rod). The primary strike capture point of the system. | Single click | Letter (A-Z), Class I or II |
| **Bonded Air Terminal** | An air terminal with a bonded base connection. | Single click | Letter (A-Z), Class I or II |

**Letter designations:** Air terminals and bonded air terminals support letter variants (A through Z). The letter distinguishes different terminal types or sizes within the design. Select the letter from the properties bar before placing. The application remembers the last letter used per material.

**Legend suffixes:** When placing lettered air terminals, you can also set a custom legend suffix (up to 24 characters) in the properties bar. This suffix appears in the legend entry for that terminal variant, allowing you to describe the terminal type (e.g., "24-inch", "with base plate").

### Connections

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Bond** | A bonding connection point. | Single click |
| **Mechanical** | A mechanical (cable-to-cable) splice connection. | Single click |
| **Cadweld** | An exothermic (Cadweld) welded connection. | Single click |

> **Note:** Mechanical and Cadweld connections can also be placed automatically by the auto-connector system (see Section 11).

### Downleads

Downlead components represent the vertical conductor runs from rooftop to ground level. Each downlead carries a **vertical footage** value (0-999 feet) that records the length of the vertical conductor run. This footage is added to the conductor footage totals and displayed adjacent to the symbol on the drawing.

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Conduit to Ground** | Down conductor in conduit, at ground level end | Directional (two-click) |
| **Conduit to Roof** | Down conductor in conduit, at roof level end | Directional (two-click) |
| **Surface to Ground** | Surface-mounted down conductor, at ground level end | Directional (two-click) |
| **Surface to Roof** | Surface-mounted down conductor, at roof level end | Directional (two-click) |

**Directional placement:** All downlead components are directional -- they have an orientation indicating which way the conductor runs. To place one:
1. Click to set the position
2. Click again (or move and click) to set the direction

The **Vertical** footage field in the properties bar lets you set the vertical footage before placing a downlead. You can also edit the vertical footage of an already-placed downlead by selecting it in Select mode.

**"To Ground" vs. "To Roof":** Each physical down conductor run has two ends visible on the plan:
- The **"to Roof"** symbol is placed at the rooftop level, marking the point where the down conductor departs the rooftop conductor system. It indicates whether the conductor descends in conduit (round base symbol) or on the building surface (square base symbol).
- The **"to Ground"** symbol is placed at the ground level or at the building wall below grade, marking the point where the conductor arrives at the grounding electrode. It uses the same conduit/surface distinction.

On a finished drawing, a single downlead typically shows both symbols: a "to Roof" symbol on the roof plan and a "to Ground" symbol on the ground-floor or elevation plan. When working from a single-page roof plan, the "to Ground" symbol may be placed at the perimeter to indicate the path and the vertical footage entry captures the actual length of the vertical run not visible in plan view.

### Penetrations

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Through-Roof-to-Steel** | Connection from the rooftop system through the roof to structural steel below | Single click |
| **Through-Wall Connector** | A conductor passing through a building wall | Single click |

### Grounding

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Ground Rod** | A driven ground rod. | Directional (two-click) |
| **Steel Bond** | A bond to existing structural steel. | Single click |

Ground rods are directional -- the direction indicates which way the rod is oriented. When the design includes both Class I and Class II ground rods, a class indicator diamond is displayed on the ground rod symbol to distinguish them.

### Miscellaneous

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Continued** | Indicates a conductor continues beyond the drawing boundary. | Directional (two-click) |
| **Connect Existing** | Indicates connection to an existing protection system. | Directional (two-click) |

Both of these symbols are always placed without a wire class designation.

### Component Layer Assignment

Components are automatically assigned to their appropriate layer:
- **Rooftop layer:** Air terminals, bonded air terminals, bonds, Cadweld connections, mechanical connections, continued, connect existing, through-roof-to-steel, through-wall connectors
- **Downleads layer:** All four downlead types
- **Grounding layer:** Ground rods, steel bonds

---

## 7. Air Terminal Auto-Spacing

Auto-spacing is one of LP Sketch's most powerful features. It automates the placement of air terminals at code-compliant intervals along conductor paths or arcs.

Both auto-spacing tools require the drawing scale to be set first.

### Linear Auto-Spacing (Linear AT)

The Linear AT tool places air terminals at equal intervals along a polyline path that you trace over roof edges, ridgelines, or other features requiring terminal coverage.

**How to use:**
1. Select the **Linear AT** tool
2. Set the **Max Interval** (in feet) in the properties bar -- this is the maximum allowed spacing between air terminals (typically 20 ft for 10-inch terminals or 25 ft for 24-inch terminals)
3. Select the **Letter** designation for the terminals to be placed
4. Click along the path to trace vertices:
   - **Left-click** places an **outside corner** vertex -- an exposed building corner that must receive an air terminal
   - **Right-click** (or Alt+click) places an **inside corner** vertex -- a reentrant corner where no terminal is needed
5. To finish:
   - Click **Finish Open** in the properties bar to apply spacing to an open path (like a ridgeline)
   - Click **Close + Finish** to close the path into a loop (like a building perimeter) and apply spacing
   - Double-click to finish an open path
   - Click near the starting point to automatically close the path

**How spacing is computed:** The tool divides the path into spans between outside corners. Each span is divided into equal segments such that no segment exceeds the maximum interval. Air terminals are placed at every division point and at every outside corner. Inside corners allow the path to route around building geometry without forcing a terminal placement.

**Outside vs. inside corners:**
- **Outside corners** are exposed convex points on the building perimeter that require an air terminal. The tool always places a terminal at each outside corner vertex.
- **Inside corners** are reentrant (concave) angles where the building turns inward. No terminal is placed at the corner itself, but the conductor routes through it.

**Touch devices:** On touch screens, a long press (hold for about 360ms) functions as an inside-corner input instead of an outside corner. You can also toggle the **Corner** mode (Outside/Inside) in the properties bar to control the default behavior.

### Arc Auto-Spacing (Arc AT)

The Arc AT tool places air terminals at equal intervals along an existing arc conductor -- useful for curved roof features like domes, tanks, or barrel roofs.

**How to use:**
1. Draw an arc conductor first using the Arc tool
2. Select the **Arc AT** tool
3. Set the **Max Interval** (in feet) and **Letter** designation in the properties bar
4. Click on the arc conductor to select it (it will highlight)
5. Click **Apply Spacing** in the properties bar

Air terminals are placed at equal angular intervals along the arc, respecting the maximum interval.

The standard maximum intervals are 20 feet for 10-inch terminals and 25 feet for 24-inch terminals, matching the Linear AT tool's Max Interval field.

---

## 8. Measurement and Construction Tools

### Measure

The **Measure** tool lets you measure polyline distances on the drawing without placing any permanent elements.

**How to use:**
1. Select the **Measure** tool
2. Click points to build a measurement path
3. The running distance is displayed in the properties bar

The distance is calculated in real-world units using the calibrated scale.

**Target distance snap:** Enter a value in the **Target** field (in feet) in the properties bar. When measuring, the cursor will snap to multiples of this distance along the path. Hold the cursor at the target distance for about 1 second to lock the snap. This is useful for checking spacing compliance without placing any elements.

Click **Clear** in the properties bar to reset the measurement.

### Mark (Measure & Mark)

The **Mark** tool combines measurement with construction mark placement. Construction marks are reference points that appear on the drawing to assist with layout but are **not included in exports**.

**How to use:**
1. Select the **Mark** tool
2. Set the **Target** distance (in feet) for desired mark spacing
3. Click to place marks:
   - **Left-click** places a mark and advances the measurement anchor to that point
   - **Right-click** (or Alt+click) places an **inside corner** -- routes around a corner without placing a mark at the corner itself

**Properties bar controls:**
- **Target** -- Target distance in feet
- **Corner** -- Toggle between Outside and Inside default corner mode (for touch devices)
- **Reset Span** -- Resets the current measurement anchor
- **Clear All** -- Removes all construction marks from the drawing

Construction marks are snappable -- other tools will snap to marks just like they snap to conductor endpoints. This makes marks useful as reference points for conductor placement.

### Calibrate

The **Calibrate** tool establishes the drawing scale by measuring a known distance on the PDF.

**How to use:**
1. Select the **Calibrate** tool
2. Click the first endpoint of a known dimension on the PDF
3. Click the second endpoint
4. Enter the real-world distance (in feet) when prompted

The scale is immediately applied and displayed in the Scale panel.

### Dimension Text

The **Dimension Text** tool places scaled measurement annotations on the drawing.

**How to use:**
1. Select the **Dimension Text** tool
2. Click the start point of the measurement
3. Click the end point of the measurement
4. Click to position the dimension label

The dimension text automatically calculates and displays the real-world distance based on the drawing scale. The display format follows the project's unit settings (feet-inches, decimal feet, or meters).

**Options:**
- **Extension Lines** -- Toggle in the properties bar to show or hide dimension extension lines and bars (the connecting linework between the measured points and the label)
- **Override text** -- After placing, double-click the dimension text in Select mode to edit. You can enter custom text (up to 24 characters) to override the calculated distance.

---

## 9. Annotations

### Text

The **Text** tool places free-form text annotations on the drawing.

**How to use:**
1. Select the **Text** tool
2. Type your text in the **Text** field in the properties bar
3. Click on the canvas to place it

Text inherits the active material color and is assigned to the active annotation layer. To edit existing text, switch to Select mode and double-click the text element.

### Arrow

The **Arrow** tool places directional arrow annotations.

**How to use:**
1. Select the **Arrow** tool
2. Click to set the tail (starting point)
3. Click to set the head (arrowhead end)

Arrows inherit the active material color. To edit an existing arrow, switch to Select mode and double-click it.

### Legend

The **Legend** tool places a legend box that automatically populates from all components placed on the drawing.

**How to use:**
1. Select the **Legend** tool
2. Click on the canvas to place the legend box

The legend includes:
- **Component rows** -- Each unique combination of component type, material, class, and letter designation, with a count of how many are placed
- **Conductor rows** -- Total conductor footage per material and wire class, combining horizontal footage (from drawn conductors) and vertical footage (from downlead symbols)

**Editing legend labels:** Double-click a placed legend in Select mode (or click **Edit Labels** in the properties bar) to open the legend label editor. This floating dialog lets you customize the text label for any legend entry. Changes are per-placement, so you can have multiple legend boxes with different label customizations.

You can place multiple legend boxes. Each is independently movable and has its own label overrides.

### General Notes

The **General Notes** tool places a numbered notes box on the drawing.

**How to use:**
1. Select the **General Notes** tool
2. Click on the canvas to place the notes box

**Editing notes:** Double-click a placed notes box in Select mode (or click **Edit Notes** in the properties bar) to open the general notes editor. This floating dialog lets you:
- Add notes (up to 15)
- Remove notes
- Reorder notes (move up/down)
- Edit note text (up to 120 characters each)

Notes are displayed as a numbered list (1. First note, 2. Second note, etc.).

### Annotation Layer Assignment

Text, arrows, and dimension text elements can be assigned to any of the four layers (Rooftop, Downleads, Grounding, Annotation). All other annotation types (legend, general notes, marks) are always on the Annotation layer.

---

## 10. Layers

LP Sketch organizes design elements across four layers:

| Layer | Contents |
|-------|----------|
| **Rooftop** | Rooftop conductors (non-grounding), rooftop components (air terminals, bonds, connections, penetrations, etc.) |
| **Downleads** | All downlead components |
| **Grounding** | Grounding conductors (red material), ground rods, steel bonds |
| **Annotation** | Text notes, arrows, dimension texts, construction marks, legend placements, general notes placements |

### Layer Visibility

Toggle layer visibility from the **Layers** panel in the sidebar. When a layer is hidden:
- Its elements are not displayed on the canvas
- Its elements are **excluded from exports** (PNG, JPG, PDF)
- Its elements are still present in the project data and will reappear when the layer is made visible

This is useful for generating material-specific exports (e.g., showing only the grounding system) or for reducing visual clutter while working on a specific aspect of the design.

### Automatic Layer Assignment

Elements are automatically assigned to layers based on their type and material. You cannot manually reassign component or conductor layers. The only elements with user-selectable layer assignment are text, arrows, and dimension text annotations.

---

## 11. Auto-Connectors

LP Sketch can automatically detect conductor junctions and place connection symbols at those points.

### How It Works

When auto-connectors are enabled, the system scans all conductor geometry (lines, arcs, curves) and identifies **junction nodes** -- points where three or more conductor branches meet. At each junction, a connector symbol is automatically placed.

### Junction Detection

A junction occurs when:
- Three or more conductor endpoints coincide at the same point
- A conductor endpoint meets the midpoint of another conductor (a T-junction)
- Two conductors cross each other (an intersection)

### Connector Types

Two auto-connector types are available, selectable from the **Tools** panel:

| Type | Symbol | Description |
|------|--------|-------------|
| **Mechanical** | Cable-to-cable connection (small circle) | Mechanical splice connector |
| **Cadweld** | Cadweld connection (concentric circles) | Exothermic welded connection |

### Material Resolution

When conductors of different materials meet at a junction, the auto-connector resolves the appropriate material:

- If **aluminum** and **copper-family** (copper, tinned, or grounding) conductors meet, the connector is placed as **bimetallic** (purple)
- Otherwise, the connector takes the material of the converging conductors

### Controls

- **Toggle on/off** -- The "Auto-Connectors" switch in the Tools panel enables or disables automatic connector placement
- **Connector type** -- Choose between "Mechanical" and "Cadweld" using the buttons below the toggle

Auto-connectors are regenerated after every project change. They are visually identical to manually placed connectors but are flagged internally as auto-generated. If you disable auto-connectors, all auto-generated connectors are removed; manually placed connectors are unaffected.

**Mechanical vs. Cadweld:** Mechanical connectors (bolted clamps) are standard for most installations. Cadweld (exothermic weld) connections are often preferred for buried connections or where a permanent, maintenance-free joint is required. Note that Class II installations do not permit crimp-type connectors, and Cadweld is not appropriate for aluminum conductors (see Material Restrictions in Section 4).

---

## 12. Selection and Editing

### Select Tool

The **Select** tool is the primary tool for selecting, moving, and editing placed elements.

**Selecting elements:**
- Click on any element to select it
- The selected element is highlighted and its type is shown in the properties bar
- Right-click any element to select it (also switches to Select mode from any tool)

**Moving elements:**
- Click and drag a selected element to reposition it
- Lines, arcs, and curves move with all their points
- Symbols move to the new position

**Editing handles:**
When an element is selected, handles appear at key control points:
- **Lines:** Handles at start and end points -- drag to reshape
- **Arcs:** Handles at start, end, and through (pull) points
- **Curves:** Handles at start, through, and end points
- **Arrows:** Handles at tail and head
- **Directional symbols:** A direction handle extending from the symbol -- drag to rotate

**Inline editing:**
Double-click to edit the content of these element types:
- **Text** -- Edit the text string
- **Dimension text** -- Edit the override text
- **Arrow** -- Edit properties
- **Legend** -- Open the legend label editor
- **General notes** -- Open the general notes editor

**Z-ordering:**
When an element is selected, the properties bar shows **Send to Back** and **Bring to Front** buttons to control drawing order.

**Deleting:**
Press **Delete** or **Backspace** to delete the selected element.

### Multi-Select Tool

The **Multi-Select** tool lets you select and move multiple elements at once.

- Click elements to add them to the selection
- **Ctrl+click** (or Cmd+click on Mac) toggles an element in or out of the selection
- Click and drag to move all selected elements together
- Press **Delete** or **Backspace** to delete all selected elements

---

## 13. Snapping System

LP Sketch includes a comprehensive snapping system to help you place elements precisely.

### Snap Types

| Snap Type | Description | Priority |
|-----------|-------------|----------|
| **Endpoint** | Start or end point of a conductor, arrow, or dimension text | High |
| **Basepoint** | Position of a symbol, text, or other placed element | High |
| **Mark** | Construction mark position | High |
| **Intersection** | Where two conductors cross | High |
| **Perpendicular** | Point on a conductor perpendicular to your reference point | High |
| **Nearest** | Nearest point along a conductor (fallback) | Low |

When snapping is active and your cursor is near a snappable feature, a snap marker appears to indicate the snap point.

### Snap Controls

- **Snap to Points** toggle in the Tools panel (or quick-access bar) -- enables/disables geometric snapping
- **Hold Shift** while clicking -- temporarily disables snapping for that click
- **Hold Ctrl** while clicking -- temporarily disables angle snapping for that click

### Angle Snapping

When enabled, angles are constrained to 15-degree increments. This applies to:
- Linear conductor segments (angle from start to end)
- Directional symbol placement (direction angle)
- Arrow placement
- Dimension text measurement direction
- Mark tool segments

Toggle angle snapping from the **Angle Snap (15 degrees)** switch in the Tools panel.

---

## 14. Annotation Size

The annotation size setting controls the visual scale of all annotations, symbols, conductor strokes, legend text, and notes. Three sizes are available:

| Size | Scale Factor | Base Text Size |
|------|-------------|----------------|
| **Small** | 1.0x | 14px |
| **Medium** | 1.5x | 21px |
| **Large** | 2.0x | 28px |

Choose the size that provides the best readability for your particular PDF sheet size. Select from the **Scale** panel in the sidebar.

---

## 15. PDF Background Brightness

The **PDF Background** brightness slider in the Project panel lets you dim the background PDF. This can be useful when:
- The PDF has dark line work that competes with your annotations
- You want to emphasize the LP overlay while presenting or reviewing
- You need better contrast for specific conductor colors

The slider ranges from 0% (black) to 100% (full brightness). This setting only affects the display and does not modify the original PDF.

---

## 16. Project Management

### Saving Projects

Click **Save** in the Project panel to download your project as a `.lpsketch.json` file. This file contains:
- All your design elements (conductors, components, annotations)
- The embedded PDF (base64-encoded)
- All project settings (scale, material, class, layer visibility, etc.)
- Legend and general notes data

### Loading Projects

Click **Load** in the Project panel and select a previously saved `.lpsketch.json` file. The application validates the file, runs any necessary schema migrations for backward compatibility, and restores your full design state.

**Limits:**
- Maximum project file size: 30 MB
- Maximum total element count: 12,000

### Autosave

LP Sketch automatically saves your work to browser local storage:
- Saves after each change (debounced by 800ms)
- Maximum autosave size: 4 MB
- If the project exceeds 4 MB (usually due to a large embedded PDF), the autosave stores a "degraded" version without the PDF data

On your next visit, if an autosaved draft is detected, it will be automatically restored. If the draft was degraded (PDF stripped), you will need to re-import the PDF.

**Important:** Autosave uses browser local storage, which is specific to your browser and device. It is not a substitute for explicitly saving your project file.

### Exporting

LP Sketch supports three export formats:

| Format | Description |
|--------|-------------|
| **PNG** | Lossless raster image at 2x resolution |
| **JPG** | Compressed raster image at 2x resolution (92% quality) |
| **PDF** | Flattened PDF with annotations composited on top of the original PDF |

**What is included in exports:**
- All visible elements (respects layer visibility)
- The background PDF

**What is excluded from exports:**
- Hidden layers
- Construction marks (marks are working aids, not design documentation)
- Snap markers, selection highlights, and other UI overlays

The PDF export creates a true flattened PDF -- the original background PDF with the annotation overlay rendered as an image on top. This ensures the recipient sees exactly what you see, regardless of their software.

---

## 17. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+Z** (Cmd+Z) | Undo |
| **Ctrl+Shift+Z** (Cmd+Shift+Z) | Redo |
| **Ctrl+Y** (Cmd+Y) | Redo (alternative) |
| **Delete** or **Backspace** | Delete selected element(s) |
| **Escape** | Cancel current operation (in-progress line, arc, dimension, etc.) |
| **Hold Shift** | Disable geometric snapping for the current click |
| **Hold Ctrl** | Disable angle snapping for the current click |
| **Right-click** (or **Alt+click**) | Inside corner input (Linear AT and Mark tools) |
| **Middle mouse drag** | Pan the view (from any tool) |
| **Scroll wheel** | Zoom in/out |

### Touch Gestures

| Gesture | Action |
|---------|--------|
| **Tap** | Place element / select |
| **Long press** (~360ms) | Inside corner input (Linear AT and Mark tools) |
| **Two-finger pinch** | Zoom in/out |
| **Two-finger drag** | Pan the view |

---

## 18. Conductor Footage Tracking

LP Sketch automatically tracks total conductor footage by material and wire class. This information appears in the legend.

### Horizontal Footage

Calculated from the drawn lengths of all conductor elements (lines, arcs, curves) using the calibrated scale. The calculation uses precise geometric methods:
- Lines: direct point-to-point distance
- Arcs: arc length computed from radius and sweep angle
- Curves: adaptive subdivision for accurate length

### Vertical Footage

Summed from the **Vertical** footage values entered on downlead components. This represents conductor length that runs vertically and cannot be measured from the plan view.

### Footage Display

- **Legend:** Conductor footage rows appear in the legend grouped by material and wire class (e.g., "Class I Copper conductor footage: 145 ft")
- **Downlead labels:** Each downlead symbol shows its vertical footage value adjacent to the symbol on the drawing

---

## 19. Display Units

LP Sketch supports three distance display formats:

| Format | Example | Description |
|--------|---------|-------------|
| **Feet-Inches** | 12' 6" | Traditional US format |
| **Decimal Feet** | 12.50 ft | Decimal foot notation |
| **Meters** | 3.810 m | Metric |

> **Note:** The UI control for selecting the display unit format was not identified during analysis of the current version. This may be a setting accessible through a control not yet documented here. Please verify the location of the unit selector with the developer.

---

## 20. Undo and Redo

LP Sketch maintains a history of up to **100 snapshots** of your project state. Every element placement, deletion, move, or property change creates a history entry.

- **Undo** (Ctrl+Z) restores the previous state
- **Redo** (Ctrl+Shift+Z or Ctrl+Y) re-applies an undone change

The current history depth is displayed in the Tools panel ("Past: X | Future: Y").

After an undo, if you make a new change, the redo (future) history is cleared -- you cannot redo past a branch point.

---

## Appendix A: Component Symbol Reference

| Component | Symbol | Layer | Directional | Class | Notes |
|-----------|--------|-------|-------------|-------|-------|
| Air Terminal | Circle (hollow Class I, filled Class II) | Rooftop | No | I or II | Letter A-Z |
| Bonded Air Terminal | Hexagon | Rooftop | No | I or II | Letter A-Z |
| Bond | Diamond (rotated square) | Rooftop | No | None | |
| Mechanical Connection | Small circle | Rooftop | No | None | Also auto-placed |
| Cadweld Connection | Concentric circles | Rooftop | No | I or II | Also auto-placed |
| Continued | S-curve | Rooftop | Yes | None | |
| Connect Existing | S-curve with junction | Rooftop | Yes | None | |
| Conduit Downlead to Ground | Circle with double down-chevrons | Downleads | Yes | I or II | Vertical footage |
| Conduit Downlead to Roof | Circle with single up-chevron | Downleads | Yes | I or II | Vertical footage |
| Surface Downlead to Ground | Square with double down-chevrons | Downleads | Yes | I or II | Vertical footage |
| Surface Downlead to Roof | Square with single up-chevron | Downleads | Yes | I or II | Vertical footage |
| Through-Roof-to-Steel | Square with star | Rooftop | No | I or II | |
| Through-Wall Connector | Circle with opposing chevrons | Rooftop | No | None | |
| Ground Rod | Grounding symbol (stem + lines) | Grounding | Yes | I or II | Class diamond when both present |
| Steel Bond | Diamond with star | Grounding | No | None | |

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Air Terminal** | A strike termination device (lightning rod) installed to intercept lightning flashes. |
| **Bonded Air Terminal** | An air terminal whose base is bonded directly to a roof feature (chimney, vent, metal body, etc.) rather than being a free-standing rod. |
| **Bonding** | An electrical connection between a conductive object and the LP system, intended to reduce potential differences that could cause arcing. |
| **Class I** | Building classification for structures 75 feet or less in height. Uses standard-size conductors and components. |
| **Class II** | Building classification for structures taller than 75 feet. Uses heavier conductors; crimp-type connectors are not permitted. |
| **Bimetallic Fitting** | A connection component for joining dissimilar metals (typically aluminum and copper). Must be installed at least 18 inches above grade. |
| **Cadweld (Exothermic Weld)** | A permanent welded connection produced by igniting a thermite charge in a graphite mold, creating a molecular bond between conductors. Not suitable for aluminum. |
| **Conductor (Main)** | A conductor that carries primary lightning current between strike termination devices and grounding electrodes. |
| **Conductor (Secondary)** | A conductor that bonds metal bodies within the zone of protection to the LP system. |
| **Down Conductor (Downlead)** | A main conductor routed vertically from the rooftop system down the building exterior to the grounding electrode. At least two are required for any structure. |
| **Grounding Electrode** | The portion of the LP system extending into the earth (ground rod, ground plate, or buried conductor) to establish electrical contact with earth. |
| **Ground Rod** | A driven grounding electrode rod, typically copper-clad steel, solid copper, or stainless steel, extending at least 10 feet into earth. |
| **Mechanical Connection** | A bolted or clamped splice connector between conductors. The standard connection type for aluminum conductors. |
| **Steel Bond** | A bonding connection from the LP conductor system to structural steel, allowing the steel framework to serve as part of the conductor path. |
| **Strike Termination Device** | A metallic component that intercepts lightning and connects it to a path to ground. Includes air terminals and qualifying structural metal bodies (3/16 inch thick or more). |
| **Zone of Protection** | The space adjacent to a grounded air terminal or mast that is substantially immune to direct lightning strokes. |
| **Outside Corner** | An exposed, convex corner on a building perimeter that requires an air terminal within 2 feet. The Linear AT tool treats these as mandatory terminal locations. |
| **Inside Corner** | A reentrant (concave) angle in a building perimeter. No terminal is required at the corner itself, but the conductor must route through it. |
| **Calibration** | The process of establishing the drawing scale by measuring a known distance on the PDF against its real-world equivalent. |
| **Construction Mark** | A temporary reference point placed on the drawing to aid in layout planning. Not included in exports. |
| **Flattened PDF** | An exported PDF where the annotation overlay is permanently composited onto the background PDF, producing a single merged document for handoff. |

---

*LP Sketch -- Lightning Protection Design*
