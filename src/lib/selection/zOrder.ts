import type { LpProject, Selection } from '../../types/project'

export type ZOrderDirection = 'front' | 'back'

type ZOrderCollectionEntry = { id: string }

function selectionCollectionForKind(
  projectState: LpProject,
  kind: Selection['kind'],
): ZOrderCollectionEntry[] | null {
  switch (kind) {
    case 'line':
      return projectState.elements.lines
    case 'arc':
      return projectState.elements.arcs
    case 'curve':
      return projectState.elements.curves
    case 'symbol':
      return projectState.elements.symbols
    case 'legend':
      return projectState.legend.placements
    case 'general_note':
      return projectState.generalNotes.placements
    case 'text':
      return projectState.elements.texts
    case 'dimension_text':
      return projectState.elements.dimensionTexts
    case 'arrow':
      return projectState.elements.arrows
    case 'mark':
      return projectState.construction.marks
    default:
      return null
  }
}

function selectionCollectionForProject(
  projectState: LpProject,
  selection: Selection,
): ZOrderCollectionEntry[] | null {
  return selectionCollectionForKind(projectState, selection.kind)
}

function hasMovableSelectionInCollection(
  collection: ZOrderCollectionEntry[],
  selectedIds: ReadonlySet<string>,
  direction: ZOrderDirection,
): boolean {
  if (collection.length < 2 || selectedIds.size === 0) {
    return false
  }

  if (direction === 'front') {
    for (let index = 0; index < collection.length - 1; index += 1) {
      const current = collection[index]
      const next = collection[index + 1]
      if (current && next && selectedIds.has(current.id) && !selectedIds.has(next.id)) {
        return true
      }
    }
    return false
  }

  for (let index = 1; index < collection.length; index += 1) {
    const previous = collection[index - 1]
    const current = collection[index]
    if (current && previous && selectedIds.has(current.id) && !selectedIds.has(previous.id)) {
      return true
    }
  }
  return false
}

function moveSelectionIdsByStep(
  collection: ZOrderCollectionEntry[],
  selectedIds: ReadonlySet<string>,
  direction: ZOrderDirection,
): boolean {
  if (!hasMovableSelectionInCollection(collection, selectedIds, direction)) {
    return false
  }

  const original = collection.slice()
  const next = original.slice()

  if (direction === 'front') {
    for (let index = 0; index < original.length - 1; index += 1) {
      const current = original[index]
      const following = original[index + 1]
      if (!current || !following) {
        continue
      }
      if (!selectedIds.has(current.id) || selectedIds.has(following.id)) {
        continue
      }

      next[index] = following
      next[index + 1] = current
    }
  } else {
    for (let index = 1; index < original.length; index += 1) {
      const previous = original[index - 1]
      const current = original[index]
      if (!previous || !current) {
        continue
      }
      if (!selectedIds.has(current.id) || selectedIds.has(previous.id)) {
        continue
      }

      next[index - 1] = current
      next[index] = previous
    }
  }

  collection.splice(0, collection.length, ...next)
  return true
}

function groupedSelectionIdsByKind(
  projectState: LpProject,
  selections: readonly Selection[],
): Map<Selection['kind'], Set<string>> {
  const grouped = new Map<Selection['kind'], Set<string>>()

  for (const selection of selections) {
    const collection = selectionCollectionForProject(projectState, selection)
    if (!collection || collection.length === 0) {
      continue
    }
    if (!collection.some((entry) => entry.id === selection.id)) {
      continue
    }

    const existing = grouped.get(selection.kind)
    if (existing) {
      existing.add(selection.id)
      continue
    }

    grouped.set(selection.kind, new Set([selection.id]))
  }

  return grouped
}

export function canMoveSelectionsByZStep(
  projectState: LpProject,
  selections: readonly Selection[],
  direction: ZOrderDirection,
): boolean {
  if (selections.length === 0) {
    return false
  }

  const grouped = groupedSelectionIdsByKind(projectState, selections)
  for (const [kind, selectedIds] of grouped) {
    const collection = selectionCollectionForKind(projectState, kind)
    if (!collection) {
      continue
    }
    if (hasMovableSelectionInCollection(collection, selectedIds, direction)) {
      return true
    }
  }

  return false
}

export function moveSelectionsByZStep(
  draft: LpProject,
  selections: readonly Selection[],
  direction: ZOrderDirection,
): boolean {
  if (selections.length === 0) {
    return false
  }

  const grouped = groupedSelectionIdsByKind(draft, selections)
  let moved = false
  for (const [kind, selectedIds] of grouped) {
    const collection = selectionCollectionForKind(draft, kind)
    if (!collection) {
      continue
    }

    if (moveSelectionIdsByStep(collection, selectedIds, direction)) {
      moved = true
    }
  }

  return moved
}

export function canMoveSelectionToZEdge(
  projectState: LpProject,
  selection: Selection | null,
  direction: ZOrderDirection,
): boolean {
  return selection ? canMoveSelectionsByZStep(projectState, [selection], direction) : false
}

export function moveSelectionToZEdge(
  draft: LpProject,
  selection: Selection,
  direction: ZOrderDirection,
): boolean {
  return moveSelectionsByZStep(draft, [selection], direction)
}
