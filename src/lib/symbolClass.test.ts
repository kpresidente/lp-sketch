import { describe, expect, it } from 'vitest'
import {
  groundRodClassLabel,
  hasBothGroundRodClasses,
  resolvedSymbolClass,
} from './symbolClass'

describe('symbol class helpers', () => {
  it('resolves none class to class1 for classed symbols', () => {
    expect(
      resolvedSymbolClass({ symbolType: 'air_terminal', class: 'none' }),
    ).toBe('class1')
  })

  it('preserves none class for class-optional symbols', () => {
    expect(
      resolvedSymbolClass({ symbolType: 'continued', class: 'none' }),
    ).toBe('none')
  })

  it('detects when both ground rod classes are present', () => {
    expect(
      hasBothGroundRodClasses([
        { symbolType: 'ground_rod', class: 'class1' },
        { symbolType: 'ground_rod', class: 'class2' },
      ]),
    ).toBe(true)
    expect(
      hasBothGroundRodClasses([
        { symbolType: 'ground_rod', class: 'class1' },
        { symbolType: 'air_terminal', class: 'class2' },
      ]),
    ).toBe(false)
  })

  it('provides 1/2 labels for ground rods based on class', () => {
    expect(groundRodClassLabel({ symbolType: 'ground_rod', class: 'class1' })).toBe('1')
    expect(groundRodClassLabel({ symbolType: 'ground_rod', class: 'class2' })).toBe('2')
    expect(groundRodClassLabel({ symbolType: 'air_terminal', class: 'class1' })).toBeNull()
  })
})
