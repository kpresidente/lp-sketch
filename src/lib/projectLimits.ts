import type { LpProject } from '../types/project'

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
    project.generalNotes.notes.length
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

