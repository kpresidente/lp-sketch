import { getDocument, PDFWorker } from 'pdfjs-dist'
import { createEffect, on, onCleanup, type Accessor } from 'solid-js'
import { base64ToBytes } from '../lib/files'

interface PdfCanvasState {
  dataBase64: string | null
  widthPt: number
  heightPt: number
}

interface UsePdfCanvasRendererOptions {
  pdfState: Accessor<PdfCanvasState>
  pdfSignature: Accessor<string>
  currentPage: Accessor<number>
  renderScale?: Accessor<number>
  interactionActive?: Accessor<boolean>
  setError: (message: string) => void
}

const MAX_PDF_RENDER_SCALE = 2

export function usePdfCanvasRenderer(options: UsePdfCanvasRendererOptions) {
  let pdfCanvasRef: HTMLCanvasElement | undefined
  let pdfBackBufferRef: HTMLCanvasElement | null = null
  let pdfRenderRequestVersion = 0
  let activePdfRenderTask: { cancel: () => void; promise: Promise<unknown> } | null = null
  let committedContentKey: string | null = null
  let committedRenderKey: string | null = null
  const sharedPdfWorker = new PDFWorker()

  function isPdfRenderCancellation(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const message = error.message.toLowerCase()
    return message.includes('cancel') || message.includes('multiple render() operations')
  }

  async function cancelActivePdfRenderTask() {
    const activeTask = activePdfRenderTask
    if (!activeTask) {
      return
    }

    activePdfRenderTask = null
    try {
      activeTask.cancel()
    } catch {
      // Ignore cancellation failures when task is already complete.
    }

    try {
      await activeTask.promise
    } catch {
      // Ignore cancellation exceptions from cancelled tasks.
    }
  }

  function normalizedRenderScale() {
    const requested = options.renderScale?.() ?? 1
    if (!Number.isFinite(requested)) {
      return 1
    }
    return Math.min(MAX_PDF_RENDER_SCALE, Math.max(1, requested))
  }

  function isInteractionActive() {
    return options.interactionActive?.() ?? false
  }

  function ensurePdfBackBuffer(frontCanvas: HTMLCanvasElement) {
    if (pdfBackBufferRef) {
      return pdfBackBufferRef
    }

    const ownerDocument =
      (frontCanvas as HTMLCanvasElement & { ownerDocument?: Document }).ownerDocument ?? globalThis.document
    if (!ownerDocument) {
      return null
    }

    pdfBackBufferRef = ownerDocument.createElement('canvas')
    return pdfBackBufferRef
  }

  function promoteBufferToFront(
    frontCanvas: HTMLCanvasElement,
    frontContext: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
  ) {
    frontCanvas.width = Math.max(1, sourceCanvas.width)
    frontCanvas.height = Math.max(1, sourceCanvas.height)
    frontContext.clearRect(0, 0, frontCanvas.width, frontCanvas.height)
    frontContext.drawImage(sourceCanvas, 0, 0)
  }

  async function renderPdfIntoCanvas(
    dataBase64: string | null,
    widthPt: number,
    heightPt: number,
    requestedPage: number,
    renderScale: number,
    contentKey: string,
    renderKey: string,
  ) {
    const requestVersion = ++pdfRenderRequestVersion
    await cancelActivePdfRenderTask()

    if (requestVersion !== pdfRenderRequestVersion) {
      return
    }

    if (!pdfCanvasRef) {
      return
    }

    const canvas = pdfCanvasRef
    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    if (!dataBase64) {
      canvas.width = Math.max(1, Math.round(widthPt))
      canvas.height = Math.max(1, Math.round(heightPt))
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      committedContentKey = contentKey
      committedRenderKey = renderKey
      return
    }

    const backBuffer = ensurePdfBackBuffer(canvas) ?? canvas
    const backContext = backBuffer.getContext('2d')
    if (!backContext) {
      return
    }

    const bytes = base64ToBytes(dataBase64)
    const pdfDocumentTask = getDocument({ data: bytes, worker: sharedPdfWorker })
    const pdf = await pdfDocumentTask.promise

    try {
      if (requestVersion !== pdfRenderRequestVersion) {
        return
      }

      if (pdf.numPages < 1) {
        throw new Error('Unable to render PDF: no pages available.')
      }

      const safePage = Number.isFinite(requestedPage)
        ? Math.min(Math.max(1, Math.trunc(requestedPage)), pdf.numPages)
        : 1

      const page = await pdf.getPage(safePage)
      const viewport = page.getViewport({ scale: renderScale })

      backBuffer.width = Math.max(1, Math.round(viewport.width))
      backBuffer.height = Math.max(1, Math.round(viewport.height))
      backContext.clearRect(0, 0, backBuffer.width, backBuffer.height)

      const renderTask = page.render({
        canvas: backBuffer,
        canvasContext: backContext,
        viewport,
      }) as { cancel: () => void; promise: Promise<unknown> }
      activePdfRenderTask = renderTask

      try {
        await renderTask.promise
        if (requestVersion !== pdfRenderRequestVersion) {
          return
        }

        promoteBufferToFront(canvas, context, backBuffer)
        committedContentKey = contentKey
        committedRenderKey = renderKey
      } catch (error) {
        if (requestVersion !== pdfRenderRequestVersion || isPdfRenderCancellation(error)) {
          return
        }

        throw error
      } finally {
        if (activePdfRenderTask === renderTask) {
          activePdfRenderTask = null
        }
      }
    } finally {
      await pdf.destroy()
    }
  }

  function queueRenderCurrentPdf() {
    const pdf = options.pdfState()
    const currentPage = options.currentPage()
    const renderScale = normalizedRenderScale()
    const contentKey = `${options.pdfSignature()}:${currentPage}`
    const renderKey = `${contentKey}:${renderScale}`
    const contentChanged = contentKey !== committedContentKey

    if (!contentChanged && renderKey === committedRenderKey) {
      return
    }

    if (!contentChanged && committedRenderKey !== null && isInteractionActive()) {
      return
    }

    void renderPdfIntoCanvas(
      pdf.dataBase64,
      pdf.widthPt,
      pdf.heightPt,
      currentPage,
      renderScale,
      contentKey,
      renderKey,
    ).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to render PDF background.'
      options.setError(message)
    })
  }

  function bindPdfCanvasRef(element: HTMLCanvasElement) {
    pdfCanvasRef = element
    pdfBackBufferRef = null
    committedContentKey = null
    committedRenderKey = null
    queueRenderCurrentPdf()
  }

  createEffect(
    on(() => [
      options.pdfSignature(),
      options.currentPage(),
      normalizedRenderScale(),
      isInteractionActive(),
    ] as const, () => {
      queueRenderCurrentPdf()
    }),
  )

  onCleanup(() => {
    pdfRenderRequestVersion += 1
    const activeTask = activePdfRenderTask
    activePdfRenderTask = null
    if (activeTask) {
      try {
        activeTask.cancel()
      } catch {
        // Ignore cancellation failures when task is already complete.
      }
    }
    sharedPdfWorker.destroy()
  })

  return {
    bindPdfCanvasRef,
  }
}
