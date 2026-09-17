import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import {
  buildAutoConnectorSymbols,
  buildAutoConnectorSymbolsForAddedConductors,
  computeAutoConnectorNodes,
  stripAutoConnectorSymbols,
} from './autoConnectors'

const incompatibleCadweldCases = [
  {
    name: 'all-aluminum',
    horizontalColor: 'blue',
    verticalColor: 'blue',
    expectedColor: 'blue',
    expectedId: 'auto-connector-p1-500-500-blue-crossrun-m',
  },
  {
    name: 'mixed aluminum and copper',
    horizontalColor: 'blue',
    verticalColor: 'green',
    expectedColor: 'purple',
    expectedId: 'auto-connector-p1-500-500-purple-crossrun-m',
  },
] as const

function createCrossingProject(
  horizontalColor: 'blue',
  verticalColor: 'blue' | 'green',
) {
  const project = createDefaultProject('Cadweld material compatibility')
  project.settings.autoConnectorsEnabled = true
  project.elements.lines.push(
    {
      id: 'line-h',
      start: { x: 0, y: 50 },
      end: { x: 100, y: 50 },
      color: horizontalColor,
      class: 'class1',
    },
    {
      id: 'line-v',
      start: { x: 50, y: 0 },
      end: { x: 50, y: 100 },
      color: verticalColor,
      class: 'class1',
    },
  )
  return project
}

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

  it('classifies a 3-branch junction as tee', () => {
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
    expect(nodes[0].junction).toBe('tee')
  })

  it('classifies a + line intersection as crossrun', () => {
    const project = createDefaultProject('Crossrun')
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

    const nodes = computeAutoConnectorNodes(project)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].junction).toBe('crossrun')
    expect(nodes[0].position.x).toBeCloseTo(50, 3)
    expect(nodes[0].position.y).toBeCloseTo(50, 3)
  })

  it('detects intersections that involve arcs and curves', () => {
    const project = createDefaultProject('Arc and curve intersections')
    project.elements.lines.push({
      id: 'line-v',
      start: { x: 50, y: 0 },
      end: { x: 50, y: 100 },
      color: 'green',
      class: 'class1',
    })
    project.elements.arcs.push({
      id: 'arc-1',
      start: { x: 20, y: 80 },
      through: { x: 50, y: 20 },
      end: { x: 80, y: 80 },
      color: 'green',
      class: 'class1',
    })
    project.elements.curves.push({
      id: 'curve-1',
      start: { x: 10, y: 20 },
      through: { x: 70, y: 35 },
      end: { x: 90, y: 20 },
      color: 'green',
      class: 'class1',
    })

    const nodes = computeAutoConnectorNodes(project)
    expect(nodes.length).toBeGreaterThanOrEqual(2)
    expect(
      nodes.some((entry) => Math.abs(entry.position.x - 50) < 1 && Math.abs(entry.position.y - 20) < 1),
    ).toBe(true)
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

  it('builds connector symbol families by junction type', () => {
    const project = createDefaultProject('Connector symbol family')
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

    const mechanical = buildAutoConnectorSymbols(project, 'mechanical')
    expect(mechanical).toHaveLength(1)
    expect(mechanical[0].symbolType).toBe('mechanical_crossrun_connection')

    const cadweld = buildAutoConnectorSymbols(project, 'cadweld')
    expect(cadweld).toHaveLength(1)
    expect(cadweld[0].symbolType).toBe('cadweld_crossrun_connection')
  })

  it.each(incompatibleCadweldCases)(
    'falls back to a mechanical connector for a $name junction during full generation',
    ({ horizontalColor, verticalColor, expectedColor, expectedId }) => {
      const project = createCrossingProject(horizontalColor, verticalColor)

      const symbols = buildAutoConnectorSymbols(project, 'cadweld')

      expect(symbols).toHaveLength(1)
      expect(symbols[0]).toMatchObject({
        id: expectedId,
        symbolType: 'mechanical_crossrun_connection',
        color: expectedColor,
      })
    },
  )

  it.each(incompatibleCadweldCases)(
    'falls back to a mechanical connector for a $name junction during incremental generation',
    ({ horizontalColor, verticalColor, expectedColor, expectedId }) => {
      const project = createCrossingProject(horizontalColor, verticalColor)

      const symbols = buildAutoConnectorSymbolsForAddedConductors(
        project,
        [{ kind: 'line', id: 'line-v' }],
        'cadweld',
      )

      expect(symbols).toHaveLength(1)
      expect(symbols[0]).toMatchObject({
        id: expectedId,
        symbolType: 'mechanical_crossrun_connection',
        color: expectedColor,
      })
    },
  )

  it('adds connectors only for newly added conductors and deduplicates against existing connector symbols', () => {
    const project = createDefaultProject('Placement-time connectors')
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

    const first = buildAutoConnectorSymbolsForAddedConductors(project, [{ kind: 'line', id: 'line-c' }])
    expect(first).toHaveLength(1)
    expect(first[0].symbolType).toBe('cable_to_cable_connection')

    project.elements.symbols.push(first[0])
    const second = buildAutoConnectorSymbolsForAddedConductors(project, [{ kind: 'line', id: 'line-c' }])
    expect(second).toHaveLength(0)
  })

  it('strips only auto-generated connector symbols, preserving manual connectors', () => {
    const symbols = [
      {
        id: 'manual-mech',
        symbolType: 'cable_to_cable_connection',
        position: { x: 10, y: 10 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'manual-cross',
        symbolType: 'mechanical_crossrun_connection',
        position: { x: 12, y: 12 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'auto-mech',
        symbolType: 'cable_to_cable_connection',
        position: { x: 20, y: 20 },
        color: 'green',
        class: 'class1',
        autoConnector: true,
      },
      {
        id: 'auto-cross',
        symbolType: 'cadweld_crossrun_connection',
        position: { x: 22, y: 22 },
        color: 'green',
        class: 'class2',
        autoConnector: true,
      },
    ]

    const stripped = stripAutoConnectorSymbols(symbols)
    expect(stripped).toHaveLength(2)
    expect(stripped.map((entry) => entry.id).sort()).toEqual(['manual-cross', 'manual-mech'])
  })
})
