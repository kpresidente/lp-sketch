# LP Sketch - Vision Document

## Overview

LP Sketch is a lightweight sketching tool for lightning protection system design. It allows a lightning protection contractor to quickly sketch a system layout on top of an imported building plan (PDF), using straight lines, symbols, and basic CAD-like tools. The output is a clear, communicable sketch — not a final deliverable — intended to be handed off to a CAD designer for professional reproduction.

## Purpose & Context

The user is a lightning protection contractor with a CAD designer on staff. The contractor knows lightning protection; the CAD designer knows CAD. Currently, the contractor sketches designs freehand (using general-purpose drawing tools), which is slow and imprecise. LP Sketch bridges that gap: it gives the contractor enough precision and domain-specific tooling to produce a clear sketch quickly, which the CAD designer can then recreate as a professional document.

**This is a communication tool, not a production tool.** Speed and clarity over polish.

## Core Workflow

1. Import a building plan (PDF) as a locked background layer
2. Use drawing tools to overlay the lightning protection system design:
   - Straight lines for conductors/cables (color-coded by type and class)
   - Stamp pre-defined symbols for components (air terminals, ground rods, etc.)
3. Optionally add a simple symbol key/legend
4. Export or share the sketch with the CAD designer

## Drawing Tools (Initial Scope)

- **Line tool** — click-to-click straight line segments, with color and style options to distinguish conductor types and classes. Supports both single-segment mode (two clicks = one line) and continuous mode (keep clicking to chain segments, double-click or Escape to end). Each segment is stored as an individual line regardless of drawing mode.
- **Arc tool** — 3-point arc: click point 1, click point 2 on the arc, click point 3 to finish. The resulting arc intersects all 3 clicked points. Each arc is stored as an individual element. Inherits the active color and class.
- **Symbol stamp tool** — select from a palette of pre-defined LP symbols, place with a click; symbols inherit the active color
- **Auto-spacing tool** — trace a path to auto-place air terminals at regular intervals (see Auto-Spacing Tool section below)
- **Measure & mark tool** — manual spacing helper with live distance readout and temporary snap marks (see Measure & Mark Tool section below)
- **Measuring tool** — non-drawing tool for measuring distances. Supports straight lines, polylines (multi-segment paths), and arcs. Displays the total path distance using the current scale. Does not place any elements on the drawing.
- **Text note tool** — place a text label on the drawing. User clicks a location and types the note. Text is editable after placement (double-click to re-enter edit mode). Text inherits the active color or uses a default annotation color (TBD).
- **Arrow tool** — two-click arrow pointer: first click = tail, second click = head (arrowhead). Separate from text notes for flexibility — a single note can have multiple arrows, or arrows can be used independently.
- **Snap system** — see Snap & Constraint System section below
- **Selection/move/delete** — select, reposition, or delete placed elements. Symbols take selection precedence over lines (higher z-index). When symbols overlap or share a basepoint, the most recently placed symbol is selected first.
- **Undo/redo** — standard undo/redo capabilities

## Wire Classification & Color System

All lines and symbols share the same color/style system.

### Line Style = Wire Class

| Style  | Meaning                    |
|--------|----------------------------|
| Dashed | Class 1 (thinner wire)     |
| Solid  | Class 2 (thicker wire)     |

### Color = Wire Material

| Color  | Material                                              |
|--------|-------------------------------------------------------|
| Green  | Copper                                                |
| Blue   | Aluminum                                              |
| Red    | Ground wire (copper, but a distinct type)             |
| Cyan   | Tinned copper (rarely used)                           |
| Purple | Bi-metallic (connections between dissimilar metals)   |

### Symbol Colors

Symbols use the same color palette as lines. For example:
- An air terminal may be green (copper), blue (aluminum), or cyan (tinned copper)
- A bond may be any of the above, plus red (ground) or purple (bi-metallic)
- The active color setting applies to both lines and symbols

## Symbol Library

### Class System for Symbols

Symbols use the same Class 1 / Class 2 distinction as lines:

- **Class 1** — symbol shape is **open** (white/no fill, colored outline only)
- **Class 2** — symbol shape is **filled** (colored fill)
- **NO CLASS** — some symbols don't distinguish between classes. These are always rendered in a single style (noted per symbol below).

### Symbol Definitions

