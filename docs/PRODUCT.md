# Product Specification

## Purpose

LP Sketch is a fast communication tool for lightning protection design. Users draw over a locked, single-page PDF plan and export a flattened result for CAD handoff.

## Core Workflow

1. Import a single-page PDF.
2. Set drawing scale (manual or calibration).
3. Draw/annotate with LP tools and symbols.
4. Save/load project JSON as needed.
5. Export PNG, JPG, or flattened PDF.

## Core Capabilities

- Editing tools:
  - Select (single), Multi-select, Pan
  - Line conductor, Arc conductor (perfect-circle segment), Curve conductor (3-point curve)
  - Arrow, Text, Legend, Measure, Measure & Mark
  - Linear AT auto-spacing and Arc AT auto-spacing
- Symbol/component placement:
  - Air terminals (including lettered variants), bonded AT, bond/connector variants,
    downleads, through-wall/through-roof, steel bond, ground rod, and directional symbols.
- Drafting assists:
  - Snap-to-points toggle
  - Angle snap (15 degrees) toggle
  - Auto-connectors
  - Real-time snap markers and selection handles
- Project controls:
  - Undo/redo, layer visibility, drawing scale, PDF brightness, annotation size
  - Quick tools customization persisted per device

## Domain Conventions

### Materials (Color)

- `green`: Copper
- `blue`: Aluminum
- `red`: Grounding
- `purple`: Bimetallic
- `cyan`: Tinned

### Classes

- Conductors use class-aware styling.
- Symbol class variants are applied where supported by the symbol type.
- Connector class precedence rules are handled by runtime auto-connector logic.

### Layers

- `rooftop`
- `downleads`
- `grounding`
- `annotation`

Only annotation elements are layer-reassignable by users; component symbols follow their defined layer families.

## Export Rules

- Export output includes persistent project geometry and symbols.
- Construction aids (temporary snaps/marks/debug cues) are excluded.
- Layer visibility filtering applies to export content.

## Non-goals

- Multi-page PDF editing
- CAD-level production drafting
- Collaborative multi-user editing

