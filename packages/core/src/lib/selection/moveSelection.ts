import { selectionKey } from '../selection'
import type { LpProject, Point, Selection } from '../../types/project'

export function moveSelectionByDelta(draft: LpProject, selection: Selection, delta: Point) {
  if (selection.kind === 'line') {
    const line = draft.elements.lines.find((entry) => entry.id === selection.id)
    if (!line) {
      return
    }

    line.start.x += delta.x
    line.start.y += delta.y
    line.end.x += delta.x
    line.end.y += delta.y
    return
  }

  if (selection.kind === 'arc') {
    const arc = draft.elements.arcs.find((entry) => entry.id === selection.id)
    if (!arc) {
      return
    }

    arc.start.x += delta.x
    arc.start.y += delta.y
    arc.end.x += delta.x
    arc.end.y += delta.y
    arc.through.x += delta.x
    arc.through.y += delta.y
    return
  }

  if (selection.kind === 'curve') {
    const curve = draft.elements.curves.find((entry) => entry.id === selection.id)
    if (!curve) {
      return
    }

    curve.start.x += delta.x
    curve.start.y += delta.y
    curve.end.x += delta.x
    curve.end.y += delta.y
    curve.through.x += delta.x
    curve.through.y += delta.y
    return
  }

  if (selection.kind === 'symbol') {
    const symbol = draft.elements.symbols.find((entry) => entry.id === selection.id)
    if (!symbol) {
      return
    }

    symbol.position.x += delta.x
    symbol.position.y += delta.y
    return
  }

  if (selection.kind === 'legend') {
    const placement = draft.legend.placements.find((entry) => entry.id === selection.id)
    if (!placement) {
      return
    }

    placement.position.x += delta.x
    placement.position.y += delta.y
    return
  }

  if (selection.kind === 'general_note') {
    const placement = draft.generalNotes.placements.find((entry) => entry.id === selection.id)
    if (!placement) {
      return
    }

    placement.position.x += delta.x
    placement.position.y += delta.y
    return
  }

  if (selection.kind === 'text') {
    const textElement = draft.elements.texts.find((entry) => entry.id === selection.id)
    if (!textElement) {
      return
    }

    textElement.position.x += delta.x
    textElement.position.y += delta.y
    return
  }

  if (selection.kind === 'dimension_text') {
    const dimensionText = draft.elements.dimensionTexts.find((entry) => entry.id === selection.id)
    if (!dimensionText) {
      return
    }

    dimensionText.position.x += delta.x
    dimensionText.position.y += delta.y
    return
  }

  if (selection.kind === 'arrow') {
    const arrow = draft.elements.arrows.find((entry) => entry.id === selection.id)
    if (!arrow) {
      return
    }

    arrow.tail.x += delta.x
    arrow.tail.y += delta.y
    arrow.head.x += delta.x
    arrow.head.y += delta.y
    return
  }

  const mark = draft.construction.marks.find((entry) => entry.id === selection.id)
  if (!mark) {
    return
  }

  mark.position.x += delta.x
  mark.position.y += delta.y
}

export function moveSelectionsByDelta(draft: LpProject, selections: readonly Selection[], delta: Point) {
  const moved = new Set<string>()
  for (const selection of selections) {
    const key = selectionKey(selection)
    if (moved.has(key)) {
      continue
    }

    moved.add(key)
    moveSelectionByDelta(draft, selection, delta)
  }
}
