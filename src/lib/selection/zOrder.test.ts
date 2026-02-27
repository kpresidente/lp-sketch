import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../../model/defaultProject'
import type { LpProject } from '../../types/project'
import { canMoveSelectionsByZStep, moveSelectionsByZStep } from './zOrder'

function lineIds(project: LpProject): string[] {
  return project.elements.lines.map((entry) => entry.id)
}

function symbolIds(project: LpProject): string[] {
  return project.elements.symbols.map((entry) => entry.id)
}

function createProjectWithLines(ids: string[]): LpProject {
  const project = createDefaultProject('Z-Order Test')
  project.elements.lines = ids.map((id, index) => ({
    id,
    start: { x: index * 10, y: 0 },
    end: { x: index * 10 + 8, y: 0 },
    color: 'green',
    class: 'class1',
  }))
  return project
}

describe('z-order movement', () => {
  it('moves a single selection one step forward/back', () => {
    const project = createProjectWithLines(['line-a', 'line-b', 'line-c'])

    const movedForward = moveSelectionsByZStep(project, [{ kind: 'line', id: 'line-b' }], 'front')
    expect(movedForward).toBe(true)
    expect(lineIds(project)).toEqual(['line-a', 'line-c', 'line-b'])

    const movedBack = moveSelectionsByZStep(project, [{ kind: 'line', id: 'line-b' }], 'back')
    expect(movedBack).toBe(true)
    expect(lineIds(project)).toEqual(['line-a', 'line-b', 'line-c'])
  })

  it('applies partial movement for multi-selection while preserving selected order', () => {
    const project = createProjectWithLines(['a', 'b', 'c', 'd', 'e'])

    const moved = moveSelectionsByZStep(
      project,
      [
        { kind: 'line', id: 'b' },
        { kind: 'line', id: 'c' },
        { kind: 'line', id: 'd' },
      ],
      'front',
    )

    expect(moved).toBe(true)
    expect(lineIds(project)).toEqual(['a', 'b', 'c', 'e', 'd'])
  })

  it('moves selected items per collection for mixed-kind multi-selection', () => {
    const project = createProjectWithLines(['line-1', 'line-2', 'line-3'])
    project.elements.symbols.push(
      {
        id: 'symbol-1',
        symbolType: 'air_terminal',
        position: { x: 10, y: 10 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'symbol-2',
        symbolType: 'air_terminal',
        position: { x: 20, y: 10 },
        color: 'green',
        class: 'class1',
      },
    )

    const moved = moveSelectionsByZStep(
      project,
      [
        { kind: 'line', id: 'line-2' },
        { kind: 'symbol', id: 'symbol-1' },
      ],
      'front',
    )

    expect(moved).toBe(true)
    expect(lineIds(project)).toEqual(['line-1', 'line-3', 'line-2'])
    expect(symbolIds(project)).toEqual(['symbol-2', 'symbol-1'])
  })

  it('reports can-move only when at least one selected entry can step', () => {
    const project = createProjectWithLines(['line-1', 'line-2', 'line-3'])

    expect(canMoveSelectionsByZStep(project, [{ kind: 'line', id: 'line-3' }], 'front')).toBe(false)
    expect(canMoveSelectionsByZStep(project, [{ kind: 'line', id: 'line-1' }], 'back')).toBe(false)
    expect(
      canMoveSelectionsByZStep(
        project,
        [
          { kind: 'line', id: 'line-3' },
          { kind: 'line', id: 'line-1' },
        ],
        'front',
      ),
    ).toBe(true)
  })

  it('returns false and leaves order unchanged when no selected entries can move', () => {
    const project = createProjectWithLines(['line-1', 'line-2'])

    const moved = moveSelectionsByZStep(project, [{ kind: 'line', id: 'line-2' }], 'front')
    expect(moved).toBe(false)
    expect(lineIds(project)).toEqual(['line-1', 'line-2'])
  })
})
