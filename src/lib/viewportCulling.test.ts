import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { filterProjectByViewport, viewportDocRect, type Rect } from './viewportCulling'

function makeViewport(minX: number, minY: number, maxX: number, maxY: number): Rect {
  return { minX, minY, maxX, maxY }
}

describe('viewportDocRect', () => {
  it('converts screen viewport to document coordinates at zoom 1, pan 0', () => {
    const view = { currentPage: 1, zoom: 1, pan: { x: 0, y: 0 }, byPage: {} }
    const rect = viewportDocRect(view, 800, 600, 0)
    expect(rect.minX).toBeCloseTo(0)
    expect(rect.minY).toBeCloseTo(0)
    expect(rect.maxX).toBeCloseTo(800)
    expect(rect.maxY).toBeCloseTo(600)
  })

  it('accounts for pan offset', () => {
    const view = { currentPage: 1, zoom: 1, pan: { x: -100, y: -50 }, byPage: {} }
    const rect = viewportDocRect(view, 800, 600, 0)
    expect(rect.minX).toBeCloseTo(100)
    expect(rect.minY).toBeCloseTo(50)
    expect(rect.maxX).toBeCloseTo(900)
    expect(rect.maxY).toBeCloseTo(650)
  })

  it('accounts for zoom', () => {
    const view = { currentPage: 1, zoom: 2, pan: { x: 0, y: 0 }, byPage: {} }
    const rect = viewportDocRect(view, 800, 600, 0)
    expect(rect.minX).toBeCloseTo(0)
    expect(rect.minY).toBeCloseTo(0)
    expect(rect.maxX).toBeCloseTo(400)
    expect(rect.maxY).toBeCloseTo(300)
  })

  it('adds margin in document coordinates', () => {
    const view = { currentPage: 1, zoom: 2, pan: { x: 0, y: 0 }, byPage: {} }
    const rect = viewportDocRect(view, 800, 600, 100)
    // margin = 100 / 2 = 50 doc units
    expect(rect.minX).toBeCloseTo(-50)
    expect(rect.minY).toBeCloseTo(-50)
    expect(rect.maxX).toBeCloseTo(450)
    expect(rect.maxY).toBeCloseTo(350)
  })
})

