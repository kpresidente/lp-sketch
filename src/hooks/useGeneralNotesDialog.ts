import { createEffect, createSignal, type Accessor, type Setter } from 'solid-js'
import { clampDialogPositionToViewport } from '../lib/appUiHelpers'
import { normalizeGeneralNoteText, normalizeGeneralNotesList } from '../lib/generalNotes'
import type { GeneralNotesDialogDragState, GeneralNotesEditState } from '../types/appRuntime'
import type { LpProject, Point, Selection } from '../types/project'

interface UseGeneralNotesDialogOptions {
  project: Accessor<LpProject>
  setSelected: Setter<Selection | null>
  commitProjectChange: (mutator: (draft: LpProject) => void) => void
  setStatus: (message: string) => void
  setError: (message: string) => void
  editDialogScreenFromDocPoint: (point: Point) => Point
  fallbackWidthPx: number
  fallbackHeightPx: number
  maxNotes: number
}

export function useGeneralNotesDialog(options: UseGeneralNotesDialogOptions) {
  const [generalNotesEdit, setGeneralNotesEdit] = createSignal<GeneralNotesEditState | null>(null)
  const [generalNotesDialogDrag, setGeneralNotesDialogDrag] = createSignal<GeneralNotesDialogDragState | null>(null)

  let generalNotesDialogRef: HTMLDivElement | undefined

  function generalNotesDialogDimensions() {
    const width = generalNotesDialogRef?.offsetWidth ?? 0
    const height = generalNotesDialogRef?.offsetHeight ?? 0

    return {
      width: width > 0 ? width : options.fallbackWidthPx,
      height: height > 0 ? height : options.fallbackHeightPx,
    }
  }

  function normalizeGeneralNotesDialogScreen(screen: Point): Point {
    const { width, height } = generalNotesDialogDimensions()
    return clampDialogPositionToViewport(screen, width, height)
  }

  function setGeneralNotesEditorScreen(screen: Point) {
    setGeneralNotesEdit((prev) => {
      if (!prev) {
        return prev
      }

      const normalized = normalizeGeneralNotesDialogScreen(screen)
      if (Math.abs(prev.screen.x - normalized.x) < 0.01 && Math.abs(prev.screen.y - normalized.y) < 0.01) {
        return prev
      }

      return {
        ...prev,
        screen: normalized,
      }
    })
  }

  function generalNotesDialogScreenFromDocPoint(point: Point): Point {
    return normalizeGeneralNotesDialogScreen(options.editDialogScreenFromDocPoint(point))
  }

  function bindGeneralNotesDialogRef(element: HTMLDivElement | undefined, screen: Point) {
    generalNotesDialogRef = element
    setGeneralNotesEditorScreen(screen)
  }

  function normalizePlacementPage(page: number | undefined, fallback: number): number {
    if (typeof page !== 'number' || !Number.isFinite(page)) {
      return Math.max(1, Math.trunc(fallback))
    }

    return Math.max(1, Math.trunc(page))
  }

  function notesForPlacement(projectState: LpProject, placement: { page?: number }): string[] {
    if (projectState.settings.notesDataScope === 'page') {
      const placementPage = normalizePlacementPage(placement.page, projectState.view.currentPage)
      return normalizeGeneralNotesList(projectState.generalNotes.notesByPage[placementPage] ?? [])
    }

    return normalizeGeneralNotesList(projectState.generalNotes.notes)
  }

  function handleGeneralNotesDialogPointerDown(
    event: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    if (event.button !== 0) {
      return
    }

    const editor = generalNotesEdit()
    if (!editor) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setGeneralNotesDialogDrag({
      pointerId: event.pointerId,
      pointerOffset: {
        x: event.clientX - editor.screen.x,
        y: event.clientY - editor.screen.y,
      },
    })
  }

  function handleGeneralNotesDialogPointerMove(
    event: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    const drag = generalNotesDialogDrag()
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    setGeneralNotesEditorScreen({
      x: event.clientX - drag.pointerOffset.x,
      y: event.clientY - drag.pointerOffset.y,
    })
  }

  function handleGeneralNotesDialogPointerUp(
    event: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    const drag = generalNotesDialogDrag()
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setGeneralNotesDialogDrag(null)
  }

  function editGeneralNotesPlacementById(placementId: string) {
    const p = options.project()
    const placement = p.generalNotes.placements.find((entry) => entry.id === placementId)
    if (!placement) {
      return
    }

    const notes = notesForPlacement(p, placement)
    setGeneralNotesEdit({
      placementId,
      notes: notes.length > 0 ? notes : [''],
      screen: generalNotesDialogScreenFromDocPoint(placement.position),
    })
    options.setSelected({ kind: 'general_note', id: placementId })
  }

  function setGeneralNotesEditorInput(index: number, value: string) {
    setGeneralNotesEdit((prev) => {
      if (!prev || index < 0 || index >= prev.notes.length) {
        return prev
      }

      const nextNotes = prev.notes.slice()
      nextNotes[index] = normalizeGeneralNoteText(value)
      return {
        ...prev,
        notes: nextNotes,
      }
    })
  }

  function addGeneralNotesEditorRow() {
    setGeneralNotesEdit((prev) => {
      if (!prev) {
        return prev
      }

      if (prev.notes.length >= options.maxNotes) {
        options.setError(`General notes are limited to ${options.maxNotes} entries.`)
        return prev
      }

      return {
        ...prev,
        notes: [...prev.notes, ''],
      }
    })
  }

  function removeGeneralNotesEditorRow(index: number) {
    setGeneralNotesEdit((prev) => {
      if (!prev || index < 0 || index >= prev.notes.length) {
        return prev
      }

      const nextNotes = prev.notes.filter((_, rowIndex) => rowIndex !== index)
      return {
        ...prev,
        notes: nextNotes.length > 0 ? nextNotes : [''],
      }
    })
  }

  function moveGeneralNotesEditorRow(index: number, direction: 'up' | 'down') {
    setGeneralNotesEdit((prev) => {
      if (!prev || index < 0 || index >= prev.notes.length) {
        return prev
      }

      const nextIndex = direction === 'up' ? index - 1 : index + 1
      if (nextIndex < 0 || nextIndex >= prev.notes.length) {
        return prev
      }

      const nextNotes = prev.notes.slice()
      const [moved] = nextNotes.splice(index, 1)
      if (typeof moved !== 'string') {
        return prev
      }
      nextNotes.splice(nextIndex, 0, moved)
      return {
        ...prev,
        notes: nextNotes,
      }
    })
  }

  function applyGeneralNotesEditor() {
    const editor = generalNotesEdit()
    if (!editor) {
      return
    }

    const p = options.project()
    const placement = p.generalNotes.placements.find((entry) => entry.id === editor.placementId)
    if (!placement) {
      setGeneralNotesEdit(null)
      return
    }

    const normalized = normalizeGeneralNotesList(editor.notes)
    const scope = p.settings.notesDataScope
    const placementPage = normalizePlacementPage(placement.page, p.view.currentPage)
    const current =
      scope === 'page'
        ? normalizeGeneralNotesList(p.generalNotes.notesByPage[placementPage] ?? [])
        : normalizeGeneralNotesList(p.generalNotes.notes)
    const changed =
      current.length !== normalized.length ||
      current.some((note, index) => note !== normalized[index])

    if (!changed) {
      setGeneralNotesEdit(null)
      return
    }

    options.commitProjectChange((draft) => {
      if (scope === 'page') {
        draft.generalNotes.notesByPage = {
          ...draft.generalNotes.notesByPage,
          [placementPage]: normalized,
        }
        return
      }

      draft.generalNotes.notes = normalized
    })

    setGeneralNotesEdit(null)
    options.setSelected({ kind: 'general_note', id: editor.placementId })
    if (scope === 'page') {
      options.setStatus(normalized.length === 0 ? `Page ${placementPage} notes cleared.` : `Page ${placementPage} notes updated.`)
      return
    }

    options.setStatus(normalized.length === 0 ? 'General notes cleared.' : 'General notes updated.')
  }

  function closeGeneralNotesDialog() {
    setGeneralNotesEdit(null)
  }

  function clearGeneralNotesDialogState() {
    setGeneralNotesDialogDrag(null)
    setGeneralNotesEdit(null)
  }

  function handleGeneralNotesViewportResize() {
    const editor = generalNotesEdit()
    if (editor) {
      setGeneralNotesEditorScreen(editor.screen)
    }
  }

  createEffect(() => {
    const editor = generalNotesEdit()
    if (!editor) {
      setGeneralNotesDialogDrag(null)
      return
    }

    setGeneralNotesEditorScreen(editor.screen)
  })

  return {
    generalNotesEdit,
    editGeneralNotesPlacementById,
    setGeneralNotesEditorInput,
    addGeneralNotesEditorRow,
    removeGeneralNotesEditorRow,
    moveGeneralNotesEditorRow,
    applyGeneralNotesEditor,
    handleGeneralNotesDialogPointerDown,
    handleGeneralNotesDialogPointerMove,
    handleGeneralNotesDialogPointerUp,
    bindGeneralNotesDialogRef,
    closeGeneralNotesDialog,
    clearGeneralNotesDialogState,
    handleGeneralNotesViewportResize,
  }
}
