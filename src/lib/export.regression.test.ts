import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { renderProjectCanvas } from './export'

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
  private alpha = 1
  private lineDash: number[] = []

  get globalAlpha() {
    return this.alpha
  }

  set globalAlpha(value: number) {
    this.alpha = value
    this.operations.push({ op: 'globalAlpha', args: [value] })
  }

  scale(x: number, y: number) {
    this.operations.push({ op: 'scale', args: [x, y] })
  }

  fillRect(x: number, y: number, w: number, h: number) {
    this.operations.push({ op: 'fillRect', args: [x, y, w, h, this.fillStyle] })
  }

  drawImage(image: unknown, x: number, y: number, w: number, h: number) {
    this.operations.push({ op: 'drawImage', args: [image, x, y, w, h] })
  }

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

  clearRect(x: number, y: number, w: number, h: number) {
    this.operations.push({ op: 'clearRect', args: [x, y, w, h] })
  }
}

interface FakeCanvas {
  width: number
  height: number
  ctx: RecordingContext
  getContext: (kind: string) => RecordingContext | null
  toBlob: (callback: (blob: Blob | null) => void) => void
}

function createFakeCanvas(): FakeCanvas {
  const ctx = new RecordingContext()

  return {
    width: 0,
    height: 0,
    ctx,
    getContext(kind: string) {
      if (kind !== '2d') {
        return null
      }
      return ctx
    },
    toBlob(callback: (blob: Blob | null) => void) {
      callback(new Blob(['ok'], { type: 'image/png' }))
    },
  }
}

function round(value: number): number {
  return Number(value.toFixed(3))
}

function normalizeArg(arg: unknown): unknown {
  if (typeof arg === 'number') {
    return round(arg)
  }
  if (typeof arg === 'string' || typeof arg === 'boolean' || arg === null) {
    return arg
  }
  if (Array.isArray(arg)) {
    return arg.map((entry) => normalizeArg(entry))
  }
  if (typeof arg === 'object') {
    return '[object]'
  }
  return String(arg)
}

function normalizeOperations(operations: DrawOp[]) {
  return operations.map((operation) => ({
    op: operation.op,
    args: operation.args.map((arg) => normalizeArg(arg)),
  }))
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

describe('export regression fixtures', () => {
  const originalDocument = globalThis.document

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalDocument) {
      vi.stubGlobal('document', originalDocument)
    }
  })

  it('matches golden canvas operations for conductor/symbol composition', async () => {
    ensurePath2DStub()
    const createdCanvases: FakeCanvas[] = []

    vi.stubGlobal('document', {
      createElement(tag: string) {
        if (tag !== 'canvas') {
          throw new Error('Unexpected element request')
        }

        const canvas = createFakeCanvas()
        createdCanvases.push(canvas)
        return canvas
      },
    })

    const project = createDefaultProject('Golden Export Fixture 1')
    project.pdf.widthPt = 640
    project.pdf.heightPt = 420
    project.settings.designScale = 'small'
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 36, y: 42 },
      end: { x: 310, y: 44 },
      color: 'green',
      class: 'class2',
    })
    project.elements.arcs.push({
      id: 'arc-1',
      start: { x: 60, y: 140 },
      through: { x: 120, y: 72 },
      end: { x: 210, y: 160 },
      color: 'blue',
      class: 'class1',
    })
    project.elements.symbols.push({
      id: 'symbol-1',
      symbolType: 'air_terminal',
      position: { x: 96, y: 44 },
      color: 'green',
      class: 'class2',
      letter: 'A',
    })
    project.elements.symbols.push({
      id: 'symbol-2',
      symbolType: 'surface_downlead_ground',
      position: { x: 340, y: 118 },
      color: 'red',
      class: 'class1',
      directionDeg: 180,
      verticalFootageFt: 50,
    })
    project.elements.texts.push({
      id: 'text-1',
      position: { x: 80, y: 220 },
      text: 'RIDGE',
      color: 'purple',
      layer: 'annotation',
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const operations = normalizeOperations(createdCanvases[0].ctx.operations)
    expect(operations).toMatchSnapshot()
  })

  it('matches golden canvas operations for dimension and downlead footage labels', async () => {
    ensurePath2DStub()
    const createdCanvases: FakeCanvas[] = []

    vi.stubGlobal('document', {
      createElement(tag: string) {
        if (tag !== 'canvas') {
          throw new Error('Unexpected element request')
        }

        const canvas = createFakeCanvas()
        createdCanvases.push(canvas)
        return canvas
      },
    })

    const project = createDefaultProject('Golden Export Fixture 2')
    project.pdf.widthPt = 560
    project.pdf.heightPt = 360
    project.settings.designScale = 'medium'
    project.scale = {
      isSet: true,
      method: 'manual',
      realUnitsPerPoint: 1 / 72,
      displayUnits: 'ft-in',
    }
    project.elements.lines.push({
      id: 'line-2',
      start: { x: 110, y: 180 },
      end: { x: 300, y: 180 },
      color: 'blue',
      class: 'class1',
    })
    project.elements.dimensionTexts.push({
      id: 'dim-1',
      start: { x: 110, y: 180 },
      end: { x: 300, y: 180 },
      position: { x: 205, y: 212 },
      showLinework: true,
      layer: 'annotation',
      text: '26ft-5in',
    })
    project.elements.symbols.push({
      id: 'symbol-3',
      symbolType: 'conduit_downlead_ground',
      position: { x: 410, y: 160 },
      color: 'red',
      class: 'class2',
      verticalFootageFt: 18,
      directionDeg: 270,
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const operations = normalizeOperations(createdCanvases[0].ctx.operations)
    expect(operations).toMatchSnapshot()
  })
})

