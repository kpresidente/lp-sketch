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
  distanceToSegment,
  lineSegmentIntersection,
  sampleCircularArcPolyline,
  sampleQuadraticPolyline,
} from './geometry'

const NODE_CLUSTER_EPSILON_PT = 0.75
const NODE_TOUCH_EPSILON_PT = 0.9
const CONNECTOR_DEDUPE_EPSILON_PT = 1
const ARC_INTERSECTION_SAMPLE_STEPS = 56
const CURVE_INTERSECTION_SAMPLE_STEPS = 56

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface Conductor {
  kind: 'line' | 'arc' | 'curve'
  id: string
  start: Point
  end: Point
  page: number
  polyline: Point[]
  bounds: Bounds
  color: MaterialColor
  class: WireClass
}

export type AutoConnectorJunction = 'tee' | 'crossrun'

export interface AutoConnectorNode {
  position: Point
  color: MaterialColor
  connectorClass: WireClass
  page: number
  junction: AutoConnectorJunction
}

export interface AddedConductorRef {
  kind: 'line' | 'arc' | 'curve'
  id: string
}

const AUTO_CONNECTOR_SYMBOL_TYPES = new Set<SymbolElement['symbolType']>([
  'cable_to_cable_connection',
  'cadweld_connection',
  'mechanical_crossrun_connection',
  'cadweld_crossrun_connection',
])

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

function samplePolylineDistance(point: Point, polyline: Point[]): number {
  if (polyline.length < 2) {
    return Number.POSITIVE_INFINITY
  }

  let nearest = Number.POSITIVE_INFINITY
  for (let i = 1; i < polyline.length; i += 1) {
    nearest = Math.min(nearest, distanceToSegment(point, polyline[i - 1], polyline[i]))
  }
  return nearest
}

function inScopeConductors(project: LpProject): Conductor[] {
  const lines = project.elements.lines.map<Conductor>((line) => {
    const polyline = [line.start, line.end]
    return {
      kind: 'line',
      id: line.id,
      start: line.start,
      end: line.end,
      page: line.page ?? 1,
      polyline,
      bounds: boundsForPolyline(polyline),
      color: line.color,
      class: line.class,
    }
  })

  const arcs = project.elements.arcs.map<Conductor>((arc) => {
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
      end: arc.end,
      page: arc.page ?? 1,
      polyline,
      bounds: boundsForPolyline(polyline),
      color: arc.color,
      class: arc.class,
    }
  })

  const curves = project.elements.curves.map<Conductor>((curve) => {
    const polyline = sampleQuadraticPolyline(
      curve.start,
      curve.through,
      curve.end,
      CURVE_INTERSECTION_SAMPLE_STEPS,
    )
    return {
      kind: 'curve',
      id: curve.id,
      start: curve.start,
      end: curve.end,
      page: curve.page ?? 1,
      polyline,
      bounds: boundsForPolyline(polyline),
      color: curve.color,
      class: curve.class,
    }
  })

  return [...lines, ...arcs, ...curves]
}

function intersectionsBetweenConductors(a: Conductor, b: Conductor): Point[] {
  const intersections: Point[] = []

  for (let i = 1; i < a.polyline.length; i += 1) {
    const aStart = a.polyline[i - 1]
    const aEnd = a.polyline[i]
    for (let j = 1; j < b.polyline.length; j += 1) {
      const bStart = b.polyline[j - 1]
      const bEnd = b.polyline[j]
      const intersection = lineSegmentIntersection(aStart, aEnd, bStart, bEnd)
      if (intersection) {
        intersections.push(intersection)
      }
    }
  }

  return intersections
}

function endpointCandidates(conductors: Conductor[]): Point[] {
  const points: Point[] = []
  for (const conductor of conductors) {
    points.push({ ...conductor.start })
    points.push({ ...conductor.end })
  }
  return points
}

