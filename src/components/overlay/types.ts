import type {
  LegendPlacement,
  LpProject,
  Point,
  Selection,
} from '../../types/project'
import type { LegendDisplayEntry } from '../../lib/legendDisplay'
export type { LegendDisplayEntry } from '../../lib/legendDisplay'

export interface SegmentPreview {
  start: Point
  end: Point
}

export interface ArcCurvePreview extends SegmentPreview {
  through: Point
  path: string
}

export interface LegendUiMetrics {
  title: string
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

export type SnapMarkerKind =
  | 'endpoint'
  | 'intersection'
  | 'nearest'
  | 'perpendicular'
  | 'basepoint'
  | 'mark'

export interface SnapPointPreview {
  point: Point
  kind: SnapMarkerKind
}

export type DimensionTextPreview =
  | {
      phase: 'span'
      start: Point
      end: Point
      showLinework: boolean
    }
  | {
      phase: 'placement'
      start: Point
      end: Point
      position: Point
      label: string
      showLinework: boolean
    }

export type SelectionHandlePreview =
  | {
      kind: 'line'
      start: Point
      end: Point
    }
  | {
      kind: 'arrow'
      tail: Point
      head: Point
    }
  | {
      kind: 'arc'
      start: Point
      through: Point
      end: Point
    }
  | {
      kind: 'curve'
      start: Point
      through: Point
      end: Point
    }
  | {
      kind: 'symbol-direction'
      center: Point
      handle: Point
    }

export interface OverlayLayerProps {
  project: LpProject
  annotationScale?: number
  selected: Selection | null
  multiSelectedKeys?: ReadonlySet<string>
  hovered: Selection | null
  legendUi: LegendUiMetrics
  textFontSizePx: number
  textLineHeightPx: number
  approximateTextWidth: (text: string) => number
  legendEntriesForPlacement: (
    items: LpProject['legend']['items'],
    placement: LegendPlacement,
  ) => LegendDisplayEntry[]
  legendBoxSize: (entries: LegendDisplayEntry[]) => { width: number; height: number }
  legendLineText: (entry: LegendDisplayEntry) => string
  measurePathPreview: Point[]
  markPathPreview: Point[]
  linearAutoSpacingPathPreview: Point[]
  linearAutoSpacingVertices: Point[]
  linearAutoSpacingCorners: Array<'outside' | 'inside'>
  arcChordPreview: SegmentPreview | null
  arcCurvePreview: ArcCurvePreview | null
  linePreview: SegmentPreview | null
  dimensionTextPreview: DimensionTextPreview | null
  directionPreview: SegmentPreview | null
  arrowPreview: SegmentPreview | null
  calibrationLinePreview: SegmentPreview | null
  dimensionTextLabel: (entry: LpProject['elements']['dimensionTexts'][number]) => string
  snapPointPreview: SnapPointPreview | null
  selectionHandlePreview: SelectionHandlePreview | null
  selectionDebugLabel?: string | null
}
