import { SYMBOL_LABELS } from '../model/defaultProject'
import type { LegendItem, LpProject, MaterialColor, SymbolClass, SymbolType } from '../types/project'

export const MATERIAL_ORDER: MaterialColor[] = ['green', 'blue', 'purple', 'red', 'cyan']
export const MATERIAL_LABEL: Record<MaterialColor, string> = {
  green: 'Copper',
  blue: 'Aluminum',
  red: 'Grounding',
  purple: 'Bimetallic',
  cyan: 'Tinned',
}

export const SYMBOL_SIDEBAR_ORDER: SymbolType[] = [
  'air_terminal',
  'bonded_air_terminal',
  'bond',
  'cable_to_cable_connection',
  'mechanical_crossrun_connection',
  'cadweld_connection',
  'cadweld_crossrun_connection',
  'continued',
  'connect_existing',
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
  'through_roof_to_steel',
  'through_wall_connector',
  'steel_bond',
  'ground_rod',
]

const NON_LEGEND_SYMBOLS = new Set<SymbolType>([
  'continued',
])

const SYMBOL_ORDER_INDEX = new Map(SYMBOL_SIDEBAR_ORDER.map((type, index) => [type, index]))
const MATERIAL_ORDER_INDEX = new Map(MATERIAL_ORDER.map((color, index) => [color, index]))
const CLASS_ORDER_INDEX = new Map<SymbolClass, number>([
  ['class1', 0],
  ['class2', 1],
  ['none', 2],
])

export function legendItemKey(
  item: Pick<LegendItem, 'symbolType' | 'color' | 'class'> & { letter?: string },
): string {
  const letter = typeof item.letter === 'string'
    ? item.letter
    : ''
  return `${item.symbolType}|${item.color}|${item.class}|${letter}`
}

export const DEFAULT_AT_LETTER = 'A'

export const LETTERED_SYMBOL_TYPES = new Set<SymbolType>([
  'air_terminal',
  'bonded_air_terminal',
])

export function defaultAtLetterByMaterial(): Record<MaterialColor, string> {
  return {
    green: DEFAULT_AT_LETTER,
    blue: DEFAULT_AT_LETTER,
    purple: DEFAULT_AT_LETTER,
    red: DEFAULT_AT_LETTER,
    cyan: DEFAULT_AT_LETTER,
  }
}

export function legendSuffixKeyForVariant(symbolType: SymbolType, letter: string): string {
  return `${symbolType}|${letter}`
}

export function normalizeSymbolLetter(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]$/.test(normalized)) {
    return ''
  }
  return normalized
}

function symbolLabelForLegend(symbolType: SymbolType, letter?: string): string {
  const base = SYMBOL_LABELS[symbolType]
  if (!LETTERED_SYMBOL_TYPES.has(symbolType) || !letter) {
    return base
  }
  return `${base} ${letter}`
}

function compareLegendItems(a: LegendItem, b: LegendItem): number {
  const materialOrder =
    (MATERIAL_ORDER_INDEX.get(a.color) ?? MATERIAL_ORDER.length) -
    (MATERIAL_ORDER_INDEX.get(b.color) ?? MATERIAL_ORDER.length)
  if (materialOrder !== 0) {
    return materialOrder
  }

  const symbolOrder =
    (SYMBOL_ORDER_INDEX.get(a.symbolType) ?? Number.POSITIVE_INFINITY) -
    (SYMBOL_ORDER_INDEX.get(b.symbolType) ?? Number.POSITIVE_INFINITY)
  if (symbolOrder !== 0) {
    return symbolOrder
  }

  const classOrder =
    (CLASS_ORDER_INDEX.get(a.class) ?? Number.POSITIVE_INFINITY) -
    (CLASS_ORDER_INDEX.get(b.class) ?? Number.POSITIVE_INFINITY)
  if (classOrder !== 0) {
    return classOrder
  }

  return a.label.localeCompare(b.label)
}

export function sortLegendItems(items: LegendItem[]): LegendItem[] {
  return [...items].sort(compareLegendItems)
}

export function buildLegendItemsFromSymbols(project: LpProject): LegendItem[] {
  const index = new Map<string, LegendItem>()

  for (const symbol of project.elements.symbols) {
    if (NON_LEGEND_SYMBOLS.has(symbol.symbolType)) {
      continue
    }

    const key = legendItemKey(symbol)
    const existing = index.get(key)

    if (existing) {
      existing.count += 1
      continue
    }

    index.set(key, {
      symbolType: symbol.symbolType,
      letter: symbol.letter,
      color: symbol.color,
      class: symbol.class,
      label: symbolLabelForLegend(symbol.symbolType, symbol.letter),
      count: 1,
    })
  }

  return sortLegendItems([...index.values()])
}
