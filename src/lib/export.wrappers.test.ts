import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'

const {
  downloadBlobMock,
  pdfLoadMock,
  pdfCreateMock,
  rgbMock,
} = vi.hoisted(() => ({
  downloadBlobMock: vi.fn(),
  pdfLoadMock: vi.fn(),
  pdfCreateMock: vi.fn(),
  rgbMock: vi.fn((r: number, g: number, b: number) => ({ r, g, b })),
}))

vi.mock('./files', () => ({
  downloadBlob: downloadBlobMock,
}))

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: pdfLoadMock,
    create: pdfCreateMock,
  },
  rgb: rgbMock,
}))

import { exportProjectImage, exportProjectPdf } from './export'

class NoopContext2D {
  fillStyle = '#000000'
  strokeStyle = '#000000'
  lineWidth = 1
  lineCap = 'butt'
  font = ''
  textBaseline: CanvasTextBaseline = 'alphabetic'

  scale() {}
  fillRect() {}
  drawImage() {}
  setLineDash() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  stroke() {}
  fill() {}
  fillText() {}
  closePath() {}
  arc() {}
  rect() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
}

interface FakeCanvas {
  width: number
  height: number
  context: NoopContext2D
  toBlobCalls: Array<{ type?: string; quality?: number }>
  failBlobSerialization?: boolean
  getContext: (kind: string) => NoopContext2D | null
  toBlob: (callback: (blob: Blob | null) => void, type?: string, quality?: number) => void
}

function createFakeCanvas(failBlobSerialization = false): FakeCanvas {
  const context = new NoopContext2D()

  return {
    width: 0,
    height: 0,
    context,
    toBlobCalls: [],
    failBlobSerialization,
    getContext(kind: string) {
      if (kind !== '2d') {
        return null
      }
      return context
    },
    toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number) {
      this.toBlobCalls.push({ type, quality })
      if (this.failBlobSerialization) {
        callback(null)
        return
      }
      callback(new Blob(['canvas-bytes'], { type: type ?? 'image/png' }))
    },
  }
}

function createPdfMocks() {
  const drawImage = vi.fn()
  const drawRectangle = vi.fn()
  const page = {
    drawImage,
    drawRectangle,
    getWidth: () => 1000,
    getHeight: () => 800,
  }

  const addPage = vi.fn(() => page)
  const getPage = vi.fn(() => page)
  const getPages = vi.fn(() => [page])
  const embedPng = vi.fn(async () => ({ id: 'overlay-image' }))
  const save = vi.fn(async () => new Uint8Array([1, 2, 3, 4]))

  return {
    page,
    drawImage,
    drawRectangle,
    addPage,
    getPage,
    getPages,
    embedPng,
    save,
    document: {
      addPage,
      getPage,
      getPages,
      embedPng,
      save,
    },
  }
}

