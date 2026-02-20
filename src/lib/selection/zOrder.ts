import type { LpProject, Selection } from '../../types/project'

export type ZOrderDirection = 'front' | 'back'

function selectionCollectionForProject(
  projectState: LpProject,
  selection: Selection,
): Array<{ id: string }> | null {
  switch (selection.kind) {
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

export function canMoveSelectionToZEdge(
  projectState: LpProject,
  selection: Selection | null,
  direction: ZOrderDirection,
): boolean {
  if (!selection) {
    return false
  }

  const collection = selectionCollectionForProject(projectState, selection)
  if (!collection || collection.length < 2) {
    return false
  }

  const index = collection.findIndex((entry) => entry.id === selection.id)
  if (index < 0) {
    return false
  }

  return direction === 'front'
    ? index < collection.length - 1
    : index > 0
}

export function moveSelectionToZEdge(
  draft: LpProject,
  selection: Selection,
  direction: ZOrderDirection,
): boolean {
  const collection = selectionCollectionForProject(draft, selection)
  if (!collection || collection.length < 2) {
    return false
  }

  const index = collection.findIndex((entry) => entry.id === selection.id)
  if (index < 0) {
    return false
  }

  const [target] = collection.splice(index, 1)
  if (!target) {
    return false
  }

  if (direction === 'front') {
    collection.push(target)
  } else {
    collection.unshift(target)
  }

  return true
}
