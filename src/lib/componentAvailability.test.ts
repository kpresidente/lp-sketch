import { describe, expect, it } from 'vitest'
import {
  isSymbolDisabledForMaterial,
  isToolDisabledForMaterial,
  isToolSelectionAllowedForMaterial,
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
    expect(isSymbolDisabledForMaterial('air_terminal', 'purple')).toBe(true)
    expect(isSymbolDisabledForMaterial('bonded_air_terminal', 'purple')).toBe(true)
    expect(isSymbolDisabledForMaterial('steel_bond', 'purple')).toBe(true)
    expect(isSymbolDisabledForMaterial('continued', 'purple')).toBe(true)
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
  })
})
