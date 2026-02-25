import { describe, expect, it } from 'vitest'
import { computeLinearAutoSpacingPoints } from '../lib/spacing'
import { buildLegendItemsFromSymbols } from '../lib/legend'
import { createDefaultProject } from './defaultProject'
import { applyRedo, applyUndo, pushHistorySnapshot, type ProjectHistoryState } from './history'
import { validateProject } from './validation'
import type { LpProject } from '../types/project'

function createSchemaValidProject(name = 'History Transactions'): LpProject {
  const project = createDefaultProject(name)

  project.projectMeta = {
    id: 'project-history-test',
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

describe('history transaction boundaries integration', () => {
  it('treats each committed P0 action as one undo/redo unit', () => {
    const maxHistory = 100
    let current = createSchemaValidProject()
    let history: ProjectHistoryState = { past: [], future: [] }
    let updateTick = 1
    const snapshots: LpProject[] = [structuredClone(current)]

    function commit(mutator: (draft: LpProject) => void) {
      const before = structuredClone(current)
      const after = structuredClone(current)
      mutator(after)
      after.legend.items = buildLegendItemsFromSymbols(after)
      after.projectMeta.updatedAt = `2026-02-12T00:00:${String(updateTick).padStart(2, '0')}.000Z`
      updateTick += 1

      history = pushHistorySnapshot(history, before, maxHistory)
      current = after
      snapshots.push(structuredClone(current))
    }

    commit((draft) => {
      draft.elements.lines.push({
        id: 'line-1',
        start: { x: 100, y: 200 },
        end: { x: 240, y: 260 },
        color: 'green',
        class: 'class1',
      })
    })

    commit((draft) => {
      draft.elements.arcs.push({
        id: 'arc-1',
        start: { x: 260, y: 220 },
        end: { x: 360, y: 240 },
        through: { x: 318, y: 180 },
        color: 'blue',
        class: 'class2',
      })
    })

    commit((draft) => {
      draft.elements.symbols.push({
        id: 'symbol-seed',
        symbolType: 'air_terminal',
        position: { x: 300, y: 180 },
        color: 'green',
        class: 'class1',
      })
    })

    commit((draft) => {
      draft.legend.placements.push({
        id: 'legend-1',
        position: { x: 640, y: 80 },
        editedLabels: {},
      })
    })

    commit((draft) => {
      const points = computeLinearAutoSpacingPoints(
        [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
          { x: 40, y: 40 },
        ],
        ['outside', 'inside', 'outside'],
        false,
        12,
      )

      for (let i = 0; i < points.length; i += 1) {
        draft.elements.symbols.push({
          id: `symbol-auto-${i}`,
          symbolType: 'air_terminal',
          position: points[i],
          color: 'green',
          class: 'class1',
        })
      }
    })

    commit((draft) => {
      draft.construction.marks.push({
        id: 'mark-1',
        position: { x: 420, y: 390 },
      })
    })

    commit((draft) => {
      draft.construction.marks = []
    })

    commit((draft) => {
      const line = draft.elements.lines.find((entry) => entry.id === 'line-1')
      if (!line) {
        return
      }

      line.start.x += 15
      line.start.y += -5
      line.end.x += 15
      line.end.y += -5
    })

    commit((draft) => {
      draft.elements.symbols = draft.elements.symbols.filter((symbol) => symbol.id !== 'symbol-seed')
    })

    expect(history.past).toHaveLength(snapshots.length - 1)

    for (let index = snapshots.length - 2; index >= 0; index -= 1) {
      const transition = applyUndo(history, structuredClone(current), maxHistory)
      expect(transition).not.toBeNull()
      if (!transition) {
        return
      }

      history = transition.history
      current = structuredClone(transition.project)
      expect(current).toEqual(snapshots[index])
    }

    expect(applyUndo(history, structuredClone(current), maxHistory)).toBeNull()

    for (let index = 1; index < snapshots.length; index += 1) {
      const transition = applyRedo(history, structuredClone(current), maxHistory)
      expect(transition).not.toBeNull()
      if (!transition) {
        return
      }

      history = transition.history
      current = structuredClone(transition.project)
      expect(current).toEqual(snapshots[index])
    }

    expect(applyRedo(history, structuredClone(current), maxHistory)).toBeNull()

    const validation = validateProject(current)
    expect(validation.valid).toBe(true)
  })
})
