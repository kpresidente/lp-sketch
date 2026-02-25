import type {
  ArcElement,
  ArrowElement,
  CurveElement,
  DimensionTextElement,
  LineElement,
  LpProject,
  MarkElement,
  Point,
  SymbolElement,
  TextElement,
  ViewState,
} from '../types/project'

export interface Rect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Compute the viewport rectangle in document coordinates.
 * Includes a screen-space margin (converted to doc space) to avoid popping
 * at viewport edges.
 */
export function viewportDocRect(
  view: ViewState,
  stageWidth: number,
  stageHeight: number,
  marginPx = 200,
): Rect {
  const marginDoc = marginPx / view.zoom
  return {
    minX: -view.pan.x / view.zoom - marginDoc,
    minY: -view.pan.y / view.zoom - marginDoc,
    maxX: (stageWidth - view.pan.x) / view.zoom + marginDoc,
    maxY: (stageHeight - view.pan.y) / view.zoom + marginDoc,
  }
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

function pointInRect(p: Point, viewport: Rect, padding: number): boolean {
  return (
    p.x + padding >= viewport.minX &&
    p.x - padding <= viewport.maxX &&
    p.y + padding >= viewport.minY &&
    p.y - padding <= viewport.maxY
  )
}

function segmentBounds(a: Point, b: Point): Rect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  }
}

function threePointBounds(a: Point, b: Point, c: Point): Rect {
  return {
    minX: Math.min(a.x, b.x, c.x),
    minY: Math.min(a.y, b.y, c.y),
    maxX: Math.max(a.x, b.x, c.x),
    maxY: Math.max(a.y, b.y, c.y),
  }
}

function lineInViewport(el: LineElement, viewport: Rect): boolean {
  return rectsOverlap(segmentBounds(el.start, el.end), viewport)
}

function arcInViewport(el: ArcElement, viewport: Rect): boolean {
  return rectsOverlap(threePointBounds(el.start, el.through, el.end), viewport)
}

function curveInViewport(el: CurveElement, viewport: Rect): boolean {
  return rectsOverlap(threePointBounds(el.start, el.through, el.end), viewport)
}

// Ground rod extends ~35 * scale below position; generous base padding covers all symbol types.
const SYMBOL_PADDING_BASE = 50

function symbolInViewport(el: SymbolElement, viewport: Rect, symbolPadding: number): boolean {
  return pointInRect(el.position, viewport, symbolPadding)
}

function textInViewport(el: TextElement, viewport: Rect, textPadding: number): boolean {
  return pointInRect(el.position, viewport, textPadding)
}

function arrowInViewport(el: ArrowElement, viewport: Rect): boolean {
  return rectsOverlap(segmentBounds(el.tail, el.head), viewport)
}

function dimensionTextInViewport(el: DimensionTextElement, viewport: Rect): boolean {
  return rectsOverlap(threePointBounds(el.start, el.end, el.position), viewport)
}

function markInViewport(el: MarkElement, viewport: Rect, padding: number): boolean {
  return pointInRect(el.position, viewport, padding)
}

/**
 * Filter a project's renderable element arrays to only include items whose
 * bounding geometry overlaps the current viewport.
 *
 * Legend and general-note placements are always kept (few in number, complex sizing).
 */
export function filterProjectByViewport(
  project: LpProject,
  viewport: Rect,
  annotationScale: number,
): LpProject {
  const symbolPad = SYMBOL_PADDING_BASE * annotationScale
  const textPad = 40 * annotationScale
  const markPad = 20 * annotationScale

  return {
    ...project,
    elements: {
      ...project.elements,
      lines: project.elements.lines.filter((el) => lineInViewport(el, viewport)),
      arcs: project.elements.arcs.filter((el) => arcInViewport(el, viewport)),
      curves: project.elements.curves.filter((el) => curveInViewport(el, viewport)),
      symbols: project.elements.symbols.filter((el) => symbolInViewport(el, viewport, symbolPad)),
      texts: project.elements.texts.filter((el) => textInViewport(el, viewport, textPad)),
      arrows: project.elements.arrows.filter((el) => arrowInViewport(el, viewport)),
      dimensionTexts: project.elements.dimensionTexts.filter((el) =>
        dimensionTextInViewport(el, viewport),
      ),
    },
    construction: {
      ...project.construction,
      marks: project.construction.marks.filter((el) => markInViewport(el, viewport, markPad)),
    },
    // Legend and general-note placements are always included.
  }
}

export { SYMBOL_PADDING_BASE }
