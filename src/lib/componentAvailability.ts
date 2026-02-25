import type { LpProject, MaterialColor, SymbolType, Tool } from '../types/project'

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
  blue: ['cadweld_connection', 'cadweld_crossrun_connection', 'ground_rod'],
  purple: [
    'air_terminal',
    'bonded_air_terminal',
    'steel_bond',
    'ground_rod',
    'cadweld_connection',
    'cadweld_crossrun_connection',
  ],
  red: ['air_terminal', 'bonded_air_terminal'],
}

const SCALE_REQUIRED_TOOLS = new Set<Tool>([
  'linear_auto_spacing',
  'arc_auto_spacing',
  'measure',
  'measure_mark',
  'dimension_text',
])

const DISABLE_REASON = {
  material: 'Unavailable for selected material.',
  scale: 'Set drawing scale first.',
} as const

type ScaleAvailabilityProject = {
  scale: Pick<LpProject['scale'], 'isSet' | 'realUnitsPerPoint'>
}

export function isToolDisabledForMaterial(tool: Tool, material: MaterialColor): boolean {
  return DISABLED_TOOLS_BY_MATERIAL[material]?.includes(tool) ?? false
}

export function isSymbolDisabledForMaterial(symbolType: SymbolType, material: MaterialColor): boolean {
  return DISABLED_SYMBOLS_BY_MATERIAL[material]?.includes(symbolType) ?? false
}

export function toolDisabledReasons(
  tool: Tool,
  project: ScaleAvailabilityProject,
  material: MaterialColor,
): string[] {
  const reasons: string[] = []
  if (isToolDisabledForMaterial(tool, material)) {
    reasons.push(DISABLE_REASON.material)
  }
  if (SCALE_REQUIRED_TOOLS.has(tool) && (!project.scale.isSet || !project.scale.realUnitsPerPoint)) {
    reasons.push(DISABLE_REASON.scale)
  }
  return reasons
}

export function symbolDisabledReasons(symbolType: SymbolType, material: MaterialColor): string[] {
  const reasons: string[] = []
  if (isSymbolDisabledForMaterial(symbolType, material)) {
    reasons.push(DISABLE_REASON.material)
  }
  return reasons
}

export function formatDisabledTooltip(baseTitle: string, reasons: readonly string[]): string {
  if (reasons.length === 0) {
    return baseTitle
  }

  return `${baseTitle} (Disabled: ${reasons.join(' ')})`
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

export function isToolSelectionAllowed(
  tool: Tool,
  activeSymbol: SymbolType,
  project: ScaleAvailabilityProject,
  material: MaterialColor,
): boolean {
  if (tool === 'symbol') {
    return symbolDisabledReasons(activeSymbol, material).length === 0
  }

  return toolDisabledReasons(tool, project, material).length === 0
}
