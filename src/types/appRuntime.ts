import type {
  LayerId,
  LpProject,
  Point,
  Selection,
} from './project'

export type SelectionHandleTarget =
  | {
      kind: 'line'
      id: string
      role: 'start' | 'end'
    }
  | {
      kind: 'curve'
      id: string
      role: 'start' | 'through' | 'end'
    }
  | {
      kind: 'arrow'
      id: string
      role: 'tail' | 'head'
    }
  | {
      kind: 'arc'
      id: string
      role: 'start' | 'through' | 'end'
    }
  | {
      kind: 'symbol-direction'
      id: string
    }

export type DragState =
  | {
      kind: 'pan'
      pointerId: number
      startScreen: Point
      startPan: Point
    }
  | {
      kind: 'move'
      pointerId: number
      startDoc: Point
      sourceProject: LpProject
      selections: Selection[]
    }
  | {
      kind: 'edit-handle'
      pointerId: number
      startDoc: Point
      sourceProject: LpProject
      selection: Selection
      handle: SelectionHandleTarget
    }

export interface TouchSpacingPending {
  pointerId: number
  tool: 'linear_auto_spacing' | 'measure_mark'
  startScreen: Point
  startResolved: Point
  longPressTriggered: boolean
}

export interface TouchGestureState {
  pointerIds: [number, number]
  startDistance: number
  startDocAtCenter: Point
  startZoom: number
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

export interface SnapResolution {
  point: Point
  snapped: boolean
  kind: SnapMarkerKind | null
}

export interface ResolvedInputPoint {
  point: Point
  preview: SnapPointPreview | null
}

export interface ResolveSnapPointOptions {
  excludeSelection?: Selection | null
  referencePoint?: Point | null
}

export interface AnnotationEditState {
  mode: 'text' | 'arrow' | 'dimension_text'
  id: string
  input: string
  layer: LayerId
  screen: Point
}

export interface TargetDistanceSnapLock {
  tool: 'measure' | 'measure_mark'
  point: Point
  snappedDistancePt: number
  targetDistanceFt: number
  acquiredAtMs: number
}

export interface LegendLabelEditState {
  rows: Array<{
    key: string
    itemName: string
    countLabel: string
    baseLabel: string
  }>
  placementId: string
  inputByKey: Record<string, string>
  screen: Point
}

export interface LegendLabelDialogDragState {
  pointerId: number
  pointerOffset: Point
}

export interface GeneralNotesEditState {
  placementId: string
  notes: string[]
  screen: Point
}

export interface GeneralNotesDialogDragState {
  pointerId: number
  pointerOffset: Point
}
