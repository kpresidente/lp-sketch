import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../../model/defaultProject'
import { drawProjectToContext } from './drawProject'

type DrawOp = {
  op: string
  args: unknown[]
}

class RecordingContext {
  operations: DrawOp[] = []
  fillStyle = ''
  strokeStyle = ''
  lineWidth = 1
  lineCap: CanvasLineCap = 'butt'
  lineJoin: CanvasLineJoin = 'miter'
  font = ''
  textBaseline: CanvasTextBaseline = 'alphabetic'
  textAlign: CanvasTextAlign = 'left'
  private lineDash: number[] = []

  setLineDash(dash: number[]) {
    this.lineDash = [...dash]
    this.operations.push({ op: 'setLineDash', args: [dash] })
  }

  beginPath() {
    this.operations.push({ op: 'beginPath', args: [] })
  }

  moveTo(x: number, y: number) {
    this.operations.push({ op: 'moveTo', args: [x, y] })
  }

  lineTo(x: number, y: number) {
    this.operations.push({ op: 'lineTo', args: [x, y] })
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.operations.push({ op: 'quadraticCurveTo', args: [cpx, cpy, x, y] })
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
    this.operations.push({ op: 'bezierCurveTo', args: [cp1x, cp1y, cp2x, cp2y, x, y] })
  }

  stroke(_: unknown = undefined) {
    this.operations.push({
      op: 'stroke',
      args: [this.strokeStyle, this.lineWidth, this.lineCap, this.lineJoin, [...this.lineDash]],
    })
  }

  fill(_: unknown = undefined) {
    this.operations.push({ op: 'fill', args: [this.fillStyle] })
  }

  fillText(text: string, x: number, y: number) {
    this.operations.push({
      op: 'fillText',
      args: [text, x, y, this.fillStyle, this.font, this.textAlign, this.textBaseline],
    })
  }

  closePath() {
    this.operations.push({ op: 'closePath', args: [] })
  }

  arc(x: number, y: number, r: number, start: number, end: number) {
    this.operations.push({ op: 'arc', args: [x, y, r, start, end] })
  }

  rect(x: number, y: number, w: number, h: number) {
    this.operations.push({ op: 'rect', args: [x, y, w, h] })
  }

  save() {
    this.operations.push({ op: 'save', args: [] })
  }

  restore() {
    this.operations.push({ op: 'restore', args: [] })
  }

  translate(x: number, y: number) {
    this.operations.push({ op: 'translate', args: [x, y] })
  }

  rotate(radians: number) {
    this.operations.push({ op: 'rotate', args: [radians] })
  }
}

function ensurePath2DStub() {
  if (typeof globalThis.Path2D !== 'undefined') {
    return
  }

  class FakePath2D {
    constructor(_: string = '') {}

    arc(_: number, __: number, ___: number, ____: number, _____: number) {}
  }

  vi.stubGlobal('Path2D', FakePath2D)
}

function hasOperation(
  operations: DrawOp[],
  op: string,
  matcher: (args: unknown[]) => boolean,
): boolean {
  return operations.some((entry) => entry.op === op && matcher(entry.args))
}

describe('drawProjectToContext', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders persisted project geometry, labels, legend, and notes into a canvas context', () => {
    ensurePath2DStub()

    const project = createDefaultProject('Workspace Canvas Core')
    project.settings.designScale = 'small'
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 12, y: 18 },
      end: { x: 144, y: 30 },
      color: 'green',
      class: 'class1',
    })
    project.elements.arrows.push({
      id: 'arrow-1',
      tail: { x: 60, y: 80 },
      head: { x: 132, y: 96 },
      color: 'purple',
      layer: 'annotation',
    })
    project.elements.symbols.push({
      id: 'symbol-1',
      symbolType: 'bond',
      position: { x: 180, y: 64 },
      color: 'green',
      class: 'class2',
    })
    project.elements.texts.push({
      id: 'text-1',
      position: { x: 40, y: 132 },
      text: 'RIDGE NOTE',
      color: 'blue',
      layer: 'annotation',
    })
    project.elements.dimensionTexts.push({
      id: 'dim-1',
      start: { x: 20, y: 170 },
      end: { x: 96, y: 170 },
      position: { x: 58, y: 192 },
      showLinework: true,
      text: '',
      layer: 'annotation',
    })
    project.legend.placements.push({
      id: 'legend-1',
      position: { x: 220, y: 24 },
      editedLabels: {},
    })
    project.generalNotes.notes = ['Roof note', 'Grounding note']
    project.generalNotes.placements.push({
      id: 'notes-1',
      position: { x: 220, y: 160 },
    })

    const ctx = new RecordingContext()

    drawProjectToContext(ctx as unknown as CanvasRenderingContext2D, project, {
      includeMarks: false,
    })

    expect(hasOperation(ctx.operations, 'moveTo', (args) => args[0] === 12 && args[1] === 18)).toBe(true)
    expect(hasOperation(ctx.operations, 'lineTo', (args) => args[0] === 144 && args[1] === 30)).toBe(true)
    expect(hasOperation(ctx.operations, 'fillText', (args) => args[0] === 'RIDGE NOTE')).toBe(true)
    expect(hasOperation(ctx.operations, 'fillText', (args) => args[0] === 'Legend')).toBe(true)
    expect(hasOperation(ctx.operations, 'fillText', (args) => args[0] === 'General Notes')).toBe(true)
    expect(hasOperation(ctx.operations, 'translate', (args) => args[0] === 180 && args[1] === 64)).toBe(true)
  })
})
