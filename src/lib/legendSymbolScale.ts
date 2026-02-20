import type { SymbolType } from '../types/project'

const LEGEND_SYMBOL_SCALE_FACTOR = 0.58
const LEGEND_GROUND_ROD_SCALE_FACTOR = 0.28

export function legendSymbolScale(symbolType: SymbolType, annotationScale: number): number {
  const factor =
    symbolType === 'ground_rod'
      ? LEGEND_GROUND_ROD_SCALE_FACTOR
      : LEGEND_SYMBOL_SCALE_FACTOR
  return factor * annotationScale
}
