import { cloneProject } from '../../lib/projectState'
import { sameSelection, selectionInList } from '../../lib/selection'
import type { DragState, SelectionHandleTarget, SnapPointPreview } from '../../types/appRuntime'
import type { LpProject, Point, Selection, Tool } from '../../types/project'

interface HandleContextSelectionPointerDownContext {
  event: PointerEvent
  currentTool: Tool
  isMeasureMarkSecondary: boolean
  isLinearAutoSpacingSecondary: boolean
  docPointFromPointer: (event: PointerEvent) => Point | null
  hitTest: (point: Point) => Selection | null
  setSnapPointPreview: (preview: SnapPointPreview | null) => void
  setHoveredSelection: (selection: Selection | null) => void
  handleSelectTool: (tool: Tool) => void
  setMultiSelection: (selections: Selection[]) => void
  setSelected: (selection: Selection | null) => void
}

export function handleContextSelectionPointerDown(
  context: HandleContextSelectionPointerDownContext,
): boolean {
  const isContextSelectionInput =
    context.event.button === 2 &&
    !context.isMeasureMarkSecondary &&
    !context.isLinearAutoSpacingSecondary &&
    context.event.pointerType !== 'touch'

  if (!isContextSelectionInput) {
    return false
  }

  const rawPoint = context.docPointFromPointer(context.event)
  if (!rawPoint) {
    return true
  }

  const hit = context.hitTest(rawPoint)
  context.setSnapPointPreview(null)
  context.setHoveredSelection(null)
  if (hit) {
    context.handleSelectTool('select')
  }
  context.setMultiSelection([])
  context.setSelected(hit)
  return true
}

interface HandleSelectPointerDownContext {
  event: PointerEvent & { currentTarget: HTMLDivElement }
  currentTool: Tool
  rawPoint: Point
  project: () => LpProject
  hitTest: (point: Point) => Selection | null
  hitTestSelectedHandle: (
    point: Point,
  ) => { selection: Selection; handle: SelectionHandleTarget } | null
  selectionHandlePointForProject: (
    project: LpProject,
    handle: SelectionHandleTarget,
  ) => Point | null
  multiSelection: () => Selection[]
  setSnapPointPreview: (preview: SnapPointPreview | null) => void
  setHoveredSelection: (selection: Selection | null) => void
  setSelected: (selection: Selection | null) => void
  setDragState: (dragState: DragState | null) => void
  setMultiSelection: (selections: Selection[]) => void
  hitTestArcForAutoSpacing: (point: Point) => LpProject['elements']['arcs'][number] | null
  setArcAutoSpacingTargetId: (id: string | null) => void
  setError: (message: string) => void
  setStatus: (message: string) => void
}

export function handleSelectPointerDown(
  context: HandleSelectPointerDownContext,
): boolean {
  if (context.currentTool === 'select') {
    context.setSnapPointPreview(null)
    context.setHoveredSelection(null)
    const selectPoint = context.rawPoint

    const handleHit = context.hitTestSelectedHandle(selectPoint)
    if (handleHit) {
      const sourceProject = cloneProject(context.project())
      const startDoc =
        context.selectionHandlePointForProject(sourceProject, handleHit.handle) ?? selectPoint

      context.setSelected(handleHit.selection)
      context.event.currentTarget.setPointerCapture(context.event.pointerId)
      context.setDragState({
        kind: 'edit-handle',
        pointerId: context.event.pointerId,
        startDoc,
        sourceProject,
        selection: handleHit.selection,
        handle: handleHit.handle,
      })
      return true
    }

    const hit = context.hitTest(selectPoint)
    context.setSelected(hit)

    if (hit) {
      const sourceProject = cloneProject(context.project())
      context.event.currentTarget.setPointerCapture(context.event.pointerId)
      context.setDragState({
        kind: 'move',
        pointerId: context.event.pointerId,
        startDoc: selectPoint,
        sourceProject,
        selections: [hit],
      })
    }

    return true
  }

  if (context.currentTool === 'multi_select') {
    context.setSnapPointPreview(null)
    context.setHoveredSelection(null)
    const selectPoint = context.rawPoint
    const hit = context.hitTest(selectPoint)
    const currentSelections = context.multiSelection()

    if (!hit) {
      if (currentSelections.length > 0) {
        context.setMultiSelection([])
      }
      return true
    }

    const toggleMode = context.event.ctrlKey || context.event.metaKey
    const isAlreadySelected = selectionInList(currentSelections, hit)

    if (toggleMode) {
      if (isAlreadySelected) {
        context.setMultiSelection(currentSelections.filter((entry) => !sameSelection(entry, hit)))
      } else {
        context.setMultiSelection([...currentSelections, hit])
      }
      return true
    }

    const nextSelections = isAlreadySelected
      ? currentSelections
      : [...currentSelections, hit]
    context.setMultiSelection(nextSelections)

    const sourceProject = cloneProject(context.project())
    context.event.currentTarget.setPointerCapture(context.event.pointerId)
    context.setDragState({
      kind: 'move',
      pointerId: context.event.pointerId,
      startDoc: selectPoint,
      sourceProject,
      selections: nextSelections,
    })
    return true
  }

  if (context.currentTool === 'arc_auto_spacing') {
    context.setSnapPointPreview(null)
    const hitArc = context.hitTestArcForAutoSpacing(context.rawPoint)
    if (!hitArc) {
      context.setHoveredSelection(null)
      context.setError('Click near an arc to select an arc auto-spacing target.')
      return true
    }

    context.setArcAutoSpacingTargetId(hitArc.id)
    context.setHoveredSelection({ kind: 'arc', id: hitArc.id })
    context.setStatus('Arc selected. Click Apply Arc Spacing.')
    return true
  }

  return false
}

