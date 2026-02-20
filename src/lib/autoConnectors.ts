import type {
  AutoConnectorType,
  LpProject,
  MaterialColor,
  Point,
  SymbolElement,
  WireClass,
} from '../types/project'
import {
  distance,
  distanceToCircularArc,
  distanceToSegment,
  lineSegmentIntersection,
  sampleCircularArcPolyline,
} from './geometry'

const NODE_CLUSTER_EPSILON_PT = 0.75
const NODE_TOUCH_EPSILON_PT = 0.9
const ARC_INTERSECTION_SAMPLE_STEPS = 56

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface LineConductor {
  kind: 'line'
  id: string
  start: Point
  end: Point
  bounds: Bounds
  color: MaterialColor
  class: WireClass
}

interface ArcConductor {
  kind: 'arc'
  id: string
  start: Point
  through: Point
  end: Point
  polyline: Point[]
  bounds: Bounds
  color: MaterialColor
  class: WireClass
}

type Conductor = LineConductor | ArcConductor

export interface AutoConnectorNode {
  position: Point
  color: MaterialColor
  connectorClass: WireClass
}

function clusterPoints(points: Point[], epsilon: number): Point[] {
  const clusters: Array<{ points: Point[]; center: Point }> = []

  for (const point of points) {
    let matchedCluster: { points: Point[]; center: Point } | null = null
    for (const cluster of clusters) {
      if (distance(cluster.center, point) <= epsilon) {
        matchedCluster = cluster
        break
      }
    }

    if (!matchedCluster) {
      clusters.push({
        points: [{ ...point }],
        center: { ...point },
      })
      continue
    }

    matchedCluster.points.push({ ...point })
    const count = matchedCluster.points.length
    const sum = matchedCluster.points.reduce(
      (acc, next) => ({ x: acc.x + next.x, y: acc.y + next.y }),
      { x: 0, y: 0 },
    )
    matchedCluster.center = {
      x: sum.x / count,
      y: sum.y / count,
    }
  }

  return clusters.map((cluster) => cluster.center)
}

function boundsForSegment(start: Point, end: Point): Bounds {
  return {
    minX: Math.min(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxX: Math.max(start.x, end.x),
    maxY: Math.max(start.y, end.y),
  }
}

function boundsForPolyline(points: Point[]): Bounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i]
    if (point.x < minX) {
      minX = point.x
    }
    if (point.y < minY) {
      minY = point.y
    }
    if (point.x > maxX) {
      maxX = point.x
    }
    if (point.y > maxY) {
      maxY = point.y
    }
  }

  return { minX, minY, maxX, maxY }
}

function boundsOverlap(a: Bounds, b: Bounds, padding = 0): boolean {
  return !(
    a.maxX + padding < b.minX ||
    b.maxX + padding < a.minX ||
    a.maxY + padding < b.minY ||
    b.maxY + padding < a.minY
  )
}

function pointInBounds(point: Point, bounds: Bounds, padding = 0): boolean {
  return (
    point.x >= bounds.minX - padding &&
    point.x <= bounds.maxX + padding &&
    point.y >= bounds.minY - padding &&
    point.y <= bounds.maxY + padding
  )
}

function inScopeArcs(project: LpProject): ArcConductor[] {
  return project.elements.arcs.map<ArcConductor>((arc) => {
    const polyline = sampleCircularArcPolyline(
      arc.start,
      arc.through,
      arc.end,
      ARC_INTERSECTION_SAMPLE_STEPS,
    )

    return {
      kind: 'arc',
      id: arc.id,
      start: arc.start,
      through: arc.through,
      end: arc.end,
      polyline,
      bounds: boundsForPolyline(polyline),
      color: arc.color,
      class: arc.class,
    }
  })
}

function endpointCandidates(conductors: Conductor[]): Point[] {
  const points: Point[] = []
  for (const conductor of conductors) {
    points.push({ ...conductor.start })
    points.push({ ...conductor.end })
  }
  return points
}

function lineLineIntersections(lines: LineConductor[]): Point[] {
  const points: Point[] = []
  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      if (!boundsOverlap(lines[i].bounds, lines[j].bounds, NODE_TOUCH_EPSILON_PT)) {
        continue
      }

      const intersection = lineSegmentIntersection(
        lines[i].start,
        lines[i].end,
        lines[j].start,
        lines[j].end,
      )
      if (intersection) {
        points.push(intersection)
      }
    }
  }
  return points
}

function lineArcIntersections(lines: LineConductor[], arcs: ArcConductor[]): Point[] {
  const points: Point[] = []

  for (const line of lines) {
    const lineBounds = line.bounds
    for (const arc of arcs) {
      if (!boundsOverlap(lineBounds, arc.bounds, NODE_TOUCH_EPSILON_PT)) {
        continue
      }

      for (let i = 1; i < arc.polyline.length; i += 1) {
        const intersection = lineSegmentIntersection(
          line.start,
          line.end,
          arc.polyline[i - 1],
          arc.polyline[i],
        )
        if (intersection) {
          points.push(intersection)
        }
      }
    }
  }

  return points
}

