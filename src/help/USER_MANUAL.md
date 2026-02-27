# LP Sketch User Manual

## 1. Introduction {#help-introduction}

LP Sketch is a lightning protection system design communication tool. It allows designers to annotate building plan PDFs with lightning protection components, conductors, and design notes, then export the result for CAD handoff or field reference.

**LP Sketch is not a CAD application.** It is purpose-built for lightning protection design communication. The tools, components, and terminology are organized around LP system design workflows rather than general-purpose drafting. You work by importing an architectural PDF, overlaying your protection system design on top of it, and exporting the finished sketch as a flattened image or PDF.

### 1.1. What LP Sketch Does {#help-introduction-does}

- Import a building plan PDF (single-page or multi-page) as a locked background
- Navigate between pages of a multi-page PDF, with independent design elements per page
- Draw rooftop conductors, down conductors, and grounding conductors using material-aware and class-aware tools
- Place LP system components: air terminals, bonds, connections, downleads, penetrations, ground rods, and more
- Auto-space air terminals along roof edges and ridgelines at code-compliant intervals
- Auto-detect and place conductor junction connectors (mechanical or Cadweld)
- Track conductor footage by material and wire class
- Generate legends and general notes
- Export flattened PNG, JPG, or PDF for handoff

### 1.2. What LP Sketch Does Not Do {#help-introduction-does-not}

- Direct editing or modification of the background PDF content
- CAD-level production drafting or engineering calculations
- Collaborative multi-user editing
- Structural or electrical load analysis

### 1.3. Core Workflow {#help-introduction-workflow}

