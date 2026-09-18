import { describe, expect, it } from 'vitest'
import { dimensionDistancePt, dimensionTextLabel, normalizeDimensionOverrideText } from './dimensionText'

describe('dimension text helpers', () => {
  it('computes point distance from start/end coordinates', () => {
    const distance = dimensionDistancePt({
      start: { x: 0, y: 0 },
      end: { x: 3, y: 4 },
    })
    expect(distance).toBe(5)
  })

  it('uses override text when present', () => {
    const label = dimensionTextLabel(
      {
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        overrideText: 'TYP',
      },
      {
        isSet: true,
        method: 'manual',
        realUnitsPerPoint: 2,
        displayUnits: 'decimal-ft',
      },
    )
    expect(label).toBe('TYP')
  })

  it('returns unscaled when drawing scale is not set', () => {
    const label = dimensionTextLabel(
      {
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
      },
      {
        isSet: false,
        method: null,
        realUnitsPerPoint: null,
        displayUnits: null,
      },
    )
    expect(label).toBe('unscaled')
  })

  it('normalizes override text to non-empty max-24 strings', () => {
    expect(normalizeDimensionOverrideText('')).toBeUndefined()
    expect(normalizeDimensionOverrideText('   ')).toBeUndefined()
    expect(normalizeDimensionOverrideText(' abc ')).toBe('abc')
    expect(normalizeDimensionOverrideText('123456789012345678901234567890')).toHaveLength(24)
  })
})
