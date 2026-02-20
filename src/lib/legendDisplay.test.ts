import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { buildLegendDisplayEntries } from './legendDisplay'

describe('legend display entries', () => {
  it('prepends conductor footage rows and applies edited symbol labels', () => {
    const project = createDefaultProject('Legend Display')
    project.scale = {
      isSet: true,
      method: 'manual',
      realUnitsPerPoint: 0.5,
      displayUnits: 'ft-in',
    }

    project.elements.lines.push({
      id: 'line-1',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      color: 'green',
      class: 'class1',
    })
    project.elements.symbols.push(
      {
        id: 'downlead-1',
        symbolType: 'conduit_downlead_ground',
        position: { x: 40, y: 40 },
        verticalFootageFt: 10,
        color: 'green',
        class: 'class1',
      },
      {
        id: 'at-1',
        symbolType: 'air_terminal',
        position: { x: 80, y: 90 },
        color: 'blue',
        class: 'class1',
      },
    )
    project.legend.items = [
      {
        symbolType: 'air_terminal',
        color: 'blue',
        class: 'class1',
        label: 'Air terminal',
        count: 1,
      },
    ]
    const placement = {
      id: 'legend-1',
      position: { x: 20, y: 20 },
      editedLabels: {
        'conductor|green|class1': 'Roof Conductor Total',
        'air_terminal|blue|class1|': 'Roof Air',
      },
    }

    const entries = buildLegendDisplayEntries(project, placement, project.legend.items)
    expect(entries[0].symbolKind).toBe('conductor')
    expect(entries[0].label).toBe('Roof Conductor Total')
    expect(entries[0].countLabel).toBe('60 ft')

    const symbolEntry = entries.find((entry) => entry.symbolKind === 'component')
    expect(symbolEntry).toBeTruthy()
    expect(symbolEntry?.label).toBe('Roof Air')
    expect(symbolEntry?.countLabel).toBe('1')
  })

  it('uses unscaled when horizontal conductor lengths exist without drawing scale', () => {
    const project = createDefaultProject('Unscaled Legend')
    project.scale = {
      isSet: false,
      method: null,
      realUnitsPerPoint: null,
      displayUnits: null,
    }
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      color: 'green',
      class: 'class1',
    })
    const placement = {
      id: 'legend-1',
      position: { x: 20, y: 20 },
      editedLabels: {},
    }

    const entries = buildLegendDisplayEntries(project, placement, [])
    expect(entries).toHaveLength(1)
    expect(entries[0].label).toBe('Class I Copper conductor footage')
    expect(entries[0].countLabel).toBe('unscaled')
  })

  it('composes symbol labels as system prefix plus optional custom suffix', () => {
    const project = createDefaultProject('Legend Prefix Suffix')
    project.legend.customSuffixes['air_terminal|A'] = 'Roof Edge'
    project.legend.items = [
      {
        symbolType: 'air_terminal',
        letter: 'A',
        color: 'green',
        class: 'class2',
        label: 'Air terminal A',
        count: 3,
      },
    ]
    const placement = {
      id: 'legend-2',
      position: { x: 0, y: 0 },
      editedLabels: {},
    }

    const entries = buildLegendDisplayEntries(project, placement, project.legend.items)
    expect(entries).toHaveLength(1)
    expect(entries[0].label).toBe('Class II Copper Air terminal A Roof Edge')
  })
})
