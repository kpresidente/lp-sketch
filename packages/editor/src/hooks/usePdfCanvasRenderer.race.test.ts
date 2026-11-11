import { createRoot, createSignal } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { usePdfCanvasRenderer } from './usePdfCanvasRenderer'

// Regression test for overlapping render requests in the render pipeline's
// request lifecycle.

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
  }

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

describe('usePdfCanvasRenderer overlapping requests', () => {
  it('shows the newest page when the page changes while the previous page is still loading', async () => {
    // Mirrors pdf.js: a canvas with an unfinished render rejects a second
    // render() with this message (InternalRenderTask.initializeGraphics).
    const canvasesInUse = new Set<unknown>()
    const renderedPages: number[] = []
    const runningRenders = new Map<number, ReturnType<typeof createDeferredPromise>>()

    function createPage(pageNumber: number) {
      return {
        getViewport: ({ scale }: { scale: number }) => ({ width: 640 * scale, height: 480 * scale }),
        render: ({ canvas }: { canvas: unknown }) => {
          renderedPages.push(pageNumber)
          if (canvasesInUse.has(canvas)) {
            const rejected = Promise.reject(
              new Error('Cannot use the same canvas during multiple render() operations.'),
            )
            rejected.catch(() => {})
            return { cancel: vi.fn(), promise: rejected }
          }

          canvasesInUse.add(canvas)
          const running = createDeferredPromise()
          runningRenders.set(pageNumber, running)
          const finished = running.promise.finally(() => {
            canvasesInUse.delete(canvas)
          })
          finished.catch(() => {})
          return {
            cancel: () => running.reject(new Error('Rendering cancelled')),
            promise: finished,
          }
        },
      }
    }

    const pageLoads = new Map<number, ReturnType<typeof createDeferredPromise<ReturnType<typeof createPage>>>>()
    const getPageMock = vi.fn((pageNumber: number) => {
      const load = createDeferredPromise<ReturnType<typeof createPage>>()
      pageLoads.set(pageNumber, load)
      return load.promise
    })
    getDocumentMock.mockImplementation(() => ({
      promise: Promise.resolve({ numPages: 3, getPage: getPageMock }),
      destroy: vi.fn(async () => {}),
    }))

    const { canvas: frontCanvas, context: frontContext } = createCanvasStub()
    const { canvas: backCanvas } = createCanvasStub()
    const originalDocument = globalThis.document
    ;(globalThis as { document?: unknown }).document = {
      createElement: () => backCanvas,
    }

    const setError = vi.fn()
    let setCurrentPage: ((next: number) => void) | null = null
    const dispose = createRoot((rootDispose) => {
      const [pdfSignature] = createSignal('signature')
      const [currentPage, setPage] = createSignal(1)
      setCurrentPage = setPage

      const { bindPdfCanvasRef } = usePdfCanvasRenderer({
        pdfState: () => ({ dataBase64: 'encoded-pdf', widthPt: 1200, heightPt: 900 }),
        pdfSignature,
        currentPage,
        setError,
      })

      bindPdfCanvasRef(frontCanvas)
      return rootDispose
    })

    try {
      // Request 1 is waiting for page 1 when the user moves to page 2.
      await flushAsyncWork()
      expect(pageLoads.has(1)).toBe(true)

      setCurrentPage?.(2)
      await flushAsyncWork()
      expect(pageLoads.has(2)).toBe(true)

      // The pages arrive in the order they were requested.
      pageLoads.get(1)?.resolve(createPage(1))
      await flushAsyncWork()
      pageLoads.get(2)?.resolve(createPage(2))
      await flushAsyncWork()

      // Let every render that was started run to completion.
      for (const running of runningRenders.values()) {
        running.resolve()
      }
      await flushAsyncWork()

      // The current page must reach the visible canvas, which requires that
      // the superseded request never occupies the shared back buffer.
      expect(frontContext.drawImage).toHaveBeenCalledTimes(1)
      expect(frontContext.drawImage).toHaveBeenCalledWith(backCanvas, 0, 0)
      expect(renderedPages).toEqual([2])
      expect(setError).not.toHaveBeenCalled()
    } finally {
      ;(globalThis as { document?: unknown }).document = originalDocument
      dispose()
    }
  })
})
