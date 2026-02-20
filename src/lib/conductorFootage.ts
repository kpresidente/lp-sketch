import type { LpProject, MaterialColor, Point, SymbolElement, SymbolType, WireClass } from '../types/project'
import { distance, circularArcGeometryFromThreePoints } from './geometry'

const MATERIAL_ORDER: MaterialColor[] = ['green', 'blue', 'purple', 'red', 'cyan']
const WIRE_CLASS_ORDER: WireClass[] = ['class1', 'class2']
const DOWNLEAD_TYPES = new Set<SymbolType>([
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
])
// Place the construction footage number slightly above-right of downlead symbols.
const DOWNLEAD_LABEL_OFFSET_X_PT = 8
const DOWNLEAD_LABEL_OFFSET_Y_PT = -14
const CURVE_FLATNESS_EPSILON_PT = 0.35
const CURVE_MAX_SUBDIVISION_DEPTH = 9

export interface ConductorMaterialSummary {
  material: MaterialColor
  wireClass: WireClass
  horizontalPt: number
  verticalFt: number
  hasHorizontal: boolean
  hasVerticalCarrier: boolean
}

export function isDownleadSymbolType(symbolType: SymbolType): boolean {
  return DOWNLEAD_TYPES.has(symbolType)
}

export function normalizeVerticalFootageFt(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return 0
  }

  const normalized = Math.round(Math.max(0, Math.min(999, value ?? 0)))
  return normalized
}

export function symbolVerticalFootageFt(symbol: Pick<SymbolElement, 'symbolType' | 'verticalFootageFt'>): number {
  if (!isDownleadSymbolType(symbol.symbolType)) {
    return 0
  }

  return normalizeVerticalFootageFt(symbol.verticalFootageFt)
}

export function downleadFootageLabelPosition(
  symbol: Pick<SymbolElement, 'symbolType' | 'position'>,
  annotationScale = 1,
): Point | null {
  if (!isDownleadSymbolType(symbol.symbolType)) {
    return null
  }

  return {
    x: symbol.position.x + DOWNLEAD_LABEL_OFFSET_X_PT * annotationScale,
    y: symbol.position.y + DOWNLEAD_LABEL_OFFSET_Y_PT * annotationScale,
  }
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function quadraticLengthAdaptiveRecursive(
  start: Point,
  control: Point,
  end: Point,
  depth: number,
): number {
  const chordLength = distance(start, end)
  const controlNetLength = distance(start, control) + distance(control, end)
  const flatnessError = controlNetLength - chordLength

  if (depth >= CURVE_MAX_SUBDIVISION_DEPTH || flatnessError <= CURVE_FLATNESS_EPSILON_PT) {
    return (chordLength + controlNetLength) / 2
  }

  const startControlMid = midpoint(start, control)
  const controlEndMid = midpoint(control, end)
  const split = midpoint(startControlMid, controlEndMid)

  return (
    quadraticLengthAdaptiveRecursive(start, startControlMid, split, depth + 1) +
    quadraticLengthAdaptiveRecursive(split, controlEndMid, end, depth + 1)
  )
}

export function quadraticLengthAdaptive(start: Point, control: Point, end: Point): number {
  return quadraticLengthAdaptiveRecursive(start, control, end, 0)
}

export function arcLengthFromThreePoints(start: Point, through: Point, end: Point): number {
  const geometry = circularArcGeometryFromThreePoints(start, through, end)
  if (!geometry) {
    return distance(start, end)
  }

  return geometry.radius * geometry.sweepRadians
}

function summaryKey(material: MaterialColor, wireClass: WireClass): string {
  return `${material}|${wireClass}`
}

export function summarizeConductorFootage(project: LpProject): ConductorMaterialSummary[] {
  const summaries = new Map<string, ConductorMaterialSummary>()

  for (const material of MATERIAL_ORDER) {
    for (const wireClass of WIRE_CLASS_ORDER) {
      summaries.set(summaryKey(material, wireClass), {
        material,
        wireClass,
        horizontalPt: 0,
        verticalFt: 0,
        hasHorizontal: false,
        hasVerticalCarrier: false,
      })
    }
  }

  for (const line of project.elements.lines) {
    const summary = summaries.get(summaryKey(line.color, line.class))
    if (!summary) {
      continue
    }
    summary.horizontalPt += distance(line.start, line.end)
    summary.hasHorizontal = true
  }

  for (const arc of project.elements.arcs) {
    const summary = summaries.get(summaryKey(arc.color, arc.class))
    if (!summary) {
      continue
    }
    summary.horizontalPt += arcLengthFromThreePoints(arc.start, arc.through, arc.end)
    summary.hasHorizontal = true
  }

  for (const curve of project.elements.curves) {
    const summary = summaries.get(summaryKey(curve.color, curve.class))
    if (!summary) {
      continue
    }
    summary.horizontalPt += quadraticLengthAdaptive(curve.start, curve.through, curve.end)
    summary.hasHorizontal = true
  }

  for (const symbol of project.elements.symbols) {
    if (!isDownleadSymbolType(symbol.symbolType)) {
      continue
    }

    const wireClass = symbol.class === 'class2' ? 'class2' : 'class1'
    const summary = summaries.get(summaryKey(symbol.color, wireClass))
    if (!summary) {
      continue
    }

    summary.hasVerticalCarrier = true
    summary.verticalFt += symbolVerticalFootageFt(symbol)
  }

  const ordered: ConductorMaterialSummary[] = []
  for (const material of MATERIAL_ORDER) {
    for (const wireClass of WIRE_CLASS_ORDER) {
      const summary = summaries.get(summaryKey(material, wireClass))
      if (summary) {
        ordered.push(summary)
      }
    }
  }

  return ordered
}
