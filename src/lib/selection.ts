import type { Selection } from '../types/project'

export function selectionKey(selection: Selection): string {
  return `${selection.kind}:${selection.id}`
}

export function selectionKeyFor(kind: Selection['kind'], id: string): string {
  return `${kind}:${id}`
}

export function selectionsKeySet(selections: readonly Selection[]): ReadonlySet<string> {
  return new Set(selections.map(selectionKey))
}

export function sameSelection(a: Selection, b: Selection): boolean {
  return a.kind === b.kind && a.id === b.id
}

export function hasSelection(selection: Selection | null): selection is Selection {
  return selection !== null
}

export function selectionInList(
  list: readonly Selection[],
  target: Selection,
): boolean {
  return list.some((entry) => sameSelection(entry, target))
}
