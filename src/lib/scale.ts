import type { Point } from '../types/project'
import { distance } from './geometry'

export const MIN_CALIBRATION_SPAN_PT = 0.01

export function calibrationSpanDistancePt(start: Point, end: Point): number {
  return distance(start, end)
}

export function realUnitsPerPointFromCalibrationSpan(
  spanDistancePt: number,
  realDistance: number,
): number {
  if (!Number.isFinite(spanDistancePt) || spanDistancePt <= MIN_CALIBRATION_SPAN_PT) {
    throw new Error('Calibration points must be different.')
  }

  if (!Number.isFinite(realDistance) || realDistance <= 0) {
    throw new Error('Calibration distance must be a positive number.')
  }

  return realDistance / spanDistancePt
}

export function realUnitsPerPointFromCalibration(
  start: Point,
  end: Point,
  realDistance: number,
): number {
  const spanDistancePt = calibrationSpanDistancePt(start, end)
  return realUnitsPerPointFromCalibrationSpan(spanDistancePt, realDistance)
}
