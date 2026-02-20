import type {
  LayerId,
  LpProject,
  MaterialColor,
  SymbolClass,
  SymbolType,
  WireClass,
} from '../types/project'

export const COLOR_HEX: Record<MaterialColor, string> = {
  green: '#2e8b57',
  blue: '#2563eb',
  red: '#DC143C',
  cyan: '#0891b2',
  purple: '#7c3aed',
}

export const SYMBOL_LABELS: Record<SymbolType, string> = {
  air_terminal: 'Air terminal',
  bonded_air_terminal: 'Bonded air terminal',
  bond: 'Bond',
  cadweld_connection: 'Cadweld connection',
  continued: 'Continued',
  connect_existing: 'Connect existing',
  conduit_downlead_ground: 'Conduit downlead to ground',
  conduit_downlead_roof: 'Conduit downlead to roof',
  surface_downlead_ground: 'Surface downlead to ground',
  surface_downlead_roof: 'Surface downlead to roof',
  through_roof_to_steel: 'Through-roof-to-steel',
  through_wall_connector: 'Through-wall connector',
  ground_rod: 'Ground rod',
  steel_bond: 'Steel bond',
  cable_to_cable_connection: 'Mechanical connection',
}

export const DIRECTIONAL_SYMBOLS = new Set<SymbolType>([
  'continued',
  'connect_existing',
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
  'ground_rod',
])

export const DOWNLEAD_SYMBOLS = new Set<SymbolType>([
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
])

export const NO_CLASS_SYMBOLS = new Set<SymbolType>([
  'continued',
  'connect_existing',
])

export const DEFAULT_LAYER_VISIBILITY: Record<LayerId, boolean> = {
  rooftop: true,
  downleads: true,
  grounding: true,
  annotation: true,
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createElementId(prefix: string) {
  return `${prefix}-${createId()}`
}

export function classForSymbol(symbolType: SymbolType, activeClass: WireClass): SymbolClass {
  if (NO_CLASS_SYMBOLS.has(symbolType)) {
    return 'none'
  }

  return activeClass
}

export function colorForSymbol(_symbolType: SymbolType, activeColor: MaterialColor): MaterialColor {
  return activeColor
}

export function createDefaultProject(name = 'Untitled LP Sketch'): LpProject {
  const timestamp = new Date().toISOString()

  return {
    schemaVersion: '1.8.0',
    projectMeta: {
      id: createElementId('project'),
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    pdf: {
      sourceType: 'referenced',
      name: '',
      sha256: '0'.repeat(64),
      page: 1,
      widthPt: 1200,
      heightPt: 900,
      dataBase64: null,
      path: null,
    },
    scale: {
      isSet: false,
      method: null,
      realUnitsPerPoint: null,
      displayUnits: null,
    },
    settings: {
      activeColor: 'green',
      activeClass: 'class1',
      designScale: 'medium',
      pdfBrightness: 1,
      snapEnabled: true,
      autoConnectorsEnabled: true,
      autoConnectorType: 'mechanical',
      angleSnapEnabled: true,
      angleIncrementDeg: 15,
    },
    view: {
      zoom: 1,
      pan: { x: 24, y: 24 },
    },
    layers: { ...DEFAULT_LAYER_VISIBILITY },
    elements: {
      lines: [],
      arcs: [],
      curves: [],
      symbols: [],
      texts: [],
      arrows: [],
      dimensionTexts: [],
    },
    construction: {
      marks: [],
    },
    legend: {
      items: [],
      placements: [],
      customSuffixes: {},
    },
    generalNotes: {
      notes: [],
      placements: [],
    },
  }
}