1. **Import a PDF** -- Load a building plan (single-page or multi-page)
2. **Set the drawing scale** -- Either manually or by calibrating against a known dimension (see [Drawing Scale](#help-scale-drawing-scale))
3. **Design your protection system** -- Draw conductors, place components, auto-space air terminals
4. **Annotate** -- Add dimension texts, notes, arrows, legend, and general notes
5. **Save your project** -- Save to a `.lpsketch.json` file for future editing
6. **Export** -- Export as PNG, JPG, or flattened PDF for handoff

---

## 2. Project {#help-project}

The **Project** panel in the sidebar manages your project identity, file operations, page navigation, and PDF background settings.

### 2.1. Project Name {#help-project-name}

Enter a name for your project in the text field at the top of the Project panel. This name is stored in the project file and helps identify your work when saving and loading projects.

### 2.2. PDF Import {#help-project-file}

Click **Import PDF** in the File section of the Project panel and select a PDF file. You can also drag and drop a PDF file directly onto the canvas.

**Requirements:**
- Maximum file size: 25 MB
- Maximum page dimensions: 20,000 points per side
- Multi-page PDFs are supported -- each page can be annotated independently

Once imported, the PDF renders as a locked background. You cannot edit the PDF content -- it serves only as a reference layer beneath your annotations. For multi-page PDFs, use the [Pages](#help-project-pages) controls to navigate between pages.

### 2.3. Saving and Loading {#help-project-save-load}

**Saving:** Click **Save** in the File section to download your project as a `.lpsketch.json` file. This file contains:
- All your design elements (conductors, components, annotations) across all pages
- The embedded PDF (base64-encoded)
- All project settings (scale, material, class, layer visibility, etc.)
- Legend and general notes data

**Loading:** Click **Load** in the File section and select a previously saved `.lpsketch.json` file. The application validates the file, runs any necessary schema migrations for backward compatibility, and restores your full design state.

**Limits:**
- Maximum project file size: 30 MB
- Maximum total element count: 12,000

### 2.4. Exporting {#help-project-export}

LP Sketch supports three export formats, available from the Export section of the Project panel:

| Format | Description |
|--------|-------------|
| **PNG** | Lossless raster image at 2x resolution |
| **JPG** | Compressed raster image at 2x resolution (92% quality) |
| **PDF** | Flattened PDF with annotations composited on top of the original PDF |

**What is included in exports:**
- All visible elements on the current page (respects [layer visibility](#help-layers-visibility))
- The background PDF

**What is excluded from exports:**
- Hidden layers
- Construction marks (marks are working aids, not design documentation)
- Snap markers, selection highlights, and other UI overlays

The PDF export creates a true flattened PDF -- the original background PDF with the annotation overlay rendered as an image on top. This ensures the recipient sees exactly what you see, regardless of their software.

### 2.5. Reporting Bugs and Features {#help-project-report}

The **Report** section in the Project panel provides two buttons for submitting feedback:

- **Bug** -- Opens the report dialog with the Bug type pre-selected. Use this for defects, unexpected behavior, or anything that appears broken.
- **Feature** -- Opens the report dialog with the Feature type pre-selected. Use this to suggest new capabilities or improvements.

The dialog collects a title, description, and optional reproduction steps. Submitting sends the report to the development team's storage backend. A brief confirmation is shown when the report is accepted. The report includes basic metadata (app version, browser environment) but does not include your PDF or drawing data by default.

### 2.6. Pages {#help-project-pages}

The **Pages** section in the Project panel lets you navigate between pages of a multi-page PDF.

- **Back** -- Navigate to the previous page
- **Forward** -- Navigate to the next page
- The page counter displays the current page number and total (e.g., "2 of 5")

Each page maintains its own:
- [Drawing scale](#help-scale-drawing-scale) and calibration
- [PDF background brightness](#help-project-pdf-background)
- Viewport position and zoom level
- Design elements (conductors, components, annotations)

Elements placed on one page do not appear on other pages. When you switch pages, the canvas shows only the elements belonging to that page.

### 2.7. PDF Background Brightness {#help-project-pdf-background}

The **PDF Background** brightness slider in the Project panel lets you dim the background PDF. This can be useful when:
- The PDF has dark line work that competes with your annotations
- You want to emphasize the LP overlay while presenting or reviewing
- You need better contrast for specific conductor colors

The slider ranges from 0% (black) to 100% (full brightness). This setting affects only the display and does not modify the original PDF. On multi-page PDFs, brightness is set independently per page.

### 2.8. Autosave {#help-project-autosave}

LP Sketch automatically saves your work to browser local storage:
- Saves after each change (debounced by 800ms)
- Maximum autosave size: 4 MB
- If the project exceeds 4 MB (usually due to a large embedded PDF), the autosave stores a "degraded" version without the PDF data

On your next visit, if an autosaved draft is detected, it will be automatically restored. If the draft was degraded (PDF stripped), you will need to re-import the PDF.

**Important:** Autosave uses browser local storage, which is specific to your browser and device. It is not a substitute for explicitly saving your project file.

---

## 3. Tools {#help-tools}

The **Tools** panel in the sidebar provides mode selection, history controls, snapping toggles, auto-connector settings, and annotation tools.

### 3.1. Mode {#help-tools-mode}

The Mode section offers three tools for interacting with the canvas:

- **Select** -- Click to select, move, and edit individual elements. See [Selection and Editing](#help-selection) for full details.
- **Multi-Select** -- Click to select multiple elements. See [Multi-Select Tool](#help-selection-multi) for details.
- **Pan** -- Click and drag to pan the view. You can also pan from any tool using the middle mouse button or two-finger drag on touch devices. See [Canvas Navigation](#help-canvas-navigation).

### 3.2. Undo and Redo {#help-tools-undo-redo}

LP Sketch maintains a history of up to **100 snapshots** of your project state. Every element placement, deletion, move, or property change creates a history entry.

- **Undo** (Ctrl+Z) restores the previous state
- **Redo** (Ctrl+Shift+Z or Ctrl+Y) re-applies an undone change

The current history depth is displayed in the Tools panel ("Past: X | Future: Y").

After an undo, if you make a new change, the redo (future) history is cleared -- you cannot redo past a branch point.

### 3.3. Snap to Points {#help-tools-snap-to-points}

Toggle **Snap to Points** in the Tools panel to enable or disable geometric snapping. When enabled, your cursor snaps to nearby geometric features (endpoints, basepoints, intersections, etc.) while placing elements.

For the full list of snap types and snap controls, see [Snapping System](#help-snapping).

### 3.4. Angle Snap {#help-tools-angle-snap}

Toggle **Angle Snap (15°)** in the Tools panel to constrain angles to 15-degree increments. This applies to linear conductor segments, directional symbol placement, arrows, dimension text measurement direction, and mark tool segments.

Hold **Ctrl** while clicking to temporarily disable angle snapping for that click. See [Angle Snapping](#help-snapping-angle) for details.

### 3.5. Auto-Connectors {#help-tools-auto-connectors}

LP Sketch can automatically place connector symbols at conductor junctions as you draw.

**How it works:** When auto-connectors are enabled, the system inspects each conductor segment as you place it. For every point where the new segment intersects or meets an existing conductor, a connector symbol is placed immediately as a normal, independent element in your design.

Auto-placed connectors are identical to manually placed connectors -- they can be selected, moved, or deleted individually. Turning the auto-connector feature off stops creating new connectors but does not remove any connectors already placed.

**Junction classification:** The system classifies each junction by the number of conductor branches that meet:

| Junction | Branches | Connector placed |
|----------|----------|-----------------|
| **T-junction** | 3 branches | Standard connector ([Mechanical or Cadweld](#help-components-connections)) |
| **Crossrun** | 4+ branches | Crossrun connector ([Mechanical Crossrun or Cadweld Crossrun](#help-components-connections)) |

**Connector types:** Two families are available, selectable from the Tools panel:

| Family | T-junction symbol | Crossrun symbol |
|--------|------------------|-----------------|
| **Mechanical** | Mechanical (small circle) | Mechanical Crossrun (small circle inside larger circle) |
| **Cadweld** | Cadweld (small square) | Cadweld Crossrun (small square inside larger square) |

**Material resolution:** When conductors of different materials meet at a junction, the auto-connector resolves the appropriate connector material:
- If **aluminum** and **copper-family** (copper or grounding) conductors meet, the connector is placed as **bimetallic** (purple)
- Otherwise, the connector takes the material of the converging conductors

**Controls:**
- **Toggle on/off** -- The "Auto-Connectors" switch in the Tools panel enables or disables automatic connector placement during future draw operations
- **Connector type** -- Choose between "Mechanical" and "Cadweld" using the buttons below the toggle

**Mechanical vs. Cadweld:** Mechanical connectors (bolted clamps) are standard for most installations. Cadweld (exothermic weld) connections are often preferred for buried connections or where a permanent, maintenance-free joint is required. Note that Class II installations do not permit crimp-type connectors, and Cadweld is not appropriate for aluminum conductors (see [Material Restrictions](#help-material-restrictions)).

### 3.6. Annotation Tools {#help-tools-annotation}

The **Annotation** section of the Tools panel provides tools for adding text, dimensions, arrows, legends, notes, measurements, marks, and continuation indicators to your design.

#### 3.6.1. Text {#help-tools-annotation-text}

The **Text** tool places free-form text annotations on the drawing.

**How to use:**
1. Select the **Text** tool
2. Type your text in the **Text** field in the [properties bar](#help-properties-bar)
3. Click on the canvas to place it

Text inherits the active [material](#help-material-material) color. To edit existing text, switch to [Select](#help-selection-select) mode and double-click the text element.

#### 3.6.2. Dimension Text {#help-tools-annotation-dimension-text}

The **Dimension Text** tool places scaled measurement annotations on the drawing. The [drawing scale](#help-scale-drawing-scale) must be set before this tool is available.

**How to use:**
1. Select the **Dimension Text** tool
2. Click the start point of the measurement
3. Click the end point of the measurement
4. Click to position the dimension label

The dimension text automatically calculates and displays the real-world distance based on the drawing scale.

**Extension lines:** Toggle in the [properties bar](#help-properties-bar) to show or hide dimension extension lines and bars (the connecting linework between the measured points and the label).

**Override text:** After placing, double-click the dimension text in [Select](#help-selection-select) mode to edit. You can enter custom text (up to 24 characters) to override the calculated distance.

#### 3.6.3. Arrow {#help-tools-annotation-arrow}

The **Arrow** tool places directional arrow annotations.

**How to use:**
1. Select the **Arrow** tool
2. Click to set the tail (starting point)
3. Click to set the head (arrowhead end)

Arrows inherit the active [material](#help-material-material) color. To edit an existing arrow, switch to [Select](#help-selection-select) mode and double-click it.

#### 3.6.4. Legend {#help-tools-annotation-legend}

The **Legend** tool places a legend box that automatically populates from all components placed on the drawing.

**How to use:**
1. Select the **Legend** tool
2. Click on the canvas to place the legend box

The legend includes:
- **Component rows** -- Each unique combination of component type, material, class, and letter designation, with a count of how many are placed
- **Conductor rows** -- Total [conductor footage](#help-conductor-footage) per material and wire class, combining horizontal footage (from drawn conductors) and vertical footage (from downlead symbols)

**Editing legend labels:** Double-click a placed legend in [Select](#help-selection-select) mode (or click **Edit Labels** in the [properties bar](#help-properties-bar)) to open the legend label editor. This floating dialog lets you customize the text label for any legend entry. Changes are per-placement, so you can have multiple legend boxes with different label customizations.

**Data scope:** The legend label editor includes a **Data Scope** toggle (Page / Global). When set to **Page**, the legend shows only components and footage from the current page. When set to **Global**, it includes data from all pages.

You can place multiple legend boxes. Each is independently movable and has its own label overrides.

#### 3.6.5. General Notes {#help-tools-annotation-general-notes}

The **General Notes** tool places a numbered notes box on the drawing.

**How to use:**
1. Select the **General Notes** tool
2. Click on the canvas to place the notes box

**Editing notes:** Double-click a placed notes box in [Select](#help-selection-select) mode (or click **Edit Notes** in the [properties bar](#help-properties-bar)) to open the general notes editor. This floating dialog lets you:
- Add notes (up to 15)
- Remove notes
- Reorder notes (move up/down)
- Edit note text (up to 120 characters each)

Notes are displayed as a numbered list (1. First note, 2. Second note, etc.).

**Data scope:** The general notes editor includes a **Data Scope** toggle (Page / Global). When set to **Page**, the notes apply to the current page only. When set to **Global**, they apply across all pages.

#### 3.6.6. Measure {#help-tools-annotation-measure}

The **Measure** tool lets you measure polyline distances on the drawing without placing any permanent elements. The [drawing scale](#help-scale-drawing-scale) must be set before this tool is available.

**How to use:**
1. Select the **Measure** tool
2. Click points to build a measurement path
3. The running distance is displayed in the [properties bar](#help-properties-bar)

The distance is calculated in real-world units using the calibrated scale.

**Target distance snap:** Enter a value in the **Target** field (in feet) in the properties bar. When measuring, the cursor will snap to multiples of this distance along the path. Hold the cursor at the target distance for about 1 second to lock the snap. This is useful for checking spacing compliance without placing any elements.

#### 3.6.7. Mark {#help-tools-annotation-mark}

The **Mark** tool combines measurement with construction mark placement. Construction marks are reference points that appear on the drawing to assist with layout but are **not included in exports**.

**How to use:**
1. Select the **Mark** tool
2. Set the **Target** distance (in feet) for desired mark spacing in the [properties bar](#help-properties-bar)
3. Click to place marks:
   - **Left-click** places a mark and advances the measurement anchor to that point
   - **Right-click** (or Alt+click) places an **inside corner** -- routes around a corner without placing a mark at the corner itself

Construction marks are snappable -- other tools will snap to marks just like they snap to conductor endpoints. This makes marks useful as reference points for conductor placement.

#### 3.6.8. Continued {#help-tools-annotation-continued}

The **Continued** symbol marks a point where a conductor run continues beyond the edge of the drawing -- for example, where a rooftop conductor exits the sheet and continues on an adjacent building or plan.

**How to use:**
1. Select the **Continued** tool from the Tools panel (Annotation section)
2. Click to set the position
3. Click again to set the direction the conductor continues

**Behavior:** The Continued symbol always renders in black regardless of the active material. It does not inherit the material color. It is assigned to the Annotation layer and does not appear in the legend.

---

## 4. Components {#help-components}

The **Components** panel in the sidebar provides tools for drawing conductors and placing LP system components. Select a tool from the panel, then click on the canvas to draw or place.

### 4.1. Conductors {#help-components-conductors}

Conductors represent the physical cable runs in your LP system. LP Sketch provides three conductor drawing tools for different routing situations.

#### 4.1.1. Linear Conductor {#help-components-conductors-linear}

The **Linear** tool draws straight conductor segments -- the most common tool for rooftop and grounding conductor runs.

**How to use:**
1. Click to set the start point
2. Click again to place a straight segment to the second point

**Continuous mode:** When enabled (toggle in the [properties bar](#help-properties-bar)), the endpoint of each segment automatically becomes the start of the next. This lets you trace a conductor path without re-clicking the start of each run. Press **Enter** or double-click to finish the continuous sequence. Press **Escape** to discard the pending segment.

**Live distance feedback:** After placing the first point, the properties bar displays the current segment length in real-world feet as you move the cursor. In continuous mode, it also shows the running total for the entire path. If no [drawing scale](#help-scale-drawing-scale) is set, the counter shows an unscaled indicator instead of a distance.

#### 4.1.2. Arc Conductor {#help-components-conductors-arc}

The **Arc** tool draws circular arc conductor segments -- useful for tracing curved roof features, tank edges, or other circular building elements.

**How to use:**
1. Click to set the first endpoint of the arc
2. Click to set the second endpoint (this defines the chord)
3. Move the cursor to define the arc curvature, then click to set the "pull" point that the arc passes through

The result is a geometrically precise circular arc segment.

#### 4.1.3. Curve Conductor {#help-components-conductors-curve}

The **Curve** tool draws smooth curve segments using a three-point definition -- useful for non-circular curved paths.

**How to use:**
1. Click to set the start point
2. Click to set a point that the curve will pass through
3. Click to set the endpoint

**Continuous mode:** Like the Linear tool, the Curve tool supports continuous chaining.

### 4.2. Air Terminals {#help-components-air-terminals}

Air terminals and auto-spacing tools for placing strike termination devices.

#### 4.2.1. Air Terminal (AT) {#help-components-air-terminals-at}

A standard air terminal (lightning rod). The primary strike capture point of the system.

**Placement:** Single click. Select the letter designation (A–Z) and optional legend suffix in the [properties bar](#help-properties-bar) before placing.

**Letter designations:** Air terminals support letter variants (A through Z). The letter distinguishes different terminal types or sizes within the design. The application remembers the last letter used per material.

**Legend suffixes:** When placing lettered air terminals, you can also set a custom legend suffix (up to 24 characters) in the properties bar. This suffix appears in the legend entry for that terminal variant, allowing you to describe the terminal type (e.g., "24-inch", "with base plate").

#### 4.2.2. Bonded Air Terminal {#help-components-air-terminals-bonded}

An air terminal with a bonded base connection. Used when bonding directly to a roof feature (chimney, vent, metal body, etc.) rather than using a free-standing rod.

**Placement:** Single click. Supports the same letter designation and legend suffix as the standard Air Terminal.

#### 4.2.3. Linear Auto-Spacing {#help-components-air-terminals-linear}

The **Linear AT** tool places air terminals at equal intervals along a polyline path that you trace over roof edges, ridgelines, or other features requiring terminal coverage. The [drawing scale](#help-scale-drawing-scale) must be set first.

**How to use:**
1. Select the **Linear AT** tool
2. Set the **Max Interval** (in feet) in the [properties bar](#help-properties-bar) -- this is the maximum allowed spacing between air terminals (typically 20 ft for 10-inch terminals or 25 ft for 24-inch terminals)
3. Select the **Letter** designation for the terminals to be placed
4. Click along the path to trace vertices:
   - **Left-click** places an **outside corner** vertex -- an exposed building corner that must receive an air terminal
   - **Right-click** (or Alt+click) places an **inside corner** vertex -- a reentrant corner where no terminal is needed
5. To finish:
   - Press **Enter** or click **Finish Open** in the properties bar to apply spacing to an open path (like a ridgeline)
   - Click **Close + Finish** to close the path into a loop (like a building perimeter) and apply spacing
   - Double-click to finish an open path
   - Click near the starting point to automatically close the path
   - Press **Escape** to discard the trace

**How spacing is computed:** The tool divides the path into spans between outside corners. Each span is divided into equal segments such that no segment exceeds the maximum interval. Air terminals are placed at every division point and at every outside corner. Inside corners allow the path to route around building geometry without forcing a terminal placement.

**Outside vs. inside corners:**
- **Outside corners** are exposed convex points on the building perimeter that require an air terminal. The tool always places a terminal at each outside corner vertex.
- **Inside corners** are reentrant (concave) angles where the building turns inward. No terminal is placed at the corner itself, but the conductor routes through it.

**Touch devices:** On touch screens, a long press (hold for about 360ms) functions as an inside-corner input instead of an outside corner. You can also toggle the **Corner** mode (Outside/Inside) in the properties bar to control the default behavior.

#### 4.2.4. Arc Auto-Spacing {#help-components-air-terminals-arc}

The **Arc AT** tool places air terminals at equal intervals along an existing [arc conductor](#help-components-conductors-arc) -- useful for curved roof features like domes, tanks, or barrel roofs. The [drawing scale](#help-scale-drawing-scale) must be set first.

**How to use:**
1. Draw an arc conductor first using the Arc tool
2. Select the **Arc AT** tool
3. Set the **Max Interval** (in feet) and **Letter** designation in the [properties bar](#help-properties-bar)
4. Click on the arc conductor to select it (it will highlight)
5. Press **Enter** or click **Apply Spacing** in the properties bar

Air terminals are placed at equal angular intervals along the arc, respecting the maximum interval.

The standard maximum intervals are 20 feet for 10-inch terminals and 25 feet for 24-inch terminals, matching the Linear AT tool's Max Interval field.

### 4.3. Connections {#help-components-connections}

Connection components represent the physical junction hardware in your LP system.

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Bond** | A bonding connection point. | Single click |
| **Mechanical** | A mechanical (cable-to-cable) splice connection. | Single click |
| **Cadweld** | An exothermic (Cadweld) welded connection. | Single click |
| **Connect Existing** | Indicates connection to an existing protection system. | Directional (two-click) |
| **Mechanical Crossrun** | A mechanical crossrun connector for a four-way (+) conductor intersection. | Single click |
| **Cadweld Crossrun** | An exothermic crossrun connector for a four-way (+) conductor intersection. | Single click |

> **Note:** Mechanical, Cadweld, Mechanical Crossrun, and Cadweld Crossrun connections can also be placed automatically by the [auto-connector system](#help-tools-auto-connectors).

### 4.4. Downleads {#help-components-downleads}

Downlead components represent the vertical conductor runs from rooftop to ground level. Each downlead carries a **vertical footage** value (0–999 feet) that records the length of the vertical conductor run. This footage is added to the [conductor footage](#help-conductor-footage) totals and displayed adjacent to the symbol on the drawing.

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Conduit to Ground** | Down conductor in conduit, at ground level end | Directional (two-click) |
| **Conduit to Roof** | Down conductor in conduit, at roof level end | Directional (two-click) |
| **Surface to Ground** | Surface-mounted down conductor, at ground level end | Directional (two-click) |
| **Surface to Roof** | Surface-mounted down conductor, at roof level end | Directional (two-click) |

**Directional placement:** All downlead components are directional -- they have an orientation indicating which way the conductor runs. To place one:
1. Click to set the position
2. Click again (or move and click) to set the direction

**Vertical footage:** Set the vertical footage in the [properties bar](#help-properties-bar) before placing a downlead. You can also edit the vertical footage of an already-placed downlead by selecting it in [Select](#help-selection-select) mode.

**"To Ground" vs. "To Roof":** Each physical down conductor run has two ends visible on the plan:
- The **"to Roof"** symbol is placed at the rooftop level, marking the point where the down conductor departs the rooftop conductor system. It indicates whether the conductor descends in conduit (square base symbol) or on the building surface (round base symbol).
- The **"to Ground"** symbol is placed at the ground level or at the building wall below grade, marking the point where the conductor arrives at the grounding electrode. It uses the same conduit/surface distinction.

On a finished drawing, a single downlead typically shows both symbols: a "to Roof" symbol on the roof plan and a "to Ground" symbol on the ground-floor or elevation plan. When working from a single-page roof plan, the "to Ground" symbol may be placed at the perimeter to indicate the path and the vertical footage entry captures the actual length of the vertical run not visible in plan view.

### 4.5. Penetrations {#help-components-penetrations}

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Through-Roof-to-Steel** | Connection from the rooftop system through the roof to structural steel below | Single click |
| **Through-Wall Connector** | A conductor passing through a building wall | Single click |

### 4.6. Grounding {#help-components-grounding}

| Component | Description | Placement |
|-----------|-------------|-----------|
| **Ground Rod** | A driven ground rod. | Directional (two-click) |
| **Steel Bond** | A bond to existing structural steel. | Single click |

Ground rods are directional -- the direction indicates which way the rod is oriented. Class I ground rods display 3 horizontal bars; Class II ground rods display 4 horizontal bars.

---

## 5. Material {#help-material}

The **Material** panel in the sidebar controls the active wire class and material for new elements.

### 5.1. Wire Classes {#help-material-class}

Class I and Class II are building classifications based on height. Class I covers buildings 75 feet or less; Class II covers buildings taller than 75 feet. Class II requires heavier conductors and components, and crimp-type connectors are not permitted.

For mixed buildings (such as a steeple rising above a lower main roof), Class II requirements apply only to the portion exceeding 75 feet. Class II conductors from the taller portion must run continuous to ground and interconnect with the balance of the system.

Select the active class from the Material panel. LP Sketch renders the two classes as:

| Class | Visual | Stroke |
|-------|--------|--------|
| **Class I** | Dashed line | 2px base width, 8-6 dash pattern |
| **Class II** | Solid line | 3px base width |

The class applies to all newly placed conductors and components. Some components always carry a specific class or have no class designation (see the [Component Symbol Reference](#help-symbol-reference)).

### 5.2. Materials {#help-material-material}

LP Sketch uses color to represent conductor and component materials. When you select a material, all new conductors and components you place will be assigned that material.

| Color | Material | Abbreviation | Use |
|-------|----------|--------------|-----|
| Green | Copper | Cu | Standard copper conductors and components |
| Blue | Aluminum | Al | Aluminum conductors and components |
| Red | Grounding | Gnd | Grounding system conductors and components |
| Purple | Bimetallic | Bi | Bimetallic connection components (junctions between dissimilar metals) |

Select the active material from the Material panel in the sidebar.

### 5.3. Material Restrictions {#help-material-restrictions}

Not all tools and components are available with every material. These restrictions mirror standard LP installation rules:

**Bimetallic (Purple):**
- Cannot draw conductors (Linear, Arc, Curve) -- bimetallic fittings are junction connectors for dissimilar-metal splices, not conductor materials
- Cannot use [auto-spacing](#help-components-air-terminals-linear) tools
- Cannot place air terminals, bonded air terminals, steel bonds, ground rods, or Cadweld connections

**Grounding (Red):**
- Cannot use [auto-spacing](#help-components-air-terminals-linear) tools -- grounding conductors are part of the electrode system, not the rooftop system
- Cannot place air terminals or bonded air terminals

**Copper (Green):**
- Cannot place ground rods -- ground rods are part of the grounding electrode system and are always placed under the Grounding (Red) material. Switch to Red to place ground rods.

**Aluminum (Blue):**
- Cannot place Cadweld connections -- the exothermic weld produces a copper alloy that is galvanically incompatible with aluminum. Use mechanical connections for aluminum.
- Cannot place ground rods -- aluminum cannot contact earth. Aluminum down conductors must transition to copper via a bimetallic fitting before connecting to the grounding system.

---

## 6. Scale {#help-scale}

The **Scale** panel in the sidebar controls the drawing scale, calibration, and annotation sizing.

### 6.1. Drawing Scale {#help-scale-drawing-scale}

Before measurements, dimension texts, and [auto-spacing](#help-components-air-terminals-linear) tools will work correctly, you must establish the drawing scale. On multi-page PDFs, each page has its own independent scale.

**Manual scale entry:** In the Scale panel, enter the scale ratio as inches-to-feet. For example, if your drawing is at 1/8" = 1'-0", enter `1` in the inches field and `8` in the feet field, then click **Apply Scale**.

The current scale is displayed as a badge below the scale controls (e.g., "1 in = 8 ft"). You can also set the scale by [calibration](#help-scale-calibration).

### 6.2. Calibration {#help-scale-calibration}

The **Calibrate** tool establishes the drawing scale by measuring a known distance on the PDF. This method is often more accurate than manual entry because it accounts for any scaling that occurred during PDF generation.

**How to use:**
1. Click the **Calibrate** button in the Scale panel (or select it from the [quick-access toolbar](#help-quick-access))
2. Click the first endpoint of a known dimension on the PDF
3. Click the second endpoint -- the [properties bar](#help-properties-bar) shows a real-distance input field
4. Type the real-world distance in feet and press **Enter** (or click **Apply**); press **Escape** to cancel

The scale is immediately applied and displayed in the Scale panel.

### 6.3. Annotation Size {#help-scale-annotation-size}

The annotation size setting controls the visual scale of all annotations, symbols, conductor strokes, legend text, and notes. Three sizes are available:

| Size | Scale Factor | Base Text Size |
|------|-------------|----------------|
| **Small** | 1.0x | 14px |
| **Medium** | 1.5x | 21px |
| **Large** | 2.0x | 28px |

Choose the size that provides the best readability for your particular PDF sheet size. Select from the Scale panel in the sidebar.

---

## 7. Layers {#help-layers}

The **Layers** panel in the sidebar controls layer visibility. LP Sketch organizes all design elements across four layers.

### 7.1. Layer Contents {#help-layers-contents}

| Layer | Contents |
|-------|----------|
| **Rooftop** | Rooftop conductors (non-grounding), rooftop components (air terminals, bonds, connections, penetrations, etc.) |
| **Downleads** | All downlead components |
| **Grounding** | Grounding conductors (red material), ground rods, steel bonds |
| **Annotation** | Text notes, arrows, dimension texts, construction marks, legend placements, general notes placements, continued symbols |

### 7.2. Layer Visibility {#help-layers-visibility}

Toggle layer visibility from the Layers panel. When a layer is hidden:
- Its elements are not displayed on the canvas
- Its elements are **excluded from exports** (PNG, JPG, PDF)
- Its elements are still present in the project data and will reappear when the layer is made visible

This is useful for generating material-specific exports (e.g., showing only the grounding system) or for reducing visual clutter while working on a specific aspect of the design.

### 7.3. Automatic Layer Assignment {#help-layers-assignment}

Elements are automatically assigned to layers based on their type and material. You cannot manually reassign component or conductor layers.

**Conductors:**
- Red (Grounding) conductors go to the **Grounding** layer
- All other material conductors go to the **Rooftop** layer

**Components:**
- **Rooftop layer:** Air terminals, bonded air terminals, bonds, Cadweld connections, mechanical connections, crossrun connections, connect existing, through-roof-to-steel, through-wall connectors
- **Downleads layer:** All four downlead types
- **Grounding layer:** Ground rods, steel bonds
- **Annotation layer:** [Continued](#help-tools-annotation-continued) symbols

**Annotations:**
- Text, arrows, and dimension text elements can be assigned to any of the four layers (Rooftop, Downleads, Grounding, Annotation)
- Legend, general notes, and construction marks are always on the Annotation layer

---

## 8. Properties Bar {#help-properties-bar}

### 8.1. Overview {#help-properties-bar-overview}

The properties bar runs across the top of the screen. It shows context-sensitive information and controls for the active tool:

- **Active tool name and icon** -- Always visible on the left
- **Tool-specific controls** -- Input fields, toggles, and action buttons that apply to the active tool (see below)
- **Selection info** -- When an element is selected, shows its type
- **Live measurements** -- Displayed on the right side: current segment length during linear drawing, path distance for the Measure tool, span distance for the Mark tool, calibration preview
- **Zoom level** -- Current zoom percentage, always shown on the right

### 8.2. Tool-Specific Controls {#help-properties-bar-controls}

The properties bar shows different controls depending on the active tool or selection. The tables below list all tool-specific controls organized by tool.

#### Linear Conductor {#help-properties-linear}

| Control | Description |
|---------|-------------|
| **Continuous** (toggle) | Chains segments end-to-end. After each click, the endpoint becomes the next start point. Press Enter or double-click to finish. Escape discards the pending segment. |
| **Line** (status, right) | Current segment length from start point to cursor, in real-world feet. |
| **Line Total** (status, right) | Running total path length across all chained segments in continuous mode. |

#### Arc Conductor {#help-properties-arc}

| Control | Description |
|---------|-------------|
| **Reset Arc** (button) | Clears the arc-in-progress and returns to endpoint 1. |

#### Curve Conductor {#help-properties-curve}

| Control | Description |
|---------|-------------|
| **Continuous** (toggle) | Chains curve segments end-to-end. Double-click or Escape to end the chain. |
| **Reset Curve** (button) | Clears the curve-in-progress and starts over. |

#### Air Terminal / Bonded AT (Placing) {#help-properties-air-terminal}

| Control | Description |
|---------|-------------|
| **Letter** (dropdown) | Sets the designation letter (A–Z) for the terminals to be placed. Remembered per material between sessions. |
| **Legend Suffix** (text, max 24 chars) | Optional text appended to the legend row for this terminal variant. Click **Clear** to remove it. |

#### Linear Auto-Spacing {#help-properties-linear-at}

| Control | Description |
|---------|-------------|
| **Max Interval** (ft) | Maximum allowed spacing between air terminals. Terminals are placed so no gap exceeds this value. |
| **Letter** (dropdown) | Designation letter for all terminals placed by this trace. |
| **Corner** (Outside/Inside toggle) | Sets the default corner type for touch/stylus input. Mouse users right-click for inside corners regardless of this setting. |
| **Finish Open** (button, or Enter) | Applies spacing to the current trace as an open path. Enabled when 2 or more vertices are placed. |
| **Close + Finish** (button) | Closes the trace into a loop and applies spacing. Enabled when 3 or more vertices are placed. |
| **Reset Trace** (button) | Clears all vertices and starts the trace over. |
| **Vertices** (status) | Count of vertices placed in the current trace. |
| **Auto Path** (status, right) | Running trace path length in real-world feet. |

#### Arc Auto-Spacing {#help-properties-arc-at}

| Control | Description |
|---------|-------------|
| **Max Interval** (ft) | Maximum allowed spacing between air terminals along the arc. |
| **Letter** (dropdown) | Designation letter for all terminals placed on this arc. |
| **Apply Spacing** (button, or Enter) | Places air terminals on the selected arc. Enabled only when a target arc has been clicked. |
| **Clear Target** (button) | Deselects the currently targeted arc. |
| **Target** (status) | Shows "selected" when an arc is targeted, "none" when no arc is selected. |

#### Downlead (Placing) {#help-properties-downlead-placing}

| Control | Description |
|---------|-------------|
| **Vertical** (number, 0–999 ft) | Vertical conductor footage for this downlead. Applied to every new downlead placement until changed. |

#### Downlead (Selected) {#help-properties-downlead-selected}

| Control | Description |
|---------|-------------|
| **Vertical** (number, 0–999 ft) | Edits the vertical footage of the selected downlead. Press Enter or click elsewhere to apply. |

#### Measure {#help-properties-measure}

| Control | Description |
|---------|-------------|
| **Target** (ft, optional) | When set, snaps the cursor to multiples of this distance along the measurement path. Leave blank for free measurement. |
| **Clear** (button) | Resets the measurement path. |
| **Path** (status, right) | Running total distance of the current measurement path. |

#### Mark {#help-properties-mark}

| Control | Description |
|---------|-------------|
| **Target** (ft) | Target spacing distance. The cursor snaps to multiples of this value along the current span. |
| **Corner** (Outside/Inside toggle) | Default corner mode for touch/stylus input. Mouse users right-click for inside corners. |
| **Reset Span** (button) | Resets the measurement anchor to the most recently placed mark, without removing any marks. |
| **Clear All** (button) | Removes all construction marks from the drawing. |
| **Marks** (status) | Total count of construction marks currently on the drawing. |
| **Mark Span** (status, right) | Distance from the last mark or anchor to the current cursor position. |

#### Calibrate {#help-properties-calibrate}

| Control | Description |
|---------|-------------|
| **Distance** (ft input) | Appears after clicking the second point. Enter the real-world distance represented by the two points. |
| **Apply** (button) | Commits the calibration and updates the drawing scale. |
| **Cancel** (button) | Discards the calibration; scale is unchanged. |

#### Dimension Text {#help-properties-dimension-text}

| Control | Description |
|---------|-------------|
| **Extension Lines** (toggle) | When on, renders the dimension bars and extension lines connecting the endpoints to the label. When off, only the label text is placed. |
| **Reset Dimension** (button) | Clears the current in-progress dimension and returns to the first click. |

#### Text {#help-properties-text}

| Control | Description |
|---------|-------------|
| **Text** (text input) | The text content that will be placed when you click the canvas. |

#### Arrow {#help-properties-arrow}

| Control | Description |
|---------|-------------|
| **Reset Arrow** (button) | Clears the arrow-in-progress and returns to the first click. |

#### Legend (Placing) {#help-properties-legend-placing}

| Control | Description |
|---------|-------------|
| **Items** (status) | Count of unique legend entries currently in the legend. |

#### Legend (Selected) {#help-properties-legend-selected}

| Control | Description |
|---------|-------------|
| **Edit Labels** (button) | Opens the legend label editor dialog for the selected legend box. |
| **Send to Back / Bring to Front** (buttons) | Controls drawing order relative to other elements on the same layer. |

#### General Notes (Placing) {#help-properties-notes-placing}

| Control | Description |
|---------|-------------|
| **Notes** (status) | Count of notes currently in the notes list. |

#### General Notes (Selected) {#help-properties-notes-selected}

| Control | Description |
|---------|-------------|
| **Edit Notes** (button) | Opens the general notes editor dialog for the selected notes box. |
| **Send to Back / Bring to Front** (buttons) | Controls drawing order relative to other elements on the same layer. |

#### Any Element (Selected) {#help-properties-selection}

| Control | Description |
|---------|-------------|
| **Send to Back** (button) | Moves the selected element behind all others on its layer. |
| **Bring to Front** (button) | Moves the selected element in front of all others on its layer. |

Additional controls appear for specific element types when selected: downlead [vertical footage](#help-properties-downlead-selected), legend [Edit Labels](#help-properties-legend-selected), and general notes [Edit Notes](#help-properties-notes-selected).

---

## 9. Quick-Access Toolbar {#help-quick-access}

The quick-access toolbar is a vertical bar that hovers on the right side of the workspace. It provides fast access to frequently used tools and settings, and always includes Select, Multi-Select, Pan, Undo, and Redo buttons.

The quick-access toolbar is fully customizable. Click the gear icon to open the customizer, where you can add or remove any tool, component, setting, toggle, or action button. Your customization is saved per device.

---

## 10. Selection and Editing {#help-selection}

### 10.1. Select Tool {#help-selection-select}

The **Select** tool is the primary tool for selecting, moving, and editing placed elements.

**Selecting elements:**
- Click on any element to select it
- The selected element is highlighted and its type is shown in the [properties bar](#help-properties-bar)
- Right-click any element to select it (also switches to Select mode from any tool)

**Moving elements:**
- Click and drag a selected element to reposition it
- Lines, arcs, and curves move with all their points
- Symbols move to the new position

### 10.2. Multi-Select Tool {#help-selection-multi}

The **Multi-Select** tool lets you select and move multiple elements at once.

- Click elements to add them to the selection
- **Ctrl+click** (or Cmd+click on Mac) toggles an element in or out of the selection
- Click and drag to move all selected elements together
- Press **Delete** or **Backspace** to delete all selected elements

### 10.3. Editing Handles {#help-selection-handles}

When an element is selected, handles appear at key control points:
- **Lines:** Handles at start and end points -- drag to reshape
- **Arcs:** Handles at start, end, and through (pull) points
- **Curves:** Handles at start, through, and end points
- **Arrows:** Handles at tail and head
- **Directional symbols:** A direction handle extending from the symbol -- drag to rotate

### 10.4. Inline Editing {#help-selection-inline}

Double-click to edit the content of these element types:
- **Text** -- Edit the text string
- **Dimension text** -- Edit the override text
- **Arrow** -- Edit properties
- **Legend** -- Open the legend label editor
- **General notes** -- Open the general notes editor

### 10.5. Z-Ordering {#help-selection-z-order}

When an element is selected, the [properties bar](#help-properties-bar) shows **Send to Back** and **Bring to Front** buttons to control drawing order relative to other elements on the same layer.

### 10.6. Deleting {#help-selection-deleting}

Press **Delete** or **Backspace** to delete the selected element(s).

---

## 11. Snapping System {#help-snapping}

LP Sketch includes a comprehensive snapping system to help you place elements precisely.

### 11.1. Snap Types {#help-snapping-types}

| Snap Type | Description | Priority |
|-----------|-------------|----------|
| **Endpoint** | Start or end point of a conductor, arrow, or dimension text | High |
| **Basepoint** | Position of a symbol, text, or other placed element | High |
| **Mark** | Construction mark position | High |
| **Intersection** | Where two conductors cross | High |
| **Perpendicular** | Point on a conductor perpendicular to your reference point | High |
| **Nearest** | Nearest point along a conductor (fallback) | Low |

When snapping is active and your cursor is near a snappable feature, a snap marker appears to indicate the snap point.

### 11.2. Snap Controls {#help-snapping-controls}

- **[Snap to Points](#help-tools-snap-to-points)** toggle in the Tools panel (or [quick-access bar](#help-quick-access)) -- enables/disables geometric snapping
- **Hold Shift** while clicking -- temporarily disables snapping for that click
- **Hold Ctrl** while clicking -- temporarily disables [angle snapping](#help-snapping-angle) for that click

### 11.3. Angle Snapping {#help-snapping-angle}

When enabled via the [Angle Snap](#help-tools-angle-snap) toggle, angles are constrained to 15-degree increments. This applies to:
- Linear conductor segments (angle from start to end)
- Directional symbol placement (direction angle)
- Arrow placement
- Dimension text measurement direction
- Mark tool segments

---

## 12. Canvas Navigation {#help-canvas-navigation}

### 12.1. Zoom {#help-canvas-navigation-zoom}

- **Scroll wheel** -- Zoom in and out (range: 25% to 800%)
- **Pinch gesture** -- Two-finger pinch to zoom on touch devices
- The current zoom percentage is displayed in the [properties bar](#help-properties-bar)

### 12.2. Pan {#help-canvas-navigation-pan}

- **Middle mouse button drag** -- Pan the view from any tool
- **[Pan tool](#help-tools-mode)** -- Click and drag to pan
- **Two-finger drag** -- Pan on touch devices

### 12.3. Touch Gestures {#help-canvas-navigation-touch}

| Gesture | Action |
|---------|--------|
| **Tap** | Place element / select |
| **Long press** (~360ms) | Inside corner input ([Linear AT](#help-components-air-terminals-linear) and [Mark](#help-tools-annotation-mark) tools) |
| **Two-finger pinch** | Zoom in/out |
| **Two-finger drag** | Pan the view |

---

## 13. Conductor Footage Tracking {#help-conductor-footage}

LP Sketch automatically tracks total conductor footage by material and wire class. This information appears in the [legend](#help-tools-annotation-legend).

### 13.1. Horizontal Footage {#help-conductor-footage-horizontal}

Calculated from the drawn lengths of all conductor elements (lines, arcs, curves) using the calibrated [scale](#help-scale-drawing-scale). The calculation uses precise geometric methods:
- Lines: direct point-to-point distance
- Arcs: arc length computed from radius and sweep angle
- Curves: adaptive subdivision for accurate length

### 13.2. Vertical Footage {#help-conductor-footage-vertical}

Summed from the **Vertical** footage values entered on [downlead](#help-components-downleads) components. This represents conductor length that runs vertically and cannot be measured from the plan view.

### 13.3. Footage Display {#help-conductor-footage-display}

- **Legend:** Conductor footage rows appear in the legend grouped by material and wire class (e.g., "Class I Copper conductor footage: 145 ft")
- **Downlead labels:** Each downlead symbol shows its vertical footage value adjacent to the symbol on the drawing

---

## 14. Display Units {#help-display-units}

Distances in LP Sketch are displayed in feet and inches format (e.g., 12' 6"). This applies to all measurements shown in the [properties bar](#help-properties-bar), [dimension text](#help-tools-annotation-dimension-text) labels, and [legend](#help-tools-annotation-legend) footage entries.

---

## 15. Keyboard Shortcuts {#help-keyboard-shortcuts}

| Shortcut | Action |
|----------|--------|
| **Ctrl+Z** (Cmd+Z) | [Undo](#help-tools-undo-redo) |
| **Ctrl+Shift+Z** (Cmd+Shift+Z) | [Redo](#help-tools-undo-redo) |
| **Ctrl+Y** (Cmd+Y) | Redo (alternative) |
| **Enter** | Finish current operation: commit continuous [line](#help-properties-linear), [finish open](#help-properties-linear-at) linear AT trace, [apply](#help-properties-arc-at) arc AT spacing. In input fields, confirms the value. |
| **Ctrl+Enter** (Cmd+Enter) | Apply/submit in multi-line editors (text annotation, general notes, report dialog) |
| **Delete** or **Backspace** | [Delete](#help-selection-deleting) selected element(s) |
| **Escape** | Cancel current operation (in-progress line, arc, dimension, etc.) |
| **Hold Shift** | Disable [geometric snapping](#help-snapping) for the current click |
| **Hold Ctrl** | Disable [angle snapping](#help-snapping-angle) for the current click |
| **Right-click** (or **Alt+click**) | Inside corner input ([Linear AT](#help-components-air-terminals-linear) and [Mark](#help-tools-annotation-mark) tools) |
| **Middle mouse drag** | [Pan](#help-canvas-navigation-pan) the view (from any tool) |
| **Scroll wheel** | [Zoom](#help-canvas-navigation-zoom) in/out |

> **Note:** Delete, Backspace, Undo, and Redo shortcuts are suppressed while an editing dialog (annotation editor, legend labels, general notes, report) is open. This prevents accidental canvas mutations during editing.

---

## Appendix A: Component Symbol Reference {#help-symbol-reference}

| Component | Symbol | Layer | Directional | Class | Notes |
|-----------|--------|-------|-------------|-------|-------|
| Air Terminal | Circle (hollow Class I, filled Class II) | Rooftop | No | I or II | Letter A-Z |
| Bonded Air Terminal | Hexagon | Rooftop | No | I or II | Letter A-Z |
| Bond | Diamond (rotated square) | Rooftop | No | None | |
| Mechanical Connection | Small circle | Rooftop | No | None | Also auto-placed |
| Cadweld Connection | Small square (outlined Class I, filled Class II) | Rooftop | No | I or II | Also auto-placed |
| Mechanical Crossrun | Small circle inside larger circle | Rooftop | No | None | Also auto-placed at + intersections |
| Cadweld Crossrun | Small square inside larger square | Rooftop | No | I or II | Also auto-placed at + intersections |
| Continued | S-curve | Annotation | Yes | None | Always black; not in legend |
| Connect Existing | S-curve with junction | Rooftop | Yes | None | |
| Conduit Downlead to Ground | Square with double down-chevrons | Downleads | Yes | I or II | Vertical footage |
| Conduit Downlead to Roof | Square with single up-chevron | Downleads | Yes | I or II | Vertical footage |
| Surface Downlead to Ground | Circle with double down-chevrons | Downleads | Yes | I or II | Vertical footage |
| Surface Downlead to Roof | Circle with single up-chevron | Downleads | Yes | I or II | Vertical footage |
| Through-Roof-to-Steel | Square with star | Rooftop | No | I or II | |
| Through-Wall Connector | Circle with opposing chevrons | Rooftop | No | None | |
| Ground Rod | Stem + 3 bars (Class I) or 4 bars (Class II) | Grounding | Yes | I or II | |
| Steel Bond | Diamond with star | Grounding | No | None | |

---

## Appendix B: Glossary {#help-glossary}

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
| **Mechanical Crossrun** | A mechanical connector used at a four-way (+) conductor intersection where conductors pass through each other rather than simply terminating. |
| **Cadweld Crossrun** | An exothermic welded connector used at a four-way (+) conductor intersection. |
| **Steel Bond** | A bonding connection from the LP conductor system to structural steel, allowing the steel framework to serve as part of the conductor path. |
| **Strike Termination Device** | A metallic component that intercepts lightning and connects it to a path to ground. Includes air terminals and qualifying structural metal bodies (3/16 inch thick or more). |
| **Zone of Protection** | The space adjacent to a grounded air terminal or mast that is substantially immune to direct lightning strokes. |
| **Outside Corner** | An exposed, convex corner on a building perimeter that requires an air terminal within 2 feet. The [Linear AT](#help-components-air-terminals-linear) tool treats these as mandatory terminal locations. |
| **Inside Corner** | A reentrant (concave) angle in a building perimeter. No terminal is required at the corner itself, but the conductor must route through it. |
| **Calibration** | The process of establishing the [drawing scale](#help-scale-drawing-scale) by measuring a known distance on the PDF against its real-world equivalent. |
| **Construction Mark** | A temporary reference point placed on the drawing to aid in layout planning. Not included in exports. |
| **Flattened PDF** | An exported PDF where the annotation overlay is permanently composited onto the background PDF, producing a single merged document for handoff. |

---

*LP Sketch -- Lightning Protection Design*
