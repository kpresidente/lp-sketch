import { angleDegrees, distance, quadraticControlPointForThrough, quadraticPoint } from '../geometry'
import { DIRECTIONAL_SYMBOLS } from '../../model/defaultProject'
import type { DragState, SelectionHandleTarget } from '../../types/appRuntime'
import type { LpProject, Point, Selection } from '../../types/project'

export function curveThroughPoint(curve: LpProject['elements']['curves'][number]): Point {
  return quadraticPoint(curve.start, curve.through, curve.end, 0.5)
}

export function directionalSymbolHandlePoint(
  symbol: LpProject['elements']['symbols'][number],
  viewZoom: number,
  directionHandleLengthPx: number,
): Point {
  const lengthDoc = directionHandleLengthPx / Math.max(0.01, viewZoom)
  const radians = ((symbol.directionDeg ?? 0) * Math.PI) / 180
  return {
    x: symbol.position.x + Math.cos(radians) * lengthDoc,
    y: symbol.position.y + Math.sin(radians) * lengthDoc,
  }
}

export function selectionHandlePointForProject(
  project: LpProject,
  handle: SelectionHandleTarget,
  directionHandleLengthPx: number,
): Point | null {
  if (handle.kind === 'line') {
    const line = project.elements.lines.find((entry) => entry.id === handle.id)
    if (!line) {
      return null
    }

    return handle.role === 'start' ? line.start : line.end
  }

  if (handle.kind === 'arrow') {
    const arrow = project.elements.arrows.find((entry) => entry.id === handle.id)
    if (!arrow) {
      return null
    }

    return handle.role === 'tail' ? arrow.tail : arrow.head
  }

  if (handle.kind === 'curve') {
    const curve = project.elements.curves.find((entry) => entry.id === handle.id)
    if (!curve) {
      return null
    }

    if (handle.role === 'start') {
      return curve.start
    }

    if (handle.role === 'end') {
      return curve.end
    }

    return curveThroughPoint(curve)
  }

  if (handle.kind === 'arc') {
    const arc = project.elements.arcs.find((entry) => entry.id === handle.id)
    if (!arc) {
      return null
    }

    if (handle.role === 'start') {
      return arc.start
    }

    if (handle.role === 'end') {
      return arc.end
    }

    return arc.through
  }

  const symbol = project.elements.symbols.find((entry) => entry.id === handle.id)
  if (!symbol || !DIRECTIONAL_SYMBOLS.has(symbol.symbolType)) {
    return null
  }

  return directionalSymbolHandlePoint(
    symbol,
    project.view.zoom,
    directionHandleLengthPx,
  )
}

