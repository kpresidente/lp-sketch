import {
  angleDegrees,
  distance,
  snapAngleDegrees,
} from '../geometry'
import { polylineLength } from '../spacing'
import type {
  TargetDistanceSnapLock,
} from '../../types/appRuntime'
import type { Point, Tool } from '../../types/project'
import type {
  ResolveInputPointContext,
  ResolveInputPointResult,
  ResolveInputPointOptions,
  SnapReferenceState,
} from './types'
import { fixedAnchorForSelectHandleDrag } from '../selection/selectionHandles'

function applyLineAngleConstraint(
  start: Point,
  end: Point,
  options: { angleSnapEnabled: boolean; angleIncrementDeg: number },
): Point {
  if (!options.angleSnapEnabled) {
    return end
  }

  const originalLength = distance(start, end)

  if (originalLength === 0) {
    return end
  }

  const snappedAngle = snapAngleDegrees(
    angleDegrees(start, end),
    options.angleIncrementDeg,
  )
  const radians = (snappedAngle * Math.PI) / 180

  return {
    x: start.x + Math.cos(radians) * originalLength,
    y: start.y + Math.sin(radians) * originalLength,
  }
}

function geometricSnapsEnabledForEvent(
  event: { shiftKey: boolean },
  snapEnabled: boolean,
): boolean {
  return snapEnabled && !event.shiftKey
}

function angleSnapEnabledForEvent(
  event: { ctrlKey: boolean },
  angleSnapEnabled: boolean,
): boolean {
  return angleSnapEnabled && !event.ctrlKey
}

export function snapReferencePointForTool(
  activeTool: Tool,
  state: SnapReferenceState,
  options: ResolveInputPointOptions = {},
): Point | null {
  if (activeTool === 'line') {
    return state.lineStart
  }

  if (activeTool === 'dimension_text') {
    return state.dimensionEnd ?? state.dimensionStart
  }

  if (activeTool === 'measure') {
    return state.measurePoints.length > 0
      ? state.measurePoints[state.measurePoints.length - 1]
      : null
  }

  if (activeTool === 'measure_mark') {
    return state.markCorners.length > 0
      ? state.markCorners[state.markCorners.length - 1]
      : state.markAnchor
  }

  if (activeTool === 'linear_auto_spacing') {
    return state.linearAutoSpacingVertices.length > 0
      ? state.linearAutoSpacingVertices[state.linearAutoSpacingVertices.length - 1]
      : null
  }

  if (activeTool === 'arrow') {
    return state.arrowStart
  }

  if (activeTool === 'select') {
    return fixedAnchorForSelectHandleDrag(options.selectDragState)
  }

  return null
}

function targetDistancePathForTool(activeTool: Tool, state: SnapReferenceState): Point[] | null {
  if (activeTool === 'measure') {
    return state.measurePoints.length > 0 ? state.measurePoints : null
  }

  if (activeTool === 'measure_mark') {
    if (!state.markAnchor) {
      return null
    }

    return [state.markAnchor, ...state.markCorners]
  }

  return null
}

