import { describe, expect, it } from 'vitest'
import {
  angleDegrees,
  circularArcGeometryFromThreePoints,
  circularArcPathFromThreePoints,
  clamp,
  distanceToCircularArc,
  distanceToQuadratic,
  distanceToSegment,
  docToScreen,
  eventToScreenPoint,
  lineSegmentIntersection,
  nearestPointOnCircularArc,
  nearestPointOnQuadratic,
  projectPointOntoSegment,
  quadraticControlPointForThrough,
  quadraticPoint,
  sampleCircularArcPolyline,
  sampleQuadraticPolyline,
  screenToDoc,
  snapAngleDegrees,
} from './geometry'
import type { Point, ViewState } from '../types/project'

function expectPointClose(actual: Point, expected: Point, epsilon = 1e-9) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(epsilon)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(epsilon)
}

describe('coordinate transforms', () => {
  const view: ViewState = {
    zoom: 2.5,
    pan: { x: 120, y: -40 },
  }

  it('maps document points into screen space', () => {
    const screen = docToScreen({ x: 10, y: 20 }, view)
    expectPointClose(screen, { x: 145, y: 10 })
  })

  it('maps screen points back into document space', () => {
    const doc = screenToDoc({ x: 145, y: 10 }, view)
    expectPointClose(doc, { x: 10, y: 20 })
  })

  it('roundtrips doc -> screen -> doc across representative points', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 15.25, y: -9.75 },
      { x: 4096.5, y: 2048.25 },
    ]

    for (const point of points) {
      const screen = docToScreen(point, view)
      const roundTrip = screenToDoc(screen, view)
      expectPointClose(roundTrip, point)
    }
  })

  it('converts pointer event coordinates into local screen coordinates', () => {
    const point = eventToScreenPoint(
      {
        clientX: 512,
        clientY: 308,
      } as PointerEvent,
      { left: 500, top: 300 },
    )

    expectPointClose(point, { x: 12, y: 8 })
  })
})

describe('geometry helpers', () => {
  it('clamps values into an inclusive range', () => {
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(4, 0, 10)).toBe(4)
    expect(clamp(25, 0, 10)).toBe(10)
  })

  it('computes and snaps angles with wrap-around', () => {
    expect(angleDegrees({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180)
    expect(angleDegrees({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(270)

    expect(snapAngleDegrees(359, 15)).toBe(0)
    expect(snapAngleDegrees(8, 15)).toBe(15)
    expect(snapAngleDegrees(7, 15)).toBe(0)
  })

  it('projects points onto line segments and handles zero-length segments', () => {
    expectPointClose(
      projectPointOntoSegment(
        { x: 3, y: 4 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ),
      { x: 3, y: 0 },
    )

    expectPointClose(
      projectPointOntoSegment(
        { x: 10, y: 12 },
        { x: 5, y: 6 },
        { x: 5, y: 6 },
      ),
      { x: 5, y: 6 },
    )

    expect(
      distanceToSegment(
        { x: 3, y: 4 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ),
    ).toBeCloseTo(4)
  })

  it('samples quadratic curves with at least one segment', () => {
    const midpoint = quadraticPoint(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
      0.5,
    )
    expectPointClose(midpoint, { x: 10, y: 5 })

    const samples = sampleQuadraticPolyline(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
      0,
    )

    expect(samples).toHaveLength(2)
    expectPointClose(samples[0], { x: 0, y: 0 })
    expectPointClose(samples[1], { x: 20, y: 0 })
  })

  it('derives a quadratic control point so the curve passes through the clicked middle point', () => {
    const start = { x: 20, y: 40 }
    const through = { x: 80, y: 30 }
    const end = { x: 140, y: 110 }
    const control = quadraticControlPointForThrough(start, through, end)

    const midpointOnCurve = quadraticPoint(start, control, end, 0.5)
    expectPointClose(midpointOnCurve, through, 1e-9)
  })

  it('finds nearest points and distances for quadratic paths', () => {
    const nearest = nearestPointOnQuadratic(
      { x: 4, y: 3 },
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    )
    expectPointClose(nearest, { x: 4, y: 0 }, 0.05)

    const d = distanceToQuadratic(
      { x: 4, y: 3 },
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    )
    expect(d).toBeCloseTo(3, 2)
  })

  it('derives circular arc geometry from three points, including major arcs', () => {
    const start = { x: 400, y: 300 }
    const through = { x: 350, y: 214 }
    const end = { x: 350, y: 386 }

    const geometry = circularArcGeometryFromThreePoints(start, through, end)
    expect(geometry).not.toBeNull()
    if (!geometry) {
      return
    }

    expect(geometry.radius).toBeGreaterThan(1)
    expect(geometry.sweepRadians).toBeGreaterThan(Math.PI)
    expect(geometry.largeArcFlag).toBe(1)

    const path = circularArcPathFromThreePoints(start, through, end)
    expect(path).toContain(' A ')
  })

  it('samples and measures nearest distance for circular arcs', () => {
    const start = { x: 300, y: 260 }
    const through = { x: 360, y: 210 }
    const end = { x: 430, y: 260 }

    const samples = sampleCircularArcPolyline(start, through, end, 10)
    expect(samples).toHaveLength(11)
    expectPointClose(samples[0], start, 1e-6)
    expectPointClose(samples[samples.length - 1], end, 1e-6)

    const nearest = nearestPointOnCircularArc(
      { x: 360, y: 235 },
      start,
      through,
      end,
      64,
    )
    const d = distanceToCircularArc(
      { x: 360, y: 235 },
      start,
      through,
      end,
      64,
    )

    expect(nearest.x).toBeGreaterThan(300)
    expect(nearest.x).toBeLessThan(430)
    expect(d).toBeGreaterThanOrEqual(0)
    expect(d).toBeLessThan(40)
  })

  it('computes line segment intersections only when both segments overlap at the intersection', () => {
    const crossing = lineSegmentIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 10, y: 0 },
    )
    expect(crossing).not.toBeNull()
    expectPointClose(crossing as Point, { x: 5, y: 5 }, 1e-6)

    const parallel = lineSegmentIntersection(
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    )
    expect(parallel).toBeNull()

    const outOfRange = lineSegmentIntersection(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: -1 },
      { x: 2, y: 1 },
    )
    expect(outOfRange).toBeNull()
  })
})
