import { COLOR_HEX } from '../../model/defaultProject'
import { resolvedSymbolClass } from '../../lib/symbolClass'
import type { SymbolElement } from '../../types/project'

const ANNOTATION_SYMBOL_COLOR = '#111827'
const LETTERED_AIR_TERMINAL_SYMBOLS = new Set<SymbolElement['symbolType']>([
  'air_terminal',
  'bonded_air_terminal',
])

function colorFor(material: keyof typeof COLOR_HEX) {
  return COLOR_HEX[material]
}

function classFill(className: SymbolElement['class'], color: string) {
  if (className === 'class2') {
    return color
  }

  if (className === 'class1') {
    return '#ffffff'
  }

  return null
}

function classStrokeWidth(className: SymbolElement['class'], scale: number) {
  return (className === 'class2' ? 1.9 : 1.45) * scale
}

function symbolRotationDeg(symbol: SymbolElement): number {
  const direction = symbol.directionDeg ?? 0

  switch (symbol.symbolType) {
    case 'conduit_downlead_roof':
    case 'surface_downlead_roof':
      return direction + 90
    case 'conduit_downlead_ground':
    case 'surface_downlead_ground':
      return direction - 90
    case 'ground_rod':
      return direction - 90
    default:
      return direction
  }
}

function drawStar(ctx: CanvasRenderingContext2D, color: string, scale: number) {
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineWidth = 2 * scale

  ctx.beginPath()
  ctx.moveTo(0, -3.5 * scale)
  ctx.lineTo(0, 3.5 * scale)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-3 * scale, -2 * scale)
  ctx.lineTo(3 * scale, 2 * scale)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-3 * scale, 2 * scale)
  ctx.lineTo(3 * scale, -2 * scale)
  ctx.stroke()
}

function drawDoubleChevronsDown(ctx: CanvasRenderingContext2D, color: string, scale: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(-2 * scale, -2 * scale)
  ctx.lineTo(0, 0)
  ctx.lineTo(2 * scale, -2 * scale)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-2 * scale, 0.667 * scale)
  ctx.lineTo(0, 2.667 * scale)
  ctx.lineTo(2 * scale, 0.667 * scale)
  ctx.stroke()
}

function drawChevronUp(ctx: CanvasRenderingContext2D, color: string, scale: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.6 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(-2 * scale, 0.667 * scale)
  ctx.lineTo(0, -1.333 * scale)
  ctx.lineTo(2 * scale, 0.667 * scale)
  ctx.stroke()
}

function fillAndStroke(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  fill: string | null,
  stroke: string,
  strokeWidth: number,
) {
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill(path)
  }

  ctx.strokeStyle = stroke
  ctx.lineWidth = strokeWidth
  ctx.stroke(path)
}

