import type {
  DragState,
  ResolveSnapPointOptions,
  ResolvedInputPoint,
  SnapResolution,
  TargetDistanceSnapLock,
} from '../../types/appRuntime'
import type {
  LpProject,
  Point,
  Tool,
} from '../../types/project'

export interface SnapReferenceState {
  lineStart: Point | null
  dimensionStart: Point | null
  dimensionEnd: Point | null
  measurePoints: Point[]
  markAnchor: Point | null
  markCorners: Point[]
  linearAutoSpacingVertices: Point[]
  arrowStart: Point | null
}

export interface InputPointerState {
  shiftKey: boolean
  ctrlKey: boolean
  pointerType: string
}

export interface ResolveInputPointOptions {
  selectDragState?: DragState | null
  snapReferencePoint?: Point | null
}

export interface ResolveInputPointContext {
  rawPoint: Point
  event: InputPointerState
  activeTool: Tool
  settings: LpProject['settings']
  view: LpProject['view']
  scale: LpProject['scale']
  snapReferenceState: SnapReferenceState
  symbolDirectionStart: Point | null
  snapResolution?: SnapResolution | null
  options?: ResolveInputPointOptions
  targetDistanceSnapLock: TargetDistanceSnapLock | null
  measureTargetDistanceFt: number | null
  targetDistanceSnapTolerancePx: number
  targetDistanceSnapReleasePx: number
  targetDistanceSnapHoldMs: number
  nowMs: () => number
  resolveSnapPoint: (rawPoint: Point, options?: ResolveSnapPointOptions) => SnapResolution
}

export interface ResolveInputPointResult extends ResolvedInputPoint {
  targetDistanceSnapLock: TargetDistanceSnapLock | null
}
