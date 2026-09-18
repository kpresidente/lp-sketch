import { createRoot, createSignal } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { usePdfCanvasRenderer } from './usePdfCanvasRenderer'

const { getDocumentMock } = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
}))

vi.mock('pdfjs-dist', () => ({
  getDocument: getDocumentMock,
  PDFWorker: class { destroy = vi.fn() },
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
    drawImage: vi.fn(),
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

function createDeferredPromise<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

async function flushAsyncWork() {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('usePdfCanvasRenderer', () => {
  it('renders into a back buffer and promotes only after the new page render completes', async () => {
    const firstRenderTask = {
      cancel: vi.fn(),
      promise: Promise.resolve(),
    }
    const secondRenderDeferred = createDeferredPromise()
    const secondRenderTask = {
      cancel: vi.fn(),
      promise: secondRenderDeferred.promise,
    }
    const renderMock = vi
      .fn()
      .mockReturnValueOnce(firstRenderTask)
      .mockReturnValueOnce(secondRenderTask)
    const getPageMock = vi.fn(async (_pageNumber: number) => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 640 * scale,
        height: 480 * scale,
      }),
      render: renderMock,
    }))
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 3,
        getPage: getPageMock,
        destroy: vi.fn(async () => {}),
      }),
    })

    const { canvas: frontCanvas, context: frontContext } = createCanvasStub()
    const { canvas: backCanvas } = createCanvasStub()
    const originalDocument = globalThis.document
    const createElementSpy = vi.fn((tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        return backCanvas as unknown as HTMLCanvasElement
      }

      throw new Error(`Unexpected tag requested in test: ${tagName}`)
    })
    ;(globalThis as typeof globalThis & { document?: { createElement: typeof createElementSpy } }).document = {
      createElement: createElementSpy,
    }

    let setCurrentPage: ((next: number) => void) | null = null
    const dispose = createRoot((rootDispose) => {
      const [pdfSignature] = createSignal('signature')
      const [currentPage, setPage] = createSignal(1)
      setCurrentPage = setPage

      const { bindPdfCanvasRef } = usePdfCanvasRenderer({
        pdfState: () => ({
          dataBase64: 'encoded-pdf',
          widthPt: 1200,
          heightPt: 900,
        }),
        pdfSignature,
        currentPage,
        setError: vi.fn(),
      })

      bindPdfCanvasRef(frontCanvas)
      return rootDispose
    })

    await flushAsyncWork()
    frontContext.clearRect.mockClear()
    frontContext.drawImage.mockClear()

    setCurrentPage?.(2)
    await flushAsyncWork()

    expect(createElementSpy).toHaveBeenCalledWith('canvas')
    expect(renderMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canvas: backCanvas,
        canvasContext: backCanvas.getContext('2d'),
      }),
    )
    expect(frontContext.clearRect).not.toHaveBeenCalled()
    expect(frontContext.drawImage).not.toHaveBeenCalled()

    secondRenderDeferred.resolve()
    await flushAsyncWork()

    expect(frontContext.drawImage).toHaveBeenCalledWith(backCanvas, 0, 0)

    ;(globalThis as typeof globalThis & { document?: Document }).document = originalDocument
    dispose()
  })

  it('defers scale rerenders until interaction settles', async () => {
    const renderTask = {
      cancel: vi.fn(),
      promise: Promise.resolve(),
    }
    const renderMock = vi.fn(() => renderTask)
    const getViewportMock = vi.fn(({ scale }: { scale: number }) => ({
      width: 640 * scale,
      height: 480 * scale,
    }))
    const getPageMock = vi.fn(async (_pageNumber: number) => ({
      getViewport: getViewportMock,
      render: renderMock,
    }))
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 3,
        getPage: getPageMock,
        destroy: vi.fn(async () => {}),
      }),
    })

    const { canvas: frontCanvas } = createCanvasStub()
    const { canvas: backCanvas } = createCanvasStub()
    const originalDocument = globalThis.document
    const createElementSpy = vi.fn((tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        return backCanvas as unknown as HTMLCanvasElement
      }

      throw new Error(`Unexpected tag requested in test: ${tagName}`)
    })
    ;(globalThis as typeof globalThis & { document?: { createElement: typeof createElementSpy } }).document = {
      createElement: createElementSpy,
    }

    let setRenderScale: ((next: number) => void) | null = null
    let setInteractionActive: ((next: boolean) => void) | null = null
    const dispose = createRoot((rootDispose) => {
      const [pdfSignature] = createSignal('signature')
      const [currentPage] = createSignal(1)
      const [renderScale, setNextRenderScale] = createSignal(1)
      const [interactionActive, setNextInteractionActive] = createSignal(false)
      setRenderScale = setNextRenderScale
      setInteractionActive = setNextInteractionActive

      const { bindPdfCanvasRef } = usePdfCanvasRenderer({
        pdfState: () => ({
          dataBase64: 'encoded-pdf',
          widthPt: 1200,
          heightPt: 900,
        }),
        pdfSignature,
        currentPage,
        setError: vi.fn(),
        renderScale,
        interactionActive,
      } as Parameters<typeof usePdfCanvasRenderer>[0])

      bindPdfCanvasRef(frontCanvas)
      return rootDispose
    })

    await flushAsyncWork()
    renderMock.mockClear()
    getViewportMock.mockClear()

    setInteractionActive?.(true)
    setRenderScale?.(2)
    await flushAsyncWork()

    expect(renderMock).not.toHaveBeenCalled()

    setInteractionActive?.(false)
    await flushAsyncWork()

    expect(renderMock).toHaveBeenCalledTimes(1)
    expect(getViewportMock).toHaveBeenLastCalledWith({ scale: 2 })

    ;(globalThis as typeof globalThis & { document?: Document }).document = originalDocument
    dispose()
  })

  it('rerenders when the visible pdf canvas ref is rebound for the same page state', async () => {
    const renderTask = {
      cancel: vi.fn(),
      promise: Promise.resolve(),
    }
    const renderMock = vi.fn(() => renderTask)
    const getPageMock = vi.fn(async (_pageNumber: number) => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 640 * scale,
        height: 480 * scale,
      }),
      render: renderMock,
    }))
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 3,
        getPage: getPageMock,
        destroy: vi.fn(async () => {}),
      }),
    })

    const { canvas: firstFrontCanvas } = createCanvasStub()
    const { canvas: secondFrontCanvas, context: secondFrontContext } = createCanvasStub()
    const { canvas: backCanvas } = createCanvasStub()
    const originalDocument = globalThis.document
    const createElementSpy = vi.fn((tagName: string) => {
      if (tagName.toLowerCase() === 'canvas') {
        return backCanvas as unknown as HTMLCanvasElement
      }

      throw new Error(`Unexpected tag requested in test: ${tagName}`)
    })
    ;(globalThis as typeof globalThis & { document?: { createElement: typeof createElementSpy } }).document = {
      createElement: createElementSpy,
    }

    let bindPdfCanvasRef: ((element: HTMLCanvasElement) => void) | null = null
    const dispose = createRoot((rootDispose) => {
      const [pdfSignature] = createSignal('signature')
      const [currentPage] = createSignal(1)
      const renderer = usePdfCanvasRenderer({
        pdfState: () => ({
          dataBase64: 'encoded-pdf',
          widthPt: 1200,
          heightPt: 900,
        }),
        pdfSignature,
        currentPage,
        setError: vi.fn(),
      })
      bindPdfCanvasRef = renderer.bindPdfCanvasRef

      renderer.bindPdfCanvasRef(firstFrontCanvas)
      return rootDispose
    })

    await flushAsyncWork()
    renderMock.mockClear()

    bindPdfCanvasRef?.(secondFrontCanvas)
    await flushAsyncWork()

    expect(renderMock).toHaveBeenCalledTimes(1)
    expect(secondFrontContext.drawImage).toHaveBeenCalledWith(backCanvas, 0, 0)

    ;(globalThis as typeof globalThis & { document?: Document }).document = originalDocument
    dispose()
  })

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