describe('export wrapper integration', () => {
  const originalDocument = globalThis.document
  let fakeCanvases: FakeCanvas[] = []

  beforeEach(() => {
    fakeCanvases = []
    downloadBlobMock.mockReset()
    pdfLoadMock.mockReset()
    pdfCreateMock.mockReset()
    rgbMock.mockClear()

    vi.stubGlobal('document', {
      createElement(tag: string) {
        if (tag !== 'canvas') {
          throw new Error(`Unexpected element request: ${tag}`)
        }

        const canvas = createFakeCanvas()
        fakeCanvases.push(canvas)
        return canvas
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalDocument) {
      vi.stubGlobal('document', originalDocument)
    }
  })

  it('exports image with expected extension, mime, and quality', async () => {
    const project = createDefaultProject('Wrapper Image')

    await exportProjectImage(project, 'jpg', 'wrapper-output', null)

    expect(fakeCanvases).toHaveLength(1)
    expect(fakeCanvases[0].toBlobCalls).toEqual([
      { type: 'image/jpeg', quality: 0.92 },
    ])
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock.mock.calls[0][0]).toBe('wrapper-output.jpg')
    expect(downloadBlobMock.mock.calls[0][1]).toBeInstanceOf(Blob)
    expect((downloadBlobMock.mock.calls[0][1] as Blob).type).toBe('image/jpeg')
  })

  it('exports PNG image with expected extension and mime', async () => {
    const project = createDefaultProject('Wrapper PNG')

    await exportProjectImage(project, 'png', 'wrapper-output', null)

    expect(fakeCanvases).toHaveLength(1)
    expect(fakeCanvases[0].toBlobCalls).toEqual([
      { type: 'image/png', quality: undefined },
    ])
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock.mock.calls[0][0]).toBe('wrapper-output.png')
    expect((downloadBlobMock.mock.calls[0][1] as Blob).type).toBe('image/png')
  })

  it('throws when canvas serialization returns null blob', async () => {
    vi.stubGlobal('document', {
      createElement(tag: string) {
        if (tag !== 'canvas') {
          throw new Error(`Unexpected element request: ${tag}`)
        }

        const canvas = createFakeCanvas(true)
        fakeCanvases.push(canvas)
        return canvas
      },
    })

    const project = createDefaultProject('Wrapper Blob Failure')

    await expect(exportProjectImage(project, 'png', 'blob-failure', null)).rejects.toThrowError(
      'Unable to serialize canvas output.',
    )
    expect(downloadBlobMock).not.toHaveBeenCalled()
  })

  it('exports PDF by loading existing source PDF and compositing overlay', async () => {
    const project = createDefaultProject('Wrapper PDF Existing')
    project.pdf.dataBase64 = 'QQ=='

    const pdf = createPdfMocks()
    pdfLoadMock.mockResolvedValue(pdf.document)

    await exportProjectPdf(project, 'wrapper-existing')

    expect(pdfLoadMock).toHaveBeenCalledTimes(1)
    expect(pdfCreateMock).not.toHaveBeenCalled()
    expect(pdf.embedPng).toHaveBeenCalledTimes(1)
    expect(pdf.drawImage).toHaveBeenCalledTimes(1)
    expect(pdf.drawRectangle).not.toHaveBeenCalled()
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock.mock.calls[0][0]).toBe('wrapper-existing.pdf')
    expect((downloadBlobMock.mock.calls[0][1] as Blob).type).toBe('application/pdf')
  })

  it('flattens export against rendered background when source PDF geometry is rotated', async () => {
    const project = createDefaultProject('Wrapper PDF Rotated Fallback')
    project.pdf.dataBase64 = 'QQ=='

    const sourcePage = {
      drawImage: vi.fn(),
      drawRectangle: vi.fn(),
      getWidth: () => 1000,
      getHeight: () => 800,
      getRotation: () => ({ angle: 90 }),
      getCropBox: () => ({ x: 0, y: 0, width: 1000, height: 800 }),
    }
    const sourceDocument = {
      addPage: vi.fn(() => sourcePage),
      getPage: vi.fn(() => sourcePage),
      getPages: vi.fn(() => [sourcePage]),
      embedPng: vi.fn(async () => ({ id: 'source-overlay-image' })),
      save: vi.fn(async () => new Uint8Array([5, 6, 7])),
    }

    const flattenedPage = {
      drawImage: vi.fn(),
      drawRectangle: vi.fn(),
      getWidth: () => project.pdf.widthPt,
      getHeight: () => project.pdf.heightPt,
    }
    const flattenedDocument = {
      addPage: vi.fn(() => flattenedPage),
      getPage: vi.fn(() => flattenedPage),
      getPages: vi.fn(() => [flattenedPage]),
      embedPng: vi.fn(async () => ({ id: 'flattened-overlay-image' })),
      save: vi.fn(async () => new Uint8Array([8, 9, 10])),
    }

    pdfLoadMock.mockResolvedValue(sourceDocument)
    pdfCreateMock.mockResolvedValue(flattenedDocument)

    await exportProjectPdf(project, 'wrapper-rotated-fallback', {} as HTMLCanvasElement)

    expect(pdfLoadMock).toHaveBeenCalledTimes(1)
    expect(pdfCreateMock).toHaveBeenCalledTimes(1)
    expect(sourceDocument.embedPng).not.toHaveBeenCalled()
    expect(sourceDocument.save).not.toHaveBeenCalled()
    expect(flattenedDocument.addPage).toHaveBeenCalledWith([project.pdf.widthPt, project.pdf.heightPt])
    expect(flattenedDocument.embedPng).toHaveBeenCalledTimes(1)
    expect(flattenedPage.drawImage).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock.mock.calls[0][0]).toBe('wrapper-rotated-fallback.pdf')
    expect((downloadBlobMock.mock.calls[0][1] as Blob).type).toBe('application/pdf')
  })

  it('flattens export against rendered background when source PDF crop box is offset', async () => {
    const project = createDefaultProject('Wrapper PDF Crop Offset Fallback')
    project.pdf.dataBase64 = 'QQ=='

    const sourcePage = {
      drawImage: vi.fn(),
      drawRectangle: vi.fn(),
      getWidth: () => 1000,
      getHeight: () => 800,
      getRotation: () => ({ angle: 0 }),
      getCropBox: () => ({ x: 24, y: 18, width: 1000, height: 800 }),
    }
    const sourceDocument = {
      addPage: vi.fn(() => sourcePage),
      getPage: vi.fn(() => sourcePage),
      getPages: vi.fn(() => [sourcePage]),
      embedPng: vi.fn(async () => ({ id: 'source-overlay-image' })),
      save: vi.fn(async () => new Uint8Array([11, 12, 13])),
    }

    const flattenedPage = {
      drawImage: vi.fn(),
      drawRectangle: vi.fn(),
      getWidth: () => project.pdf.widthPt,
      getHeight: () => project.pdf.heightPt,
    }
    const flattenedDocument = {
      addPage: vi.fn(() => flattenedPage),
      getPage: vi.fn(() => flattenedPage),
      getPages: vi.fn(() => [flattenedPage]),
      embedPng: vi.fn(async () => ({ id: 'flattened-overlay-image' })),
      save: vi.fn(async () => new Uint8Array([21, 22, 23])),
    }

    pdfLoadMock.mockResolvedValue(sourceDocument)
    pdfCreateMock.mockResolvedValue(flattenedDocument)

    await exportProjectPdf(project, 'wrapper-crop-offset-fallback', {} as HTMLCanvasElement)

    expect(pdfLoadMock).toHaveBeenCalledTimes(1)
    expect(pdfCreateMock).toHaveBeenCalledTimes(1)
    expect(sourceDocument.embedPng).not.toHaveBeenCalled()
    expect(sourceDocument.save).not.toHaveBeenCalled()
    expect(flattenedDocument.addPage).toHaveBeenCalledWith([project.pdf.widthPt, project.pdf.heightPt])
    expect(flattenedDocument.embedPng).toHaveBeenCalledTimes(1)
    expect(flattenedPage.drawImage).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock.mock.calls[0][0]).toBe('wrapper-crop-offset-fallback.pdf')
    expect((downloadBlobMock.mock.calls[0][1] as Blob).type).toBe('application/pdf')
  })

  it('applies a white wash overlay to source PDF pages when brightness is reduced', async () => {
    const project = createDefaultProject('Wrapper PDF Brightness')
    project.pdf.dataBase64 = 'QQ=='
    project.settings.pdfBrightness = 0.6

    const pdf = createPdfMocks()
    pdfLoadMock.mockResolvedValue(pdf.document)

    await exportProjectPdf(project, 'wrapper-brightness')

    expect(pdfLoadMock).toHaveBeenCalledTimes(1)
    expect(pdf.drawRectangle).toHaveBeenCalledTimes(1)
    expect(pdf.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
        opacity: 0.4,
      }),
    )
    expect(pdf.drawImage).toHaveBeenCalledTimes(1)
  })

  it('adds a page when loaded source PDF has zero pages', async () => {
    const project = createDefaultProject('Wrapper PDF Empty Pages')
    project.pdf.dataBase64 = 'QQ=='

    const drawImage = vi.fn()
    const drawRectangle = vi.fn()
    const page = {
      drawImage,
      drawRectangle,
      getWidth: () => 1000,
      getHeight: () => 800,
    }
    const addPage = vi.fn(() => page)
    const getPages = vi.fn(() => [])
    const getPage = vi.fn(() => page)
    const embedPng = vi.fn(async () => ({ id: 'overlay-image' }))
    const save = vi.fn(async () => new Uint8Array([9, 8, 7]))

    pdfLoadMock.mockResolvedValue({
      addPage,
      getPages,
      getPage,
      embedPng,
      save,
    })

    await exportProjectPdf(project, 'wrapper-empty-pages')

    expect(pdfLoadMock).toHaveBeenCalledTimes(1)
    expect(addPage).toHaveBeenCalledTimes(1)
    expect(getPage).toHaveBeenCalledWith(0)
    expect(drawRectangle).not.toHaveBeenCalled()
    expect(drawImage).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock.mock.calls[0][0]).toBe('wrapper-empty-pages.pdf')
  })

  it('exports PDF without source by creating white page background first', async () => {
    const project = createDefaultProject('Wrapper PDF New')
    project.pdf.dataBase64 = null

    const pdf = createPdfMocks()
    pdfCreateMock.mockResolvedValue(pdf.document)

    await exportProjectPdf(project, 'wrapper-new')

    expect(pdfCreateMock).toHaveBeenCalledTimes(1)
    expect(pdfLoadMock).not.toHaveBeenCalled()
    expect(pdf.drawRectangle).toHaveBeenCalledTimes(1)
    expect(rgbMock).toHaveBeenCalled()
    expect(pdf.drawImage).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock.mock.calls[0][0]).toBe('wrapper-new.pdf')
  })
})