interface HandlePointerHoverContext {
  event: PointerEvent
  currentTool: Tool
  rawDoc: Point
  activeDrag: DragState | null
  selected: () => Selection | null
  multiSelection: () => Selection[]
  setCursorDoc: (point: Point | null) => void
  setSnapPointPreview: (preview: SnapPointPreview | null) => void
  setHoveredSelection: (selection: Selection | null) => void
  hitTest: (point: Point) => Selection | null
  hitTestArcForAutoSpacing: (point: Point) => LpProject['elements']['arcs'][number] | null
}

export function handlePointerHover(
  context: HandlePointerHoverContext,
): boolean {
  const isSelectEditDrag =
    context.currentTool === 'select' &&
    !!context.activeDrag &&
    context.activeDrag.pointerId === context.event.pointerId &&
    (context.activeDrag.kind === 'move' || context.activeDrag.kind === 'edit-handle')
  const isSelectPanDrag =
    context.currentTool === 'select' &&
    !!context.activeDrag &&
    context.activeDrag.pointerId === context.event.pointerId &&
    context.activeDrag.kind === 'pan'
  const isMultiMoveDrag =
    context.currentTool === 'multi_select' &&
    !!context.activeDrag &&
    context.activeDrag.pointerId === context.event.pointerId &&
    context.activeDrag.kind === 'move'

  if (context.currentTool === 'select' && !isSelectEditDrag && !isSelectPanDrag) {
    context.setCursorDoc(context.rawDoc)
    context.setSnapPointPreview(null)
    context.setHoveredSelection(
      context.event.pointerType === 'touch' || !!context.selected()
        ? null
        : context.hitTest(context.rawDoc),
    )
    return true
  }

  if (context.currentTool === 'multi_select' && !isMultiMoveDrag) {
    context.setCursorDoc(context.rawDoc)
    context.setSnapPointPreview(null)
    context.setHoveredSelection(
      context.event.pointerType === 'touch' || context.multiSelection().length > 0
        ? null
        : context.hitTest(context.rawDoc),
    )
    return true
  }

  if (context.currentTool === 'arc_auto_spacing') {
    context.setCursorDoc(context.rawDoc)
    context.setSnapPointPreview(null)
    if (context.event.pointerType === 'touch') {
      context.setHoveredSelection(null)
    } else {
      const hitArc = context.hitTestArcForAutoSpacing(context.rawDoc)
      context.setHoveredSelection(hitArc ? { kind: 'arc', id: hitArc.id } : null)
    }
    return true
  }

  if (isSelectPanDrag || isMultiMoveDrag) {
    context.setCursorDoc(context.rawDoc)
    context.setSnapPointPreview(null)
    context.setHoveredSelection(null)
    return true
  }

  return false
}
