import type { Point, ViewState } from '../types/project'

export interface RectLike {
  left: number
  top: number
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function distance(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function screenToDoc(point: Point, view: ViewState): Point {
  return {
    x: (point.x - view.pan.x) / view.zoom,
    y: (point.y - view.pan.y) / view.zoom,
  }
}

export function docToScreen(point: Point, view: ViewState): Point {
  return {
    x: point.x * view.zoom + view.pan.x,
    y: point.y * view.zoom + view.pan.y,
  }
}

export function eventToScreenPoint(event: PointerEvent | MouseEvent | WheelEvent, rect: RectLike): Point {
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

export function angleDegrees(a: Point, b: Point) {
  const raw = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  return (raw + 360) % 360
}

export function snapAngleDegrees(angle: number, incrementDeg: number) {
  const snapped = Math.round(angle / incrementDeg) * incrementDeg
  return (snapped + 360) % 360
}

export function projectPointOntoSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) {
    return start
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lenSq, 0, 1)

  return {
    x: start.x + t * dx,
    y: start.y + t * dy,
  }
}

export function distanceToSegment(point: Point, start: Point, end: Point) {
  const projection = projectPointOntoSegment(point, start, end)
  return distance(point, projection)
}

export function quadraticPoint(start: Point, control: Point, end: Point, t: number): Point {
  const oneMinusT = 1 - t
  const a = oneMinusT * oneMinusT
  const b = 2 * oneMinusT * t
  const c = t * t

  return {
    x: a * start.x + b * control.x + c * end.x,
    y: a * start.y + b * control.y + c * end.y,
  }
}

export function quadraticControlPointForThrough(
  start: Point,
  through: Point,
  end: Point,
): Point {
  return {
    x: 2 * through.x - (start.x + end.x) / 2,
    y: 2 * through.y - (start.y + end.y) / 2,
  }
}

export function sampleQuadraticPolyline(
  start: Point,
  control: Point,
  end: Point,
  segments = 24,
): Point[] {
  const points: Point[] = []
  const totalSegments = Math.max(1, Math.floor(segments))

  for (let i = 0; i <= totalSegments; i += 1) {
    points.push(quadraticPoint(start, control, end, i / totalSegments))
  }

  return points
}

export function nearestPointOnQuadratic(
  point: Point,
  start: Point,
  control: Point,
  end: Point,
  segments = 48,
): Point {
  const samples = sampleQuadraticPolyline(start, control, end, segments)
  let bestPoint = samples[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (let i = 1; i < samples.length; i += 1) {
    const projected = projectPointOntoSegment(point, samples[i - 1], samples[i])
    const d = distance(point, projected)

    if (d < bestDistance) {
      bestDistance = d
      bestPoint = projected
    }
  }

  return bestPoint
}

export function distanceToQuadratic(
  point: Point,
  start: Point,
  control: Point,
  end: Point,
  segments = 48,
): number {
  const nearest = nearestPointOnQuadratic(point, start, control, end, segments)
  return distance(point, nearest)
}

export function lineSegmentIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const denominator =
    (a1.x - a2.x) * (b1.y - b2.y) -
    (a1.y - a2.y) * (b1.x - b2.x)

  if (denominator === 0) {
    return null
  }

  const x =
    ((a1.x * a2.y - a1.y * a2.x) * (b1.x - b2.x) -
      (a1.x - a2.x) * (b1.x * b2.y - b1.y * b2.x)) /
    denominator
  const y =
    ((a1.x * a2.y - a1.y * a2.x) * (b1.y - b2.y) -
      (a1.y - a2.y) * (b1.x * b2.y - b1.y * b2.x)) /
    denominator

  const withinA =
    x >= Math.min(a1.x, a2.x) - 1e-9 &&
    x <= Math.max(a1.x, a2.x) + 1e-9 &&
    y >= Math.min(a1.y, a2.y) - 1e-9 &&
    y <= Math.max(a1.y, a2.y) + 1e-9
  const withinB =
    x >= Math.min(b1.x, b2.x) - 1e-9 &&
    x <= Math.max(b1.x, b2.x) + 1e-9 &&
    y >= Math.min(b1.y, b2.y) - 1e-9 &&
    y <= Math.max(b1.y, b2.y) + 1e-9

  if (!withinA || !withinB) {
    return null
  }

  return { x, y }
}

const TAU = Math.PI * 2

function normalizeRadians(radians: number): number {
  const normalized = radians % TAU
  return normalized < 0 ? normalized + TAU : normalized
}

function positiveAngleDelta(start: number, end: number): number {
  const normalizedStart = normalizeRadians(start)
  const normalizedEnd = normalizeRadians(end)
  const delta = normalizedEnd - normalizedStart
  return delta >= 0 ? delta : delta + TAU
}

export interface CircularArcGeometry {
  center: Point
  radius: number
  startAngle: number
  throughAngle: number
  endAngle: number
  sweepPositive: boolean
  sweepRadians: number
  largeArcFlag: 0 | 1
  sweepFlag: 0 | 1
}

export function circularArcGeometryFromThreePoints(
  start: Point,
  through: Point,
  end: Point,
  epsilon = 1e-6,
): CircularArcGeometry | null {
  if (
    distance(start, through) <= epsilon ||
    distance(start, end) <= epsilon ||
    distance(through, end) <= epsilon
  ) {
    return null
  }

  const ax = start.x
  const ay = start.y
  const bx = through.x
  const by = through.y
  const cx = end.x
  const cy = end.y

  const denominator =
    2 * (
      ax * (by - cy) +
      bx * (cy - ay) +
      cx * (ay - by)
    )

  if (Math.abs(denominator) <= epsilon) {
    return null
  }

  const aSq = ax * ax + ay * ay
  const bSq = bx * bx + by * by
  const cSq = cx * cx + cy * cy

  const centerX =
    (aSq * (by - cy) + bSq * (cy - ay) + cSq * (ay - by)) /
    denominator
  const centerY =
    (aSq * (cx - bx) + bSq * (ax - cx) + cSq * (bx - ax)) /
    denominator

  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    return null
  }

