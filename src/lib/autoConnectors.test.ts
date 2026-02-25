import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import {
  buildAutoConnectorSymbols,
  computeAutoConnectorNodes,
  stripAutoConnectorSymbols,
} from './autoConnectors'

describe('auto connector classifier', () => {
  it('does not place a connector for a simple L-corner bend', () => {
    const project = createDefaultProject('L-corner')
    project.elements.lines.push(
      {
        id: 'line-a',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-b',
        start: { x: 100, y: 0 },
        end: { x: 100, y: 80 },
        color: 'green',
        class: 'class1',
      },
    )

    expect(computeAutoConnectorNodes(project)).toEqual([])
  })

  it('places a connector when a third branch meets an L-corner node', () => {
    const project = createDefaultProject('T-junction')
    project.elements.lines.push(
      {
        id: 'line-a',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-b',
        start: { x: 100, y: 0 },
        end: { x: 100, y: 80 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-c',
        start: { x: 100, y: 0 },
        end: { x: 160, y: 0 },
        color: 'green',
        class: 'class1',
      },
    )

    const nodes = computeAutoConnectorNodes(project)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].position.x).toBeCloseTo(100, 3)
    expect(nodes[0].position.y).toBeCloseTo(0, 3)
  })

  it('places connectors for line-line and line-arc interior intersections', () => {
    const project = createDefaultProject('Mixed intersections')
    project.elements.lines.push(
      {
        id: 'line-h',
        start: { x: 0, y: 50 },
        end: { x: 100, y: 50 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-v',
        start: { x: 50, y: 0 },
        end: { x: 50, y: 100 },
        color: 'green',
        class: 'class1',
      },
    )
    project.elements.arcs.push({
      id: 'arc-1',
      start: { x: 20, y: 80 },
      through: { x: 50, y: 20 },
      end: { x: 80, y: 80 },
      color: 'green',
      class: 'class1',
    })

    const nodes = computeAutoConnectorNodes(project)
    expect(nodes.length).toBeGreaterThanOrEqual(2)
    expect(nodes.some((entry) => Math.abs(entry.position.x - 50) < 1 && Math.abs(entry.position.y - 50) < 1)).toBe(true)
    expect(nodes.some((entry) => Math.abs(entry.position.x - 50) < 1 && Math.abs(entry.position.y - 20) < 1)).toBe(true)
  })

  it('does not infer connectors across different pages', () => {
    const project = createDefaultProject('Page-local connectors')
    project.elements.lines.push(
      {
        id: 'line-page-1',
        start: { x: 0, y: 50 },
        end: { x: 100, y: 50 },
        page: 1,
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-page-2',
        start: { x: 50, y: 0 },
        end: { x: 50, y: 100 },
        page: 2,
        color: 'green',
        class: 'class1',
      },
    )

    const nodes = computeAutoConnectorNodes(project)
    expect(nodes).toEqual([])
  })

  it('resolves bimetallic material and class-II precedence deterministically', () => {
    const project = createDefaultProject('Resolution rules')
    project.elements.lines.push(
      {
        id: 'line-copper',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-al',
        start: { x: 50, y: -50 },
        end: { x: 50, y: 50 },
        color: 'blue',
        class: 'class2',
      },
    )

    const nodes = computeAutoConnectorNodes(project)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].color).toBe('purple')
    expect(nodes[0].connectorClass).toBe('class2')
  })

  it('builds auto connector symbols and strips them without removing manual connectors', () => {
    const project = createDefaultProject('Auto symbol projection')
    project.elements.lines.push(
      {
        id: 'line-a',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-b',
        start: { x: 50, y: -50 },
        end: { x: 50, y: 50 },
        color: 'green',
        class: 'class1',
      },
    )
    project.elements.symbols.push({
      id: 'manual-connector',
      symbolType: 'cable_to_cable_connection',
      position: { x: 50, y: 0 },
      color: 'green',
      class: 'none',
    })

    const autoSymbols = buildAutoConnectorSymbols(project)
    expect(autoSymbols).toHaveLength(1)
    expect(autoSymbols[0].autoConnector).toBe(true)
    expect(autoSymbols[0].page).toBe(1)
    expect(autoSymbols[0].class).toBe('class1')
    expect(autoSymbols[0].symbolType).toBe('cable_to_cable_connection')

    const stripped = stripAutoConnectorSymbols([
      ...project.elements.symbols,
      ...autoSymbols,
    ])
    expect(stripped).toHaveLength(1)
    expect(stripped[0].id).toBe('manual-connector')
  })

  it('supports cadweld auto-connector symbol mode', () => {
    const project = createDefaultProject('Cadweld Auto Symbol Projection')
    project.settings.autoConnectorType = 'cadweld'
    project.elements.lines.push(
      {
        id: 'line-a',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-b',
        start: { x: 50, y: -50 },
        end: { x: 50, y: 50 },
        color: 'green',
        class: 'class1',
      },
    )

    const autoSymbols = buildAutoConnectorSymbols(project)
    expect(autoSymbols).toHaveLength(1)
    expect(autoSymbols[0].symbolType).toBe('cadweld_connection')

    const stripped = stripAutoConnectorSymbols(autoSymbols)
    expect(stripped).toHaveLength(0)
  })
})