| #  | Symbol                    | Shape                        | Class Variants | Notes                                           |
|----|---------------------------|------------------------------|----------------|--------------------------------------------------|
| 1  | Air terminal              | Circle                       | Yes            | C1: open circle, C2: filled circle              |
| 2  | Bond                      | Asterisk (*)                 | No             | Connection/bonding point                         |
| 3  | Conduit downlead to ground| Diamond with circle          | Yes            | C1: open, C2: filled                             |
| 4  | Conduit downlead to roof  | Triangle with circle         | Yes            | C1: open, C2: filled. **Directional** — two-click placement (see Symbol Placement). |
| 5  | Surface downlead to ground| Diamond                      | Yes            | C1: open, C2: filled                             |
| 6  | Surface downlead to roof  | Triangle                     | Yes            | C1: open, C2: filled. **Directional** — two-click placement (see Symbol Placement). |
| 7  | Through-roof-to-steel     | Square                       | Yes            | C1: open, C2: filled                             |
| 8  | Through-wall connector    | Square with X inside         | No             |                                                  |
| 9  | Ground rod                | Electrical ground symbol     | No             | See ground-rod.jpeg. **Directional** — two-click placement (see Symbol Placement). |
| 10 | Steel bond                | Asterisk with circle         | No             | Grounding only (always red/ground color)         |
| 11 | Cable-to-cable connection | Small dot                    | Yes            | Smaller than air terminal.                       |

### Symbol Placement

Most symbols are **symmetrical** — single click to place at the basepoint. The following symbols are **directional** and require **two clicks**:

- **Ground rod** — asymmetrical (has a directional stem). Two clicks:
  1. First click: basepoint (top of the stem — the connection point to conductor lines)
  2. Second click: direction the ground prongs face
- **Conduit downlead to roof** (triangle with circle) and **Surface downlead to roof** (triangle) — equilateral triangle acts as an arrowhead pointing in a direction. Two clicks:
  1. First click: basepoint (center of the triangle)
  2. Second click: direction a vertex of the triangle points toward

All directional symbols respect the angular constraint toggle — direction snaps to 15-degree increments when angular snap is on. All other symbols are symmetrical and placed with a single click.

### Symbol Behavior

- **Fixed size** — symbols maintain a constant pixel size regardless of zoom level (always legible). Scaling with zoom may be added later if needed.
- **Basepoint** — every symbol has a defined basepoint (center or logical anchor) used for placement and snapping.
- **Z-index** — symbols always render above lines. Lines render above the background PDF.
- **Color** — symbols inherit the active material color at the time of placement. Can be changed after placement via selection.

### Symbol Selection UI

- Symbols are **grouped by material color** (copper, aluminum, ground, tinned copper, bi-metallic)
- A **Class 1 / Class 2 toggle** switches all symbols between their open and filled variants globally
  - Symbols marked NO CLASS are unaffected by the toggle
- User selects a material color + symbol, then clicks to place

## Auto-Spacing Tool (Air Terminal Placement)

A specialized tool for placing air terminals at regular intervals along a traced path. This is the primary use case for air terminal placement on roof lines and perimeters.

### Core Concept

The user traces a polyline (or closed polygon) along a roof edge or perimeter. The app automatically places air terminals along that path at the largest equal interval that does not exceed a configurable maximum distance (e.g., 20 feet).

### How It Works

1. User activates the auto-spacing tool and sets the max interval distance
2. User traces a path by clicking vertices along the roof edge
3. At each vertex, the user indicates whether it is an **outside corner** or an **inside corner**:
   - **Left click** = outside corner (convex turn). Always receives an air terminal. Acts as an anchor point for the spacing calculation.
   - **Right click** = inside corner (concave turn). No air terminal placed. The path measurement continues straight through it — it's just a bend in the path, not a spacing boundary.
4. The first and last points of an open polyline always receive an air terminal
5. User completes the path (double-click to end an open polyline, or close the polygon by clicking near the start point)
6. The app calculates and places air terminals along the path

### Spacing Algorithm

1. Identify all **anchor points**: start point, end point (if open polyline), and all outside corners
2. For each span between consecutive anchor points, measure the total path length along the polyline (following through any inside corners)
3. Divide each span into N equal segments, where N is the smallest number of segments such that each segment length ≤ max interval distance
4. Place air terminals at each calculated point along the path, plus at all anchor points

### Corner Type — Always Manual

The user always manually indicates outside vs. inside corners (left click vs. right click). There is no auto-detection, even for closed polygons where it would be geometrically possible. This keeps the interaction consistent and predictable — the user is always the one making the distinction, regardless of shape complexity.

### Path Types

- **Open polyline** — a path that doesn't close on itself (e.g., 3 sides of a building). Start and end points always get ATs.
- **Closed polygon** — the path returns to its starting point (e.g., full roof perimeter). No start/end distinction; outside corners and spacing govern all AT placement.