  const center = { x: centerX, y: centerY }
  const radius = distance(center, start)
  if (!Number.isFinite(radius) || radius <= epsilon) {
    return null
  }

  const startAngle = normalizeRadians(Math.atan2(start.y - center.y, start.x - center.x))
  const throughAngle = normalizeRadians(Math.atan2(through.y - center.y, through.x - center.x))
  const endAngle = normalizeRadians(Math.atan2(end.y - center.y, end.x - center.x))

  const ccwSpan = positiveAngleDelta(startAngle, endAngle)
  const ccwThrough = positiveAngleDelta(startAngle, throughAngle)
  const angleEpsilon = 1e-7

  if (ccwSpan <= angleEpsilon || ccwSpan >= TAU - angleEpsilon) {
    return null
  }

  const throughOnPositiveSweep = ccwThrough <= ccwSpan + angleEpsilon
  const sweepPositive = throughOnPositiveSweep
  const sweepRadians = sweepPositive ? ccwSpan : TAU - ccwSpan

  if (sweepRadians <= angleEpsilon || sweepRadians >= TAU - angleEpsilon) {
    return null
  }

  return {
    center,
    radius,
    startAngle,
    throughAngle,
    endAngle,
    sweepPositive,
    sweepRadians,
    largeArcFlag: sweepRadians > Math.PI ? 1 : 0,
    sweepFlag: sweepPositive ? 1 : 0,
  }
}

export function circularArcPathFromThreePoints(start: Point, through: Point, end: Point): string | null {
  const arc = circularArcGeometryFromThreePoints(start, through, end)
  if (!arc) {
    return null
  }

  return `M ${start.x} ${start.y} A ${arc.radius} ${arc.radius} 0 ${arc.largeArcFlag} ${arc.sweepFlag} ${end.x} ${end.y}`
}

export function sampleCircularArcPolyline(
  start: Point,
  through: Point,
  end: Point,
  segments = 32,
): Point[] {
  const arc = circularArcGeometryFromThreePoints(start, through, end)
  if (!arc) {
    return [start, end]
  }

  const totalSegments = Math.max(2, Math.floor(segments))
  const points: Point[] = []
  const direction = arc.sweepPositive ? 1 : -1

  for (let i = 0; i <= totalSegments; i += 1) {
    const t = i / totalSegments
    const angle = arc.startAngle + direction * arc.sweepRadians * t
    points.push({
      x: arc.center.x + Math.cos(angle) * arc.radius,
      y: arc.center.y + Math.sin(angle) * arc.radius,
    })
  }

  points[0] = { ...start }
  points[points.length - 1] = { ...end }
  return points
}

export function nearestPointOnCircularArc(
  point: Point,
  start: Point,
  through: Point,
  end: Point,
  segments = 96,
): Point {
  const samples = sampleCircularArcPolyline(start, through, end, segments)
  let bestPoint = samples[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (let i = 1; i < samples.length; i += 1) {
    const projected = projectPointOntoSegment(point, samples[i - 1], samples[i])
    const d = distance(point, projected)

    if (d < bestDistance) {
      bestDistance = d
      bestPoint = projected
    }
  }

  return bestPoint
}

export function distanceToCircularArc(
  point: Point,
  start: Point,
  through: Point,
  end: Point,
  segments = 96,
): number {
  const nearest = nearestPointOnCircularArc(point, start, through, end, segments)
  return distance(point, nearest)
}
