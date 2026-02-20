import type {
  DimensionTextElement,
  ScaleState,
  ScaleDisplayUnits,
  Point,
} from '../types/project'
import { distance } from './geometry'

function formatDistance(distanceValue: number, units: ScaleDisplayUnits): string {
  if (units === 'decimal-ft') {
    return `${distanceValue.toFixed(2)} ft`
  }

  if (units === 'm') {
    return `${distanceValue.toFixed(3)} m`
  }

  const totalInches = Math.max(0, Math.round(distanceValue * 12))
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return `${feet}' ${inches}"`
}

export function dimensionDistancePt(entry: Pick<DimensionTextElement, 'start' | 'end'>): number {
  return distance(entry.start, entry.end)
}

export function normalizeDimensionOverrideText(value: string): string | undefined {
  const normalized = value.trim().slice(0, 24)
  return normalized.length > 0 ? normalized : undefined
}

export function dimensionTextLabel(
  entry: Pick<DimensionTextElement, 'start' | 'end' | 'overrideText'>,
  scale: ScaleState,
): string {
  const override = normalizeDimensionOverrideText(entry.overrideText ?? '')
  if (override) {
    return override
  }

  if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
    return 'unscaled'
  }

  const distancePt = dimensionDistancePt(entry)
  return formatDistance(distancePt * scale.realUnitsPerPoint, scale.displayUnits)
}

export interface DimensionLineworkGeometry {
  extensionStart: Point
  extensionEnd: Point
  barStart: Point
  barEnd: Point
  unitTangent: Point
  unitNormal: Point
  barLengthPt: number
  offsetPt: number
}

export interface DimensionLineSegment {
  start: Point
  end: Point
}

export function dimensionLineworkGeometry(
  entry: Pick<DimensionTextElement, 'start' | 'end' | 'position'>,
  minimumOffsetPt = 10,
): DimensionLineworkGeometry | null {
  const spanDx = entry.end.x - entry.start.x
  const spanDy = entry.end.y - entry.start.y
  const spanLength = Math.hypot(spanDx, spanDy)

  if (!Number.isFinite(spanLength) || spanLength <= 1e-6) {
    return null
  }

  const unitTangent = {
    x: spanDx / spanLength,
    y: spanDy / spanLength,
  }
  const baseNormal = {
    x: -unitTangent.y,
    y: unitTangent.x,
  }
  const midpoint = {
    x: (entry.start.x + entry.end.x) / 2,
    y: (entry.start.y + entry.end.y) / 2,
  }
  const pointerVector = {
    x: entry.position.x - midpoint.x,
    y: entry.position.y - midpoint.y,
  }
  const signedOffset =
    pointerVector.x * baseNormal.x + pointerVector.y * baseNormal.y

  const direction = signedOffset < 0 ? -1 : 1
  const offsetMagnitude = Math.max(
    minimumOffsetPt,
    Math.abs(signedOffset),
  )
  const normal = {
    x: baseNormal.x * direction,
    y: baseNormal.y * direction,
  }

  const barStart = {
    x: entry.start.x + normal.x * offsetMagnitude,
    y: entry.start.y + normal.y * offsetMagnitude,
  }
  const barEnd = {
    x: entry.end.x + normal.x * offsetMagnitude,
    y: entry.end.y + normal.y * offsetMagnitude,
  }

  return {
    extensionStart: { ...entry.start },
    extensionEnd: { ...entry.end },
    barStart,
    barEnd,
    unitTangent,
    unitNormal: normal,
    barLengthPt: spanLength,
    offsetPt: offsetMagnitude,
  }
}

function pointAlongBar(
  geometry: DimensionLineworkGeometry,
  distancePt: number,
): Point {
  return {
    x: geometry.barStart.x + geometry.unitTangent.x * distancePt,
    y: geometry.barStart.y + geometry.unitTangent.y * distancePt,
  }
}

export function dimensionExtensionLineSegments(
  geometry: DimensionLineworkGeometry,
  overshootPt = 0,
): [DimensionLineSegment, DimensionLineSegment] {
  const overshoot = Math.max(0, overshootPt)
  const startTo = {
    x: geometry.barStart.x + geometry.unitNormal.x * overshoot,
    y: geometry.barStart.y + geometry.unitNormal.y * overshoot,
  }
  const endTo = {
    x: geometry.barEnd.x + geometry.unitNormal.x * overshoot,
    y: geometry.barEnd.y + geometry.unitNormal.y * overshoot,
  }

  return [
    {
      start: geometry.extensionStart,
      end: startTo,
    },
    {
      start: geometry.extensionEnd,
      end: endTo,
    },
  ]
}

export function dimensionBarLineSegments(
  geometry: DimensionLineworkGeometry,
  labelPosition: Point,
  labelWidthPt: number,
  labelHeightPt: number,
  gapPaddingPt = 0,
): DimensionLineSegment[] {
  const barLength = Math.max(0, geometry.barLengthPt)
  if (barLength <= 1e-6) {
    return []
  }

  const labelCenter = {
    x: labelPosition.x + labelWidthPt / 2,
    y: labelPosition.y + labelHeightPt / 2,
  }
  const toLabel = {
    x: labelCenter.x - geometry.barStart.x,
    y: labelCenter.y - geometry.barStart.y,
  }
  const along = toLabel.x * geometry.unitTangent.x + toLabel.y * geometry.unitTangent.y
  const normalOffset = toLabel.x * geometry.unitNormal.x + toLabel.y * geometry.unitNormal.y

  // If label is clearly away from the bar, keep a full bar.
  if (Math.abs(normalOffset) > labelHeightPt * 0.9) {
    return [{ start: geometry.barStart, end: geometry.barEnd }]
  }

  // If projected label center is outside bar extent, keep a full bar.
  if (along <= 0 || along >= barLength) {
    return [{ start: geometry.barStart, end: geometry.barEnd }]
  }

  const halfGap = Math.max(0, labelWidthPt / 2 + gapPaddingPt)
  const gapStart = Math.max(0, along - halfGap)
  const gapEnd = Math.min(barLength, along + halfGap)

  if (gapEnd - gapStart < 0.25) {
    return [{ start: geometry.barStart, end: geometry.barEnd }]
  }

  const segments: DimensionLineSegment[] = []
  if (gapStart > 0.25) {
    segments.push({
      start: geometry.barStart,
      end: pointAlongBar(geometry, gapStart),
    })
  }

  if (gapEnd < barLength - 0.25) {
    segments.push({
      start: pointAlongBar(geometry, gapEnd),
      end: geometry.barEnd,
    })
  }

  return segments
}