function resolveTargetDistanceSnap(
  activeTool: Tool,
  candidatePoint: Point,
  context: ResolveInputPointContext,
  currentLock: TargetDistanceSnapLock | null,
): { point: Point; snapped: boolean; targetDistanceSnapLock: TargetDistanceSnapLock | null } {
  if (activeTool !== 'measure' && activeTool !== 'measure_mark') {
    return { point: candidatePoint, snapped: false, targetDistanceSnapLock: null }
  }

  const targetDistanceFt = context.measureTargetDistanceFt
  const path = targetDistancePathForTool(activeTool, context.snapReferenceState)

  if (
    !targetDistanceFt ||
    !context.scale.isSet ||
    !context.scale.realUnitsPerPoint ||
    !path ||
    path.length === 0
  ) {
    return { point: candidatePoint, snapped: false, targetDistanceSnapLock: null }
  }

  const start = path[path.length - 1]
  const segmentLength = distance(start, candidatePoint)

  if (segmentLength <= 0.0001) {
    return { point: candidatePoint, snapped: false, targetDistanceSnapLock: null }
  }

  const targetDistancePt = targetDistanceFt / context.scale.realUnitsPerPoint
  if (!Number.isFinite(targetDistancePt) || targetDistancePt <= 0) {
    return { point: candidatePoint, snapped: false, targetDistanceSnapLock: null }
  }

  const baseLengthPt = polylineLength(path)
  const candidateLengthPt = baseLengthPt + segmentLength
  const targetMultiple = Math.max(1, Math.round(candidateLengthPt / targetDistancePt))
  const snappedDistancePt = targetMultiple * targetDistancePt
  const distanceToTargetPt = Math.abs(candidateLengthPt - snappedDistancePt)
  const zoom = Math.max(0.01, context.view.zoom)
  const snapToleranceDoc = context.targetDistanceSnapTolerancePx / zoom
  const releaseToleranceDoc = context.targetDistanceSnapReleasePx / zoom

  if (
    currentLock &&
    currentLock.tool === activeTool &&
    Math.abs(currentLock.targetDistanceFt - targetDistanceFt) < 0.0001 &&
    Math.abs(currentLock.snappedDistancePt - snappedDistancePt) < 0.01
  ) {
    const lockAgeMs = context.nowMs() - currentLock.acquiredAtMs
    const movedFromLock = distance(candidatePoint, currentLock.point)
    if (
      movedFromLock <= releaseToleranceDoc &&
      (
        lockAgeMs <= context.targetDistanceSnapHoldMs ||
        distanceToTargetPt <= snapToleranceDoc
      )
    ) {
      return { point: currentLock.point, snapped: true, targetDistanceSnapLock: currentLock }
    }
  }

  if (distanceToTargetPt > snapToleranceDoc) {
    return { point: candidatePoint, snapped: false, targetDistanceSnapLock: null }
  }

  const snappedSegmentDistancePt = snappedDistancePt - baseLengthPt
  if (snappedSegmentDistancePt < 0 || snappedSegmentDistancePt > segmentLength + 0.001) {
    return { point: candidatePoint, snapped: false, targetDistanceSnapLock: null }
  }

  const t = snappedSegmentDistancePt / segmentLength
  const snappedPoint = {
    x: start.x + (candidatePoint.x - start.x) * t,
    y: start.y + (candidatePoint.y - start.y) * t,
  }

  const nextLock: TargetDistanceSnapLock = {
    tool: activeTool,
    point: snappedPoint,
    snappedDistancePt,
    targetDistanceFt,
    acquiredAtMs: context.nowMs(),
  }

  return {
    point: snappedPoint,
    snapped: true,
    targetDistanceSnapLock: nextLock,
  }
}

function snapPreviewFromResolution(
  canShowPreview: boolean,
  snapResolution: ResolveInputPointContext['snapResolution'],
) {
  return canShowPreview && snapResolution?.snapped && snapResolution.kind
    ? {
        point: snapResolution.point,
        kind: snapResolution.kind,
      }
    : null
}

