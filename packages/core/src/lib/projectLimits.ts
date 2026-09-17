import type { LpProject } from '../types/project'

function notesByPageCount(project: LpProject): number {
  let count = 0
  for (const notes of Object.values(project.generalNotes.notesByPage)) {
    if (!Array.isArray(notes)) {
      continue
    }
    count += notes.length
  }
  return count
}

export function projectElementCount(project: LpProject): number {
  return (
    project.elements.lines.length +
    project.elements.arcs.length +
    project.elements.curves.length +
    project.elements.symbols.length +
    project.elements.texts.length +
    project.elements.arrows.length +
    project.elements.dimensionTexts.length +
    project.construction.marks.length +
    project.legend.placements.length +
    project.generalNotes.placements.length +
    project.generalNotes.notes.length +
    notesByPageCount(project)
  )
}

export function projectHasRecoverableContent(project: LpProject): boolean {
  if (project.pdf.dataBase64) {
    return true
  }

  if (projectElementCount(project) > 0) {
    return true
  }

  if (project.legend.items.length > 0 || Object.keys(project.legend.customSuffixes).length > 0) {
    return true
  }

  return false
}
