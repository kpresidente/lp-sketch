import { COLOR_HEX } from '../../model/defaultProject'
import type { LpProject, SymbolElement } from '../../types/project'
import {
  annotationScaleFactor,
  approximateLegendLineWidthForScale,
  scaledLegendMetrics,
  textFontSizePxForScale,
  textLineHeightPxForScale,
  wireDashPatternCanvasForScale,
  wireStrokeWidthForScale,
} from '../../lib/annotationScale'
import {
  downleadFootageLabelPosition,
  isDownleadSymbolType,
  symbolVerticalFootageFt,
} from '../../lib/conductorFootage'
import {
  dimensionBarLineSegments,
  dimensionLabelWidthPx,
  dimensionExtensionLineSegments,
  dimensionLineworkGeometry,
  dimensionTextLabel,
} from '../../lib/dimensionText'
import { circularArcGeometryFromThreePoints } from '../../lib/geometry'
import { GENERAL_NOTES_TITLE, generalNotesBoxSize, generalNotesDisplayLines, scaledGeneralNotesMetrics } from '../../lib/generalNotes'
import { buildLegendItemsFromSymbols } from '../../lib/legend'
import { buildLegendDisplayEntries, type LegendDisplayEntry } from '../../lib/legendDisplay'
import { legendSymbolCenterOffsetY, legendSymbolScale } from '../../lib/legendSymbolScale'
import { splitTextIntoLines } from '../../lib/textLayout'
import { drawSymbol } from './drawSymbol'

const LEGEND_TITLE = 'Legend'

export interface DrawProjectOptions {
  includeMarks?: boolean
}

function colorFor(material: keyof typeof COLOR_HEX) {
  return COLOR_HEX[material]
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
        const symbolType = entry.symbolType ?? 'air_terminal'
        const symbolScale = legendSymbolScale(symbolType, designScale)
        const legendSymbol: SymbolElement = {
          id: `legend-symbol-${i}`,
          symbolType,
          position: {
            x: legendMetrics.symbolCenterXPx,
            y: symbolCenterY + legendSymbolCenterOffsetY(symbolType, symbolScale),
          },
          color: entry.color,
          class: entry.class,
        }
        drawSymbol(ctx, legendSymbol, symbolScale)
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

export function drawProjectToContext(
  ctx: CanvasRenderingContext2D,
  project: LpProject,
  options: DrawProjectOptions = {},
) {
  const includeMarks = options.includeMarks ?? false
  const designScale = annotationScaleFactor(project.settings.designScale)
  const textFontSizePx = textFontSizePxForScale(designScale)

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
    drawSymbol(ctx, symbol, designScale)
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
    const lines = splitTextIntoLines(text.text)
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(
        lines[i] && lines[i].length > 0 ? lines[i] : ' ',
        text.position.x,
        text.position.y + i * textLineHeightPxForScale(designScale),
      )
    }
  }

  for (const dimensionText of project.elements.dimensionTexts) {
    const label = dimensionTextLabel(dimensionText, project.scale)
    const labelWidth = dimensionLabelWidthPx(
      label,
      designScale,
      textFontSizePx,
      ctx,
    )
    if (dimensionText.showLinework) {
      const geometry = dimensionLineworkGeometry(
        {
          start: dimensionText.start,
          end: dimensionText.end,
          position: dimensionText.position,
        },
      )
      if (geometry) {
        const extensionSegments = dimensionExtensionLineSegments(geometry, 6 * designScale)
        const barSegments = dimensionBarLineSegments(
          geometry,
          dimensionText.position,
          labelWidth,
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
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      label,
      dimensionText.position.x,
      dimensionText.position.y,
    )
    ctx.textAlign = 'left'
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
