import { createEffect } from 'solid-js'
import { reportHandledOperationTelemetry } from '../lib/telemetry'
import type { LpProject } from '../types/project'
import { drawProjectToContext } from './renderCore'

interface WorkspaceCanvasProps {
  project: LpProject
}

export default function WorkspaceCanvas(props: WorkspaceCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined

  createEffect(() => {
    const canvas = canvasRef
    const project = props.project
    if (!canvas) {
      return
    }

    const width = Math.max(1, Math.round(project.pdf.widthPt))
    const height = Math.max(1, Math.round(project.pdf.heightPt))
    const pixelRatio =
      typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
        ? window.devicePixelRatio
        : 1

    canvas.width = Math.max(1, Math.round(width * pixelRatio))
    canvas.height = Math.max(1, Math.round(height * pixelRatio))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const reportRenderFailure = (message: string, error?: unknown) => {
      reportHandledOperationTelemetry(
        'workspace_canvas_render_failed',
        message,
        {
          width_pt: width,
          height_pt: height,
          current_page: project.view.currentPage,
          line_count: project.elements.lines.length,
          arc_count: project.elements.arcs.length,
          curve_count: project.elements.curves.length,
          symbol_count: project.elements.symbols.length,
          text_count: project.elements.texts.length,
          dimension_count: project.elements.dimensionTexts.length,
          arrow_count: project.elements.arrows.length,
          legend_count: project.legend.placements.length,
          general_notes_count: project.generalNotes.placements.length,
        },
      )
      console.warn(message, error)
    }

    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reportRenderFailure('Unable to create workspace canvas context.')
        return
      }

      ctx.clearRect(0, 0, width, height)
      ctx.scale(pixelRatio, pixelRatio)
      drawProjectToContext(ctx, project, { includeMarks: false })
    } catch (error) {
      reportRenderFailure('Workspace canvas render failed.', error)
    }
  })

  return (
    <canvas
      ref={canvasRef}
      class="workspace-canvas-layer"
      aria-label="Workspace canvas overlay"
    />
  )
}
