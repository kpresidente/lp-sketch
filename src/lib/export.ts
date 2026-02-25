import { PDFDocument, rgb } from 'pdf-lib'
import { COLOR_HEX } from '../model/defaultProject'
import type { LpProject, SymbolElement } from '../types/project'
import {
  annotationScaleFactor,
  approximateTextWidthForScale,
  approximateLegendLineWidthForScale,
  scaledLegendMetrics,
  textFontSizePxForScale,
  textLineHeightPxForScale,
  wireDashPatternCanvasForScale,
  wireStrokeWidthForScale,
} from './annotationScale'
import {
  downleadFootageLabelPosition,
  isDownleadSymbolType,
  symbolVerticalFootageFt,
} from './conductorFootage'
import { downloadBlob } from './files'
import {
  dimensionBarLineSegments,
  dimensionExtensionLineSegments,
  dimensionLineworkGeometry,
  dimensionTextLabel,
} from './dimensionText'
import { circularArcGeometryFromThreePoints } from './geometry'
import { buildLegendItemsFromSymbols } from './legend'
import { legendSymbolScale } from './legendSymbolScale'
import { buildLegendDisplayEntries, type LegendDisplayEntry } from './legendDisplay'
import { GENERAL_NOTES_TITLE, generalNotesBoxSize, generalNotesDisplayLines, scaledGeneralNotesMetrics } from './generalNotes'
import { filterProjectByCurrentPage, filterProjectByVisibleLayers } from './layers'
import { groundRodClassLabel, hasBothGroundRodClasses, resolvedSymbolClass } from './symbolClass'

const LEGEND_TITLE = 'Legend'
const LETTERED_AIR_TERMINAL_SYMBOLS = new Set<SymbolElement['symbolType']>([
  'air_terminal',
  'bonded_air_terminal',
])

interface RenderCanvasOptions {
  includeBackground: boolean
  includeMarks?: boolean
  pixelRatio?: number
  backgroundCanvas?: HTMLCanvasElement | null
}

function normalizedCurrentPage(project: LpProject): number {
  const candidate = Number.isFinite(project.view.currentPage)
    ? project.view.currentPage
    : project.pdf.page
  if (!Number.isFinite(candidate)) {
    return 1
  }

  return Math.max(1, Math.trunc(candidate))
}

function activePdfDimensions(project: LpProject): { widthPt: number; heightPt: number } {
  const width = Number.isFinite(project.pdf.widthPt) ? project.pdf.widthPt : 1
  const height = Number.isFinite(project.pdf.heightPt) ? project.pdf.heightPt : 1
  return {
    widthPt: Math.max(1, Math.round(width)),
    heightPt: Math.max(1, Math.round(height)),
  }
}

function normalizedPdfBrightness(project: LpProject): number {
  const value = project.settings.pdfBrightness
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.max(0, Math.min(1, value))
}

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
      // Chevron glyphs are authored with an "up" tip; directionDeg uses +X as 0 deg.
      return direction + 90
    case 'conduit_downlead_ground':
    case 'surface_downlead_ground':
      // Double-chevron glyphs are authored with a "down" tip; directionDeg uses +X as 0 deg.
      return direction - 90
    case 'ground_rod':
      // Ground rod glyph uses stem-top as basepoint and extends downward by default.
      return direction - 90
    default:
      return direction
  }
}

function hexToPdfRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255
  return rgb(r, g, b)
}

function base64ToUint8(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to serialize canvas output.'))
          return
        }

        resolve(blob)
      },
      type,
      quality,
    )
  })
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

function drawSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: SymbolElement,
  designScale: number,
  showGroundRodClassIndicator: boolean,
) {
  const className = resolvedSymbolClass(symbol)
  const color = colorFor(symbol.color)
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

    case 'bond':
      {
        const diamond = new Path2D(
          `M0 ${-6.2 * designScale} L${6.2 * designScale} 0 L0 ${6.2 * designScale} L${-6.2 * designScale} 0 Z`,
        )
        fillAndStroke(ctx, diamond, fill, color, strokeWidth)
      }
      break

    case 'conduit_downlead_ground': {
      const ring = new Path2D()
      ring.arc(0, 0, 6 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, ring, fill, color, strokeWidth)
      drawDoubleChevronsDown(ctx, innerStroke, designScale)
      break
    }

    case 'conduit_downlead_roof': {
      const ring = new Path2D()
      ring.arc(0, 0, 6 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, ring, fill, color, strokeWidth)
      drawChevronUp(ctx, innerStroke, designScale)
      break
    }

    case 'surface_downlead_ground': {
      const square = new Path2D(
        `M${-5.4 * designScale} ${-5.4 * designScale} L${5.4 * designScale} ${-5.4 * designScale} L${5.4 * designScale} ${5.4 * designScale} L${-5.4 * designScale} ${5.4 * designScale} Z`,
      )
      fillAndStroke(ctx, square, fill, color, strokeWidth)
      drawDoubleChevronsDown(ctx, innerStroke, designScale)
      break
    }

    case 'surface_downlead_roof': {
      const square = new Path2D(
        `M${-5.4 * designScale} ${-5.4 * designScale} L${5.4 * designScale} ${-5.4 * designScale} L${5.4 * designScale} ${5.4 * designScale} L${-5.4 * designScale} ${5.4 * designScale} Z`,
      )
      fillAndStroke(ctx, square, fill, color, strokeWidth)
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

      const classLabel = groundRodClassLabel(symbol)
      if (showGroundRodClassIndicator && classLabel) {
        const diamond = new Path2D(
          `M0 ${8.8 * designScale} L${5.6 * designScale} ${14.4 * designScale} L0 ${20 * designScale} L${-5.6 * designScale} ${14.4 * designScale} Z`,
        )
        fillAndStroke(ctx, diamond, fill, color, strokeWidth)

        ctx.fillStyle = innerStroke
        ctx.font = `700 ${8 * designScale}px Segoe UI, Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(classLabel, 0, 14.4 * designScale)
      }
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

    case 'cadweld_connection': {
      const outer = new Path2D()
      outer.arc(0, 0, 5.4 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, outer, fill, color, strokeWidth)

      const center = new Path2D()
      center.arc(0, 0, 1.7 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, center, color, color, 1.2 * designScale)
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
      ctx.moveTo(-6 * designScale, 6 * designScale)
      ctx.bezierCurveTo(
        -6 * designScale,
        6 * designScale,
        0.667 * designScale,
        -4.667 * designScale,
        6 * designScale,
        -4.667 * designScale,
      )
      ctx.stroke()

      const controlPoint = new Path2D()
      controlPoint.arc(-4.667 * designScale, -4.667 * designScale, 1.333 * designScale, 0, Math.PI * 2)
      fillAndStroke(ctx, controlPoint, null, color, 1.55 * designScale)

      ctx.beginPath()
      ctx.moveTo(-3.333 * designScale, -4.667 * designScale)
      ctx.lineTo(-2 * designScale, -4.667 * designScale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(1.333 * designScale, -4.667 * designScale)
      ctx.lineTo(0, -4.667 * designScale)
      ctx.stroke()
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

function approximateLegendLineWidth(text: string, designScale: number): number {
  return approximateLegendLineWidthForScale(text, designScale)
}

function legendBoxSize(
  entries: LegendDisplayEntry[],
  designScale: number,
): { width: number; height: number } {
  const headerDescription = 'Description'
  const headerCount = 'Count'
  const legendMetrics = scaledLegendMetrics(designScale)
  const hasEntries = entries.length > 0
  const descriptionLines = hasEntries ? entries.map((entry) => entry.label) : ['No components used yet.']
  const descriptionWidth = descriptionLines.reduce(
    (max, line) => Math.max(max, approximateLegendLineWidth(line, designScale)),
    approximateLegendLineWidth(headerDescription, designScale),
  )
  const countWidth = hasEntries
    ? entries.reduce(
      (max, entry) => Math.max(max, approximateLegendLineWidth(entry.countLabel, designScale)),
      approximateLegendLineWidth(headerCount, designScale),
    )
    : approximateLegendLineWidth('', designScale)

  const width =
    legendMetrics.paddingXPx * 2 +
    legendMetrics.textOffsetXPx +
    descriptionWidth +
    12 * designScale +
    Math.max(42 * designScale, countWidth) +
    6 * designScale
  const rowCount = hasEntries ? entries.length + 1 : 1
  const height =
    legendMetrics.paddingYPx * 2 +
    legendMetrics.titleHeightPx +
    rowCount * legendMetrics.rowHeightPx

  return {
    width: Math.max(180 * designScale, width),
    height,
  }
}

function drawLegendPlacements(
  ctx: CanvasRenderingContext2D,
  project: LpProject,
  designScale: number,
) {
  const legendMetrics = scaledLegendMetrics(designScale)
  const showGroundRodClassIndicator = hasBothGroundRodClasses(project.elements.symbols)

  for (const placement of project.legend.placements) {
    const legendItems = buildLegendItemsFromSymbols(project)
    const entries = buildLegendDisplayEntries(project, placement, legendItems)
    const size = legendBoxSize(entries, designScale)

    ctx.save()
    ctx.translate(placement.position.x, placement.position.y)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.1 * designScale
    ctx.beginPath()
    ctx.rect(0, 0, size.width, size.height)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#0f172a'
    ctx.font = `700 ${legendMetrics.titleFontSizePx}px Segoe UI, Arial, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(LEGEND_TITLE, legendMetrics.paddingXPx, legendMetrics.paddingYPx)

    const dividerY = legendMetrics.paddingYPx + legendMetrics.titleHeightPx - 3 * designScale
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1 * designScale
    ctx.beginPath()
    ctx.moveTo(legendMetrics.paddingXPx, dividerY)
    ctx.lineTo(size.width - legendMetrics.paddingXPx, dividerY)
    ctx.stroke()

    if (entries.length === 0) {
      ctx.fillStyle = '#64748b'
      ctx.font = `${legendMetrics.textFontSizePx}px Segoe UI, Arial, sans-serif`
      ctx.fillText(
        'No components used yet.',
        legendMetrics.paddingXPx,
        legendMetrics.paddingYPx + legendMetrics.titleHeightPx + 2 * designScale,
      )
      ctx.restore()
      continue
    }

    ctx.fillStyle = '#475569'
    ctx.font = `700 ${legendMetrics.textFontSizePx}px Segoe UI, Arial, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(
      'Description',
      legendMetrics.textOffsetXPx,
      legendMetrics.paddingYPx + legendMetrics.titleHeightPx + 3 * designScale,
    )
    ctx.textAlign = 'right'
    ctx.fillText(
      'Count',
      size.width - legendMetrics.paddingXPx,
      legendMetrics.paddingYPx + legendMetrics.titleHeightPx + 3 * designScale,
    )
    ctx.textAlign = 'left'

    const headerDividerY =
      legendMetrics.paddingYPx + legendMetrics.titleHeightPx + legendMetrics.rowHeightPx - 3 * designScale
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1 * designScale
    ctx.beginPath()
    ctx.moveTo(legendMetrics.paddingXPx, headerDividerY)
    ctx.lineTo(size.width - legendMetrics.paddingXPx, headerDividerY)
    ctx.stroke()

    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i]
      const rowTop =
        legendMetrics.paddingYPx + legendMetrics.titleHeightPx + legendMetrics.rowHeightPx + i * legendMetrics.rowHeightPx
      const symbolCenterY = rowTop + legendMetrics.rowHeightPx / 2

      if (entry.symbolKind === 'conductor') {
        const wireClass = entry.class === 'class2' ? 'class2' : 'class1'
        ctx.strokeStyle = COLOR_HEX[entry.color]
        ctx.lineWidth = wireStrokeWidthForScale(wireClass, designScale)
        ctx.lineCap = 'round'
        ctx.setLineDash(wireDashPatternCanvasForScale(wireClass, designScale))
        ctx.beginPath()
        ctx.moveTo(legendMetrics.symbolCenterXPx - 10 * designScale, symbolCenterY)
        ctx.lineTo(legendMetrics.symbolCenterXPx + 10 * designScale, symbolCenterY)
        ctx.stroke()
        ctx.setLineDash([])
      } else {
        const legendSymbol: SymbolElement = {
          id: `legend-symbol-${i}`,
          symbolType: entry.symbolType ?? 'air_terminal',
          position: {
            x: legendMetrics.symbolCenterXPx,
            y: symbolCenterY,
          },
          color: entry.color,
          class: entry.class,
        }
        drawSymbol(
          ctx,
          legendSymbol,
          legendSymbolScale(entry.symbolType ?? 'air_terminal', designScale),
          showGroundRodClassIndicator,
        )
      }

      ctx.fillStyle = '#1e293b'
      ctx.font = `${legendMetrics.textFontSizePx}px Segoe UI, Arial, sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(
        entry.label,
        legendMetrics.textOffsetXPx,
        rowTop + 3 * designScale,
      )

      ctx.fillStyle = '#0f172a'
      ctx.textAlign = 'right'
      ctx.fillText(
        entry.countLabel,
        size.width - legendMetrics.paddingXPx,
        rowTop + 3 * designScale,
      )
      ctx.textAlign = 'left'
    }

    ctx.restore()
  }
}

