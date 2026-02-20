import { clamp, distance } from '../../lib/geometry'
import type { SnapPointPreview, TouchGestureState } from '../../types/appRuntime'
import type { Point, Selection } from '../../types/project'

interface HandleTouchPointerDownForGestureContext {
  event: PointerEvent
  activeTouchPoints: Map<number, Point>
  screenPointFromPointer: (event: PointerEvent) => Point | null
  touchGesture: () => TouchGestureState | null
  beginTouchGestureFromActivePointers: () => boolean
}

export function handleTouchPointerDownForGesture(
  context: HandleTouchPointerDownForGestureContext,
): boolean {
  if (context.event.pointerType !== 'touch') {
    return false
  }

  const touchScreen = context.screenPointFromPointer(context.event)
  if (touchScreen) {
    context.activeTouchPoints.set(context.event.pointerId, touchScreen)
  }

  if (context.touchGesture() || context.activeTouchPoints.size >= 2) {
    if (context.beginTouchGestureFromActivePointers()) {
      context.event.preventDefault()
    }
    return true
  }

  return false
}

interface HandleTouchPointerMoveForGestureContext {
  event: PointerEvent
  activeTouchPoints: Map<number, Point>
  screenPointFromPointer: (event: PointerEvent) => Point | null
  touchGesture: () => TouchGestureState | null
  clearTouchGesture: () => void
  beginTouchGestureFromActivePointers: () => boolean
  updateView: (mutator: (view: { zoom: number; pan: Point }) => { zoom: number; pan: Point }) => void
  setSnapPointPreview: (preview: SnapPointPreview | null) => void
  setHoveredSelection: (selection: Selection | null) => void
}

export function handleTouchPointerMoveForGesture(
  context: HandleTouchPointerMoveForGestureContext,
): boolean {
  if (context.event.pointerType !== 'touch') {
    return false
  }

  context.setSnapPointPreview(null)
  context.setHoveredSelection(null)
  const touchScreen = context.screenPointFromPointer(context.event)
  if (touchScreen) {
    context.activeTouchPoints.set(context.event.pointerId, touchScreen)
  }

  const gesture = context.touchGesture()
  if (gesture) {
    const firstPoint = context.activeTouchPoints.get(gesture.pointerIds[0])
    const secondPoint = context.activeTouchPoints.get(gesture.pointerIds[1])

    if (!firstPoint || !secondPoint) {
      context.clearTouchGesture()
      if (context.activeTouchPoints.size >= 2) {
        context.beginTouchGestureFromActivePointers()
      }
      return true
    }

    const center = {
      x: (firstPoint.x + secondPoint.x) / 2,
      y: (firstPoint.y + secondPoint.y) / 2,
    }
    const nextDistance = Math.max(1, distance(firstPoint, secondPoint))
    const nextZoom = clamp(
      gesture.startZoom * (nextDistance / gesture.startDistance),
      0.25,
      8,
    )

    context.updateView(() => ({
      zoom: nextZoom,
      pan: {
        x: center.x - gesture.startDocAtCenter.x * nextZoom,
        y: center.y - gesture.startDocAtCenter.y * nextZoom,
      },
    }))

    context.event.preventDefault()
    return true
  }

  if (context.activeTouchPoints.size >= 2) {
    if (context.beginTouchGestureFromActivePointers()) {
      context.event.preventDefault()
    }
    return true
  }

  return false
}

interface HandleTouchPointerEndForGestureContext {
  event: PointerEvent
  activeTouchPoints: Map<number, Point>
  touchGesture: () => TouchGestureState | null
  clearTouchGesture: () => void
  beginTouchGestureFromActivePointers: () => boolean
}

export function handleTouchPointerEndForGesture(
  context: HandleTouchPointerEndForGestureContext,
): boolean {
  if (context.event.pointerType !== 'touch') {
    return false
  }

  context.activeTouchPoints.delete(context.event.pointerId)
  const gesture = context.touchGesture()

  if (gesture && gesture.pointerIds.includes(context.event.pointerId)) {
    context.clearTouchGesture()
    if (context.activeTouchPoints.size >= 2) {
      context.beginTouchGestureFromActivePointers()
    }
    return true
  }

  return false
}
