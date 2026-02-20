import { describe, expect, it } from 'vitest'
import {
  MIN_CALIBRATION_SPAN_PT,
  calibrationSpanDistancePt,
  realUnitsPerPointFromCalibration,
  realUnitsPerPointFromCalibrationSpan,
} from './scale'

describe('scale calibration math', () => {
  it('computes real-units-per-point from a measured span', () => {
    const ratio = realUnitsPerPointFromCalibrationSpan(240, 60)
    expect(ratio).toBeCloseTo(0.25)
  })

  it('computes calibration span distance from two points', () => {
    const span = calibrationSpanDistancePt({ x: 10, y: 10 }, { x: 34, y: 42 })
    expect(span).toBeCloseTo(40)
  })

  it('computes real-units-per-point directly from calibration points', () => {
    const ratio = realUnitsPerPointFromCalibration(
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      25,
    )

    expect(ratio).toBeCloseTo(0.25)
  })

  it('rejects non-positive real-world calibration distance', () => {
    expect(() => realUnitsPerPointFromCalibrationSpan(100, 0)).toThrowError(
      'Calibration distance must be a positive number.',
    )
  })

  it('rejects degenerate calibration spans', () => {
    expect(() =>
      realUnitsPerPointFromCalibrationSpan(MIN_CALIBRATION_SPAN_PT, 10),
    ).toThrowError('Calibration points must be different.')
  })
})
