import type { Point } from '@lp-sketch/core/types/project'

const PAN_THRESHOLD_PX = 8

/** Tracks an eligible touch; the pen guard and multi-touch controller decide eligibility. */
export function createSingleFingerPan() {
  let gesture: {
    pointerId: number
    startScreen: Point
    startPan: Point
    dragging: boolean
  } | null = null

  return {
    begin(pointerId: number, screenPoint: Point, pan: Point) {
      gesture = { pointerId, startScreen: { ...screenPoint }, startPan: { ...pan }, dragging: false }
    },
    move(pointerId: number, screenPoint: Point): Point | null {
      if (!gesture || gesture.pointerId !== pointerId) return null
      const dx = screenPoint.x - gesture.startScreen.x
      const dy = screenPoint.y - gesture.startScreen.y
      if (!gesture.dragging && Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return null
      gesture.dragging = true
      return { x: gesture.startPan.x + dx, y: gesture.startPan.y + dy }
    },
    clear() {
      gesture = null
    },
  }
}
