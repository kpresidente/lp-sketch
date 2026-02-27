export type MaterialColor = 'green' | 'blue' | 'red' | 'cyan' | 'purple'

export type WireClass = 'class1' | 'class2'

export type SymbolClass = WireClass | 'none'
export type AutoConnectorType = 'mechanical' | 'cadweld'

export type DesignScale = 'small' | 'medium' | 'large'
export type LayerId = 'rooftop' | 'downleads' | 'grounding' | 'annotation'
export type LayerSublayerId = 'connections'

// UI copy uses "component" terminology. Schema keys remain "symbol" for
// backward compatibility with saved project files.
export type SymbolType =
  | 'air_terminal'
  | 'bonded_air_terminal'
  | 'bond'
  | 'cadweld_connection'
  | 'cadweld_crossrun_connection'
  | 'continued'
  | 'connect_existing'
  | 'conduit_downlead_ground'
  | 'conduit_downlead_roof'
  | 'surface_downlead_ground'
  | 'surface_downlead_roof'
  | 'through_roof_to_steel'
  | 'through_wall_connector'
  | 'ground_rod'
  | 'steel_bond'
  | 'cable_to_cable_connection'
  | 'mechanical_crossrun_connection'

export type ScaleDisplayUnits = 'ft-in' | 'decimal-ft' | 'm'
export type DataScope = 'page' | 'global'

export interface Point {
  x: number
  y: number
}

export interface ProjectMeta {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface PdfPageInfo {
  page: number
  widthPt: number
  heightPt: number
}

export interface PdfState {
  sourceType: 'embedded' | 'referenced'
  name: string
  sha256: string
  page: number
  pageCount: number
  pages: PdfPageInfo[]
  widthPt: number
  heightPt: number
  dataBase64: string | null
  path: string | null
}

export interface ScaleState {
  isSet: boolean
  method: 'manual' | 'calibrated' | null
  realUnitsPerPoint: number | null
  displayUnits: ScaleDisplayUnits | null
  byPage: Record<number, {
    isSet: boolean
    method: 'manual' | 'calibrated' | null
    realUnitsPerPoint: number | null
    displayUnits: ScaleDisplayUnits | null
  }>
}

export interface SettingsState {
  activeColor: MaterialColor
  activeClass: WireClass
  designScale: DesignScale
  pdfBrightness: number
  pdfBrightnessByPage: Record<number, number>
  legendDataScope: DataScope
  notesDataScope: DataScope
  snapEnabled: boolean
  autoConnectorsEnabled: boolean
  autoConnectorType: AutoConnectorType
  angleSnapEnabled: boolean
  angleIncrementDeg: 15
}

export interface ViewState {
  currentPage: number
  zoom: number
  pan: Point
  byPage: Record<number, {
    zoom: number
    pan: Point
  }>
}

export interface LineElement {
  id: string
  start: Point
  end: Point
  page?: number
  color: MaterialColor
  class: WireClass
}

export interface ArcElement {
  id: string
  start: Point
  end: Point
  through: Point
  page?: number
  color: MaterialColor
  class: WireClass
}

export interface CurveElement {
  id: string
  start: Point
  end: Point
  through: Point
  page?: number
  color: MaterialColor
  class: WireClass
}

export interface SymbolElement {
  id: string
  symbolType: SymbolType
  position: Point
  page?: number
  directionDeg?: number
  verticalFootageFt?: number
  letter?: string
  autoConnector?: boolean
  color: MaterialColor
  class: SymbolClass
}

// Aliases to reflect current UI terminology while preserving schema names.
export type ComponentType = SymbolType
export type ComponentElement = SymbolElement

export interface TextElement {
  id: string
  position: Point
  text: string
  page?: number
  color: MaterialColor
  layer: LayerId
}

export interface ArrowElement {
  id: string
  tail: Point
  head: Point
  page?: number
  color: MaterialColor
  layer: LayerId
}

export interface DimensionTextElement {
  id: string
  start: Point
  end: Point
  position: Point
  page?: number
  overrideText?: string
  showLinework?: boolean
  layer: LayerId
}

export interface MarkElement {
  id: string
  position: Point
  page?: number
}

export interface LegendItem {
  symbolType: SymbolType
  letter?: string
  color: MaterialColor
  class: SymbolClass
  label: string
  count: number
}

export interface LegendPlacement {
  id: string
  position: Point
  page?: number
  editedLabels: Record<string, string>
}

export interface GeneralNotePlacement {
  id: string
  position: Point
  page?: number
}

export interface LpProject {
  schemaVersion: string
  projectMeta: ProjectMeta
  pdf: PdfState
  scale: ScaleState
  settings: SettingsState
  view: ViewState
  layers: {
    rooftop: boolean
    downleads: boolean
    grounding: boolean
    annotation: boolean
    sublayers: Record<LayerSublayerId, boolean>
  }
  elements: {
    lines: LineElement[]
    arcs: ArcElement[]
    curves: CurveElement[]
    // Legacy persisted key name; represents placed components.
    symbols: SymbolElement[]
    texts: TextElement[]
    arrows: ArrowElement[]
    dimensionTexts: DimensionTextElement[]
  }
  construction: {
    marks: MarkElement[]
  }
  legend: {
    items: LegendItem[]
    placements: LegendPlacement[]
    customSuffixes: Record<string, string>
  }
  generalNotes: {
    notes: string[]
    notesByPage: Record<number, string[]>
    placements: GeneralNotePlacement[]
  }
}

export type Tool =
  | 'select'
  | 'multi_select'
  | 'line'
  | 'arc'
  | 'curve'
  | 'linear_auto_spacing'
  | 'arc_auto_spacing'
  // Legacy tool id kept for save/state compatibility. Represents component placement.
  | 'symbol'
  | 'legend'
  | 'general_notes'
  | 'text'
  | 'dimension_text'
  | 'arrow'
  | 'pan'
  | 'calibrate'
  | 'measure'
  | 'measure_mark'

export type Selection =
  | { kind: 'line'; id: string }
  | { kind: 'arc'; id: string }
  | { kind: 'curve'; id: string }
  | { kind: 'symbol'; id: string }
  | { kind: 'legend'; id: string }
  | { kind: 'general_note'; id: string }
  | { kind: 'text'; id: string }
  | { kind: 'dimension_text'; id: string }
  | { kind: 'arrow'; id: string }
  | { kind: 'mark'; id: string }
