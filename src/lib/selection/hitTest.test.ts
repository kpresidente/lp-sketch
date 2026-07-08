import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../../model/defaultProject'
import type { LegendDisplayEntry } from '../legendDisplay'
import { moveSelectionsByZStep } from './zOrder'
import { hitTest } from './hitTest'

const hitTestOptions = {
  linearHitTieTolerancePx: 2,
  legendTitle: 'Legend',
  legendEntriesForPlacement: () => [] as LegendDisplayEntry[],
}

describe('hitTest z-order', () => {
  it('selects the topmost overlapping entry after z-order movement', () => {
    const project = createDefaultProject('Hit Test Z-Order')
    project.view = {
      currentPage: 1,
      zoom: 1,
      pan: { x: 0, y: 0 },
      byPage: { 1: { zoom: 1, pan: { x: 0, y: 0 } } },
    }
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 40, y: 80 },
      end: { x: 120, y: 80 },
      color: 'green',
      class: 'class1',
    })
    project.elements.symbols.push({
      id: 'symbol-1',
      symbolType: 'air_terminal',
      position: { x: 80, y: 80 },
      color: 'green',
      class: 'class1',
    })

    expect(hitTest({ x: 80, y: 80 }, project, hitTestOptions)).toEqual({
      kind: 'symbol',
      id: 'symbol-1',
    })

    const moved = moveSelectionsByZStep(project, [{ kind: 'line', id: 'line-1' }], 'front')

    expect(moved).toBe(true)
    expect(hitTest({ x: 80, y: 80 }, project, hitTestOptions)).toEqual({
      kind: 'line',
      id: 'line-1',
    })
  })
})