export function hitTestSelectedHandle(
  point: Point,
  selected: Selection | null,
  project: LpProject,
  options: { selectionHandleHitTolerancePx: number; directionHandleLengthPx: number },
): { selection: Selection; handle: SelectionHandleTarget } | null {
  if (!selected) {
    return null
  }

  const toleranceDoc = options.selectionHandleHitTolerancePx / Math.max(0.01, project.view.zoom)
  let bestHandle: SelectionHandleTarget | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  function evaluateHandle(handle: SelectionHandleTarget, handlePoint: Point) {
    const handleDistance = distance(point, handlePoint)
    if (handleDistance <= toleranceDoc && handleDistance < bestDistance) {
      bestDistance = handleDistance
      bestHandle = handle
    }
  }

  if (selected.kind === 'line') {
    const line = project.elements.lines.find((entry) => entry.id === selected.id)
    if (!line) {
      return null
    }

    evaluateHandle({ kind: 'line', id: line.id, role: 'start' }, line.start)
    evaluateHandle({ kind: 'line', id: line.id, role: 'end' }, line.end)
  } else if (selected.kind === 'curve') {
    const curve = project.elements.curves.find((entry) => entry.id === selected.id)
    if (!curve) {
      return null
    }

    evaluateHandle({ kind: 'curve', id: curve.id, role: 'start' }, curve.start)
    evaluateHandle({ kind: 'curve', id: curve.id, role: 'through' }, curveThroughPoint(curve))
    evaluateHandle({ kind: 'curve', id: curve.id, role: 'end' }, curve.end)
  } else if (selected.kind === 'arc') {
    const arc = project.elements.arcs.find((entry) => entry.id === selected.id)
    if (!arc) {
      return null
    }

    evaluateHandle({ kind: 'arc', id: arc.id, role: 'start' }, arc.start)
    evaluateHandle({ kind: 'arc', id: arc.id, role: 'through' }, arc.through)
    evaluateHandle({ kind: 'arc', id: arc.id, role: 'end' }, arc.end)
  } else if (selected.kind === 'arrow') {
    const arrow = project.elements.arrows.find((entry) => entry.id === selected.id)
    if (!arrow) {
      return null
    }

    evaluateHandle({ kind: 'arrow', id: arrow.id, role: 'tail' }, arrow.tail)
    evaluateHandle({ kind: 'arrow', id: arrow.id, role: 'head' }, arrow.head)
  } else if (selected.kind === 'symbol') {
    const symbol = project.elements.symbols.find((entry) => entry.id === selected.id)
    if (!symbol || !DIRECTIONAL_SYMBOLS.has(symbol.symbolType)) {
      return null
    }

    evaluateHandle(
      { kind: 'symbol-direction', id: symbol.id },
      directionalSymbolHandlePoint(
        symbol,
        project.view.zoom,
        options.directionHandleLengthPx,
      ),
    )
  } else {
    return null
  }

  if (!bestHandle) {
    return null
  }

  return {
    selection: selected,
    handle: bestHandle,
  }
}

