import { approximateLegendLineWidthForScale } from './annotationScale'
import type { LegendDisplayEntry } from './legendDisplay'

export interface LegendBoxMetrics {
  title?: string
  paddingXPx: number
  textOffsetXPx: number
  paddingYPx: number
  titleHeightPx: number
  rowHeightPx: number
}

export function legendLineText(entry: LegendDisplayEntry): string {
  return `${entry.label} ${entry.countLabel}`
}

export function legendBoxSize(
  entries: LegendDisplayEntry[],
  designScale: number,
  legendUi: LegendBoxMetrics,
): { width: number; height: number } {
  const headerDescription = 'Description'
  const headerCount = 'Count'
  const hasEntries = entries.length > 0
  const descriptionLines = hasEntries ? entries.map((entry) => entry.label) : ['No components used yet.']
  const descriptionWidth = descriptionLines.reduce(
    (max, line) => Math.max(max, approximateLegendLineWidthForScale(line, designScale)),
    approximateLegendLineWidthForScale(headerDescription, designScale),
  )
  const countWidth = hasEntries
    ? entries.reduce(
      (max, entry) => Math.max(max, approximateLegendLineWidthForScale(entry.countLabel, designScale)),
      approximateLegendLineWidthForScale(headerCount, designScale),
    )
    : approximateLegendLineWidthForScale('', designScale)

  const width =
    legendUi.paddingXPx * 2 +
    legendUi.textOffsetXPx +
    descriptionWidth +
    12 * designScale +
    Math.max(42 * designScale, countWidth) +
    6 * designScale
  const rowCount = hasEntries ? entries.length + 1 : 1
  const height =
    legendUi.paddingYPx * 2 +
    legendUi.titleHeightPx +
    rowCount * legendUi.rowHeightPx

  return {
    width: Math.max(180 * designScale, width),
    height,
  }
}
