import type { SymbolType } from '../types/project'

const LEGEND_SYMBOL_SCALE_FACTOR = 0.58
const LEGEND_GROUND_ROD_SCALE_FACTOR = 0.42
const GROUND_ROD_BASEPOINT_TO_VISUAL_CENTER_PX = 17.5

export function legendSymbolScale(symbolType: SymbolType, annotationScale: number): number {
  const factor =
    symbolType === 'ground_rod'
      ? LEGEND_GROUND_ROD_SCALE_FACTOR
      : LEGEND_SYMBOL_SCALE_FACTOR
  return factor * annotationScale
}

export function legendSymbolCenterOffsetY(symbolType: SymbolType, symbolScale: number): number {
  if (symbolType !== 'ground_rod') {
    return 0
  }

  return -GROUND_ROD_BASEPOINT_TO_VISUAL_CENTER_PX * symbolScale
}
