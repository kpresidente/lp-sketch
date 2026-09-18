import { describe, expect, it } from 'vitest'
import type { Point } from '../types/project'
import {
  computeArcAutoSpacingPoints,
  computeLinearAutoSpacingPoints,
} from './spacing'

function expectPointClose(actual: Point, expected: Point, epsilon = 1e-6) {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(epsilon)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(epsilon)
}

describe('computeLinearAutoSpacingPoints', () => {
  it('computes open-path spacing with inside corner pass-through', () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]
    const corners = ['outside', 'inside', 'outside'] as const

    const points = computeLinearAutoSpacingPoints(vertices, [...corners], false, 6)

    expect(points).toHaveLength(5)
    expectPointClose(points[0], { x: 0, y: 0 })
    expectPointClose(points[1], { x: 5, y: 0 })
    expectPointClose(points[2], { x: 10, y: 0 })
    expectPointClose(points[3], { x: 10, y: 5 })
    expectPointClose(points[4], { x: 10, y: 10 })
  })

  it('splits open-path anchors at outside corners', () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]
    const corners = ['outside', 'outside', 'outside'] as const

    const points = computeLinearAutoSpacingPoints(vertices, [...corners], false, 6)

    expect(points).toHaveLength(5)
    expectPointClose(points[0], { x: 0, y: 0 })
    expectPointClose(points[2], { x: 10, y: 0 })
    expectPointClose(points[4], { x: 10, y: 10 })
  })

  it('computes closed-path spacing between outside anchors', () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const corners = ['outside', 'outside', 'outside', 'outside'] as const

    const points = computeLinearAutoSpacingPoints(vertices, [...corners], true, 7)

    expect(points).toHaveLength(8)

    const hasMidTop = points.some((point) => Math.abs(point.x - 5) < 1e-6 && Math.abs(point.y - 0) < 1e-6)
    const hasMidRight = points.some((point) => Math.abs(point.x - 10) < 1e-6 && Math.abs(point.y - 5) < 1e-6)
    const hasMidBottom = points.some((point) => Math.abs(point.x - 5) < 1e-6 && Math.abs(point.y - 10) < 1e-6)
    const hasMidLeft = points.some((point) => Math.abs(point.x - 0) < 1e-6 && Math.abs(point.y - 5) < 1e-6)

    expect(hasMidTop).toBe(true)
    expect(hasMidRight).toBe(true)
    expect(hasMidBottom).toBe(true)
    expect(hasMidLeft).toBe(true)
  })

  it('dedupes nearly overlapping points with fixed epsilon', () => {
    const vertices: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const corners = ['outside', 'inside', 'inside', 'inside'] as const

    const points = computeLinearAutoSpacingPoints(vertices, [...corners], true, 100)

    expect(points).toHaveLength(1)
    expectPointClose(points[0], { x: 0, y: 0 })
  })
})

describe('computeArcAutoSpacingPoints', () => {
  it('returns evenly spaced points on a circular arc including both endpoints', () => {
    const start = { x: 0, y: 0 }
    const through = { x: 5, y: -5 }
    const end = { x: 10, y: 0 }

    const points = computeArcAutoSpacingPoints(start, through, end, 4)
    expect(points.length).toBeGreaterThanOrEqual(3)
    expectPointClose(points[0], start)
    expectPointClose(points[points.length - 1], end)

    const segmentLengths: number[] = []
    for (let i = 1; i < points.length; i += 1) {
      segmentLengths.push(Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
    }

    const avgLength =
      segmentLengths.reduce((sum, value) => sum + value, 0) / segmentLengths.length
    for (const length of segmentLengths) {
      expect(Math.abs(length - avgLength)).toBeLessThan(0.75)
    }
  })

  it('supports major arcs greater than 180 degrees', () => {
    const start = { x: 1, y: 0 }
    const through = { x: -1, y: 0 }
    const end = { x: 0, y: 1 }

    const majorPoints = computeArcAutoSpacingPoints(start, through, end, 0.5)
    const minorPoints = computeArcAutoSpacingPoints(
      start,
      { x: Math.SQRT1_2, y: Math.SQRT1_2 },
      end,
      0.5,
    )

    expect(majorPoints.length).toBeGreaterThan(minorPoints.length)
    expectPointClose(majorPoints[0], start)
    expectPointClose(majorPoints[majorPoints.length - 1], end)
  })
})
