import type { DesignScale, WireClass } from '../types/project'

export const DESIGN_SCALE_FACTORS: Record<DesignScale, number> = {
  small: 1,
  medium: 1.5,
  large: 2,
}

const BASE_TEXT_FONT_SIZE_PX = 14
const BASE_TEXT_LINE_HEIGHT_PX = 16
const BASE_TEXT_CHAR_WIDTH_PX = 7.4

const BASE_LEGEND_TITLE_FONT_SIZE_PX = 13
const BASE_LEGEND_TEXT_FONT_SIZE_PX = 12
const BASE_LEGEND_PADDING_X_PX = 8
const BASE_LEGEND_PADDING_Y_PX = 8
const BASE_LEGEND_TITLE_HEIGHT_PX = 18
const BASE_LEGEND_ROW_HEIGHT_PX = 20
const BASE_LEGEND_SYMBOL_CENTER_X_PX = 12
const BASE_LEGEND_SYMBOL_RADIUS_PX = 5
const BASE_LEGEND_TEXT_OFFSET_X_PX = 30

export interface ScaledLegendMetrics {
  titleFontSizePx: number
  textFontSizePx: number
  paddingXPx: number
  paddingYPx: number
  titleHeightPx: number
  rowHeightPx: number
  symbolCenterXPx: number
  symbolRadiusPx: number
  textOffsetXPx: number
}

export function annotationScaleFactor(designScale: DesignScale | null | undefined): number {
  if (!designScale) {
    return DESIGN_SCALE_FACTORS.small
  }

  return DESIGN_SCALE_FACTORS[designScale] ?? DESIGN_SCALE_FACTORS.small
}

export function textFontSizePxForScale(scale: number): number {
  return BASE_TEXT_FONT_SIZE_PX * scale
}

export function textLineHeightPxForScale(scale: number): number {
  return BASE_TEXT_LINE_HEIGHT_PX * scale
}

export function approximateTextWidthForScale(text: string, scale: number): number {
  const visible = text.trim().length
  const minWidth = 24 * scale
  if (visible === 0) {
    return minWidth
  }

  return Math.max(minWidth, visible * BASE_TEXT_CHAR_WIDTH_PX * scale)
}

export function scaledLegendMetrics(scale: number): ScaledLegendMetrics {
  return {
    titleFontSizePx: BASE_LEGEND_TITLE_FONT_SIZE_PX * scale,
    textFontSizePx: BASE_LEGEND_TEXT_FONT_SIZE_PX * scale,
    paddingXPx: BASE_LEGEND_PADDING_X_PX * scale,
    paddingYPx: BASE_LEGEND_PADDING_Y_PX * scale,
    titleHeightPx: BASE_LEGEND_TITLE_HEIGHT_PX * scale,
    rowHeightPx: BASE_LEGEND_ROW_HEIGHT_PX * scale,
    symbolCenterXPx: BASE_LEGEND_SYMBOL_CENTER_X_PX * scale,
    symbolRadiusPx: BASE_LEGEND_SYMBOL_RADIUS_PX * scale,
    textOffsetXPx: BASE_LEGEND_TEXT_OFFSET_X_PX * scale,
  }
}

export function approximateLegendLineWidthForScale(text: string, scale: number): number {
  return Math.max(64 * scale, text.length * 6.7 * scale)
}

export function wireStrokeWidthForScale(wireClass: WireClass, scale: number): number {
  return (wireClass === 'class1' ? 2 : 3) * scale
}

export function wireDashPatternSvgForScale(
  wireClass: WireClass,
  scale: number,
): string | undefined {
  if (wireClass !== 'class1') {
    return undefined
  }

  return `${8 * scale} ${6 * scale}`
}

export function wireDashPatternCanvasForScale(
  wireClass: WireClass,
  scale: number,
): number[] {
  if (wireClass !== 'class1') {
    return []
  }

  return [8 * scale, 6 * scale]
}