export function resolveInputPoint(context: ResolveInputPointContext): ResolveInputPointResult {
  const activeTool = context.activeTool
  const selectDragState = context.options?.selectDragState
  const snapReferencePoint = context.options?.snapReferencePoint ??
    snapReferencePointForTool(activeTool, context.snapReferenceState, {
      selectDragState,
    })
  const canApplyGeometricSnaps = geometricSnapsEnabledForEvent(context.event, context.settings.snapEnabled)
  const canShowPreview = canApplyGeometricSnaps && context.event.pointerType !== 'touch'
  let nextTargetDistanceSnapLock = canApplyGeometricSnaps ? context.targetDistanceSnapLock : null
  const unconstrained = canApplyGeometricSnaps
    ? (
      context.snapResolution?.point ??
      context.resolveSnapPoint(context.rawPoint, { referencePoint: snapReferencePoint }).point
    )
    : context.rawPoint

  if (activeTool === 'line') {
    const start = context.snapReferenceState.lineStart
    if (start && angleSnapEnabledForEvent(context.event, context.settings.angleSnapEnabled)) {
      return {
        point: applyLineAngleConstraint(start, unconstrained, context.settings),
        preview: snapPreviewFromResolution(canShowPreview, context.snapResolution),
        targetDistanceSnapLock: nextTargetDistanceSnapLock,
      }
    }
  }

  if (activeTool === 'dimension_text') {
    const start = context.snapReferenceState.dimensionStart
    const end = context.snapReferenceState.dimensionEnd
    if (start && !end && angleSnapEnabledForEvent(context.event, context.settings.angleSnapEnabled)) {
      return {
        point: applyLineAngleConstraint(start, unconstrained, context.settings),
        preview: snapPreviewFromResolution(canShowPreview, context.snapResolution),
        targetDistanceSnapLock: nextTargetDistanceSnapLock,
      }
    }
  }

  if (activeTool === 'measure_mark') {
    const corners = context.snapReferenceState.markCorners
    const start = corners.length > 0 ? corners[corners.length - 1] : context.snapReferenceState.markAnchor
    if (start && angleSnapEnabledForEvent(context.event, context.settings.angleSnapEnabled)) {
      const angledPoint = applyLineAngleConstraint(start, unconstrained, context.settings)
      const targetSnap = canApplyGeometricSnaps
        ? resolveTargetDistanceSnap(activeTool, angledPoint, context, nextTargetDistanceSnapLock)
        : { point: angledPoint, snapped: false, targetDistanceSnapLock: null }
      nextTargetDistanceSnapLock = targetSnap.targetDistanceSnapLock
      return {
        point: targetSnap.point,
        preview:
          canShowPreview && targetSnap.snapped
            ? {
                point: targetSnap.point,
                kind: 'mark',
              }
            : snapPreviewFromResolution(canShowPreview, context.snapResolution),
        targetDistanceSnapLock: nextTargetDistanceSnapLock,
      }
    }
  }

  if (activeTool === 'linear_auto_spacing') {
    const vertices = context.snapReferenceState.linearAutoSpacingVertices
    const start = vertices.length > 0 ? vertices[vertices.length - 1] : null
    if (start && angleSnapEnabledForEvent(context.event, context.settings.angleSnapEnabled)) {
      return {
        point: applyLineAngleConstraint(start, unconstrained, context.settings),
        preview: snapPreviewFromResolution(canShowPreview, context.snapResolution),
        targetDistanceSnapLock: nextTargetDistanceSnapLock,
      }
    }
  }

  if (activeTool === 'arrow') {
    const start = context.snapReferenceState.arrowStart
    if (start && angleSnapEnabledForEvent(context.event, context.settings.angleSnapEnabled)) {
      return {
        point: applyLineAngleConstraint(start, unconstrained, context.settings),
        preview: snapPreviewFromResolution(canShowPreview, context.snapResolution),
        targetDistanceSnapLock: nextTargetDistanceSnapLock,
      }
    }
  }

  if (activeTool === 'symbol') {
    const start = context.symbolDirectionStart
    if (start && angleSnapEnabledForEvent(context.event, context.settings.angleSnapEnabled)) {
      return {
        point: applyLineAngleConstraint(start, unconstrained, context.settings),
        preview: snapPreviewFromResolution(canShowPreview, context.snapResolution),
        targetDistanceSnapLock: nextTargetDistanceSnapLock,
      }
    }
  }

  if (activeTool === 'select') {
    if (selectDragState?.kind === 'edit-handle' && angleSnapEnabledForEvent(context.event, context.settings.angleSnapEnabled)) {
      const fixedAnchor = fixedAnchorForSelectHandleDrag(selectDragState)
      if (fixedAnchor) {
        return {
          point: applyLineAngleConstraint(fixedAnchor, unconstrained, context.settings),
          preview: snapPreviewFromResolution(canShowPreview, context.snapResolution),
          targetDistanceSnapLock: nextTargetDistanceSnapLock,
        }
      }
    }
  }

  const targetSnap = canApplyGeometricSnaps
    ? resolveTargetDistanceSnap(activeTool, unconstrained, context, nextTargetDistanceSnapLock)
    : { point: unconstrained, snapped: false, targetDistanceSnapLock: null }
  nextTargetDistanceSnapLock = targetSnap.targetDistanceSnapLock
  return {
    point: targetSnap.point,
    preview:
      canShowPreview && targetSnap.snapped
        ? {
            point: targetSnap.point,
            kind: 'mark',
          }
        : snapPreviewFromResolution(canShowPreview, context.snapResolution),
    targetDistanceSnapLock: nextTargetDistanceSnapLock,
  }
}
