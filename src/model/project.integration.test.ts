import { describe, expect, it } from 'vitest'
import { buildLegendItemsFromSymbols, legendItemKey } from '../lib/legend'
import { computeLinearAutoSpacingPoints } from '../lib/spacing'
import { createDefaultProject } from './defaultProject'
import { applyRedo, applyUndo, pushHistorySnapshot, type ProjectHistoryState } from './history'
import { asProject, validateProject } from './validation'
import type { LpProject } from '../types/project'

function createSchemaValidProject(name = 'Integration Test Project'): LpProject {
  const project = createDefaultProject(name)

  project.projectMeta = {
    id: 'project-test',
    name,
    createdAt: '2026-02-12T00:00:00.000Z',
    updatedAt: '2026-02-12T00:00:00.000Z',
  }

  project.pdf = {
    sourceType: 'embedded',
    name: 'plan.pdf',
    sha256: 'a'.repeat(64),
    page: 1,
    pageCount: 1,
    pages: [{ page: 1, widthPt: 1000, heightPt: 800 }],
    widthPt: 1000,
    heightPt: 800,
    dataBase64: 'QQ==',
    path: null,
  }

  project.scale = {
    isSet: true,
    method: 'manual',
    realUnitsPerPoint: 0.25,
    displayUnits: 'ft-in',
    byPage: {
      1: {
        isSet: true,
        method: 'manual',
        realUnitsPerPoint: 0.25,
        displayUnits: 'ft-in',
      },
    },
  }

  return project
}

describe('project integration', () => {
  it('passes save/load roundtrip with schema validation', () => {
    const project = createSchemaValidProject('Roundtrip')

    project.elements.lines.push({
      id: 'line-1',
      start: { x: 10, y: 20 },
      end: { x: 140, y: 90 },
      color: 'green',
      class: 'class1',
    })

    project.elements.arcs.push({
      id: 'arc-1',
      start: { x: 150, y: 200 },
      end: { x: 260, y: 210 },
      through: { x: 210, y: 165 },
      color: 'blue',
      class: 'class2',
    })

    project.elements.curves.push({
      id: 'curve-1',
      start: { x: 140, y: 310 },
      end: { x: 280, y: 320 },
      through: { x: 208, y: 260 },
      color: 'green',
      class: 'class1',
    })

    project.elements.symbols.push(
      {
        id: 'symbol-1',
        symbolType: 'air_terminal',
        position: { x: 180, y: 120 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'symbol-2',
        symbolType: 'bond',
        position: { x: 220, y: 160 },
        color: 'red',
        class: 'none',
      },
    )

    project.elements.texts.push({
      id: 'text-1',
      position: { x: 90, y: 70 },
      text: 'RIDGE NOTE',
      color: 'cyan',
      layer: 'annotation',
    })

    project.elements.arrows.push({
      id: 'arrow-1',
      tail: { x: 88, y: 66 },
      head: { x: 160, y: 118 },
      color: 'purple',
      layer: 'annotation',
    })

    project.construction.marks.push({
      id: 'mark-1',
      position: { x: 300, y: 330 },
    })

    project.legend.items = buildLegendItemsFromSymbols(project)
    const key = legendItemKey(project.legend.items[0])
    project.legend.placements.push({
      id: 'legend-1',
      position: { x: 640, y: 80 },
      editedLabels: {
        [key]: 'CUSTOM LABEL',
      },
    })

    const saved = JSON.stringify(project)
    const parsed = JSON.parse(saved) as unknown
    const validation = validateProject(parsed)

    expect(validation.valid).toBe(true)

    const loaded = asProject(parsed)
    expect(loaded).toEqual(project)
  })

  it('integrates spacing placement output into legend and schema-valid project', () => {
    const project = createSchemaValidProject('Spacing Pipeline')

    const spacingPoints = computeLinearAutoSpacingPoints(
      [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 40 },
      ],
      ['outside', 'inside', 'outside'],
      false,
      12,
    )

    for (let i = 0; i < spacingPoints.length; i += 1) {
      project.elements.symbols.push({
        id: `symbol-${i}`,
        symbolType: 'air_terminal',
        position: spacingPoints[i],
        color: 'green',
        class: 'class1',
      })
    }

    project.legend.items = buildLegendItemsFromSymbols(project)

    expect(project.legend.items).toHaveLength(1)
    expect(project.legend.items[0].count).toBe(spacingPoints.length)

    const validation = validateProject(project)
    expect(validation.valid).toBe(true)
  })

  it('applies undo/redo as transaction boundaries across project edits', () => {
    const maxHistory = 100
    let current = createSchemaValidProject('Undo Redo')
    let history: ProjectHistoryState = { past: [], future: [] }
    let updateTick = 1

    function commit(mutator: (draft: LpProject) => void) {
      const before = structuredClone(current)
      const after = structuredClone(current)
      mutator(after)
      after.legend.items = buildLegendItemsFromSymbols(after)
      after.projectMeta.updatedAt = `2026-02-12T00:00:${String(updateTick).padStart(2, '0')}.000Z`
      updateTick += 1

      history = pushHistorySnapshot(history, before, maxHistory)
      current = after
    }

    commit((draft) => {
      draft.construction.marks.push({ id: 'mark-1', position: { x: 10, y: 10 } })
    })

    commit((draft) => {
      draft.construction.marks = []
    })

    commit((draft) => {
      draft.elements.symbols.push({
        id: 'symbol-1',
        symbolType: 'air_terminal',
        position: { x: 20, y: 20 },
        color: 'green',
        class: 'class1',
      })
    })

    expect(current.construction.marks).toHaveLength(0)
    expect(current.elements.symbols).toHaveLength(1)

    const undo1 = applyUndo(history, structuredClone(current), maxHistory)
    expect(undo1).not.toBeNull()
    if (!undo1) {
      return
    }
    history = undo1.history
    current = structuredClone(undo1.project)

    expect(current.elements.symbols).toHaveLength(0)
    expect(current.construction.marks).toHaveLength(0)

    const undo2 = applyUndo(history, structuredClone(current), maxHistory)
    expect(undo2).not.toBeNull()
    if (!undo2) {
      return
    }
    history = undo2.history
    current = structuredClone(undo2.project)

    expect(current.construction.marks).toHaveLength(1)

    const redo1 = applyRedo(history, structuredClone(current), maxHistory)
    expect(redo1).not.toBeNull()
    if (!redo1) {
      return
    }
    history = redo1.history
    current = structuredClone(redo1.project)

    expect(current.construction.marks).toHaveLength(0)

    const redo2 = applyRedo(history, structuredClone(current), maxHistory)
    expect(redo2).not.toBeNull()
    if (!redo2) {
      return
    }
    history = redo2.history
    current = structuredClone(redo2.project)

    expect(current.elements.symbols).toHaveLength(1)
    expect(current.legend.items[0].count).toBe(1)
  })
})
