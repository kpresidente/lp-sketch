import { createRoot, createSignal } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { usePdfCanvasRenderer } from './usePdfCanvasRenderer'

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
    base64ToBytes: vi.fn(() => new Uint8Array([1, 2, 3])),
  }
})

function createCanvasStub() {
  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '#ffffff',
  } as unknown as CanvasRenderingContext2D

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement

  return { canvas, context }
}

async function flushAsyncWork() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('usePdfCanvasRenderer', () => {
  it('renders the current active PDF page', async () => {
    const renderTask = {
      cancel: vi.fn(),
      promise: Promise.resolve(),
    }
    const renderMock = vi.fn(() => renderTask)
    const getPageMock = vi.fn(async (_pageNumber: number) => ({
      getViewport: () => ({ width: 640, height: 480 }),
      render: renderMock,
    }))
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 3,
        getPage: getPageMock,
        destroy: vi.fn(async () => {}),
      }),
    })

    const { canvas } = createCanvasStub()
    const errors: string[] = []

    let setCurrentPage: ((next: number) => void) | null = null
    const dispose = createRoot((rootDispose) => {
      const [pdfSignature] = createSignal('signature')
      const [currentPage, setPage] = createSignal(2)
      setCurrentPage = setPage

      const { bindPdfCanvasRef } = usePdfCanvasRenderer({
        pdfState: () => ({
          dataBase64: 'encoded-pdf',
          widthPt: 1200,
          heightPt: 900,
        }),
        pdfSignature,
        currentPage,
        setError(message) {
          errors.push(message)
        },
      })

      bindPdfCanvasRef(canvas)
      return rootDispose
    })

    await flushAsyncWork()
    expect(getPageMock.mock.calls.some(([page]) => page === 2)).toBe(true)

    setCurrentPage?.(3)
    await flushAsyncWork()
    expect(getPageMock.mock.calls.some(([page]) => page === 3)).toBe(true)
    expect(errors).toEqual([])

    dispose()
  })
})
