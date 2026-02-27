import { describe, expect, it } from 'vitest'
import { classForSymbol, colorForSymbol } from './defaultProject'

describe('colorForSymbol', () => {
  it('does not force steel bond to red and uses the active color', () => {
    expect(colorForSymbol('steel_bond', 'blue')).toBe('blue')
    expect(colorForSymbol('steel_bond', 'green')).toBe('green')
  })

  it('treats continued as annotation-styled and material-independent', () => {
    expect(colorForSymbol('continued', 'blue')).toBe('green')
    expect(colorForSymbol('continued', 'purple')).toBe('green')
  })
})

describe('classForSymbol', () => {
  it('keeps cable-to-cable connection class-aware', () => {
    expect(classForSymbol('cable_to_cable_connection', 'class1')).toBe('class1')
    expect(classForSymbol('cable_to_cable_connection', 'class2')).toBe('class2')
    expect(classForSymbol('mechanical_crossrun_connection', 'class1')).toBe('class1')
    expect(classForSymbol('cadweld_crossrun_connection', 'class2')).toBe('class2')
    expect(classForSymbol('connect_existing', 'class1')).toBe('class1')
    expect(classForSymbol('connect_existing', 'class2')).toBe('class2')
  })

  it('keeps classed symbols class-aware', () => {
    expect(classForSymbol('air_terminal', 'class1')).toBe('class1')
    expect(classForSymbol('air_terminal', 'class2')).toBe('class2')
  })
})
