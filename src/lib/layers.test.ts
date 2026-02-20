import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { filterProjectByVisibleLayers, symbolLayer } from './layers'

describe('layers helpers', () => {
  it('maps symbol families to expected automatic layers', () => {
    expect(symbolLayer('air_terminal')).toBe('rooftop')
    expect(symbolLayer('conduit_downlead_ground')).toBe('downleads')
    expect(symbolLayer('ground_rod')).toBe('grounding')
  })

  it('filters project render content by layer visibility', () => {
    const project = createDefaultProject('Layer Filtering')
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      color: 'green',
      class: 'class1',
    })
    project.elements.lines.push({
      id: 'line-2',
      start: { x: 0, y: 20 },
      end: { x: 100, y: 20 },
      color: 'red',
      class: 'class1',
    })
    project.elements.symbols.push(
      {
        id: 'sym-rooftop',
        symbolType: 'air_terminal',
        position: { x: 10, y: 10 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'sym-downlead',
        symbolType: 'conduit_downlead_ground',
        position: { x: 20, y: 20 },
        verticalFootageFt: 8,
        color: 'green',
        class: 'class1',
      },
      {
        id: 'sym-grounding',
        symbolType: 'ground_rod',
        position: { x: 30, y: 30 },
        directionDeg: 90,
        color: 'red',
        class: 'none',
      },
    )
    project.elements.texts.push({
      id: 'text-1',
      position: { x: 40, y: 40 },
      text: 'NOTE',
      color: 'blue',
      layer: 'annotation',
    })
    project.legend.placements.push({
      id: 'legend-1',
      position: { x: 20, y: 20 },
      editedLabels: {},
    })
    project.generalNotes.placements.push({
      id: 'general-notes-1',
      position: { x: 28, y: 28 },
    })

    project.layers.rooftop = false
    project.layers.downleads = true
    project.layers.grounding = true
    project.layers.annotation = false

    const filtered = filterProjectByVisibleLayers(project)
    expect(filtered.elements.lines).toHaveLength(1)
    expect(filtered.elements.lines[0].id).toBe('line-2')
    expect(filtered.elements.symbols.map((entry) => entry.id)).toEqual([
      'sym-downlead',
      'sym-grounding',
    ])
    expect(filtered.elements.texts).toHaveLength(0)
    expect(filtered.legend.placements).toHaveLength(0)
    expect(filtered.generalNotes.placements).toHaveLength(0)
  })

  it('returns the original project reference when all layers are visible', () => {
    const project = createDefaultProject('Layer Fast Path')
    const filtered = filterProjectByVisibleLayers(project)
    expect(filtered).toBe(project)
  })
})
