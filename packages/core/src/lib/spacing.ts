import type { Point } from '../types/project'
import { circularArcGeometryFromThreePoints, distance } from './geometry'

export type CornerKind = 'outside' | 'inside'

export const AUTO_SPACING_DEDUPE_EPSILON_PT = 0.5

export function polylineLength(points: Point[]): number {
  if (points.length < 2) {
    return 0
  }

  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i])
  }

  return total
}

function pointAtDistanceAlongPolyline(points: Point[], targetDistance: number): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 }
  }

  if (points.length === 1 || targetDistance <= 0) {
    return points[0]
  }

  let traversed = 0

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    const segmentLength = distance(a, b)

    if (segmentLength <= 1e-9) {
      continue
    }

    if (traversed + segmentLength >= targetDistance) {
      const remainder = targetDistance - traversed
      const t = remainder / segmentLength
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      }
    }

    traversed += segmentLength
  }

  return points[points.length - 1]
}

function dedupePoints(points: Point[], epsilonPt: number): Point[] {
  const deduped: Point[] = []

  for (const point of points) {
    const existing = deduped.find((candidate) => distance(candidate, point) <= epsilonPt)
    if (!existing) {
      deduped.push(point)
    }
  }

  return deduped
}

function equalSpacingPointsOnPolyline(points: Point[], maxIntervalPt: number): Point[] {
  const totalLength = polylineLength(points)

  if (totalLength <= 1e-9) {
    return points.length > 0 ? [points[0]] : []
  }

  const segmentCount = Math.max(1, Math.ceil(totalLength / maxIntervalPt))
  const interval = totalLength / segmentCount
  const output: Point[] = []

  for (let i = 0; i <= segmentCount; i += 1) {
    output.push(pointAtDistanceAlongPolyline(points, i * interval))
  }

  return output
}

function openSpanVertices(vertices: Point[], startIndex: number, endIndex: number): Point[] {
  return vertices.slice(startIndex, endIndex + 1)
}

function closedSpanVertices(vertices: Point[], startIndex: number, endIndex: number): Point[] {
  if (startIndex === endIndex) {
    return [...vertices.slice(startIndex), ...vertices.slice(0, startIndex + 1)]
  }

  if (startIndex < endIndex) {
    return vertices.slice(startIndex, endIndex + 1)
  }

  return [...vertices.slice(startIndex), ...vertices.slice(0, endIndex + 1)]
}

export function computeLinearAutoSpacingPoints(
  vertices: Point[],
  corners: CornerKind[],
  closed: boolean,
  maxIntervalPt: number,
  dedupeEpsilonPt = AUTO_SPACING_DEDUPE_EPSILON_PT,
): Point[] {
  if (vertices.length < 2 || maxIntervalPt <= 0) {
    return []
  }

  const result: Point[] = []

  if (closed) {
    const anchors = corners
      .map((corner, index) => (corner === 'outside' ? index : -1))
      .filter((index) => index >= 0)

    if (anchors.length === 0) {
      return []
    }

    if (anchors.length === 1) {
      const span = closedSpanVertices(vertices, anchors[0], anchors[0])
      result.push(...equalSpacingPointsOnPolyline(span, maxIntervalPt))
      return dedupePoints(result, dedupeEpsilonPt)
    }

    for (let i = 0; i < anchors.length; i += 1) {
      const startIndex = anchors[i]
      const endIndex = anchors[(i + 1) % anchors.length]
      const span = closedSpanVertices(vertices, startIndex, endIndex)
      result.push(...equalSpacingPointsOnPolyline(span, maxIntervalPt))
    }

    return dedupePoints(result, dedupeEpsilonPt)
  }

  const anchorSet = new Set<number>([0, vertices.length - 1])
  for (let i = 1; i < vertices.length - 1; i += 1) {
    if (corners[i] === 'outside') {
      anchorSet.add(i)
    }
  }

  const anchors = [...anchorSet].sort((a, b) => a - b)
  for (let i = 1; i < anchors.length; i += 1) {
    const span = openSpanVertices(vertices, anchors[i - 1], anchors[i])
    result.push(...equalSpacingPointsOnPolyline(span, maxIntervalPt))
  }

  return dedupePoints(result, dedupeEpsilonPt)
}

export function computeArcAutoSpacingPoints(
  start: Point,
  through: Point,
  end: Point,
  maxIntervalPt: number,
  dedupeEpsilonPt = AUTO_SPACING_DEDUPE_EPSILON_PT,
): Point[] {
  if (maxIntervalPt <= 0) {
    return []
  }

  const geometry = circularArcGeometryFromThreePoints(start, through, end)
  if (!geometry) {
    return []
  }

  const arcLength = geometry.radius * geometry.sweepRadians
  if (!Number.isFinite(arcLength) || arcLength <= 1e-9) {
    return [{ ...start }]
  }

  const segmentCount = Math.max(1, Math.ceil(arcLength / maxIntervalPt))
  const direction = geometry.sweepPositive ? 1 : -1
  const angleStep = geometry.sweepRadians / segmentCount
  const points: Point[] = []

  for (let i = 0; i <= segmentCount; i += 1) {
    const angle = geometry.startAngle + direction * angleStep * i
    points.push({
      x: geometry.center.x + Math.cos(angle) * geometry.radius,
      y: geometry.center.y + Math.sin(angle) * geometry.radius,
    })
  }

  points[0] = { ...start }
  points[points.length - 1] = { ...end }
  return dedupePoints(points, dedupeEpsilonPt)
}
