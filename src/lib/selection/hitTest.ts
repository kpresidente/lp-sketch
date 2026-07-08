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
import { projectDrawOrderEntries, type ProjectDrawOrderEntry } from './zOrder'

interface HitTestOptions {
  linearHitTieTolerancePx: number
  legendTitle: string
  legendEntriesForPlacement: (items: LegendItem[], placement: LegendPlacement) => LegendDisplayEntry[]
}

type LinearHit = {
  selection: Selection
  distance: number
  priority: number
  orderIndex: number
  hasExplicitZIndex: boolean
}

function linearPriority(kind: ProjectDrawOrderEntry['kind']): number {
  switch (kind) {
    case 'arc':
    case 'curve':
      return 0
    case 'arrow':
      return 1
    case 'line':
      return 2
    default:
      return Number.POSITIVE_INFINITY
  }
}

function bestLinearHit(hits: LinearHit[], linearTieToleranceDoc: number): LinearHit | null {
  let best: LinearHit | null = null

  for (const hit of hits) {
    if (!best) {
      best = hit
      continue
    }

    if (hit.distance < best.distance - linearTieToleranceDoc) {
      best = hit
      continue
    }

    if (Math.abs(hit.distance - best.distance) > linearTieToleranceDoc) {
      continue
    }

    if (hit.hasExplicitZIndex || best.hasExplicitZIndex) {
      if (hit.orderIndex > best.orderIndex) {
        best = hit
      }
      continue
    }

    if (hit.priority < best.priority || (hit.priority === best.priority && hit.orderIndex > best.orderIndex)) {
      best = hit
    }
  }

  return best
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
  const pointScreen = docToScreen(point, project.view)
  const orderedEntries = projectDrawOrderEntries(project, { includeMarks: true })
  const linearHits: LinearHit[] = []

  const selectPendingLinear = () => bestLinearHit(linearHits, linearTieToleranceDoc)?.selection ?? null

  for (let i = orderedEntries.length - 1; i >= 0; i -= 1) {
    const entry = orderedEntries[i]
    if (!entry) {
      continue
    }

    switch (entry.kind) {
      case 'symbol':
        if (distance(point, entry.item.position) <= toleranceDoc) {
          const pendingLinear = selectPendingLinear()
          if (pendingLinear) {
            return pendingLinear
          }
          return entry.selection
        }
        break
      case 'text':
        if (pointHitsText(point, entry.item, project.view, tolerancePx, designScale)) {
          const pendingLinear = selectPendingLinear()
          if (pendingLinear) {
            return pendingLinear
          }
          return entry.selection
        }
        break
      case 'dimension_text':
        if (pointHitsDimensionText(point, entry.item, project, tolerancePx, designScale)) {
          const pendingLinear = selectPendingLinear()
          if (pendingLinear) {
            return pendingLinear
          }
          return entry.selection
        }
        break
      case 'legend': {
        const entries = options.legendEntriesForPlacement(project.legend.items, entry.item)
        const size = legendBoxSize(entries, designScale, {
          title: options.legendTitle,
          ...scaledLegendMetrics(designScale),
        })
        const origin = docToScreen(entry.item.position, project.view)

        if (
          pointScreen.x >= origin.x - tolerancePx &&
          pointScreen.x <= origin.x + size.width + tolerancePx &&
          pointScreen.y >= origin.y - tolerancePx &&
          pointScreen.y <= origin.y + size.height + tolerancePx
        ) {
          const pendingLinear = selectPendingLinear()
          if (pendingLinear) {
            return pendingLinear
          }
          return entry.selection
        }
        break
      }
      case 'general_note': {
        const size = generalNotesBoxSize(project.generalNotes.notes, designScale)
        const origin = docToScreen(entry.item.position, project.view)

        if (
          pointScreen.x >= origin.x - tolerancePx &&
          pointScreen.x <= origin.x + size.width + tolerancePx &&
          pointScreen.y >= origin.y - tolerancePx &&
          pointScreen.y <= origin.y + size.height + tolerancePx
        ) {
          const pendingLinear = selectPendingLinear()
          if (pendingLinear) {
            return pendingLinear
          }
          return entry.selection
        }
        break
      }
      case 'mark':
        if (distance(point, entry.item.position) <= toleranceDoc) {
          const pendingLinear = selectPendingLinear()
          if (pendingLinear) {
            return pendingLinear
          }
          return entry.selection
        }
        break
      case 'arc': {
        const candidateDistance = distanceToCircularArc(point, entry.item.start, entry.item.through, entry.item.end, 72)
        if (candidateDistance <= toleranceDoc) {
          linearHits.push({
            selection: entry.selection,
            distance: candidateDistance,
            priority: linearPriority(entry.kind),
            orderIndex: i,
            hasExplicitZIndex: Number.isFinite(entry.item.zIndex),
          })
        }
        break
      }
      case 'curve': {
        const candidateDistance = distanceToQuadratic(point, entry.item.start, entry.item.through, entry.item.end, 48)
        if (candidateDistance <= toleranceDoc) {
          linearHits.push({
            selection: entry.selection,
            distance: candidateDistance,
            priority: linearPriority(entry.kind),
            orderIndex: i,
            hasExplicitZIndex: Number.isFinite(entry.item.zIndex),
          })
        }
        break
      }
      case 'arrow': {
        const candidateDistance = distanceToSegment(point, entry.item.tail, entry.item.head)
        if (candidateDistance <= toleranceDoc) {
          linearHits.push({
            selection: entry.selection,
            distance: candidateDistance,
            priority: linearPriority(entry.kind),
            orderIndex: i,
            hasExplicitZIndex: Number.isFinite(entry.item.zIndex),
          })
        }
        break
      }
      case 'line': {
        const candidateDistance = distanceToSegment(point, entry.item.start, entry.item.end)
        if (candidateDistance <= toleranceDoc) {
          linearHits.push({
            selection: entry.selection,
            distance: candidateDistance,
            priority: linearPriority(entry.kind),
            orderIndex: i,
            hasExplicitZIndex: Number.isFinite(entry.item.zIndex),
          })
        }
        break
      }
    }
  }

  return selectPendingLinear()
}
