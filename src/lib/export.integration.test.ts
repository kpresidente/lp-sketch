import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import type { SymbolClass, SymbolType } from '../types/project'
import { annotationScaleFactor } from './annotationScale'
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
  lineCap = 'butt'
  font = ''
  textBaseline: CanvasTextBaseline = 'alphabetic'
  private alpha = 1

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
    this.operations.push({ op: 'fillRect', args: [x, y, w, h] })
  }

  drawImage(image: unknown, x: number, y: number, w: number, h: number) {
    this.operations.push({ op: 'drawImage', args: [image, x, y, w, h] })
  }

  setLineDash(dash: number[]) {
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

  stroke(_: unknown = undefined) {
    this.operations.push({ op: 'stroke', args: [] })
  }

  fill(_: unknown = undefined) {
    this.operations.push({ op: 'fill', args: [] })
  }

  fillText(text: string, x: number, y: number) {
    this.operations.push({ op: 'fillText', args: [text, x, y, this.fillStyle] })
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

function hasOperation(
  operations: DrawOp[],
  op: string,
  matcher: (args: unknown[]) => boolean,
): boolean {
  return operations.some((entry) => entry.op === op && matcher(entry.args))
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

describe('export integration', () => {
  const originalDocument = globalThis.document

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalDocument) {
      vi.stubGlobal('document', originalDocument)
    }
  })

  it('renders geometry in document-space coordinates for export alignment', async () => {
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

    const project = createDefaultProject('Export Geometry')
    project.pdf.widthPt = 800
    project.pdf.heightPt = 600

    project.elements.lines.push({
      id: 'line-1',
      start: { x: 11, y: 22 },
      end: { x: 133, y: 244 },
      color: 'green',
      class: 'class1',
    })

    project.elements.arcs.push({
      id: 'arc-1',
      start: { x: 301, y: 111 },
      through: { x: 355, y: 144 },
      end: { x: 412, y: 212 },
      color: 'red',
      class: 'class2',
    })

    project.elements.curves.push({
      id: 'curve-1',
      start: { x: 280, y: 260 },
      through: { x: 332, y: 212 },
      end: { x: 418, y: 270 },
      color: 'blue',
      class: 'class1',
    })

    project.elements.texts.push({
      id: 'text-1',
      position: { x: 500, y: 88 },
      text: 'RIDGE NOTE',
      color: 'blue',
      layer: 'annotation',
    })

    project.elements.arrows.push({
      id: 'arrow-1',
      tail: { x: 522, y: 95 },
      head: { x: 610, y: 140 },
      color: 'purple',
      layer: 'annotation',
    })

    const canvas = await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
    expect(createdCanvases).toHaveLength(1)

    const ops = createdCanvases[0].ctx.operations

    expect(hasOperation(ops, 'moveTo', (args) => args[0] === 11 && args[1] === 22)).toBe(true)
    expect(hasOperation(ops, 'lineTo', (args) => args[0] === 133 && args[1] === 244)).toBe(true)

    expect(
      hasOperation(
        ops,
        'arc',
        (args) =>
          typeof args[0] === 'number' &&
          typeof args[1] === 'number' &&
          typeof args[2] === 'number' &&
          (args[2] as number) > 1,
      ),
    ).toBe(true)

    expect(
      hasOperation(
        ops,
        'quadraticCurveTo',
        (args) => args[0] === 332 && args[1] === 212 && args[2] === 418 && args[3] === 270,
      ),
    ).toBe(true)

    expect(
      hasOperation(
        ops,
        'fillText',
        (args) => args[0] === 'RIDGE NOTE' && args[1] === 500 && args[2] === 88,
      ),
    ).toBe(true)

    expect(hasOperation(ops, 'moveTo', (args) => args[0] === 522 && args[1] === 95)).toBe(true)
    expect(hasOperation(ops, 'lineTo', (args) => args[0] === 610 && args[1] === 140)).toBe(true)
  })

  it('renders dimension linework in export output when enabled', async () => {
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

    const project = createDefaultProject('Dimension Linework Export')
    project.pdf.widthPt = 500
    project.pdf.heightPt = 300
    project.settings.designScale = 'small'
    project.scale = {
      isSet: true,
      method: 'manual',
      realUnitsPerPoint: 1 / 72,
      displayUnits: 'ft-in',
      byPage: {
        1: {
          isSet: true,
          method: 'manual',
          realUnitsPerPoint: 1 / 72,
          displayUnits: 'ft-in',
        },
      },
    }
    project.elements.dimensionTexts.push({
      id: 'dimension-text-1',
      start: { x: 100, y: 120 },
      end: { x: 200, y: 120 },
      position: { x: 150, y: 150 },
      showLinework: true,
      layer: 'annotation',
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const ops = createdCanvases[0].ctx.operations
    expect(hasOperation(ops, 'moveTo', (args) => args[0] === 100 && args[1] === 120)).toBe(true)
    expect(
      hasOperation(
        ops,
        'lineTo',
        (args) =>
          typeof args[0] === 'number' &&
          typeof args[1] === 'number' &&
          Math.abs(args[0] - 100) < 0.01 &&
          args[1] > 150 &&
          args[1] < 170,
      ),
    ).toBe(true)
    expect(hasOperation(ops, 'moveTo', (args) => args[0] === 200 && args[1] === 120)).toBe(true)
    expect(
      hasOperation(
        ops,
        'lineTo',
        (args) =>
          typeof args[0] === 'number' &&
          typeof args[1] === 'number' &&
          Math.abs(args[0] - 200) < 0.01 &&
          args[1] > 150 &&
          args[1] < 170,
      ),
    ).toBe(true)
    expect(
      hasOperation(
        ops,
        'moveTo',
        (args) =>
          typeof args[0] === 'number' &&
          typeof args[1] === 'number' &&
          args[1] === 150 &&
          args[0] > 100 &&
          args[0] < 200,
      ),
    ).toBe(true)
    expect(
      hasOperation(
        ops,
        'lineTo',
        (args) =>
          typeof args[0] === 'number' &&
          typeof args[1] === 'number' &&
          args[1] === 150 &&
          args[0] > 100 &&
          args[0] < 200,
      ),
    ).toBe(true)
  })

  it('renders all symbol variants and legend label branches', async () => {
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

    const project = createDefaultProject('Symbol and Legend Branches')
    project.pdf.widthPt = 700
    project.pdf.heightPt = 480

    const symbolTypes: SymbolType[] = [
      'air_terminal',
      'bond',
      'conduit_downlead_ground',
      'conduit_downlead_roof',
      'surface_downlead_ground',
      'surface_downlead_roof',
      'through_roof_to_steel',
      'through_wall_connector',
      'ground_rod',
      'steel_bond',
      'cable_to_cable_connection',
      'mechanical_crossrun_connection',
      'cadweld_connection',
      'cadweld_crossrun_connection',
    ]

    symbolTypes.forEach((symbolType, index) => {
      const className: SymbolClass =
        index % 3 === 0 ? 'class1' : index % 3 === 1 ? 'class2' : 'none'

      project.elements.symbols.push({
        id: `sym-${symbolType}`,
        symbolType,
        position: { x: 40 + index * 40, y: 120 + (index % 2) * 40 },
        color: index % 2 === 0 ? 'green' : 'blue',
        class: className,
        directionDeg: symbolType === 'ground_rod' ? 45 : undefined,
      })
    })

    project.elements.symbols.push({
      id: 'sym-unknown',
      symbolType: 'unknown_symbol' as unknown as SymbolType,
      position: { x: 620, y: 260 },
      color: 'red',
      class: 'class1',
    })

    project.legend.items = [
      {
        symbolType: 'bond',
        color: 'green',
        class: 'none',
        label: 'Bond',
        count: 2,
      },
      {
        symbolType: 'air_terminal',
        color: 'blue',
        class: 'class1',
        label: 'Air terminal',
        count: 3,
      },
    ]
    project.legend.placements.push({
      id: 'legend-1',
      position: { x: 20, y: 18 },
      editedLabels: {
        'bond|green|none|': '  Custom Bond  ',
        'air_terminal|blue|class1|': '   ',
      },
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const ops = createdCanvases[0].ctx.operations

    expect(hasOperation(ops, 'rotate', (args) => (args[0] as number) < -0.7 && (args[0] as number) > -0.9)).toBe(true)
    expect(
      hasOperation(
        ops,
        'fillText',
        (args) => args[0] === 'Class I Copper Air terminal',
      ),
    ).toBe(true)
    expect(
      hasOperation(
        ops,
        'fillText',
        (args) => args[0] === 'Description',
      ),
    ).toBe(true)
    expect(hasOperation(ops, 'fillText', (args) => args[0] === 'Count')).toBe(true)
    expect(hasOperation(ops, 'fillText', (args) => args[0] === '1')).toBe(true)
    const legendSymbolTranslations = ops.filter(
      (entry) =>
        entry.op === 'translate' &&
        typeof entry.args[0] === 'number' &&
        (entry.args[0] as number) > 0 &&
        typeof entry.args[1] === 'number' &&
        (entry.args[1] as number) > 30,
    )
    expect(legendSymbolTranslations.length).toBeGreaterThanOrEqual(2)
    expect(hasOperation(ops, 'moveTo', (args) => args[0] === 9 && args[1] === 33)).toBe(false)
  })

  it('uses white symbol letter fill for class2 lettered air terminals in export rendering', async () => {
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

    const project = createDefaultProject('Class2 Letter Fill')
    project.pdf.widthPt = 400
    project.pdf.heightPt = 220
    project.elements.symbols.push({
      id: 'class2-air-terminal',
      symbolType: 'air_terminal',
      position: { x: 100, y: 100 },
      color: 'green',
      class: 'class2',
      letter: 'Q',
    })
    project.elements.symbols.push({
      id: 'class2-bonded-air-terminal',
      symbolType: 'bonded_air_terminal',
      position: { x: 150, y: 100 },
      color: 'blue',
      class: 'class2',
      letter: 'R',
    })
    project.elements.symbols.push({
      id: 'class1-air-terminal',
      symbolType: 'air_terminal',
      position: { x: 200, y: 100 },
      color: 'green',
      class: 'class1',
      letter: 'S',
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const ops = createdCanvases[0].ctx.operations
    expect(hasOperation(ops, 'fillText', (args) => args[0] === 'Q' && args[3] === '#ffffff')).toBe(true)
    expect(hasOperation(ops, 'fillText', (args) => args[0] === 'R' && args[3] === '#ffffff')).toBe(true)
    expect(hasOperation(ops, 'fillText', (args) => args[0] === 'S' && args[3] === '#111827')).toBe(true)
  })

  it('renders downlead footage labels in export output independent of construction marks', async () => {
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

    const project = createDefaultProject('Downlead Footage Export')
    project.settings.designScale = 'small'
    project.pdf.widthPt = 400
    project.pdf.heightPt = 300
    project.elements.symbols.push({
      id: 'downlead-1',
      symbolType: 'surface_downlead_ground',
      position: { x: 210, y: 160 },
      color: 'red',
      class: 'class1',
      verticalFootageFt: 37,
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const ops = createdCanvases[0].ctx.operations
    expect(
      hasOperation(
        ops,
        'fillText',
        (args) => args[0] === '37' && args[1] === 218 && args[2] === 146,
      ),
    ).toBe(true)
  })

  it('excludes hidden layers from rendered export geometry', async () => {
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

    const project = createDefaultProject('Layer Filter Export')
    project.pdf.widthPt = 500
    project.pdf.heightPt = 380
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 60, y: 80 },
      end: { x: 220, y: 180 },
      color: 'green',
      class: 'class1',
    })
    project.layers.rooftop = false

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const ops = createdCanvases[0].ctx.operations
    expect(hasOperation(ops, 'moveTo', (args) => args[0] === 60 && args[1] === 80)).toBe(false)
    expect(hasOperation(ops, 'lineTo', (args) => args[0] === 220 && args[1] === 180)).toBe(false)
  })

  it('renders only current-page geometry for export', async () => {
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

    const project = createDefaultProject('Page Scoped Export')
    project.pdf.pageCount = 2
    project.pdf.pages = [
      { page: 1, widthPt: 500, heightPt: 380 },
      { page: 2, widthPt: 640, heightPt: 420 },
    ]
    project.view.currentPage = 2
    project.pdf.page = 2
    project.pdf.widthPt = 640
    project.pdf.heightPt = 420

    project.elements.lines.push(
      {
        id: 'line-page-1',
        page: 1,
        start: { x: 40, y: 40 },
        end: { x: 160, y: 160 },
        color: 'green',
        class: 'class1',
      },
      {
        id: 'line-page-2',
        page: 2,
        start: { x: 300, y: 80 },
        end: { x: 440, y: 200 },
        color: 'green',
        class: 'class1',
      },
    )

    const canvas = await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(420)
    const ops = createdCanvases[0].ctx.operations
    expect(hasOperation(ops, 'moveTo', (args) => args[0] === 40 && args[1] === 40)).toBe(false)
    expect(hasOperation(ops, 'lineTo', (args) => args[0] === 160 && args[1] === 160)).toBe(false)
    expect(hasOperation(ops, 'moveTo', (args) => args[0] === 300 && args[1] === 80)).toBe(true)
    expect(hasOperation(ops, 'lineTo', (args) => args[0] === 440 && args[1] === 200)).toBe(true)
  })

  it('excludes marks when includeMarks is false and includes them when true', async () => {
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

    const project = createDefaultProject('Marks Export')
    project.construction.marks.push({ id: 'mark-1', position: { x: 503, y: 607 } })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: true,
      pixelRatio: 1,
    })

    const noMarksOps = createdCanvases[0].ctx.operations
    const withMarksOps = createdCanvases[1].ctx.operations

    const markScale = annotationScaleFactor(project.settings.designScale)
    const markStartX = 503 - 5 * markScale
    const markStartY = 607 - 5 * markScale

    expect(
      hasOperation(
        noMarksOps,
        'moveTo',
        (args) => args[0] === markStartX && args[1] === markStartY,
      ),
    ).toBe(false)
    expect(
      hasOperation(
        withMarksOps,
        'moveTo',
        (args) => args[0] === markStartX && args[1] === markStartY,
      ),
    ).toBe(true)
  })

  it('draws background at page-aligned dimensions when requested', async () => {
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

    const project = createDefaultProject('Background Export')
    project.pdf.widthPt = 1224
    project.pdf.heightPt = 792

    const backgroundCanvas = { id: 'background-canvas' }

    await renderProjectCanvas(project, {
      includeBackground: true,
      includeMarks: false,
      pixelRatio: 2,
      backgroundCanvas: backgroundCanvas as unknown as HTMLCanvasElement,
    })

    const ops = createdCanvases[0].ctx.operations

    expect(hasOperation(ops, 'scale', (args) => args[0] === 2 && args[1] === 2)).toBe(true)
    expect(
      hasOperation(
        ops,
        'fillRect',
        (args) => args[0] === 0 && args[1] === 0 && args[2] === 1224 && args[3] === 792,
      ),
    ).toBe(true)
    expect(
      hasOperation(
        ops,
        'drawImage',
        (args) =>
          args[0] === backgroundCanvas &&
          args[1] === 0 &&
          args[2] === 0 &&
          args[3] === 1224 &&
          args[4] === 792,
      ),
    ).toBe(true)
  })

  it('applies PDF brightness alpha when compositing the background canvas', async () => {
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

    const project = createDefaultProject('Background Brightness')
    project.pdf.widthPt = 1000
    project.pdf.heightPt = 600
    project.settings.pdfBrightness = 0.6

    const backgroundCanvas = { id: 'background-canvas' }

    await renderProjectCanvas(project, {
      includeBackground: true,
      includeMarks: false,
      pixelRatio: 2,
      backgroundCanvas: backgroundCanvas as unknown as HTMLCanvasElement,
    })

    const ops = createdCanvases[0].ctx.operations

    expect(hasOperation(ops, 'save', () => true)).toBe(true)
    expect(hasOperation(ops, 'globalAlpha', (args) => args[0] === 0.6)).toBe(true)
    expect(
      hasOperation(
        ops,
        'drawImage',
        (args) =>
          args[0] === backgroundCanvas &&
          args[1] === 0 &&
          args[2] === 0 &&
          args[3] === 1000 &&
          args[4] === 600,
      ),
    ).toBe(true)
    expect(hasOperation(ops, 'restore', () => true)).toBe(true)
  })

  it('renders background fill without drawImage when background canvas is absent', async () => {
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

    const project = createDefaultProject('Background Fill Only')
    project.pdf.widthPt = 321
    project.pdf.heightPt = 123

    await renderProjectCanvas(project, {
      includeBackground: true,
      includeMarks: false,
      pixelRatio: 1,
      backgroundCanvas: null,
    })

    const ops = createdCanvases[0].ctx.operations

    expect(
      hasOperation(
        ops,
        'fillRect',
        (args) => args[0] === 0 && args[1] === 0 && args[2] === 321 && args[3] === 123,
      ),
    ).toBe(true)
    expect(hasOperation(ops, 'drawImage', () => true)).toBe(false)
  })

  it('shows empty legend message when there are no legend items', async () => {
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

    const project = createDefaultProject('Empty Legend')
    project.legend.placements.push({
      id: 'legend-empty',
      position: { x: 30, y: 22 },
      editedLabels: {},
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const ops = createdCanvases[0].ctx.operations
    expect(hasOperation(ops, 'fillText', (args) => args[0] === 'No components used yet.')).toBe(true)
  })

  it('renders general notes placements with shared numbered content', async () => {
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

    const project = createDefaultProject('General Notes Export')
    project.generalNotes.notes = ['Bond all rooftop equipment.']
    project.generalNotes.placements.push({
      id: 'general-notes-1',
      position: { x: 48, y: 36 },
    })

    await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    const ops = createdCanvases[0].ctx.operations
    expect(hasOperation(ops, 'fillText', (args) => args[0] === 'General Notes')).toBe(true)
    expect(hasOperation(ops, 'fillText', (args) => args[0] === '1. Bond all rooftop equipment.')).toBe(true)
  })

  it('clamps export canvas dimensions to at least one pixel', async () => {
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

    const project = createDefaultProject('Minimum Canvas Size')
    project.pdf.widthPt = 0
    project.pdf.heightPt = 0

    const canvas = await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    expect(canvas.width).toBe(1)
    expect(canvas.height).toBe(1)
    expect(createdCanvases).toHaveLength(1)
  })

  it('throws when the export canvas context cannot be created', async () => {
    vi.stubGlobal('document', {
      createElement(tag: string) {
        if (tag !== 'canvas') {
          throw new Error('Unexpected element request')
        }

        return {
          width: 0,
          height: 0,
          getContext: () => null,
          toBlob: (_callback: (blob: Blob | null) => void) => {},
        } as HTMLCanvasElement
      },
    })

    const project = createDefaultProject('Bad Context')
    await expect(
      renderProjectCanvas(project, {
        includeBackground: false,
        includeMarks: false,
        pixelRatio: 1,
      }),
    ).rejects.toThrowError('Unable to create export canvas context.')
  })

  it('renders export canvas with 500+ elements without failing', async () => {
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

    const project = createDefaultProject('Performance Sanity')
    project.pdf.widthPt = 1200
    project.pdf.heightPt = 900

    for (let i = 0; i < 500; i += 1) {
      project.elements.lines.push({
        id: `line-${i}`,
        start: { x: i, y: i % 100 },
        end: { x: i + 40, y: (i % 100) + 20 },
        color: 'green',
        class: i % 2 === 0 ? 'class1' : 'class2',
      })

      project.elements.symbols.push({
        id: `symbol-${i}`,
        symbolType: 'air_terminal',
        position: { x: (i * 2) % 1000, y: (i * 3) % 800 },
        color: 'blue',
        class: 'class1',
      })
    }

    const canvas = await renderProjectCanvas(project, {
      includeBackground: false,
      includeMarks: false,
      pixelRatio: 1,
    })

    expect(canvas.width).toBe(1200)
    expect(canvas.height).toBe(900)
    expect(createdCanvases).toHaveLength(1)
    expect(createdCanvases[0].ctx.operations.length).toBeGreaterThan(1000)
  })
})
