// @vitest-environment jsdom

import { createSignal } from 'solid-js'
import { render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import WorkspaceCanvas from './WorkspaceCanvas'
import { drawProjectToContext } from './renderCore'
import { reportHandledOperationTelemetry } from '../lib/telemetry'

vi.mock('./renderCore', () => ({
  drawProjectToContext: vi.fn(),
}))

vi.mock('../lib/telemetry', () => ({
  reportHandledOperationTelemetry: vi.fn(),
}))

describe('WorkspaceCanvas', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(drawProjectToContext).mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      scale: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
  })

  it('sizes the canvas to the PDF dimensions and draws the provided project slice', () => {
    const project = createDefaultProject('Workspace Canvas')
    project.pdf.widthPt = 480
    project.pdf.heightPt = 320

    render(() => <WorkspaceCanvas project={project} />)

    const canvas = screen.getByLabelText('Workspace canvas overlay') as HTMLCanvasElement
    expect(canvas.width).toBe(480)
    expect(canvas.height).toBe(320)
    expect(drawProjectToContext).toHaveBeenCalledWith(
      expect.anything(),
      project,
      { includeMarks: false },
    )
  })

  it('redraws when the provided project slice changes', () => {
    const firstProject = createDefaultProject('Workspace Canvas First')
    firstProject.pdf.widthPt = 480
    firstProject.pdf.heightPt = 320

    const secondProject = createDefaultProject('Workspace Canvas Second')
    secondProject.pdf.widthPt = 640
    secondProject.pdf.heightPt = 360

    const [currentProject, setCurrentProject] = createSignal(firstProject)

    render(() => <WorkspaceCanvas project={currentProject()} />)

    setCurrentProject(secondProject)

    expect(drawProjectToContext).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      firstProject,
      { includeMarks: false },
    )
    expect(drawProjectToContext).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      secondProject,
      { includeMarks: false },
    )
  })

  it('reports a handled failure when the canvas context cannot be created', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    const project = createDefaultProject('Workspace Canvas Failure')
    project.pdf.widthPt = 480
    project.pdf.heightPt = 320

    render(() => <WorkspaceCanvas project={project} />)

    expect(reportHandledOperationTelemetry).toHaveBeenCalledWith(
      'workspace_canvas_render_failed',
      expect.stringContaining('Unable to create workspace canvas context.'),
      expect.objectContaining({
        width_pt: 480,
        height_pt: 320,
      }),
    )
  })
})
