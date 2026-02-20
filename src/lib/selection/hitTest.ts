import { annotationScaleFactor, scaledLegendMetrics } from '../annotationScale'
import {
  distance,
  distanceToCircularArc,
  distanceToQuadratic,
  distanceToSegment,
  docToScreen,
} from '../geometry'
import { generalNotesBoxSize } from '../generalNotes'
import { legendBoxSize } from '../legendUi'
import { pointHitsDimensionText, pointHitsText } from '../annotationHitTest'
import type { LegendDisplayEntry } from '../legendDisplay'
import type { LegendItem, LegendPlacement, LpProject, Point, Selection } from '../../types/project'

interface HitTestOptions {
  linearHitTieTolerancePx: number
  legendTitle: string
  legendEntriesForPlacement: (items: LegendItem[], placement: LegendPlacement) => LegendDisplayEntry[]
}

export function hitTest(
  point: Point,
  project: LpProject,
  options: HitTestOptions,
): Selection | null {
  const designScale = annotationScaleFactor(project.settings.designScale)
  const tolerancePx = 10 * designScale
  const toleranceDoc = (10 * designScale) / project.view.zoom
  const linearTieToleranceDoc = options.linearHitTieTolerancePx / project.view.zoom

  for (let i = project.elements.symbols.length - 1; i >= 0; i -= 1) {
    const symbol = project.elements.symbols[i]
    if (distance(point, symbol.position) <= toleranceDoc) {
      return { kind: 'symbol', id: symbol.id }
    }
  }

  for (let i = project.elements.texts.length - 1; i >= 0; i -= 1) {
    const textElement = project.elements.texts[i]
    if (pointHitsText(point, textElement, project.view, tolerancePx, designScale)) {
      return { kind: 'text', id: textElement.id }
    }
  }

  for (let i = project.elements.dimensionTexts.length - 1; i >= 0; i -= 1) {
    const dimensionText = project.elements.dimensionTexts[i]
    if (pointHitsDimensionText(point, dimensionText, project, tolerancePx, designScale)) {
      return { kind: 'dimension_text', id: dimensionText.id }
    }
  }

  for (let i = project.legend.placements.length - 1; i >= 0; i -= 1) {
    const placement = project.legend.placements[i]
    const entries = options.legendEntriesForPlacement(project.legend.items, placement)
    const size = legendBoxSize(entries, designScale, {
      title: options.legendTitle,
      ...scaledLegendMetrics(designScale),
    })
    const origin = docToScreen(placement.position, project.view)
    const pointScreen = docToScreen(point, project.view)

    if (
      pointScreen.x >= origin.x - tolerancePx &&
      pointScreen.x <= origin.x + size.width + tolerancePx &&
      pointScreen.y >= origin.y - tolerancePx &&
      pointScreen.y <= origin.y + size.height + tolerancePx
    ) {
      return { kind: 'legend', id: placement.id }
    }
  }

  for (let i = project.generalNotes.placements.length - 1; i >= 0; i -= 1) {
    const placement = project.generalNotes.placements[i]
    const size = generalNotesBoxSize(project.generalNotes.notes, designScale)
    const origin = docToScreen(placement.position, project.view)
    const pointScreen = docToScreen(point, project.view)

    if (
      pointScreen.x >= origin.x - tolerancePx &&
      pointScreen.x <= origin.x + size.width + tolerancePx &&
      pointScreen.y >= origin.y - tolerancePx &&
      pointScreen.y <= origin.y + size.height + tolerancePx
    ) {
      return { kind: 'general_note', id: placement.id }
    }
  }

  for (let i = project.construction.marks.length - 1; i >= 0; i -= 1) {
    const mark = project.construction.marks[i]
    if (distance(point, mark.position) <= toleranceDoc) {
      return { kind: 'mark', id: mark.id }
    }
  }

  let bestLinearSelection: Selection | null = null
  let bestLinearDistance = Number.POSITIVE_INFINITY
  let bestLinearPriority = Number.POSITIVE_INFINITY
  const considerLinearSelection = (
    candidate: Selection,
    candidateDistance: number,
    priority: number,
  ) => {
    if (candidateDistance > toleranceDoc) {
      return
    }

    if (candidateDistance < bestLinearDistance - linearTieToleranceDoc) {
      bestLinearDistance = candidateDistance
      bestLinearPriority = priority
      bestLinearSelection = candidate
      return
    }

    if (Math.abs(candidateDistance - bestLinearDistance) <= linearTieToleranceDoc) {
      if (priority < bestLinearPriority) {
        bestLinearDistance = candidateDistance
        bestLinearPriority = priority
        bestLinearSelection = candidate
      }
    }
  }

  for (let i = project.elements.arcs.length - 1; i >= 0; i -= 1) {
    const arc = project.elements.arcs[i]
    const d = distanceToCircularArc(point, arc.start, arc.through, arc.end, 72)
    considerLinearSelection({ kind: 'arc', id: arc.id }, d, 0)
  }

  for (let i = project.elements.curves.length - 1; i >= 0; i -= 1) {
    const curve = project.elements.curves[i]
    const d = distanceToQuadratic(point, curve.start, curve.through, curve.end, 48)
    considerLinearSelection({ kind: 'curve', id: curve.id }, d, 0)
  }

  for (let i = project.elements.arrows.length - 1; i >= 0; i -= 1) {
    const arrow = project.elements.arrows[i]
    const d = distanceToSegment(point, arrow.tail, arrow.head)
    considerLinearSelection({ kind: 'arrow', id: arrow.id }, d, 1)
  }

  for (let i = project.elements.lines.length - 1; i >= 0; i -= 1) {
    const line = project.elements.lines[i]
    const d = distanceToSegment(point, line.start, line.end)
    considerLinearSelection({ kind: 'line', id: line.id }, d, 2)
  }

  if (bestLinearSelection) {
    return bestLinearSelection
  }

  return null
}
