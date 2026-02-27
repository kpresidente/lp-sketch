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
  setError: (message: string) => void
}

export function usePdfCanvasRenderer(options: UsePdfCanvasRendererOptions) {
  let pdfCanvasRef: HTMLCanvasElement | undefined
  let pdfRenderRequestVersion = 0
  let activePdfRenderTask: { cancel: () => void; promise: Promise<unknown> } | null = null
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

  async function renderPdfIntoCanvas(dataBase64: string | null, widthPt: number, heightPt: number) {
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

      const requestedPage = options.currentPage()
      const safePage = Number.isFinite(requestedPage)
        ? Math.min(Math.max(1, Math.trunc(requestedPage)), pdf.numPages)
        : 1

      const page = await pdf.getPage(safePage)
      const viewport = page.getViewport({ scale: 1 })

      canvas.width = Math.max(1, Math.round(viewport.width))
      canvas.height = Math.max(1, Math.round(viewport.height))

      context.clearRect(0, 0, canvas.width, canvas.height)

      const renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
      }) as { cancel: () => void; promise: Promise<unknown> }
      activePdfRenderTask = renderTask

      try {
        await renderTask.promise
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
    void renderPdfIntoCanvas(pdf.dataBase64, pdf.widthPt, pdf.heightPt).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to render PDF background.'
      options.setError(message)
    })
  }

  function bindPdfCanvasRef(element: HTMLCanvasElement) {
    pdfCanvasRef = element
    queueRenderCurrentPdf()
  }

  createEffect(
    on(() => [options.pdfSignature(), options.currentPage()] as const, () => {
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