function allPairIntersections(conductors: Conductor[]): Point[] {
  const points: Point[] = []

  for (let i = 0; i < conductors.length; i += 1) {
    for (let j = i + 1; j < conductors.length; j += 1) {
      if (!boundsOverlap(conductors[i].bounds, conductors[j].bounds, NODE_TOUCH_EPSILON_PT)) {
        continue
      }

      points.push(...intersectionsBetweenConductors(conductors[i], conductors[j]))
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
  if (colors.has('green') || colors.has('cyan')) {
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
    const onConductor = samplePolylineDistance(node, conductor.polyline) <= NODE_TOUCH_EPSILON_PT
    if (onConductor) {
      contribution += 2
    }
  }

  return contribution
}

function junctionForBranchCount(branchCount: number): AutoConnectorJunction | null {
  if (branchCount < 3) {
    return null
  }

  return branchCount >= 4 ? 'crossrun' : 'tee'
}

function resolveNodeFromPoint(
  node: Point,
  conductors: Conductor[],
  page: number,
): AutoConnectorNode | null {
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

  const junction = junctionForBranchCount(branchCount)
  if (!junction || colors.size === 0 || classes.size === 0) {
    return null
  }

  return {
    position: node,
    color: resolveConnectorMaterial(colors),
    connectorClass: resolveConnectorClass(classes),
    page,
    junction,
  }
}

function sortNodes(nodes: AutoConnectorNode[]): AutoConnectorNode[] {
  return [...nodes].sort((a, b) => {
    if (a.page !== b.page) {
      return a.page - b.page
    }
    if (Math.abs(a.position.y - b.position.y) > 1e-6) {
      return a.position.y - b.position.y
    }
    if (Math.abs(a.position.x - b.position.x) > 1e-6) {
      return a.position.x - b.position.x
    }
    const colorOrder = a.color.localeCompare(b.color)
    if (colorOrder !== 0) {
      return colorOrder
    }
    return a.junction.localeCompare(b.junction)
  })
}

function autoConnectorSymbolType(
  connectorType: AutoConnectorType,
  junction: AutoConnectorJunction,
): SymbolElement['symbolType'] {
  if (connectorType === 'cadweld') {
    return junction === 'crossrun'
      ? 'cadweld_crossrun_connection'
      : 'cadweld_connection'
  }

  return junction === 'crossrun'
    ? 'mechanical_crossrun_connection'
    : 'cable_to_cable_connection'
}

function autoConnectorId(
  position: Point,
  color: MaterialColor,
  page: number,
  junction: AutoConnectorJunction,
  connectorType: AutoConnectorType,
): string {
  const x = Math.round(position.x * 10)
  const y = Math.round(position.y * 10)
  const mode = connectorType === 'cadweld' ? 'c' : 'm'
  return `auto-connector-p${page}-${x}-${y}-${color}-${junction}-${mode}`
}

function hasConnectorNear(
  symbols: readonly SymbolElement[],
  position: Point,
  page: number,
): boolean {
  return symbols.some((symbol) =>
    AUTO_CONNECTOR_SYMBOL_TYPES.has(symbol.symbolType) &&
    (symbol.page ?? 1) === page &&
    distance(symbol.position, position) <= CONNECTOR_DEDUPE_EPSILON_PT,
  )
}

function findConductorByRef(
  conductors: readonly Conductor[],
  ref: AddedConductorRef,
): Conductor | null {
  const match = conductors.find((conductor) => conductor.kind === ref.kind && conductor.id === ref.id)
  return match ?? null
}

function candidatesForAddedConductor(
  addedConductor: Conductor,
  conductorsOnPage: readonly Conductor[],
): Point[] {
  const points: Point[] = [
    { ...addedConductor.start },
    { ...addedConductor.end },
  ]

  for (const conductor of conductorsOnPage) {
    if (conductor.id === addedConductor.id && conductor.kind === addedConductor.kind) {
      continue
    }

    if (!boundsOverlap(addedConductor.bounds, conductor.bounds, NODE_TOUCH_EPSILON_PT)) {
      continue
    }

    points.push(...intersectionsBetweenConductors(addedConductor, conductor))
  }

  return clusterPoints(points, NODE_CLUSTER_EPSILON_PT)
}

export function isAutoConnectorSymbolType(symbolType: SymbolElement['symbolType']): boolean {
  return AUTO_CONNECTOR_SYMBOL_TYPES.has(symbolType)
}

export function computeAutoConnectorNodes(project: LpProject): AutoConnectorNode[] {
  const conductors = inScopeConductors(project)
  const conductorsByPage = new Map<number, Conductor[]>()

  for (const conductor of conductors) {
    const existing = conductorsByPage.get(conductor.page)
    if (existing) {
      existing.push(conductor)
    } else {
      conductorsByPage.set(conductor.page, [conductor])
    }
  }

  const nodes: AutoConnectorNode[] = []
  for (const [page, conductorsOnPage] of conductorsByPage.entries()) {
    const candidates = clusterPoints(
      [
        ...endpointCandidates(conductorsOnPage),
        ...allPairIntersections(conductorsOnPage),
      ],
      NODE_CLUSTER_EPSILON_PT,
    )

    for (const candidate of candidates) {
      const node = resolveNodeFromPoint(candidate, conductorsOnPage, page)
      if (!node) {
        continue
      }
      nodes.push(node)
    }
  }

  return sortNodes(nodes)
}

export function buildAutoConnectorSymbols(
  project: LpProject,
  connectorType: AutoConnectorType = project.settings.autoConnectorType,
): SymbolElement[] {
  const nodes = computeAutoConnectorNodes(project)

  return nodes.map((node) => ({
    id: autoConnectorId(node.position, node.color, node.page, node.junction, connectorType),
    symbolType: autoConnectorSymbolType(connectorType, node.junction),
    position: node.position,
    page: node.page,
    color: node.color,
    class: node.connectorClass,
    autoConnector: true,
  }))
}

export function buildAutoConnectorSymbolsForAddedConductors(
  project: LpProject,
  addedConductors: readonly AddedConductorRef[],
  connectorType: AutoConnectorType = project.settings.autoConnectorType,
): SymbolElement[] {
  if (!project.settings.autoConnectorsEnabled || addedConductors.length === 0) {
    return []
  }

  const conductors = inScopeConductors(project)
  if (conductors.length === 0) {
    return []
  }

  const conductorsByPage = new Map<number, Conductor[]>()
  for (const conductor of conductors) {
    const existing = conductorsByPage.get(conductor.page)
    if (existing) {
      existing.push(conductor)
    } else {
      conductorsByPage.set(conductor.page, [conductor])
    }
  }

  const pending: SymbolElement[] = []
  for (const conductorRef of addedConductors) {
    const addedConductor = findConductorByRef(conductors, conductorRef)
    if (!addedConductor) {
      continue
    }

    const conductorsOnPage = conductorsByPage.get(addedConductor.page)
    if (!conductorsOnPage || conductorsOnPage.length === 0) {
      continue
    }

    const candidates = candidatesForAddedConductor(addedConductor, conductorsOnPage)
    for (const candidate of candidates) {
      const node = resolveNodeFromPoint(candidate, conductorsOnPage, addedConductor.page)
      if (!node) {
        continue
      }

      if (
        hasConnectorNear(project.elements.symbols, node.position, node.page) ||
        hasConnectorNear(pending, node.position, node.page)
      ) {
        continue
      }

      pending.push({
        id: autoConnectorId(node.position, node.color, node.page, node.junction, connectorType),
        symbolType: autoConnectorSymbolType(connectorType, node.junction),
        position: node.position,
        page: node.page,
        color: node.color,
        class: node.connectorClass,
        autoConnector: true,
      })
    }
  }

  return [...pending].sort((a, b) => {
    const pageA = a.page ?? 1
    const pageB = b.page ?? 1
    if (pageA !== pageB) {
      return pageA - pageB
    }
    if (Math.abs(a.position.y - b.position.y) > 1e-6) {
      return a.position.y - b.position.y
    }
    if (Math.abs(a.position.x - b.position.x) > 1e-6) {
      return a.position.x - b.position.x
    }
    const colorOrder = a.color.localeCompare(b.color)
    if (colorOrder !== 0) {
      return colorOrder
    }
    return a.symbolType.localeCompare(b.symbolType)
  })
}

export function stripAutoConnectorSymbols(symbols: SymbolElement[]): SymbolElement[] {
  return symbols.filter((symbol) => !symbol.autoConnector || !AUTO_CONNECTOR_SYMBOL_TYPES.has(symbol.symbolType))
}
