import { describe, expect, it } from 'vitest'
import type { SymbolType, Tool } from '../types/project'
import {
  SYMBOL_BUTTON_ICON,
  SYMBOL_CLASS2_CUSTOM_ICON,
  TOOL_CUSTOM_ICON,
  TOOL_ICON,
  tablerIconClass,
} from './iconRegistry'

const TOOL_IDS: Tool[] = [
  'select',
  'multi_select',
  'line',
  'arc',
  'curve',
  'linear_auto_spacing',
  'arc_auto_spacing',
  'symbol',
  'legend',
  'text',
  'dimension_text',
  'arrow',
  'pan',
  'calibrate',
  'measure',
  'measure_mark',
]

const SYMBOL_TYPES: SymbolType[] = [
  'air_terminal',
  'bonded_air_terminal',
  'bond',
  'cadweld_connection',
  'continued',
  'connect_existing',
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
  'through_roof_to_steel',
  'through_wall_connector',
  'ground_rod',
  'steel_bond',
  'cable_to_cable_connection',
]

describe('icon registry coverage', () => {
  it('maps every tool id to a base icon class', () => {
    for (const toolId of TOOL_IDS) {
      const icon = TOOL_ICON[toolId]
      expect(icon).toBeTruthy()
      expect(tablerIconClass(icon)).toMatch(/^ti ti-/)
    }
  })

  it('maps every symbol button to a base icon class', () => {
    for (const symbolType of SYMBOL_TYPES) {
      const icon = SYMBOL_BUTTON_ICON[symbolType]
      expect(icon).toBeTruthy()
      expect(tablerIconClass(icon)).toMatch(/^ti ti-/)
    }
  })

  it('keeps approved custom overrides for phase-1 icon gaps', () => {
    expect(TOOL_CUSTOM_ICON.arc_auto_spacing).toBe('at-arc')
    expect(TOOL_CUSTOM_ICON.multi_select).toBe('multi-select-hand-plus')
    expect(SYMBOL_CLASS2_CUSTOM_ICON.steel_bond).toBe('steel-bond-filled')
  })

  it('uses hand-finger base glyph for select mode', () => {
    expect(TOOL_ICON.select).toBe('hand-finger')
  })
})