function resolveConnectorMaterial(colors: Set<MaterialColor>): MaterialColor {
  const hasAluminum = colors.has('blue')
  const hasCopperFamily = colors.has('green') || colors.has('cyan') || colors.has('red')
  if (hasAluminum && hasCopperFamily) {
    return 'purple'
  }

  if (colors.has('red')) {
    return 'red'
  }
  if (colors.has('cyan')) {
    return 'cyan'
  }
  if (colors.has('green')) {
    return 'green'
  }
  if (colors.has('blue')) {
    return 'blue'
  }
  return 'purple'
}

function resolveConnectorClass(classes: Set<WireClass>): WireClass {
  return classes.has('class2') ? 'class2' : 'class1'
}

function conductorBranchContribution(conductor: Conductor, node: Point): number {
  if (!pointInBounds(node, conductor.bounds, NODE_TOUCH_EPSILON_PT)) {
    return 0
  }

  const onStart = distance(conductor.start, node) <= NODE_TOUCH_EPSILON_PT
  const onEnd = distance(conductor.end, node) <= NODE_TOUCH_EPSILON_PT
  let contribution = 0

  if (onStart) {
    contribution += 1
  }
  if (onEnd && !onStart) {
    contribution += 1
  }
  if (!onStart && !onEnd) {
    if (conductor.kind === 'line') {
      if (distanceToSegment(node, conductor.start, conductor.end) <= NODE_TOUCH_EPSILON_PT) {
        contribution += 2
      }
    } else if (
      distanceToCircularArc(node, conductor.start, conductor.through, conductor.end, 96)
      <= NODE_TOUCH_EPSILON_PT
    ) {
      contribution += 2
    }
  }

  return contribution
}

export function computeAutoConnectorNodes(project: LpProject): AutoConnectorNode[] {
  const arcs = inScopeArcs(project)
  const lineConductors = project.elements.lines.map<LineConductor>((line) => ({
    kind: 'line',
    id: line.id,
    start: line.start,
    end: line.end,
    bounds: boundsForSegment(line.start, line.end),
    color: line.color,
    class: line.class,
  }))
  const conductors: Conductor[] = [...lineConductors, ...arcs]
  const candidates = [
    ...endpointCandidates(conductors),
    ...lineLineIntersections(lineConductors),
    ...lineArcIntersections(lineConductors, arcs),
  ]
  const nodes = clusterPoints(candidates, NODE_CLUSTER_EPSILON_PT)
  const connectors: AutoConnectorNode[] = []

  for (const node of nodes) {
    let branchCount = 0
    const classes = new Set<WireClass>()
    const colors = new Set<MaterialColor>()

    for (const conductor of conductors) {
      const contribution = conductorBranchContribution(conductor, node)
      if (contribution <= 0) {
        continue
      }

      branchCount += contribution
      classes.add(conductor.class)
      colors.add(conductor.color)
    }

    if (branchCount < 3 || colors.size === 0 || classes.size === 0) {
      continue
    }

    connectors.push({
      position: node,
      color: resolveConnectorMaterial(colors),
      connectorClass: resolveConnectorClass(classes),
    })
  }

  connectors.sort((a, b) => {
    if (Math.abs(a.position.y - b.position.y) > 1e-6) {
      return a.position.y - b.position.y
    }
    if (Math.abs(a.position.x - b.position.x) > 1e-6) {
      return a.position.x - b.position.x
    }
    return a.color.localeCompare(b.color)
  })

  return connectors
}

function autoConnectorSymbolType(connectorType: AutoConnectorType): SymbolElement['symbolType'] {
  return connectorType === 'cadweld'
    ? 'cadweld_connection'
    : 'cable_to_cable_connection'
}

function autoConnectorId(position: Point, color: MaterialColor): string {
  const x = Math.round(position.x * 10)
  const y = Math.round(position.y * 10)
  return `auto-connector-${x}-${y}-${color}`
}

export function buildAutoConnectorSymbols(
  project: LpProject,
  connectorType: AutoConnectorType = project.settings.autoConnectorType,
): SymbolElement[] {
  const nodes = computeAutoConnectorNodes(project)

  return nodes.map((node) => ({
    id: autoConnectorId(node.position, node.color),
    symbolType: autoConnectorSymbolType(connectorType),
    position: node.position,
    color: node.color,
    class: node.connectorClass,
    autoConnector: true,
  }))
}

export function stripAutoConnectorSymbols(symbols: SymbolElement[]): SymbolElement[] {
  return symbols.filter((symbol) => {
    if (!symbol.autoConnector) {
      return true
    }

    return (
      symbol.symbolType !== 'cable_to_cable_connection' &&
      symbol.symbolType !== 'cadweld_connection'
    )
  })
}
