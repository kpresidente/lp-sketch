import { describe, expect, it } from 'vitest'
import {
  formatDisabledTooltip,
  isToolSelectionAllowed,
  isSymbolDisabledForMaterial,
  isToolDisabledForMaterial,
  isToolSelectionAllowedForMaterial,
  symbolDisabledReasons,
  toolDisabledReasons,
} from './componentAvailability'

describe('component availability by material', () => {
  it('applies tool disable rules', () => {
    expect(isToolDisabledForMaterial('line', 'purple')).toBe(true)
    expect(isToolDisabledForMaterial('arc', 'purple')).toBe(true)
    expect(isToolDisabledForMaterial('curve', 'purple')).toBe(true)
    expect(isToolDisabledForMaterial('linear_auto_spacing', 'purple')).toBe(true)
    expect(isToolDisabledForMaterial('arc_auto_spacing', 'purple')).toBe(true)
    expect(isToolDisabledForMaterial('linear_auto_spacing', 'red')).toBe(true)
    expect(isToolDisabledForMaterial('arc_auto_spacing', 'red')).toBe(true)
    expect(isToolDisabledForMaterial('line', 'red')).toBe(false)
    expect(isToolDisabledForMaterial('line', 'green')).toBe(false)
    expect(isToolDisabledForMaterial('line', 'blue')).toBe(false)
  })

  it('applies symbol disable rules', () => {
    expect(isSymbolDisabledForMaterial('ground_rod', 'green')).toBe(true)
    expect(isSymbolDisabledForMaterial('ground_rod', 'blue')).toBe(true)
    expect(isSymbolDisabledForMaterial('cadweld_connection', 'blue')).toBe(true)
    expect(isSymbolDisabledForMaterial('cadweld_crossrun_connection', 'blue')).toBe(true)
    expect(isSymbolDisabledForMaterial('air_terminal', 'purple')).toBe(true)
    expect(isSymbolDisabledForMaterial('bonded_air_terminal', 'purple')).toBe(true)
    expect(isSymbolDisabledForMaterial('steel_bond', 'purple')).toBe(true)
    expect(isSymbolDisabledForMaterial('cadweld_crossrun_connection', 'purple')).toBe(true)
    expect(isSymbolDisabledForMaterial('continued', 'purple')).toBe(false)
    expect(isSymbolDisabledForMaterial('connect_existing', 'purple')).toBe(false)
    expect(isSymbolDisabledForMaterial('air_terminal', 'red')).toBe(true)
    expect(isSymbolDisabledForMaterial('bonded_air_terminal', 'red')).toBe(true)
    expect(isSymbolDisabledForMaterial('bond', 'red')).toBe(false)
  })

  it('applies combined tool/symbol availability checks', () => {
    expect(isToolSelectionAllowedForMaterial('line', 'air_terminal', 'purple')).toBe(false)
    expect(isToolSelectionAllowedForMaterial('line', 'air_terminal', 'green')).toBe(true)
    expect(isToolSelectionAllowedForMaterial('symbol', 'air_terminal', 'red')).toBe(false)
    expect(isToolSelectionAllowedForMaterial('symbol', 'bond', 'red')).toBe(true)
    expect(isToolSelectionAllowedForMaterial('symbol', 'continued', 'purple')).toBe(true)
  })

  it('includes scale-dependent disable reasons for scale-required tools', () => {
    const unscaledProject = {
      scale: {
        isSet: false,
        realUnitsPerPoint: null,
      },
    } as const
    const scaledProject = {
      scale: {
        isSet: true,
        realUnitsPerPoint: 1,
      },
    } as const

    expect(toolDisabledReasons('measure', unscaledProject, 'green')).toContain('Set drawing scale first.')
    expect(toolDisabledReasons('measure', scaledProject, 'green')).toEqual([])
    expect(toolDisabledReasons('line', unscaledProject, 'green')).toEqual([])
  })

  it('formats disabled tooltip text with reason details', () => {
    expect(formatDisabledTooltip('Measure', ['Set drawing scale first.'])).toBe(
      'Measure (Disabled: Set drawing scale first.)',
    )
    expect(formatDisabledTooltip('Measure', [])).toBe('Measure')
  })

  it('applies combined selection checks including scale requirements', () => {
    const unscaledProject = {
      scale: {
        isSet: false,
        realUnitsPerPoint: null,
      },
    } as const
    const scaledProject = {
      scale: {
        isSet: true,
        realUnitsPerPoint: 1,
      },
    } as const

    expect(isToolSelectionAllowed('measure', 'air_terminal', unscaledProject, 'green')).toBe(false)
    expect(isToolSelectionAllowed('measure', 'air_terminal', scaledProject, 'green')).toBe(true)
    expect(isToolSelectionAllowed('symbol', 'air_terminal', scaledProject, 'red')).toBe(false)
  })

  it('returns material reasons for disabled symbols', () => {
    expect(symbolDisabledReasons('ground_rod', 'green')).toEqual(['Unavailable for selected material.'])
    expect(symbolDisabledReasons('bond', 'green')).toEqual([])
  })
})
