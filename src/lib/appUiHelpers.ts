import type { Point, ScaleDisplayUnits } from '../types/project'
import { clamp } from './geometry'

export const FLOATING_DIALOG_VIEWPORT_MARGIN_PX = 12

export function normalizePointerEvent<T extends PointerEvent & { currentTarget: HTMLDivElement }>(
  event: T,
): T {
  return event
}

export function formatDistance(distanceValue: number, units: ScaleDisplayUnits): string {
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

export function formatScaleFeet(value: number): string {
  const normalized = value.toFixed(3).replace(/\.?0+$/, '')
  return normalized.length > 0 ? normalized : '0'
}

export function scaleFeetPerInch(realUnitsPerPoint: number, units: ScaleDisplayUnits): number {
  const feetPerPoint =
    units === 'm'
      ? realUnitsPerPoint * 3.280839895
      : realUnitsPerPoint
  return feetPerPoint * 72
}

export function clampPdfBrightness(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.max(0, Math.min(1, value))
}

export function normalizeNonNegativeIntegerInput(value: string): string {
  return value.replace(/[^\d]/g, '')
}

export function normalizeVerticalFootageInput(value: string): string {
  return normalizeNonNegativeIntegerInput(value).slice(0, 3)
}

export function clampDialogPositionToViewport(
  screen: Point,
  width: number,
  height: number,
  viewportMarginPx = FLOATING_DIALOG_VIEWPORT_MARGIN_PX,
): Point {
  const clampedWidth = Math.max(1, width)
  const clampedHeight = Math.max(1, height)
  const maxX = Math.max(
    viewportMarginPx,
    window.innerWidth - clampedWidth - viewportMarginPx,
  )
  const maxY = Math.max(
    viewportMarginPx,
    window.innerHeight - clampedHeight - viewportMarginPx,
  )

  return {
    x: clamp(screen.x, viewportMarginPx, maxX),
    y: clamp(screen.y, viewportMarginPx, maxY),
  }
}
