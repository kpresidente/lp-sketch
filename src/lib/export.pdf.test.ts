import { afterEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { createDefaultProject } from '../model/defaultProject'
import { exportProjectPdf } from './export'
import { downloadBlob } from './files'

vi.mock('./files', () => ({
  downloadBlob: vi.fn(),
}))

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aO0AAAAASUVORK5CYII='

class MinimalContext {
  scale(_: number, __: number) {}
  setLineDash(_: number[]) {}
  beginPath() {}
  moveTo(_: number, __: number) {}
  lineTo(_: number, __: number) {}
  quadraticCurveTo(_: number, __: number, ___: number, ____: number) {}
  bezierCurveTo(_: number, __: number, ___: number, ____: number, _____: number, ______: number) {}
  stroke(_: unknown = undefined) {}
  fill(_: unknown = undefined) {}
  fillText(_: string, __: number, ___: number) {}
  closePath() {}
  arc(_: number, __: number, ___: number, ____: number, _____: number) {}
  rect(_: number, __: number, ___: number, ____: number) {}
  save() {}
  restore() {}
  translate(_: number, __: number) {}
  rotate(_: number) {}
  drawImage(_: unknown, __: number, ___: number, ____: number, _____: number) {}
  fillRect(_: number, __: number, ___: number, ____: number) {}
}

interface FakeCanvas {
  width: number
  height: number
  getContext: (kind: string) => MinimalContext | null
  toBlob: (callback: (blob: Blob | null) => void, type?: string) => void
}

function createFakeCanvas(): FakeCanvas {
  const context = new MinimalContext()
  const pngBytes = new Uint8Array(Buffer.from(TINY_PNG_BASE64, 'base64'))

  return {
    width: 0,
    height: 0,
    getContext(kind: string) {
      if (kind !== '2d') {
        return null
      }
      return context
    },
    toBlob(callback: (blob: Blob | null) => void, type?: string) {
      callback(new Blob([pngBytes], { type: type ?? 'image/png' }))
    },
  }
}

describe('exportProjectPdf', () => {
  const originalDocument = globalThis.document

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    if (originalDocument) {
      vi.stubGlobal('document', originalDocument)
    }
  })

  it('exports only the active source page', async () => {
    vi.stubGlobal('document', {
      createElement(tag: string) {
        if (tag !== 'canvas') {
          throw new Error('Unexpected element request')
        }
        return createFakeCanvas()
      },
    })

    const sourcePdf = await PDFDocument.create()
    sourcePdf.addPage([320, 220])
    sourcePdf.addPage([640, 420])
    const sourceBytes = await sourcePdf.save()

    const project = createDefaultProject('Current Page PDF Export')
    project.pdf.sourceType = 'embedded'
    project.pdf.dataBase64 = Buffer.from(sourceBytes).toString('base64')
    project.pdf.pageCount = 2
    project.pdf.pages = [
      { page: 1, widthPt: 320, heightPt: 220 },
      { page: 2, widthPt: 640, heightPt: 420 },
    ]
    project.pdf.page = 2
    project.pdf.widthPt = 640
    project.pdf.heightPt = 420
    project.view.currentPage = 2
    project.view.byPage[2] = { zoom: 1, pan: { x: 24, y: 24 } }

    await exportProjectPdf(project, 'current-page')

    const mockedDownload = vi.mocked(downloadBlob)
    expect(mockedDownload).toHaveBeenCalledTimes(1)

    const [filename, blob] = mockedDownload.mock.calls[0]
    expect(filename).toBe('current-page.pdf')

    const exportedBytes = new Uint8Array(await (blob as Blob).arrayBuffer())
    const exportedPdf = await PDFDocument.load(exportedBytes)
    expect(exportedPdf.getPageCount()).toBe(1)

    const page = exportedPdf.getPage(0)
    expect(Math.round(page.getWidth())).toBe(640)
    expect(Math.round(page.getHeight())).toBe(420)
  })
})