export function moveSelectionHandleByDelta(
  draft: LpProject,
  sourceProject: LpProject,
  handle: SelectionHandleTarget,
  delta: Point,
  directionHandleLengthPx: number,
) {
  if (handle.kind === 'line') {
    const sourceLine = sourceProject.elements.lines.find((entry) => entry.id === handle.id)
    const line = draft.elements.lines.find((entry) => entry.id === handle.id)
    if (!sourceLine || !line) {
      return
    }

    if (handle.role === 'start') {
      line.start = {
        x: sourceLine.start.x + delta.x,
        y: sourceLine.start.y + delta.y,
      }
    } else {
      line.end = {
        x: sourceLine.end.x + delta.x,
        y: sourceLine.end.y + delta.y,
      }
    }
    return
  }

  if (handle.kind === 'curve') {
    const sourceCurve = sourceProject.elements.curves.find((entry) => entry.id === handle.id)
    const curve = draft.elements.curves.find((entry) => entry.id === handle.id)
    if (!sourceCurve || !curve) {
      return
    }

    const sourceThroughPoint = curveThroughPoint(sourceCurve)

    if (handle.role === 'start') {
      const nextStart = {
        x: sourceCurve.start.x + delta.x,
        y: sourceCurve.start.y + delta.y,
      }
      curve.start = nextStart
      curve.end = { ...sourceCurve.end }
      curve.through = quadraticControlPointForThrough(nextStart, sourceThroughPoint, sourceCurve.end)
      return
    }

    if (handle.role === 'end') {
      const nextEnd = {
        x: sourceCurve.end.x + delta.x,
        y: sourceCurve.end.y + delta.y,
      }
      curve.start = { ...sourceCurve.start }
      curve.end = nextEnd
      curve.through = quadraticControlPointForThrough(sourceCurve.start, sourceThroughPoint, nextEnd)
      return
    }

    const nextThrough = {
      x: sourceThroughPoint.x + delta.x,
      y: sourceThroughPoint.y + delta.y,
    }
    curve.start = { ...sourceCurve.start }
    curve.end = { ...sourceCurve.end }
    curve.through = quadraticControlPointForThrough(sourceCurve.start, nextThrough, sourceCurve.end)
    return
  }

  if (handle.kind === 'arc') {
    const sourceArc = sourceProject.elements.arcs.find((entry) => entry.id === handle.id)
    const arc = draft.elements.arcs.find((entry) => entry.id === handle.id)
    if (!sourceArc || !arc) {
      return
    }

    if (handle.role === 'start') {
      arc.start = {
        x: sourceArc.start.x + delta.x,
        y: sourceArc.start.y + delta.y,
      }
      arc.end = { ...sourceArc.end }
      arc.through = { ...sourceArc.through }
      return
    }

    if (handle.role === 'end') {
      arc.start = { ...sourceArc.start }
      arc.end = {
        x: sourceArc.end.x + delta.x,
        y: sourceArc.end.y + delta.y,
      }
      arc.through = { ...sourceArc.through }
      return
    }

    arc.start = { ...sourceArc.start }
    arc.end = { ...sourceArc.end }
    arc.through = {
      x: sourceArc.through.x + delta.x,
      y: sourceArc.through.y + delta.y,
    }
    return
  }

  if (handle.kind === 'arrow') {
    const sourceArrow = sourceProject.elements.arrows.find((entry) => entry.id === handle.id)
    const arrow = draft.elements.arrows.find((entry) => entry.id === handle.id)
    if (!sourceArrow || !arrow) {
      return
    }

    if (handle.role === 'tail') {
      arrow.tail = {
        x: sourceArrow.tail.x + delta.x,
        y: sourceArrow.tail.y + delta.y,
      }
      arrow.head = { ...sourceArrow.head }
    } else {
      arrow.tail = { ...sourceArrow.tail }
      arrow.head = {
        x: sourceArrow.head.x + delta.x,
        y: sourceArrow.head.y + delta.y,
      }
    }
    return
  }

  const sourceSymbol = sourceProject.elements.symbols.find((entry) => entry.id === handle.id)
  const symbol = draft.elements.symbols.find((entry) => entry.id === handle.id)
  if (!sourceSymbol || !symbol || !DIRECTIONAL_SYMBOLS.has(sourceSymbol.symbolType)) {
    return
  }

  const sourceHandlePoint = directionalSymbolHandlePoint(
    sourceSymbol,
    sourceProject.view.zoom,
    directionHandleLengthPx,
  )
  const nextDirectionTarget = {
    x: sourceHandlePoint.x + delta.x,
    y: sourceHandlePoint.y + delta.y,
  }
  symbol.directionDeg = angleDegrees(sourceSymbol.position, nextDirectionTarget)
}

export function fixedAnchorForSelectHandleDrag(
  selectDragState: DragState | null | undefined,
): Point | null {
  if (selectDragState?.kind !== 'edit-handle') {
    return null
  }

  if (selectDragState.handle.kind === 'line') {
    const sourceLine = selectDragState.sourceProject.elements.lines.find(
      (entry) => entry.id === selectDragState.handle.id,
    )
    if (!sourceLine) {
      return null
    }

    return selectDragState.handle.role === 'start'
      ? sourceLine.end
      : sourceLine.start
  }

  if (selectDragState.handle.kind === 'arrow') {
    const sourceArrow = selectDragState.sourceProject.elements.arrows.find(
      (entry) => entry.id === selectDragState.handle.id,
    )
    if (!sourceArrow) {
      return null
    }

    return selectDragState.handle.role === 'tail'
      ? sourceArrow.head
      : sourceArrow.tail
  }

  if (selectDragState.handle.kind === 'symbol-direction') {
    const sourceSymbol = selectDragState.sourceProject.elements.symbols.find(
      (entry) => entry.id === selectDragState.handle.id,
    )
    if (!sourceSymbol || !DIRECTIONAL_SYMBOLS.has(sourceSymbol.symbolType)) {
      return null
    }

    return sourceSymbol.position
  }

  return null
}