function drawGeneralNotesPlacements(
  ctx: CanvasRenderingContext2D,
  project: LpProject,
  designScale: number,
) {
  const metrics = scaledGeneralNotesMetrics(designScale)
  const lines = generalNotesDisplayLines(project.generalNotes.notes)

  for (const placement of project.generalNotes.placements) {
    const size = generalNotesBoxSize(project.generalNotes.notes, designScale)

    ctx.save()
    ctx.translate(placement.position.x, placement.position.y)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.1 * designScale
    ctx.beginPath()
    ctx.rect(0, 0, size.width, size.height)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#0f172a'
    ctx.font = `700 ${metrics.titleFontSizePx}px Segoe UI, Arial, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(GENERAL_NOTES_TITLE, metrics.paddingXPx, metrics.paddingYPx)

    const dividerY = metrics.paddingYPx + metrics.titleHeightPx - 3 * designScale
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1 * designScale
    ctx.beginPath()
    ctx.moveTo(metrics.paddingXPx, dividerY)
    ctx.lineTo(size.width - metrics.paddingXPx, dividerY)
    ctx.stroke()

    ctx.fillStyle = project.generalNotes.notes.length === 0 ? '#64748b' : '#1e293b'
    ctx.font = `${metrics.textFontSizePx}px Segoe UI, Arial, sans-serif`
    for (let i = 0; i < lines.length; i += 1) {
      const rowTop = metrics.paddingYPx + metrics.titleHeightPx + i * metrics.rowHeightPx
      ctx.fillText(lines[i], metrics.paddingXPx, rowTop + 3 * designScale)
    }

    ctx.restore()
  }
}

function drawProjectElements(
  ctx: CanvasRenderingContext2D,
  project: LpProject,
  includeMarks: boolean,
) {
  const designScale = annotationScaleFactor(project.settings.designScale)
  const textFontSizePx = textFontSizePxForScale(designScale)
  const showGroundRodClassIndicator = hasBothGroundRodClasses(project.elements.symbols)

  for (const line of project.elements.lines) {
    ctx.strokeStyle = colorFor(line.color)
    ctx.lineWidth = wireStrokeWidthForScale(line.class, designScale)
    ctx.lineCap = 'round'
    ctx.setLineDash(wireDashPatternCanvasForScale(line.class, designScale))

    ctx.beginPath()
    ctx.moveTo(line.start.x, line.start.y)
    ctx.lineTo(line.end.x, line.end.y)
    ctx.stroke()
  }

  ctx.setLineDash([])

  for (const arc of project.elements.arcs) {
    ctx.strokeStyle = colorFor(arc.color)
    ctx.lineWidth = wireStrokeWidthForScale(arc.class, designScale)
    ctx.lineCap = 'round'
    ctx.setLineDash(wireDashPatternCanvasForScale(arc.class, designScale))

    const geometry = circularArcGeometryFromThreePoints(arc.start, arc.through, arc.end)
    if (!geometry) {
      ctx.beginPath()
      ctx.moveTo(arc.start.x, arc.start.y)
      ctx.lineTo(arc.end.x, arc.end.y)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(
        geometry.center.x,
        geometry.center.y,
        geometry.radius,
        geometry.startAngle,
        geometry.endAngle,
        !geometry.sweepPositive,
      )
      ctx.stroke()
    }
  }

  ctx.setLineDash([])

  for (const curve of project.elements.curves) {
    ctx.strokeStyle = colorFor(curve.color)
    ctx.lineWidth = wireStrokeWidthForScale(curve.class, designScale)
    ctx.lineCap = 'round'
    ctx.setLineDash(wireDashPatternCanvasForScale(curve.class, designScale))

    ctx.beginPath()
    ctx.moveTo(curve.start.x, curve.start.y)
    ctx.quadraticCurveTo(curve.through.x, curve.through.y, curve.end.x, curve.end.y)
    ctx.stroke()
  }

  ctx.setLineDash([])

  for (const symbol of project.elements.symbols) {
    drawSymbol(ctx, symbol, designScale, showGroundRodClassIndicator)
  }

  for (const symbol of project.elements.symbols) {
    if (!isDownleadSymbolType(symbol.symbolType)) {
      continue
    }

    const position = downleadFootageLabelPosition(symbol, designScale)
    if (!position) {
      continue
    }

    ctx.fillStyle = '#111827'
    ctx.font = `${textFontSizePx}px Segoe UI, Arial, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(
      String(symbolVerticalFootageFt(symbol)),
      position.x,
      position.y,
    )
  }

  for (const text of project.elements.texts) {
    ctx.fillStyle = colorFor(text.color)
    ctx.font = `${textFontSizePx}px Segoe UI, Arial, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(text.text, text.position.x, text.position.y)
  }

  for (const dimensionText of project.elements.dimensionTexts) {
    const label = dimensionTextLabel(dimensionText, project.scale)
    if (dimensionText.showLinework) {
      const geometry = dimensionLineworkGeometry(
        {
          start: dimensionText.start,
          end: dimensionText.end,
          position: dimensionText.position,
        },
      )
      if (geometry) {
        const extensionSegments = dimensionExtensionLineSegments(geometry, 3 * designScale)
        const barSegments = dimensionBarLineSegments(
          geometry,
          dimensionText.position,
          approximateTextWidthForScale(label, designScale),
          textLineHeightPxForScale(designScale),
          4 * designScale,
        )
        ctx.strokeStyle = '#111827'
        ctx.lineCap = 'round'
        ctx.setLineDash([])

        ctx.lineWidth = 1.25 * designScale
        for (const segment of extensionSegments) {
          ctx.beginPath()
          ctx.moveTo(segment.start.x, segment.start.y)
          ctx.lineTo(segment.end.x, segment.end.y)
          ctx.stroke()
        }

        ctx.lineWidth = 1.5 * designScale
        for (const segment of barSegments) {
          ctx.beginPath()
          ctx.moveTo(segment.start.x, segment.start.y)
          ctx.lineTo(segment.end.x, segment.end.y)
          ctx.stroke()
        }
      }
    }

    ctx.fillStyle = '#111827'
    ctx.font = `${textFontSizePx}px Segoe UI, Arial, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(
      label,
      dimensionText.position.x,
      dimensionText.position.y,
    )
  }

  for (const arrow of project.elements.arrows) {
    const color = colorFor(arrow.color)
    const dx = arrow.head.x - arrow.tail.x
    const dy = arrow.head.y - arrow.tail.y
    const angle = Math.atan2(dy, dx)
    const headLength = 8 * designScale

    ctx.strokeStyle = color
    ctx.lineWidth = 2 * designScale
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(arrow.tail.x, arrow.tail.y)
    ctx.lineTo(arrow.head.x, arrow.head.y)
    ctx.stroke()

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(arrow.head.x, arrow.head.y)
    ctx.lineTo(
      arrow.head.x - headLength * Math.cos(angle - Math.PI / 6),
      arrow.head.y - headLength * Math.sin(angle - Math.PI / 6),
    )
    ctx.lineTo(
      arrow.head.x - headLength * Math.cos(angle + Math.PI / 6),
      arrow.head.y - headLength * Math.sin(angle + Math.PI / 6),
    )
    ctx.closePath()
    ctx.fill()
  }

  drawLegendPlacements(ctx, project, designScale)
  drawGeneralNotesPlacements(ctx, project, designScale)

  if (includeMarks) {
    for (const mark of project.construction.marks) {
      ctx.strokeStyle = '#b91c1c'
      ctx.lineWidth = 1.8 * designScale

      ctx.beginPath()
      ctx.moveTo(mark.position.x - 5 * designScale, mark.position.y - 5 * designScale)
      ctx.lineTo(mark.position.x + 5 * designScale, mark.position.y + 5 * designScale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(mark.position.x - 5 * designScale, mark.position.y + 5 * designScale)
      ctx.lineTo(mark.position.x + 5 * designScale, mark.position.y - 5 * designScale)
      ctx.stroke()
    }
  }
}

export async function renderProjectCanvas(
  project: LpProject,
  options: RenderCanvasOptions,
): Promise<HTMLCanvasElement> {
  const currentPage = normalizedCurrentPage(project)
  const pageScopedProject = filterProjectByCurrentPage(project, currentPage)
  const visibleProject = filterProjectByVisibleLayers(pageScopedProject)
  const pdfBrightness = normalizedPdfBrightness(visibleProject)
  const { widthPt, heightPt } = activePdfDimensions(visibleProject)
  const pixelRatio = options.pixelRatio ?? 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(widthPt * pixelRatio))
  canvas.height = Math.max(1, Math.round(heightPt * pixelRatio))

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Unable to create export canvas context.')
  }

  ctx.scale(pixelRatio, pixelRatio)

  if (options.includeBackground) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, widthPt, heightPt)

    if (options.backgroundCanvas) {
      ctx.save()
      ctx.globalAlpha = pdfBrightness
      ctx.drawImage(options.backgroundCanvas, 0, 0, widthPt, heightPt)
      ctx.restore()
    }
  }

  drawProjectElements(ctx, visibleProject, options.includeMarks ?? false)

  return canvas
}

