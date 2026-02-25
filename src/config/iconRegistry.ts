import type { SymbolType, Tool } from '../types/project'

export type TablerIconName = string
export type CustomIconName =
  | 'at-arc'
  | 'steel-bond-filled'
  | 'multi-select-hand-plus'
  | 'cadweld-connection'
  | 'mechanical-crossrun-connection'
  | 'cadweld-crossrun-connection'

export function tablerIconClass(icon: TablerIconName): string {
  return `ti ti-${icon}`
}

export const MISC_ICON = {
  appLogo: 'bolt',
  panelChevron: 'chevron-down',
  pdfPlaceholder: 'file-type-pdf',
  scaleBadge: 'ruler-2',
} as const

export const COMMAND_ICON = {
  undo: 'arrow-back-up',
  redo: 'arrow-forward-up',
} as const

export const MISC_FEATURE_ICON = {
  selectedSymbol: 'circle-dashed',
  autoConnectors: 'circles', // fallback: circles-filled is not available in webfont set
  continued: 'ease-in-out',
  connectExisting: 'ease-out-control-point', // fallback: ease-out-control-point-filled is not available
} as const

export const PROJECT_ACTION_ICON = {
  importPdf: 'file-import',
  saveProject: 'device-floppy',
  loadProject: 'folder-open',
  exportPng: 'photo',
  exportJpg: 'photo',
  exportPdf: 'file-type-pdf',
  reportBug: 'bug',
  reportFeature: 'sparkles-2',
} as const

export const TOOL_ICON: Record<Tool, TablerIconName> = {
  select: 'hand-finger',
  multi_select: 'hand-finger',
  line: 'line',
  arc: 'vector-spline',
  curve: 'math-max-min',
  linear_auto_spacing: 'dots',
  arc_auto_spacing: 'circle-dot',
  symbol: 'shapes',
  legend: 'list',
  general_notes: 'notes',
  text: 'typography',
  dimension_text: 'ruler-measure',
  arrow: 'arrow-narrow-right',
  pan: 'hand-stop',
  calibrate: 'compass',
  measure: 'ruler-3',
  measure_mark: 'asterisk',
}

export const TOOL_CUSTOM_ICON: Partial<Record<Tool, CustomIconName>> = {
  arc_auto_spacing: 'at-arc',
  multi_select: 'multi-select-hand-plus',
}

export const SYMBOL_BUTTON_ICON: Record<SymbolType, TablerIconName> = {
  air_terminal: 'circle',
  bonded_air_terminal: 'hexagon',
  bond: 'square-rotated',
  cadweld_connection: 'square',
  cadweld_crossrun_connection: 'squares',
  continued: 'ease-in-out',
  connect_existing: 'ease-out-control-point',
  cable_to_cable_connection: 'point',
  mechanical_crossrun_connection: 'circles-relation',
  conduit_downlead_ground: 'square-chevrons-down',
  conduit_downlead_roof: 'square-chevron-down',
  surface_downlead_ground: 'circle-chevrons-down',
  surface_downlead_roof: 'circle-chevron-down',
  through_roof_to_steel: 'square-asterisk',
  through_wall_connector: 'code-circle',
  ground_rod: 'circuit-ground',
  steel_bond: 'square-rotated-asterisk',
}

export const SYMBOL_CLASS2_CUSTOM_ICON: Partial<Record<SymbolType, CustomIconName>> = {
  steel_bond: 'steel-bond-filled',
}

export const SYMBOL_CUSTOM_ICON: Partial<Record<SymbolType, CustomIconName>> = {
  cadweld_connection: 'cadweld-connection',
  mechanical_crossrun_connection: 'mechanical-crossrun-connection',
  cadweld_crossrun_connection: 'cadweld-crossrun-connection',
}
