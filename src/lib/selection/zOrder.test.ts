import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../../model/defaultProject'
import type { LpProject } from '../../types/project'
import { canMoveSelectionsByZStep, moveSelectionsByZStep, projectDrawOrderEntries } from './zOrder'

function lineIds(project: LpProject): string[] {
  return project.elements.lines.map((entry) => entry.id)
}

function drawOrderIds(project: LpProject): string[] {
  return projectDrawOrderEntries(project, { includeMarks: true }).map((entry) => `${entry.kind}:${entry.id}`)
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

function createProjectWithPositionedLines(
  entries: Array<{ id: string; start: { x: number; y: number }; end: { x: number; y: number } }>,
): LpProject {
  const project = createDefaultProject('Z-Order Test')
  project.elements.lines = entries.map((entry) => ({
    id: entry.id,
    start: entry.start,
    end: entry.end,
    color: 'green',
    class: 'class1',
  }))
  return project
}

describe('z-order movement', () => {
  it('moves a single selection past the next overlapping target', () => {
    const project = createProjectWithPositionedLines([
      { id: 'line-a', start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
      { id: 'line-b', start: { x: 100, y: 0 }, end: { x: 120, y: 0 } },
      { id: 'line-c', start: { x: 140, y: 0 }, end: { x: 160, y: 0 } },
      { id: 'line-d', start: { x: 10, y: -10 }, end: { x: 10, y: 10 } },
    ])

    const movedForward = moveSelectionsByZStep(project, [{ kind: 'line', id: 'line-a' }], 'front')
    expect(movedForward).toBe(true)
    expect(lineIds(project)).toEqual(['line-a', 'line-b', 'line-c', 'line-d'])
    expect(drawOrderIds(project)).toEqual(['line:line-d', 'line:line-b', 'line:line-c', 'line:line-a'])

    const movedBack = moveSelectionsByZStep(project, [{ kind: 'line', id: 'line-a' }], 'back')
    expect(movedBack).toBe(true)
    expect(lineIds(project)).toEqual(['line-a', 'line-b', 'line-c', 'line-d'])
    expect(drawOrderIds(project)).toEqual(['line:line-a', 'line:line-b', 'line:line-c', 'line:line-d'])
  })

  it('applies partial movement for multi-selection while preserving selected order', () => {
    const project = createProjectWithPositionedLines([
      { id: 'a', start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
      { id: 'b', start: { x: 5, y: -10 }, end: { x: 5, y: 10 } },
      { id: 'c', start: { x: 100, y: 0 }, end: { x: 120, y: 0 } },
      { id: 'd', start: { x: 110, y: -10 }, end: { x: 110, y: 10 } },
      { id: 'e', start: { x: 180, y: 0 }, end: { x: 200, y: 0 } },
    ])

    const moved = moveSelectionsByZStep(
      project,
      [
        { kind: 'line', id: 'a' },
        { kind: 'line', id: 'c' },
        { kind: 'line', id: 'e' },
      ],
      'front',
    )

    expect(moved).toBe(true)
    expect(lineIds(project)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(drawOrderIds(project)).toEqual(['line:b', 'line:a', 'line:d', 'line:c', 'line:e'])
  })

  it('moves selected items within one layer even when the selection spans kinds', () => {
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
    expect(lineIds(project)).toEqual(['line-1', 'line-2', 'line-3'])
    expect(drawOrderIds(project)).toEqual([
      'line:line-1',
      'line:line-3',
      'line:line-2',
      'symbol:symbol-2',
      'symbol:symbol-1',
    ])
  })

  it('moves a conductor in front of a same-layer symbol', () => {
    const project = createProjectWithLines(['line-1'])
    project.elements.symbols.push({
      id: 'symbol-1',
      symbolType: 'air_terminal',
      position: { x: 10, y: 10 },
      color: 'green',
      class: 'class1',
    })

    expect(drawOrderIds(project)).toEqual(['line:line-1', 'symbol:symbol-1'])
    expect(canMoveSelectionsByZStep(project, [{ kind: 'line', id: 'line-1' }], 'front')).toBe(true)

    const moved = moveSelectionsByZStep(project, [{ kind: 'line', id: 'line-1' }], 'front')

    expect(moved).toBe(true)
    expect(drawOrderIds(project)).toEqual(['symbol:symbol-1', 'line:line-1'])
  })

  it('does not move entries across layer boundaries', () => {
    const project = createDefaultProject('Layer Scoped Z-Order Test')
    project.elements.lines = [
      {
        id: 'rooftop-line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'grounding-line',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        color: 'red',
        class: 'class1',
      },
    ]

    expect(drawOrderIds(project)).toEqual(['line:rooftop-line', 'line:grounding-line'])
    expect(canMoveSelectionsByZStep(project, [{ kind: 'line', id: 'rooftop-line' }], 'front')).toBe(false)

    const moved = moveSelectionsByZStep(project, [{ kind: 'line', id: 'rooftop-line' }], 'front')

    expect(moved).toBe(false)
    expect(drawOrderIds(project)).toEqual(['line:rooftop-line', 'line:grounding-line'])
  })

  it('reports can-move only when at least one selected entry has an overlapping target', () => {
    const project = createProjectWithPositionedLines([
      { id: 'line-1', start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
      { id: 'line-2', start: { x: 10, y: -10 }, end: { x: 10, y: 10 } },
      { id: 'line-3', start: { x: 100, y: 0 }, end: { x: 120, y: 0 } },
      { id: 'line-4', start: { x: 110, y: -10 }, end: { x: 110, y: 10 } },
    ])

    expect(canMoveSelectionsByZStep(project, [{ kind: 'line', id: 'line-2' }], 'front')).toBe(false)
    expect(canMoveSelectionsByZStep(project, [{ kind: 'line', id: 'line-1' }], 'back')).toBe(false)
    expect(
      canMoveSelectionsByZStep(
        project,
        [
          { kind: 'line', id: 'line-2' },
          { kind: 'line', id: 'line-3' },
        ],
        'front',
      ),
    ).toBe(true)
  })

  it('returns false and leaves order unchanged when no selected entries overlap a target', () => {
    const project = createProjectWithPositionedLines([
      { id: 'line-1', start: { x: 0, y: 0 }, end: { x: 20, y: 0 } },
      { id: 'line-2', start: { x: 100, y: 0 }, end: { x: 120, y: 0 } },
    ])

    const moved = moveSelectionsByZStep(project, [{ kind: 'line', id: 'line-1' }], 'front')
    expect(moved).toBe(false)
    expect(drawOrderIds(project)).toEqual(['line:line-1', 'line:line-2'])
  })
})
