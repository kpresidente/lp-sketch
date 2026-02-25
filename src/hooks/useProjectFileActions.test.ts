import { createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_PDF_IMPORT_PAGES } from '../config/runtimeLimits'
import { createDefaultProject } from '../model/defaultProject'
import type { LpProject, Selection } from '../types/project'
import { useProjectFileActions } from './useProjectFileActions'

const { getDocumentMock } = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
}))

vi.mock('pdfjs-dist', () => ({
  getDocument: getDocumentMock,
}))

vi.mock('../lib/files', async () => {
  const actual = await vi.importActual<typeof import('../lib/files')>('../lib/files')
  return {
    ...actual,
    arrayBufferToBase64: vi.fn(() => 'base64-pdf-data'),
    sha256Hex: vi.fn(async () => 'f'.repeat(64)),
  }
})

function createTestPdfFile(): File {
  return {
    name: 'test.pdf',
    size: 4,
    async arrayBuffer() {
      return new Uint8Array([1, 2, 3, 4]).buffer
    },
  } as File
}

function createMockPdf(numPages: number) {
  return {
    numPages,
    getPage: vi.fn(async (page: number) => ({
      getViewport: () => ({
        width: 1000 + page,
        height: 800 + page,
      }),
    })),
    destroy: vi.fn(async () => {}),
  }
}

function createImportEvent(file: File): Event {
  const target = {
    files: [file],
    value: 'set',
  }
  return {
    target,
  } as unknown as Event
}

function createHarness() {
  const [project, setProject] = createSignal<LpProject>(createDefaultProject('Import Harness'))
  const [selected, setSelected] = createSignal<Selection | null>(null)
  const [multiSelection, setMultiSelection] = createSignal<Selection[]>([])
  const [status, setStatus] = createSignal('')
  const [error, setError] = createSignal('')

  const actions = useProjectFileActions({
    project,
    visibleProject: project,
    replaceProject(nextProject) {
      setProject(nextProject)
    },
    clearTransientToolState() {},
    setSelected,
    setMultiSelection,
    setStatus,
    setError,
    getPdfCanvas: () => undefined,
  })

  return {
    project,
    selected,
    multiSelection,
    status,
    error,
    actions,
  }
}

describe('useProjectFileActions import PDF', () => {
  beforeEach(() => {
    getDocumentMock.mockReset()
  })

  it('shows explicit max-page error when a PDF exceeds configured page limit', async () => {
    const totalPages = MAX_PDF_IMPORT_PAGES + 1
    const mockPdf = createMockPdf(totalPages)
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve(mockPdf),
    })

    const harness = createHarness()
    await harness.actions.handleImportPdf(createImportEvent(createTestPdfFile()))

    expect(harness.error()).toBe(
      `This PDF has ${totalPages} pages. The maximum supported is ${MAX_PDF_IMPORT_PAGES}.`,
    )
    expect(mockPdf.getPage).not.toHaveBeenCalled()
    expect(mockPdf.destroy).toHaveBeenCalledOnce()
    expect(harness.project().pdf.pageCount).toBe(1)
    expect(harness.selected()).toBeNull()
    expect(harness.multiSelection()).toHaveLength(0)
  })

  it('imports a multi-page PDF and initializes page-scoped state for each page', async () => {
    const totalPages = Math.min(3, MAX_PDF_IMPORT_PAGES)
    const mockPdf = createMockPdf(totalPages)
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve(mockPdf),
    })

    const harness = createHarness()
    await harness.actions.handleImportPdf(createImportEvent(createTestPdfFile()))

    expect(harness.status()).toContain('Imported test.pdf')
    expect(harness.error()).toBe('')
    expect(harness.project().pdf.pageCount).toBe(totalPages)
    expect(harness.project().pdf.pages).toEqual([
      { page: 1, widthPt: 1001, heightPt: 801 },
      { page: 2, widthPt: 1002, heightPt: 802 },
      { page: 3, widthPt: 1003, heightPt: 803 },
    ])
    expect(harness.project().view.currentPage).toBe(1)
    expect(harness.project().view.byPage[1]).toEqual({ zoom: 1, pan: { x: 24, y: 24 } })
    expect(harness.project().view.byPage[2]).toEqual({ zoom: 1, pan: { x: 24, y: 24 } })
    expect(harness.project().view.byPage[3]).toEqual({ zoom: 1, pan: { x: 24, y: 24 } })
    expect(harness.project().scale.byPage[1].isSet).toBe(false)
    expect(harness.project().scale.byPage[2].isSet).toBe(false)
    expect(harness.project().scale.byPage[3].isSet).toBe(false)
    expect(harness.project().settings.pdfBrightnessByPage[1]).toBe(harness.project().settings.pdfBrightness)
    expect(harness.project().settings.pdfBrightnessByPage[2]).toBe(harness.project().settings.pdfBrightness)
    expect(harness.project().settings.pdfBrightnessByPage[3]).toBe(harness.project().settings.pdfBrightness)
    expect(mockPdf.getPage).toHaveBeenCalledTimes(totalPages)
    expect(mockPdf.destroy).toHaveBeenCalledOnce()
    expect(harness.selected()).toBeNull()
    expect(harness.multiSelection()).toHaveLength(0)
  })
})