export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: SymbolElement,
  designScale: number,
) {
  const className = resolvedSymbolClass(symbol)
  const color = symbol.symbolType === 'continued'
    ? ANNOTATION_SYMBOL_COLOR
    : colorFor(symbol.color)
  const fill = classFill(className, color)
  const strokeWidth = classStrokeWidth(className, designScale)
  const innerStroke = className === 'class2' ? '#ffffff' : color

  ctx.save()
  ctx.translate(symbol.position.x, symbol.position.y)

  if (typeof symbol.directionDeg === 'number') {
    ctx.rotate((symbolRotationDeg(symbol) * Math.PI) / 180)
  }

  switch (symbol.symbolType) {
    case 'air_terminal': {
      const path = new Path2D()
      path.arc(0, 0, 6 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, path, fill, color, strokeWidth)
      break
    }

    case 'bonded_air_terminal': {
      const hex = new Path2D(
        `M0 ${-6.4 * designScale} L${5.5 * designScale} ${-3.2 * designScale} L${5.5 * designScale} ${3.2 * designScale} L0 ${6.4 * designScale} L${-5.5 * designScale} ${3.2 * designScale} L${-5.5 * designScale} ${-3.2 * designScale} Z`,
      )
      fillAndStroke(ctx, hex, fill, color, strokeWidth)
      break
    }

    case 'bond': {
      const diamond = new Path2D(
        `M0 ${-6.2 * designScale} L${6.2 * designScale} 0 L0 ${6.2 * designScale} L${-6.2 * designScale} 0 Z`,
      )
      fillAndStroke(ctx, diamond, fill, color, strokeWidth)
      break
    }

    case 'conduit_downlead_ground': {
      const square = new Path2D(
        `M${-5.4 * designScale} ${-5.4 * designScale} L${5.4 * designScale} ${-5.4 * designScale} L${5.4 * designScale} ${5.4 * designScale} L${-5.4 * designScale} ${5.4 * designScale} Z`,
      )
      fillAndStroke(ctx, square, fill, color, strokeWidth)
      drawDoubleChevronsDown(ctx, innerStroke, designScale)
      break
    }

    case 'conduit_downlead_roof': {
      const square = new Path2D(
        `M${-5.4 * designScale} ${-5.4 * designScale} L${5.4 * designScale} ${-5.4 * designScale} L${5.4 * designScale} ${5.4 * designScale} L${-5.4 * designScale} ${5.4 * designScale} Z`,
      )
      fillAndStroke(ctx, square, fill, color, strokeWidth)
      drawChevronUp(ctx, innerStroke, designScale)
      break
    }

    case 'surface_downlead_ground': {
      const ring = new Path2D()
      ring.arc(0, 0, 6 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, ring, fill, color, strokeWidth)
      drawDoubleChevronsDown(ctx, innerStroke, designScale)
      break
    }

    case 'surface_downlead_roof': {
      const ring = new Path2D()
      ring.arc(0, 0, 6 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, ring, fill, color, strokeWidth)
      drawChevronUp(ctx, innerStroke, designScale)
      break
    }

    case 'through_roof_to_steel': {
      const square = new Path2D(
        `M${-5.5 * designScale} ${-5.5 * designScale} L${5.5 * designScale} ${-5.5 * designScale} L${5.5 * designScale} ${5.5 * designScale} L${-5.5 * designScale} ${5.5 * designScale} Z`,
      )
      fillAndStroke(ctx, square, fill, color, strokeWidth)
      drawStar(ctx, innerStroke, designScale * 0.86)
      break
    }

    case 'through_wall_connector': {
      const ring = new Path2D()
      ring.arc(0, 0, 6 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, ring, fill, color, strokeWidth)

      ctx.strokeStyle = innerStroke
      ctx.lineWidth = 1.6 * designScale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(-1.333 * designScale, -1.333 * designScale)
      ctx.lineTo(-2.667 * designScale, 0)
      ctx.lineTo(-1.333 * designScale, 1.333 * designScale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(1.333 * designScale, -1.333 * designScale)
      ctx.lineTo(2.667 * designScale, 0)
      ctx.lineTo(1.333 * designScale, 1.333 * designScale)
      ctx.stroke()
      break
    }

    case 'ground_rod': {
      ctx.strokeStyle = color
      ctx.lineWidth = 2 * designScale
      ctx.lineCap = 'round'

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 27 * designScale)
      ctx.stroke()

      if (className === 'class2') {
        ctx.beginPath()
        ctx.moveTo(-13 * designScale, 23 * designScale)
        ctx.lineTo(13 * designScale, 23 * designScale)
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.moveTo(-10 * designScale, 27 * designScale)
      ctx.lineTo(10 * designScale, 27 * designScale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(-6.4 * designScale, 31 * designScale)
      ctx.lineTo(6.4 * designScale, 31 * designScale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(-3.6 * designScale, 35 * designScale)
      ctx.lineTo(3.6 * designScale, 35 * designScale)
      ctx.stroke()
      break
    }

    case 'steel_bond': {
      const diamond = new Path2D(
        `M0 ${-6.2 * designScale} L${6.2 * designScale} 0 L0 ${6.2 * designScale} L${-6.2 * designScale} 0 Z`,
      )
      fillAndStroke(ctx, diamond, fill, color, strokeWidth)
      drawStar(ctx, innerStroke, designScale * 0.86)
      break
    }

    case 'cable_to_cable_connection': {
      const circle = new Path2D()
      circle.arc(0, 0, 3.2 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, circle, fill, color, strokeWidth)
      break
    }

    case 'mechanical_crossrun_connection': {
      const outer = new Path2D()
      outer.arc(0, 0, 6 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, outer, fill, color, strokeWidth)

      const inner = new Path2D()
      inner.arc(0, 0, 3.2 * designScale, 0, Math.PI * 2)
      const innerFill = className === 'class2' ? '#ffffff' : fill
      fillAndStroke(ctx, inner, innerFill, color, strokeWidth)
      break
    }

    case 'cadweld_connection': {
      const square = new Path2D(
        `M${-3.2 * designScale} ${-3.2 * designScale} L${3.2 * designScale} ${-3.2 * designScale} L${3.2 * designScale} ${3.2 * designScale} L${-3.2 * designScale} ${3.2 * designScale} Z`,
      )
      fillAndStroke(ctx, square, fill, color, strokeWidth)
      break
    }

    case 'cadweld_crossrun_connection': {
      const outer = new Path2D(
        `M${-5.5 * designScale} ${-5.5 * designScale} L${5.5 * designScale} ${-5.5 * designScale} L${5.5 * designScale} ${5.5 * designScale} L${-5.5 * designScale} ${5.5 * designScale} Z`,
      )
      fillAndStroke(ctx, outer, fill, color, strokeWidth)

      const inner = new Path2D(
        `M${-3.2 * designScale} ${-3.2 * designScale} L${3.2 * designScale} ${-3.2 * designScale} L${3.2 * designScale} ${3.2 * designScale} L${-3.2 * designScale} ${3.2 * designScale} Z`,
      )
      const innerFill = className === 'class2' ? '#ffffff' : fill
      fillAndStroke(ctx, inner, innerFill, color, strokeWidth)
      break
    }

    case 'continued': {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.55 * designScale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(-6 * designScale, 5.333 * designScale)
      ctx.bezierCurveTo(
        -0.667 * designScale,
        5.333 * designScale,
        0.667 * designScale,
        -5.334 * designScale,
        6 * designScale,
        -5.334 * designScale,
      )
      ctx.stroke()
      break
    }

    case 'connect_existing': {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.55 * designScale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(-6 * designScale, 5.333 * designScale)
      ctx.bezierCurveTo(
        -0.667 * designScale,
        5.333 * designScale,
        0.667 * designScale,
        -5.334 * designScale,
        6 * designScale,
        -5.334 * designScale,
      )
      ctx.stroke()

      const connectorCircle = new Path2D()
      connectorCircle.arc(0, 0, 3.2 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, connectorCircle, fill, color, strokeWidth)
      break
    }

    default:
      break
  }

  if (typeof symbol.letter === 'string' && symbol.letter.trim().length > 0) {
    const letterFill =
      LETTERED_AIR_TERMINAL_SYMBOLS.has(symbol.symbolType) && className === 'class2'
        ? '#ffffff'
        : '#111827'
    ctx.fillStyle = letterFill
    ctx.font = `700 ${8.2 * designScale}px Segoe UI, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(symbol.letter.trim().toUpperCase(), 0, 0)
    ctx.textAlign = 'left'
  }

  ctx.restore()
}
