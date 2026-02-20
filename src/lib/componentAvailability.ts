import type { MaterialColor, SymbolType, Tool } from '../types/project'

const DISABLED_TOOLS_BY_MATERIAL: Partial<Record<MaterialColor, readonly Tool[]>> = {
  purple: [
    'line',
    'arc',
    'curve',
    'linear_auto_spacing',
    'arc_auto_spacing',
  ],
  red: [
    'linear_auto_spacing',
    'arc_auto_spacing',
  ],
}

const DISABLED_SYMBOLS_BY_MATERIAL: Partial<Record<MaterialColor, readonly SymbolType[]>> = {
  green: ['ground_rod'],
  blue: ['cadweld_connection', 'ground_rod'],
  purple: [
    'air_terminal',
    'bonded_air_terminal',
    'steel_bond',
    'ground_rod',
    'cadweld_connection',
    'continued',
  ],
  red: ['air_terminal', 'bonded_air_terminal'],
}

export function isToolDisabledForMaterial(tool: Tool, material: MaterialColor): boolean {
  return DISABLED_TOOLS_BY_MATERIAL[material]?.includes(tool) ?? false
}

export function isSymbolDisabledForMaterial(symbolType: SymbolType, material: MaterialColor): boolean {
  return DISABLED_SYMBOLS_BY_MATERIAL[material]?.includes(symbolType) ?? false
}

export function isToolSelectionAllowedForMaterial(
  tool: Tool,
  activeSymbol: SymbolType,
  material: MaterialColor,
): boolean {
  if (tool === 'symbol') {
    return !isSymbolDisabledForMaterial(activeSymbol, material)
  }

  return !isToolDisabledForMaterial(tool, material)
}