### Snapping & Constraints

The auto-spacing tool respects the same snap and angular constraint system as the line tool. Vertices snap to existing elements, and angular constraints apply to each segment while tracing.

### Output

The tool produces only air terminal symbols placed along the path (inheriting the active color and class). It does **not** draw conductor lines — the user draws conductor lines first using the line tool, then uses the auto-spacing tool to backfill air terminals along the path. This keeps each step focused on one thing at a time.

### Note on Right-Click

The right-click interaction for inside corners may conflict with browser context menus if this is built as a web app. Alternative input methods (e.g., modifier key + click, or a different keybinding) should be considered during technical design. The concept is: two distinct click types to distinguish outside vs. inside corners with zero mode-switching.

## Measure & Mark Tool (Manual Spacing Helper)

A manual spacing tool for placing symbols that have distance requirements too complex to fully automate. Where the auto-spacing tool handles the simple case (air terminals, fully automated), this tool gives the user distance feedback and lets them make placement decisions themselves.

### Core Concept

The user clicks a starting point, then traces a path. As they move the mouse, a live distance readout shows how far they are from their last anchor point, measured along the path. When they reach the right distance, they click to drop a **mark** — a temporary snap point (displayed as a red X or similar). After all marks are placed, the user switches to the symbol stamp tool and snaps real symbols to the marks.

### How It Works

1. User activates the measure & mark tool
2. User clicks a starting point (first anchor)
3. As the mouse moves, a **live distance readout** displays the path distance from the last anchor point
4. User traces a path using the same polyline mechanics as the auto-spacing tool:
   - **Left click** = outside corner (counts toward distance, and can also serve as a mark placement)
   - **Right click** = inside corner (bend in path, distance measurement continues through it)
5. When at the desired distance, user clicks to drop a **mark** (temporary custom snap point)
6. That same click **immediately begins the next measurement** — the mark is both the end of one span and the start of the next (same as clicking a vertex in a polyline)
7. Repeat until all marks are placed
8. User ends the operation (e.g., double-click, Escape, or a finish button)
9. User switches to symbol stamp tool and snaps symbols to the marks
10. Marks can be cleared individually or all at once when no longer needed

### Marks

- Marks are **temporary construction geometry** — visual helpers, not part of the final drawing
- Displayed as a distinct indicator (e.g., red X) to differentiate from real symbols
- Act as **snap points** for all other tools (line tool, symbol stamp, etc.)
- Not included in export/output or legend counts
- Can be cleared individually (select + delete) or all at once (clear all marks)

### Distance Measurement

- Distance is measured **along the traced path**, not as a straight-line crow-flies distance
- Inside corners (right-click) are pass-through bends — the distance continues through them without resetting
- Outside corners (left-click) count toward the distance and can optionally serve as mark locations

### Snapping & Constraints

The measure & mark tool respects the same snap and angular constraint system as the line tool and auto-spacing tool. The same left-click / right-click note regarding browser context menus applies here as well.

## Snap & Constraint System

Snapping applies **only to user-drawn elements** (lines and symbols). The static PDF background layer is never a snap target.

### Snap Modes

| Snap Type       | Behavior                                                        |
|-----------------|-----------------------------------------------------------------|
| Endpoint        | Snap to the start or end point of an existing line or arc       |
| Intersection    | Snap to where two lines/arcs cross                              |
| Nearest on line | Snap to any point along an existing line or arc (closest point) |
| Symbol basepoint| Snap to the basepoint of any placed symbol                      |

### Constraints

| Constraint       | Behavior                                                       |
|------------------|----------------------------------------------------------------|
| Angular (15-deg) | Constrain line angle to 15-degree increments (0, 15, 30, 45, 60, 75, 90, ... 345). Gives ortho, 45s, and 30/60 angles for roof slopes and angled runs. |

### Snap & Constraint Toggles

- **Snap toggle button** — turns all object snap modes (endpoint, intersection, nearest, basepoint) on or off at once. Default: ON.
- **Angular constraint toggle button** — turns 15-degree angle snapping on or off independently. Default: ON.
- **Shift key override** — holding Shift temporarily disables ALL snapping and constraints (full freehand), regardless of toggle states.

### Not Included (For Now)

- Per-snap-mode toggles (enable/disable individual snap types) — may be added later
- Grid snap — may be added later, but no clear use case currently
- Snap to PDF background elements — intentionally excluded

## Legend / Symbol Key

