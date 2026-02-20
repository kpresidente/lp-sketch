import { distance } from '../../lib/geometry'
import type { TouchSpacingPending } from '../../types/appRuntime'
import type { Point } from '../../types/project'

interface BeginTouchSpacingPendingContext {
  event: PointerEvent & { currentTarget: HTMLDivElement }
  currentTool: 'linear_auto_spacing' | 'measure_mark' | string
  resolvedPoint: Point
  touchLongPressMs: number
  screenPointFromPointer: (event: PointerEvent) => Point | null
  clearTouchSpacingPending: () => void
  touchSpacingPending: () => TouchSpacingPending | null
  setTouchSpacingPending: (pending: TouchSpacingPending | null) => void
  setTouchSpacingTimer: (timerId: number | null) => void
  cursorDoc: () => Point | null
  applyLinearAutoSpacingInput: (point: Point, isSecondaryInput: boolean) => void
  applyMeasureMarkInput: (point: Point, isSecondaryInput: boolean) => void
}

export function beginTouchSpacingPendingOnPointerDown(
  context: BeginTouchSpacingPendingContext,
): boolean {
  if (
    context.event.pointerType !== 'touch' ||
    (
      context.currentTool !== 'linear_auto_spacing' &&
      context.currentTool !== 'measure_mark'
    )
  ) {
    return false
  }

  const screenPoint = context.screenPointFromPointer(context.event)
  if (!screenPoint) {
    return true
  }

  context.event.preventDefault()
  if (!context.event.currentTarget.hasPointerCapture(context.event.pointerId)) {
    context.event.currentTarget.setPointerCapture(context.event.pointerId)
  }

  context.clearTouchSpacingPending()
  context.setTouchSpacingPending({
    pointerId: context.event.pointerId,
    tool: context.currentTool,
    startScreen: screenPoint,
    startResolved: context.resolvedPoint,
    longPressTriggered: false,
  })

  const timerId = window.setTimeout(() => {
    context.setTouchSpacingTimer(null)
    const pending = context.touchSpacingPending()
    if (!pending || pending.pointerId !== context.event.pointerId) {
      return
    }

    const longPressPoint = context.cursorDoc() ?? pending.startResolved

    if (pending.tool === 'linear_auto_spacing') {
      context.applyLinearAutoSpacingInput(longPressPoint, true)
    } else {
      context.applyMeasureMarkInput(longPressPoint, true)
    }

    context.setTouchSpacingPending({
      ...pending,
      longPressTriggered: true,
    })
  }, context.touchLongPressMs)

  context.setTouchSpacingTimer(timerId)
  return true
}

interface HandleTouchSpacingPendingMoveContext {
  event: PointerEvent
  touchLongPressMoveTolerancePx: number
  touchSpacingPending: () => TouchSpacingPending | null
  screenPointFromPointer: (event: PointerEvent) => Point | null
  clearTouchSpacingTimer: () => void
}

export function handleTouchSpacingPendingMove(
  context: HandleTouchSpacingPendingMoveContext,
): boolean {
  const pending = context.touchSpacingPending()
  if (!pending || pending.pointerId !== context.event.pointerId) {
    return false
  }

  if (!pending.longPressTriggered) {
    const currentScreen = context.screenPointFromPointer(context.event)
    if (currentScreen) {
      const movement = distance(currentScreen, pending.startScreen)
      if (movement > context.touchLongPressMoveTolerancePx) {
        context.clearTouchSpacingTimer()
      }
    }
  }

  return true
}

interface HandleTouchSpacingPendingUpContext {
  event: PointerEvent & { currentTarget: HTMLDivElement }
  touchSpacingPending: () => TouchSpacingPending | null
  clearTouchSpacingTimer: () => void
  setTouchSpacingPending: (pending: TouchSpacingPending | null) => void
  docPointFromPointer: (event: PointerEvent) => Point | null
  resolveInputPoint: (rawPoint: Point, event: PointerEvent) => { point: Point }
  touchCornerMode: () => 'inside' | 'outside'
  applyLinearAutoSpacingInput: (point: Point, isSecondaryInput: boolean) => void
  applyMeasureMarkInput: (point: Point, isSecondaryInput: boolean) => void
}

export function handleTouchSpacingPendingPointerUp(
  context: HandleTouchSpacingPendingUpContext,
): boolean {
  const pending = context.touchSpacingPending()
  if (!pending || pending.pointerId !== context.event.pointerId) {
    return false
  }

  context.clearTouchSpacingTimer()

  if (context.event.currentTarget.hasPointerCapture(context.event.pointerId)) {
    context.event.currentTarget.releasePointerCapture(context.event.pointerId)
  }

  if (!pending.longPressTriggered) {
    const rawPoint = context.docPointFromPointer(context.event)
    if (rawPoint) {
      const resolvedPoint = context.resolveInputPoint(rawPoint, context.event).point
      const useSecondaryCorner = context.touchCornerMode() === 'inside'

      if (pending.tool === 'linear_auto_spacing') {
        context.applyLinearAutoSpacingInput(resolvedPoint, useSecondaryCorner)
      } else {
        context.applyMeasureMarkInput(resolvedPoint, useSecondaryCorner)
      }
    }
  }

  context.setTouchSpacingPending(null)
  return true
}

interface HandleTouchSpacingPendingCancelContext {
  event: PointerEvent & { currentTarget: HTMLDivElement }
  touchSpacingPending: () => TouchSpacingPending | null
  clearTouchSpacingPending: () => void
}

export function handleTouchSpacingPendingPointerCancel(
  context: HandleTouchSpacingPendingCancelContext,
): boolean {
  const pending = context.touchSpacingPending()
  if (!pending || pending.pointerId !== context.event.pointerId) {
    return false
  }

  context.clearTouchSpacingPending()

  if (context.event.currentTarget.hasPointerCapture(context.event.pointerId)) {
    context.event.currentTarget.releasePointerCapture(context.event.pointerId)
  }
  return true
}
