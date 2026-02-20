import { createEffect, createSignal, type Accessor, type Setter } from 'solid-js'
import { clampDialogPositionToViewport } from '../lib/appUiHelpers'
import { buildLegendDisplayEntries, legendEditorBaseLabel } from '../lib/legendDisplay'
import type { LegendLabelDialogDragState, LegendLabelEditState } from '../types/appRuntime'
import type { LpProject, Point, Selection } from '../types/project'

interface UseLegendLabelDialogOptions {
  project: Accessor<LpProject>
  setSelected: Setter<Selection | null>
  commitProjectChange: (mutator: (draft: LpProject) => void) => void
  setStatus: (message: string) => void
  setError: (message: string) => void
  editDialogScreenFromDocPoint: (point: Point) => Point
  fallbackWidthPx: number
  fallbackHeightPx: number
}

export function useLegendLabelDialog(options: UseLegendLabelDialogOptions) {
  const [legendLabelEdit, setLegendLabelEdit] = createSignal<LegendLabelEditState | null>(null)
  const [legendLabelDialogDrag, setLegendLabelDialogDrag] = createSignal<LegendLabelDialogDragState | null>(null)

  let legendLabelDialogRef: HTMLDivElement | undefined

  function legendLabelDialogDimensions() {
    const width = legendLabelDialogRef?.offsetWidth ?? 0
    const height = legendLabelDialogRef?.offsetHeight ?? 0

    return {
      width: width > 0 ? width : options.fallbackWidthPx,
      height: height > 0 ? height : options.fallbackHeightPx,
    }
  }

  function normalizeLegendLabelDialogScreen(screen: Point): Point {
    const { width, height } = legendLabelDialogDimensions()
    return clampDialogPositionToViewport(screen, width, height)
  }

  function setLegendLabelEditorScreen(screen: Point) {
    setLegendLabelEdit((prev) => {
      if (!prev) {
        return prev
      }

      const normalized = normalizeLegendLabelDialogScreen(screen)
      if (Math.abs(prev.screen.x - normalized.x) < 0.01 && Math.abs(prev.screen.y - normalized.y) < 0.01) {
        return prev
      }

      return {
        ...prev,
        screen: normalized,
      }
    })
  }

  function legendLabelDialogScreenFromDocPoint(point: Point): Point {
    return normalizeLegendLabelDialogScreen(options.editDialogScreenFromDocPoint(point))
  }

  function bindLegendLabelDialogRef(element: HTMLDivElement | undefined, screen: Point) {
    legendLabelDialogRef = element
    setLegendLabelEditorScreen(screen)
  }

  function handleLegendLabelDialogPointerDown(
    event: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    if (event.button !== 0) {
      return
    }

    const editor = legendLabelEdit()
    if (!editor) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setLegendLabelDialogDrag({
      pointerId: event.pointerId,
      pointerOffset: {
        x: event.clientX - editor.screen.x,
        y: event.clientY - editor.screen.y,
      },
    })
  }

  function handleLegendLabelDialogPointerMove(
    event: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    const drag = legendLabelDialogDrag()
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    setLegendLabelEditorScreen({
      x: event.clientX - drag.pointerOffset.x,
      y: event.clientY - drag.pointerOffset.y,
    })
  }

  function handleLegendLabelDialogPointerUp(
    event: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    const drag = legendLabelDialogDrag()
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setLegendLabelDialogDrag(null)
  }

  function editLegendPlacementById(placementId: string) {
    const p = options.project()
    const placement = p.legend.placements.find((entry) => entry.id === placementId)
    if (!placement) {
      return
    }

    const entries = buildLegendDisplayEntries(p, placement)
    if (entries.length === 0) {
      options.setError('Legend has no entries to edit.')
      return
    }

    const inputByKey: Record<string, string> = {}
    for (const entry of entries) {
      inputByKey[entry.key] = placement.editedLabels[entry.key] ?? legendEditorBaseLabel(p, entry)
    }

    setLegendLabelEdit({
      placementId,
      inputByKey,
      screen: legendLabelDialogScreenFromDocPoint(placement.position),
    })
    options.setSelected({ kind: 'legend', id: placementId })
  }

  function setLegendLabelEditorInput(key: string, value: string) {
    setLegendLabelEdit((prev) =>
      prev
        ? {
          ...prev,
          inputByKey: {
            ...prev.inputByKey,
            [key]: value,
          },
        }
        : prev,
    )
  }

  function applyLegendLabelEditor() {
    const editor = legendLabelEdit()
    if (!editor) {
      return
    }

    const p = options.project()
    const placement = p.legend.placements.find((entry) => entry.id === editor.placementId)
    if (!placement) {
      setLegendLabelEdit(null)
      return
    }

    const entries = buildLegendDisplayEntries(p, placement)
    const nextEditedLabels: Record<string, string> = {}
    for (const entry of entries) {
      const baseLabel = legendEditorBaseLabel(p, entry)
      const currentValue = editor.inputByKey[entry.key] ?? baseLabel
      const normalized = currentValue.trim()
      if (normalized.length > 0 && normalized !== baseLabel) {
        nextEditedLabels[entry.key] = normalized
      }
    }

    const previousEditedLabels = placement.editedLabels
    const allKeys = new Set([
      ...Object.keys(previousEditedLabels),
      ...Object.keys(nextEditedLabels),
    ])
    let changed = false
    for (const key of allKeys) {
      if ((previousEditedLabels[key] ?? '') !== (nextEditedLabels[key] ?? '')) {
        changed = true
        break
      }
    }

    if (!changed) {
      setLegendLabelEdit(null)
      return
    }

    options.commitProjectChange((draft) => {
      const target = draft.legend.placements.find((entry) => entry.id === editor.placementId)
      if (!target) {
        return
      }
      target.editedLabels = nextEditedLabels
    })

    setLegendLabelEdit(null)
    options.setSelected({ kind: 'legend', id: editor.placementId })
    options.setStatus('Legend labels updated.')
  }

  function closeLegendLabelDialog() {
    setLegendLabelEdit(null)
  }

  function clearLegendLabelDialogState() {
    setLegendLabelDialogDrag(null)
    setLegendLabelEdit(null)
  }

  function handleLegendLabelViewportResize() {
    const editor = legendLabelEdit()
    if (editor) {
      setLegendLabelEditorScreen(editor.screen)
    }
  }

  createEffect(() => {
    const editor = legendLabelEdit()
    if (!editor) {
      setLegendLabelDialogDrag(null)
      return
    }

    setLegendLabelEditorScreen(editor.screen)
  })

  return {
    legendLabelEdit,
    editLegendPlacementById,
    setLegendLabelEditorInput,
    applyLegendLabelEditor,
    handleLegendLabelDialogPointerDown,
    handleLegendLabelDialogPointerMove,
    handleLegendLabelDialogPointerUp,
    bindLegendLabelDialogRef,
    closeLegendLabelDialog,
    clearLegendLabelDialogState,
    handleLegendLabelViewportResize,
  }
}