describe('filterProjectByViewport', () => {
  it('keeps elements inside the viewport', () => {
    const project = createDefaultProject('Viewport Test')
    project.elements.lines.push({
      id: 'line-inside',
      start: { x: 50, y: 50 },
      end: { x: 150, y: 50 },
      color: 'green',
      class: 'class1',
    })
    project.elements.symbols.push({
      id: 'sym-inside',
      symbolType: 'air_terminal',
      position: { x: 100, y: 100 },
      color: 'green',
      class: 'class1',
    })

    const viewport = makeViewport(0, 0, 200, 200)
    const filtered = filterProjectByViewport(project, viewport, 1)

    expect(filtered.elements.lines).toHaveLength(1)
    expect(filtered.elements.lines[0].id).toBe('line-inside')
    expect(filtered.elements.symbols).toHaveLength(1)
    expect(filtered.elements.symbols[0].id).toBe('sym-inside')
  })

  it('removes elements completely outside the viewport', () => {
    const project = createDefaultProject('Viewport Cull')
    project.elements.lines.push({
      id: 'line-outside',
      start: { x: 500, y: 500 },
      end: { x: 600, y: 500 },
      color: 'green',
      class: 'class1',
    })
    project.elements.symbols.push({
      id: 'sym-outside',
      symbolType: 'air_terminal',
      position: { x: 500, y: 500 },
      color: 'green',
      class: 'class1',
    })
    project.elements.texts.push({
      id: 'text-outside',
      position: { x: 500, y: 500 },
      text: 'Far away',
      color: 'blue',
      layer: 'annotation',
    })
    project.elements.arrows.push({
      id: 'arrow-outside',
      tail: { x: 500, y: 500 },
      head: { x: 550, y: 500 },
      color: 'green',
      layer: 'annotation',
    })
    project.construction.marks.push({
      id: 'mark-outside',
      position: { x: 500, y: 500 },
    })

    const viewport = makeViewport(0, 0, 200, 200)
    const filtered = filterProjectByViewport(project, viewport, 1)

    expect(filtered.elements.lines).toHaveLength(0)
    expect(filtered.elements.symbols).toHaveLength(0)
    expect(filtered.elements.texts).toHaveLength(0)
    expect(filtered.elements.arrows).toHaveLength(0)
    expect(filtered.construction.marks).toHaveLength(0)
  })

  it('keeps elements that partially overlap the viewport', () => {
    const project = createDefaultProject('Partial Overlap')
    // Line starts inside, ends outside
    project.elements.lines.push({
      id: 'line-partial',
      start: { x: 180, y: 100 },
      end: { x: 300, y: 100 },
      color: 'green',
      class: 'class1',
    })

    const viewport = makeViewport(0, 0, 200, 200)
    const filtered = filterProjectByViewport(project, viewport, 1)

    expect(filtered.elements.lines).toHaveLength(1)
  })

  it('uses symbol padding so nearby symbols are kept', () => {
    const project = createDefaultProject('Symbol Padding')
    // Symbol is just outside viewport at x=220, but with padding of 50 it should be kept
    project.elements.symbols.push({
      id: 'sym-near',
      symbolType: 'air_terminal',
      position: { x: 240, y: 100 },
      color: 'green',
      class: 'class1',
    })

    const viewport = makeViewport(0, 0, 200, 200)
    const filtered = filterProjectByViewport(project, viewport, 1)

    // position.x=240, viewport.maxX=200, padding=50 → 240-50=190 < 200 ✓
    expect(filtered.elements.symbols).toHaveLength(1)
  })

  it('scales symbol padding with annotation scale', () => {
    const project = createDefaultProject('Scale Padding')
    project.elements.symbols.push({
      id: 'sym-scaled',
      symbolType: 'air_terminal',
      position: { x: 350, y: 100 },
      color: 'green',
      class: 'class1',
    })

    const viewport = makeViewport(0, 0, 200, 200)
    // At annotationScale=1, padding=50 → 350-50=300 > 200 → culled
    expect(filterProjectByViewport(project, viewport, 1).elements.symbols).toHaveLength(0)
    // At annotationScale=4, padding=200 → 350-200=150 < 200 → kept
    expect(filterProjectByViewport(project, viewport, 4).elements.symbols).toHaveLength(1)
  })

  it('filters arcs and curves using three-point bounds', () => {
    const project = createDefaultProject('Arc/Curve Bounds')
    project.elements.arcs.push({
      id: 'arc-inside',
      start: { x: 10, y: 10 },
      through: { x: 50, y: 50 },
      end: { x: 90, y: 10 },
      color: 'green',
      class: 'class1',
    })
    project.elements.arcs.push({
      id: 'arc-outside',
      start: { x: 400, y: 400 },
      through: { x: 450, y: 450 },
      end: { x: 500, y: 400 },
      color: 'green',
      class: 'class1',
    })
    project.elements.curves.push({
      id: 'curve-inside',
      start: { x: 20, y: 20 },
      through: { x: 60, y: 60 },
      end: { x: 100, y: 20 },
      color: 'blue',
      class: 'class1',
    })

    const viewport = makeViewport(0, 0, 200, 200)
    const filtered = filterProjectByViewport(project, viewport, 1)

    expect(filtered.elements.arcs).toHaveLength(1)
    expect(filtered.elements.arcs[0].id).toBe('arc-inside')
    expect(filtered.elements.curves).toHaveLength(1)
    expect(filtered.elements.curves[0].id).toBe('curve-inside')
  })

  it('filters dimension texts using start/end/position bounds', () => {
    const project = createDefaultProject('DimensionText Bounds')
    project.elements.dimensionTexts.push({
      id: 'dt-inside',
      start: { x: 50, y: 50 },
      end: { x: 150, y: 50 },
      position: { x: 100, y: 30 },
      layer: 'annotation',
    })
    project.elements.dimensionTexts.push({
      id: 'dt-outside',
      start: { x: 400, y: 400 },
      end: { x: 500, y: 400 },
      position: { x: 450, y: 380 },
      layer: 'annotation',
    })

    const viewport = makeViewport(0, 0, 200, 200)
    const filtered = filterProjectByViewport(project, viewport, 1)

    expect(filtered.elements.dimensionTexts).toHaveLength(1)
    expect(filtered.elements.dimensionTexts[0].id).toBe('dt-inside')
  })

  it('always preserves legend and general-note placements', () => {
    const project = createDefaultProject('Preserve Legends')
    project.legend.placements.push({
      id: 'legend-far',
      position: { x: 5000, y: 5000 },
      editedLabels: {},
    })
    project.generalNotes.placements.push({
      id: 'notes-far',
      position: { x: 5000, y: 5000 },
    })

    const viewport = makeViewport(0, 0, 200, 200)
    const filtered = filterProjectByViewport(project, viewport, 1)

    expect(filtered.legend.placements).toHaveLength(1)
    expect(filtered.generalNotes.placements).toHaveLength(1)
  })

  it('handles mixed in/out elements correctly', () => {
    const project = createDefaultProject('Mixed')
    project.elements.lines.push(
      { id: 'l1', start: { x: 10, y: 10 }, end: { x: 50, y: 10 }, color: 'green', class: 'class1' },
      { id: 'l2', start: { x: 300, y: 300 }, end: { x: 400, y: 300 }, color: 'green', class: 'class1' },
      { id: 'l3', start: { x: 80, y: 80 }, end: { x: 120, y: 120 }, color: 'blue', class: 'class2' },
    )

    const viewport = makeViewport(0, 0, 200, 200)
    const filtered = filterProjectByViewport(project, viewport, 1)

    expect(filtered.elements.lines.map((el) => el.id)).toEqual(['l1', 'l3'])
  })
})
