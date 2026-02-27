# Product Specification

## Purpose

LP Sketch is a fast communication tool for lightning protection design. Users draw over a locked PDF plan and export a flattened result for CAD handoff.

## Core Workflow

1. Import a PDF (single or multi-page).
2. Set drawing scale (manual entry or calibration tool).
3. Draw/annotate with LP tools and symbols.
4. Navigate pages, toggle layers, adjust properties as needed.
5. Save/load project JSON.
6. Export PNG, JPG, or flattened PDF of the current page.

## Core Capabilities

- Editing tools:
  - Select (single), Multi-select, Pan
  - Line conductor, Arc conductor (perfect-circle segment), Curve conductor (3-point curve)
  - Arrow, Text, Dimension Text, Legend, General Notes
  - Measure, Measure & Mark, Calibrate
  - Linear AT auto-spacing, Arc AT auto-spacing
- Symbol/component placement:
  - Air terminals (with letter labels), bonded AT
  - Bond, cable-to-cable connection, mechanical crossrun, cadweld, cadweld crossrun, connect-existing
  - Conduit/surface downleads (roof and ground variants), through-wall, through-roof
  - Steel bond, ground rod
  - Continued-line indicator
- Drafting assists:
  - Snap-to-points toggle
  - Angle snap (15-degree increments) toggle
  - Auto-connectors (mechanical or cadweld)
  - Real-time snap markers and selection handles
- Project controls:
  - Undo/redo with visible history counts
  - Layer and sublayer visibility
  - Drawing scale with display units (ft-in, decimal-ft, meters)
  - PDF brightness (per-page), annotation size (small/medium/large)
  - Page navigation (previous/next, page counter)
  - Quick-access toolbar with customizable tool/setting slots
  - Built-in help drawer with context-sensitive links
  - Bug/feature reporting from within the app

## Domain Conventions

### Materials (Color)

- `green`: Copper
- `blue`: Aluminum
- `red`: Grounding
- `purple`: Bimetallic
- `cyan`: Tinned

### Wire Classes

- Class I (hollow fill)
- Class II (solid fill with outline)

Conductors use class-aware styling. Symbol class variants are applied where supported.

### Layers

- `rooftop` (includes `connections` sublayer)
- `downleads`
- `grounding`
- `annotation`

Only annotation elements are layer-reassignable by users; component symbols follow their defined layer families.

## Export Rules

- Export output includes persistent project geometry and symbols.
- Construction aids (marks, snaps, debug cues) are excluded.
- Layer visibility filtering applies to export content.
- Single-page export (current page only).
- PDF export rasterizes annotations onto the original PDF page.

## Non-goals

- CAD-level production drafting
- Collaborative multi-user editing