export async function exportProjectImage(
  project: LpProject,
  format: 'png' | 'jpg',
  filenameBase: string,
  backgroundCanvas?: HTMLCanvasElement | null,
) {
  const canvas = await renderProjectCanvas(project, {
    includeBackground: true,
    includeMarks: false,
    pixelRatio: 2,
    backgroundCanvas,
  })

  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const blob = await canvasToBlob(canvas, mime, format === 'jpg' ? 0.92 : undefined)
  downloadBlob(`${filenameBase}.${format}`, blob)
}

export async function exportProjectPdf(
  project: LpProject,
  filenameBase: string,
  backgroundCanvas?: HTMLCanvasElement | null,
): Promise<void> {
  const visibleProject = filterProjectByVisibleLayers(project)
  const pdfBrightness = normalizedPdfBrightness(visibleProject)
  const hasSourcePdf = Boolean(visibleProject.pdf.dataBase64)
  const currentPage = normalizedCurrentPage(visibleProject)
  const { widthPt: activeWidthPt, heightPt: activeHeightPt } = activePdfDimensions(visibleProject)

  let pdfDocument: PDFDocument

  const pageHasGeometryMismatch = (
    page: {
      getWidth: () => number
      getHeight: () => number
      getRotation?: () => { angle: number }
      getCropBox?: () => { x: number; y: number; width: number; height: number }
    },
  ) => {
    const normalizedRotation = ((((page.getRotation?.().angle ?? 0) % 360) + 360) % 360)
    if (normalizedRotation !== 0) {
      return true
    }

    if (
      Math.abs(page.getWidth() - visibleProject.pdf.widthPt) > 0.5 ||
      Math.abs(page.getHeight() - visibleProject.pdf.heightPt) > 0.5
    ) {
      return true
    }

    const cropBox = page.getCropBox?.()
    if (cropBox && (Math.abs(cropBox.x) > 0.5 || Math.abs(cropBox.y) > 0.5)) {
      return true
    }

    return false
  }

  if (hasSourcePdf) {
    const sourcePdfDocument = await PDFDocument.load(base64ToUint8(visibleProject.pdf.dataBase64 ?? ''))
    const sourcePages = sourcePdfDocument.getPages()
    const sourcePageIndex = sourcePages.length > 0
      ? Math.max(0, Math.min(sourcePages.length - 1, currentPage - 1))
      : 0
    const sourcePage = sourcePages.length > 0 ? sourcePdfDocument.getPage(sourcePageIndex) : null
    const canUseRasterFallback = !!backgroundCanvas && sourcePage && pageHasGeometryMismatch(sourcePage)

    if (canUseRasterFallback) {
      const compositedCanvas = await renderProjectCanvas(visibleProject, {
        includeBackground: true,
        includeMarks: false,
        pixelRatio: 2,
        backgroundCanvas,
      })
      const compositedBlob = await canvasToBlob(compositedCanvas, 'image/png')
      const compositedBytes = new Uint8Array(await compositedBlob.arrayBuffer())

      const flattenedPdf = await PDFDocument.create()
      const flattenedPage = flattenedPdf.addPage([activeWidthPt, activeHeightPt])
      const compositedImage = await flattenedPdf.embedPng(compositedBytes)

      flattenedPage.drawImage(compositedImage, {
        x: 0,
        y: 0,
        width: flattenedPage.getWidth(),
        height: flattenedPage.getHeight(),
      })

      const bytes = await flattenedPdf.save()
      const byteCopy = new Uint8Array(bytes.length)
      byteCopy.set(bytes)
      downloadBlob(`${filenameBase}.pdf`, new Blob([byteCopy], { type: 'application/pdf' }))
      return
    }

    pdfDocument = await PDFDocument.create()
    if (sourcePage) {
      const [copiedPage] = await pdfDocument.copyPages(sourcePdfDocument, [sourcePageIndex])
      pdfDocument.addPage(copiedPage)
    } else {
      pdfDocument.addPage([activeWidthPt, activeHeightPt])
    }
  } else {
    pdfDocument = await PDFDocument.create()
    pdfDocument.addPage([activeWidthPt, activeHeightPt])
  }

  const overlayCanvas = await renderProjectCanvas(visibleProject, {
    includeBackground: false,
    includeMarks: false,
    pixelRatio: 2,
  })
  const overlayBlob = await canvasToBlob(overlayCanvas, 'image/png')
  const overlayBytes = new Uint8Array(await overlayBlob.arrayBuffer())

  const pages = pdfDocument.getPages()

  if (pages.length === 0) {
    pdfDocument.addPage([visibleProject.pdf.widthPt, visibleProject.pdf.heightPt])
  }

  const page = pdfDocument.getPage(0)
  const overlayImage = await pdfDocument.embedPng(overlayBytes)

  if (!hasSourcePdf) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
      color: hexToPdfRgb('#ffffff'),
      borderWidth: 0,
    })
  }

  if (hasSourcePdf && pdfBrightness < 1) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
      color: hexToPdfRgb('#ffffff'),
      borderWidth: 0,
      opacity: 1 - pdfBrightness,
    })
  }

  page.drawImage(overlayImage, {
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
  })

  const bytes = await pdfDocument.save()
  const byteCopy = new Uint8Array(bytes.length)
  byteCopy.set(bytes)
  downloadBlob(`${filenameBase}.pdf`, new Blob([byteCopy], { type: 'application/pdf' }))
}