- **Stamp-based** — the legend can be stamped onto the drawing at any chosen location
- **Auto-populated** — only shows symbols and colors actually used in the current drawing (not the full library)
- **Counts included** — each symbol entry in the legend displays the count of how many times it appears on the drawing
- **Manual editing** — user can modify the legend after stamping if needed
- Kept simple — a quick reference for the CAD designer, not a formatted title block

## Scale & Calibration

The auto-spacing tool, measure & mark tool, and measuring tool all require real-world distance values. The app needs to know the scale of the imported PDF.

Two methods supported:

- **Manual scale entry** — user enters a known scale ratio (e.g., 1/4" = 1'-0", or 1:48)
- **Calibration from drawing** — user clicks two points on the PDF and enters the real-world distance between them. The app calculates the scale from that.

Scale must be set before distance-based tools can be used. Scale can be recalibrated at any time.

## Background Layer (PDF Import)

- PDF is imported as a non-editable background image
- Single-page PDFs only
- User can zoom and pan
- Drawing layer sits on top; PDF is purely visual reference
- Render order (bottom to top): PDF background → lines/arcs → symbols

## Saving & Project Files

- The app uses a native project file format that preserves all editable state: PDF reference, all lines, arcs, symbols, marks, scale settings, and legend
- User can save, close, and reopen projects to continue editing
- Project file format: JSON (SolidJS store serialized; PDF embedded as base64 or file-referenced)

## Output

- Primary output: a sketch that communicates the LP system design to a CAD designer
- Export format: PDF (overlay flattened onto the original), or image (PNG/JPG)
- Legend/key included in the output

## Platform & Technical Stack

- Primarily desktop, but should be touch-friendly for tablet use
- Cross-platform target via web browser (PWA)
- Optionally wrappable in Tauri for native desktop installer later if needed

### Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | SolidJS + TypeScript | Integrates with existing SolidJS application (monorepo or suite) |
| UI components | Kobalte | Accessible, unstyled component primitives for SolidJS |
| Icons | Tabler Icons | Consistent with existing application |
| Drawing layer | SVG (managed by SolidJS) | Lines, arcs, symbols, arrows, text — all SVG elements driven by SolidJS reactivity. No canvas library needed. |
| PDF background | HTML5 Canvas + pdf.js | pdf.js renders the PDF to a canvas element beneath the SVG layer |
| PDF export | pdf-lib | Overlay drawing elements onto original PDF for flattened export |
| Project files | JSON | SolidJS store serialized to JSON; PDF embedded (base64) or referenced |
| Deployment | PWA | Installable on desktop and mobile; offline capable |

### Why SVG over a Canvas Library

The drawing layer uses SVG rather than a canvas library (e.g., Konva.js, Fabric.js) because:

- SVG elements are DOM nodes — SolidJS's fine-grained reactivity drives them directly (e.g., `<line stroke={color()}>` just works)
- Hit detection, z-ordering, and per-element events are free via the DOM
- No impedance mismatch between an imperative canvas library and SolidJS's reactive model
- Fewer dependencies, less bridge code
- The drawing will have hundreds of elements at most — well within SVG performance limits
- Canvas is used only for the one thing it's needed for: pdf.js background rendering

### Mobile / Touch Input

Desktop interactions need to be mapped to touch gestures. Primary approach is gesture-based (no toolbar toggling required), with a toolbar toggle as a fallback.

#### Gesture Mapping (Primary)

| Desktop              | Mobile / Tablet              |
|----------------------|------------------------------|
| Left click           | Tap                          |
| Right click          | Long press (~300-400ms)      |
| Hover / mouse move   | Touch and drag (preview + distance readout update live while dragging; lift to commit) |
| Scroll to zoom       | Pinch to zoom                |
| Middle-click drag to pan | Two-finger drag to pan   |
| Double-click         | Double-tap                   |

#### Toolbar Toggle (Fallback)

If the gesture approach proves insufficient for certain workflows, a toolbar-based fallback can be added:

- **Left-click / right-click toggle** — switches what a tap does (outside corner vs. inside corner)
- **Drag / hover toggle** — switches finger/stylus behavior between panning and tool interaction

The gesture approach is preferred as it requires no mode switching, but the toolbar fallback is available if specific tools feel awkward on touch.

## Out of Scope (For Now)

- Title blocks and professional formatting
- Detail callout systems
- Multi-page documents
- Collaboration / multi-user
- Grid snap
- Snap to PDF background elements
- Symbol scaling with zoom

## Open Questions

- Monorepo structure: how to integrate LP Sketch into the existing SolidJS application
- PWA configuration details (service worker, caching strategy)
- PDF embedding vs. file reference in project files (base64 increases file size but is self-contained)
