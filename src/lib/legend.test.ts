import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { buildLegendItemsFromSymbols, legendItemKey } from './legend'

describe('legend utilities', () => {
  it('returns empty items when no symbols exist', () => {
    const project = createDefaultProject()

    const items = buildLegendItemsFromSymbols(project)

    expect(items).toEqual([])
  })

  it('aggregates by symbol type + letter + color + class with counts', () => {
    const project = createDefaultProject()

    project.elements.symbols.push(
      {
        id: 'symbol-1',
        symbolType: 'air_terminal',
        position: { x: 1, y: 1 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'symbol-2',
        symbolType: 'air_terminal',
        position: { x: 2, y: 2 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'symbol-3',
        symbolType: 'air_terminal',
        position: { x: 3, y: 3 },
        color: 'red',
        class: 'class1',
      },
      {
        id: 'symbol-4',
        symbolType: 'bond',
        position: { x: 4, y: 4 },
        color: 'red',
        class: 'none',
      },
    )

    const items = buildLegendItemsFromSymbols(project)

    const greenAir = items.find(
      (item) =>
        item.symbolType === 'air_terminal' &&
        item.color === 'green' &&
        item.class === 'class1',
    )
    const redAir = items.find(
      (item) =>
        item.symbolType === 'air_terminal' &&
        item.color === 'red' &&
        item.class === 'class1',
    )
    const redBond = items.find(
      (item) =>
        item.symbolType === 'bond' && item.color === 'red' && item.class === 'none',
    )

    expect(greenAir?.count).toBe(2)
    expect(redAir?.count).toBe(1)
    expect(redBond?.count).toBe(1)
    expect(greenAir?.label).toBe('Air terminal')
    expect(redBond?.label).toBe('Bond')
  })

  it('treats lettered air terminals as distinct legend rows', () => {
    const project = createDefaultProject()
    project.elements.symbols.push(
      {
        id: 'symbol-a1',
        symbolType: 'air_terminal',
        letter: 'A',
        position: { x: 0, y: 0 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'symbol-a2',
        symbolType: 'air_terminal',
        letter: 'A',
        position: { x: 10, y: 10 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'symbol-b1',
        symbolType: 'air_terminal',
        letter: 'B',
        position: { x: 20, y: 20 },
        color: 'green',
        class: 'class1',
      },
    )

    const items = buildLegendItemsFromSymbols(project)
    const aRow = items.find((item) => item.letter === 'A')
    const bRow = items.find((item) => item.letter === 'B')

    expect(aRow?.count).toBe(2)
    expect(bRow?.count).toBe(1)
  })

  it('creates stable keys for editable label mapping', () => {
    const key = legendItemKey({
      symbolType: 'ground_rod',
      color: 'blue',
      class: 'none',
      label: 'Ground rod',
      count: 2,
    })

    expect(key).toBe('ground_rod|blue|none|')
  })

  it('excludes annotation-only continued symbols from legend items', () => {
    const project = createDefaultProject()
    project.elements.symbols.push(
      {
        id: 'continued-1',
        symbolType: 'continued',
        position: { x: 10, y: 10 },
        color: 'green',
        class: 'none',
      },
      {
        id: 'bond-1',
        symbolType: 'bond',
        position: { x: 20, y: 20 },
        color: 'green',
        class: 'none',
      },
    )

    const items = buildLegendItemsFromSymbols(project)

    expect(items).toHaveLength(1)
    expect(items[0].symbolType).toBe('bond')
  })
})
