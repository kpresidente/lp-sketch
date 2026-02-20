import {
  distance,
  lineSegmentIntersection,
  nearestPointOnCircularArc,
  nearestPointOnQuadratic,
  projectPointOntoSegment,
  sampleCircularArcPolyline,
  sampleQuadraticPolyline,
} from '../geometry'
import { SNAP_KIND_PRIORITY } from '../../config/appConstants'
import type {
  ResolveSnapPointOptions,
  SnapMarkerKind,
  SnapResolution,
} from '../../types/appRuntime'
import type { LpProject, Point } from '../../types/project'

export function resolveSnapPoint(
  rawPoint: Point,
  project: LpProject,
  options: ResolveSnapPointOptions = {},
): SnapResolution {
  if (!project.settings.snapEnabled) {
    return {
      point: rawPoint,
      snapped: false,
      kind: null,
    }
  }

  const toleranceDoc = 10 / project.view.zoom
  const excludedSelection = options.excludeSelection ?? null
  const snapLines =
    excludedSelection?.kind === 'line'
      ? project.elements.lines.filter((entry) => entry.id !== excludedSelection.id)
      : project.elements.lines
  const snapArcs =
    excludedSelection?.kind === 'arc'
      ? project.elements.arcs.filter((entry) => entry.id !== excludedSelection.id)
      : project.elements.arcs
  const snapCurves =
    excludedSelection?.kind === 'curve'
      ? project.elements.curves.filter((entry) => entry.id !== excludedSelection.id)
      : project.elements.curves
  const snapSymbols =
    excludedSelection?.kind === 'symbol'
      ? project.elements.symbols.filter((entry) => entry.id !== excludedSelection.id)
      : project.elements.symbols
  const snapTexts =
    excludedSelection?.kind === 'text'
      ? project.elements.texts.filter((entry) => entry.id !== excludedSelection.id)
      : project.elements.texts
  const snapDimensionTexts =
    excludedSelection?.kind === 'dimension_text'
      ? project.elements.dimensionTexts.filter((entry) => entry.id !== excludedSelection.id)
      : project.elements.dimensionTexts
  const snapArrows =
    excludedSelection?.kind === 'arrow'
      ? project.elements.arrows.filter((entry) => entry.id !== excludedSelection.id)
      : project.elements.arrows
  const snapMarks =
    excludedSelection?.kind === 'mark'
      ? project.construction.marks.filter((entry) => entry.id !== excludedSelection.id)
      : project.construction.marks
  const perpendicularReference = options.referencePoint ?? null
  let bestPoint: Point | null = null
  let bestKind: SnapMarkerKind | null = null
  let bestPriority = Number.NEGATIVE_INFINITY
  let bestDistance = Number.POSITIVE_INFINITY

  function evaluateCandidate(candidate: Point, kind: SnapMarkerKind) {
    const d = distance(candidate, rawPoint)
    const priority = SNAP_KIND_PRIORITY[kind]
    if (
      d <= toleranceDoc &&
      (
        priority > bestPriority ||
        (priority === bestPriority && d < bestDistance)
      )
    ) {
      bestPriority = priority
      bestDistance = d
      bestPoint = candidate
      bestKind = kind
    }
  }

  for (const line of snapLines) {
    evaluateCandidate(line.start, 'endpoint')
    evaluateCandidate(line.end, 'endpoint')
    if (perpendicularReference) {
      evaluateCandidate(
        projectPointOntoSegment(perpendicularReference, line.start, line.end),
        'perpendicular',
      )
    }
  }

  const arcSnapEntries = snapArcs.map((arc) => ({
    polyline: sampleCircularArcPolyline(arc.start, arc.through, arc.end, 24),
    start: arc.start,
    end: arc.end,
    nearest: nearestPointOnCircularArc(rawPoint, arc.start, arc.through, arc.end, 64),
  }))

  for (const arcEntry of arcSnapEntries) {
    evaluateCandidate(arcEntry.start, 'endpoint')
    evaluateCandidate(arcEntry.end, 'endpoint')
  }

  const curveSnapEntries = snapCurves.map((curve) => ({
    polyline: sampleQuadraticPolyline(curve.start, curve.through, curve.end, 24),
    start: curve.start,
    end: curve.end,
    nearest: nearestPointOnQuadratic(rawPoint, curve.start, curve.through, curve.end, 64),
  }))

  for (const curveEntry of curveSnapEntries) {
    evaluateCandidate(curveEntry.start, 'endpoint')
    evaluateCandidate(curveEntry.end, 'endpoint')
  }

  for (const arrow of snapArrows) {
    evaluateCandidate(arrow.tail, 'endpoint')
    evaluateCandidate(arrow.head, 'endpoint')
    if (perpendicularReference) {
      evaluateCandidate(
        projectPointOntoSegment(perpendicularReference, arrow.tail, arrow.head),
        'perpendicular',
      )
    }
  }

  for (const mark of snapMarks) {
    evaluateCandidate(mark.position, 'mark')
  }

  const arcLikeEntries = [
    ...arcSnapEntries,
    ...curveSnapEntries,
  ]

  for (const line of snapLines) {
    for (const arcLike of arcLikeEntries) {
      const polyline = arcLike.polyline
      for (let i = 1; i < polyline.length; i += 1) {
        const intersection = lineSegmentIntersection(
          line.start,
          line.end,
          polyline[i - 1],
          polyline[i],
        )

        if (intersection) {
          evaluateCandidate(intersection, 'intersection')
        }
      }
    }
  }

  for (let a = 0; a < arcLikeEntries.length; a += 1) {
    const polyA = arcLikeEntries[a].polyline

    for (let b = a + 1; b < arcLikeEntries.length; b += 1) {
      const polyB = arcLikeEntries[b].polyline

      for (let i = 1; i < polyA.length; i += 1) {
        for (let j = 1; j < polyB.length; j += 1) {
          const intersection = lineSegmentIntersection(
            polyA[i - 1],
            polyA[i],
            polyB[j - 1],
            polyB[j],
          )

          if (intersection) {
            evaluateCandidate(intersection, 'intersection')
          }
        }
      }
    }
  }

  for (let i = 0; i < snapLines.length; i += 1) {
    const lineA = snapLines[i]

    for (let j = i + 1; j < snapLines.length; j += 1) {
      const lineB = snapLines[j]
      const intersection = lineSegmentIntersection(lineA.start, lineA.end, lineB.start, lineB.end)

      if (intersection) {
        evaluateCandidate(intersection, 'intersection')
      }
    }
  }

  for (const arrow of snapArrows) {
    for (const line of snapLines) {
      const intersection = lineSegmentIntersection(arrow.tail, arrow.head, line.start, line.end)
      if (intersection) {
        evaluateCandidate(intersection, 'intersection')
      }
    }
  }

  for (const arcEntry of arcLikeEntries) {
    const polyline = arcEntry.polyline
    for (const arrow of snapArrows) {
      for (let i = 1; i < polyline.length; i += 1) {
        const intersection = lineSegmentIntersection(
          arrow.tail,
          arrow.head,
          polyline[i - 1],
          polyline[i],
        )

        if (intersection) {
          evaluateCandidate(intersection, 'intersection')
        }
      }
    }
  }

  for (const symbol of snapSymbols) {
    evaluateCandidate(symbol.position, 'basepoint')
  }

  for (const textElement of snapTexts) {
    evaluateCandidate(textElement.position, 'basepoint')
  }

  for (const dimensionText of snapDimensionTexts) {
    evaluateCandidate(dimensionText.position, 'basepoint')
  }

  for (const line of snapLines) {
    evaluateCandidate(projectPointOntoSegment(rawPoint, line.start, line.end), 'nearest')
  }

  for (const arrow of snapArrows) {
    evaluateCandidate(projectPointOntoSegment(rawPoint, arrow.tail, arrow.head), 'nearest')
  }

  for (const arcEntry of arcSnapEntries) {
    evaluateCandidate(arcEntry.nearest, 'nearest')
  }

  for (const curveEntry of curveSnapEntries) {
    evaluateCandidate(curveEntry.nearest, 'nearest')
  }

  if (bestPoint) {
    return {
      point: bestPoint,
      snapped: true,
      kind: bestKind,
    }
  }

  return {
    point: rawPoint,
    snapped: false,
    kind: null,
  }
}
