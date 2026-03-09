import { PDFDocument, rgb } from 'pdf-lib'
import type { LpProject } from '../types/project'
import { downloadBlob } from './files'
import { filterProjectByCurrentPage, filterProjectByVisibleLayers } from './layers'
import { drawProjectToContext } from '../workspace/renderCore'

interface RenderCanvasOptions {
  includeBackground: boolean
  includeMarks?: boolean
  pixelRatio?: number
  backgroundCanvas?: HTMLCanvasElement | null
}

function normalizedCurrentPage(project: LpProject): number {
  const candidate = Number.isFinite(project.view.currentPage)
    ? project.view.currentPage
    : project.pdf.page
  if (!Number.isFinite(candidate)) {
    return 1
  }

  return Math.max(1, Math.trunc(candidate))
}

function activePdfDimensions(project: LpProject): { widthPt: number; heightPt: number } {
  const width = Number.isFinite(project.pdf.widthPt) ? project.pdf.widthPt : 1
  const height = Number.isFinite(project.pdf.heightPt) ? project.pdf.heightPt : 1
  return {
    widthPt: Math.max(1, Math.round(width)),
    heightPt: Math.max(1, Math.round(height)),
  }
}

function normalizedPdfBrightness(project: LpProject): number {
  const value = project.settings.pdfBrightness
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.max(0, Math.min(1, value))
}

function hexToPdfRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255
  return rgb(r, g, b)
}

function base64ToUint8(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to serialize canvas output.'))
          return
        }

        resolve(blob)
      },
      type,
      quality,
    )
  })
}

export async function renderProjectCanvas(
  project: LpProject,
  options: RenderCanvasOptions,
): Promise<HTMLCanvasElement> {
  const currentPage = normalizedCurrentPage(project)
  const pageScopedProject = filterProjectByCurrentPage(project, currentPage)
  const visibleProject = filterProjectByVisibleLayers(pageScopedProject)
  const pdfBrightness = normalizedPdfBrightness(visibleProject)
  const { widthPt, heightPt } = activePdfDimensions(visibleProject)
  const pixelRatio = options.pixelRatio ?? 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(widthPt * pixelRatio))
  canvas.height = Math.max(1, Math.round(heightPt * pixelRatio))

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Unable to create export canvas context.')
  }

  ctx.scale(pixelRatio, pixelRatio)

  if (options.includeBackground) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, widthPt, heightPt)

    if (options.backgroundCanvas) {
      ctx.save()
      ctx.globalAlpha = pdfBrightness
      ctx.drawImage(options.backgroundCanvas, 0, 0, widthPt, heightPt)
      ctx.restore()
    }
  }

  drawProjectToContext(ctx, visibleProject, { includeMarks: options.includeMarks ?? false })

  return canvas
}

export async function exportProjectImage(
  project: LpProject,
  format: 'png' | 'jpg',
  filenameBase: string,
  backgroundCanvas?: HTMLCanvasElement | null,
) {
  const blob = await renderProjectImageBlob(project, format, backgroundCanvas)
  downloadBlob(`${filenameBase}.${format}`, blob)
}

export async function renderProjectImageBlob(
  project: LpProject,
  format: 'png' | 'jpg',
  backgroundCanvas?: HTMLCanvasElement | null,
) {
  const canvas = await renderProjectCanvas(project, {
    includeBackground: true,
    includeMarks: false,
    pixelRatio: 2,
    backgroundCanvas,
  })

  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  return canvasToBlob(canvas, mime, format === 'jpg' ? 0.92 : undefined)
}

export async function renderProjectPdfBlob(
  project: LpProject,
  backgroundCanvas?: HTMLCanvasElement | null,
): Promise<Blob> {
  const visibleProject = filterProjectByVisibleLayers(project)
  const pdfBrightness = normalizedPdfBrightness(visibleProject)
  const hasSourcePdf = Boolean(visibleProject.pdf.dataBase64)
  const currentPage = normalizedCurrentPage(visibleProject)
  const { widthPt: activeWidthPt, heightPt: activeHeightPt } = activePdfDimensions(visibleProject)

  let pdfDocument: PDFDocument

  const pageHasGeometryMismatch = (
    page: {
      getWidth: () => number
      getHeight: () => number
      getRotation?: () => { angle: number }
      getCropBox?: () => { x: number; y: number; width: number; height: number }
    },
  ) => {
    const normalizedRotation = ((((page.getRotation?.().angle ?? 0) % 360) + 360) % 360)
    if (normalizedRotation !== 0) {
      return true
    }

    if (
      Math.abs(page.getWidth() - visibleProject.pdf.widthPt) > 0.5 ||
      Math.abs(page.getHeight() - visibleProject.pdf.heightPt) > 0.5
    ) {
      return true
    }

    const cropBox = page.getCropBox?.()
    if (cropBox && (Math.abs(cropBox.x) > 0.5 || Math.abs(cropBox.y) > 0.5)) {
      return true
    }

    return false
  }

  if (hasSourcePdf) {
    const sourcePdfDocument = await PDFDocument.load(base64ToUint8(visibleProject.pdf.dataBase64 ?? ''))
    const sourcePages = sourcePdfDocument.getPages()
    const sourcePageIndex = sourcePages.length > 0
      ? Math.max(0, Math.min(sourcePages.length - 1, currentPage - 1))
      : 0
    const sourcePage = sourcePages.length > 0 ? sourcePdfDocument.getPage(sourcePageIndex) : null
    const canUseRasterFallback = !!backgroundCanvas && sourcePage && pageHasGeometryMismatch(sourcePage)

    if (canUseRasterFallback) {
      const compositedCanvas = await renderProjectCanvas(visibleProject, {
        includeBackground: true,
        includeMarks: false,
        pixelRatio: 2,
        backgroundCanvas,
      })
      const compositedBlob = await canvasToBlob(compositedCanvas, 'image/png')
      const compositedBytes = new Uint8Array(await compositedBlob.arrayBuffer())

      const flattenedPdf = await PDFDocument.create()
      const flattenedPage = flattenedPdf.addPage([activeWidthPt, activeHeightPt])
      const compositedImage = await flattenedPdf.embedPng(compositedBytes)

      flattenedPage.drawImage(compositedImage, {
        x: 0,
        y: 0,
        width: flattenedPage.getWidth(),
        height: flattenedPage.getHeight(),
      })

      const bytes = await flattenedPdf.save()
      const byteCopy = new Uint8Array(bytes.length)
      byteCopy.set(bytes)
      return new Blob([byteCopy], { type: 'application/pdf' })
    }

    pdfDocument = await PDFDocument.create()
    if (sourcePage) {
      const [copiedPage] = await pdfDocument.copyPages(sourcePdfDocument, [sourcePageIndex])
      pdfDocument.addPage(copiedPage)
    } else {
      pdfDocument.addPage([activeWidthPt, activeHeightPt])
    }
  } else {
    pdfDocument = await PDFDocument.create()
    pdfDocument.addPage([activeWidthPt, activeHeightPt])
  }

  const overlayCanvas = await renderProjectCanvas(visibleProject, {
    includeBackground: false,
    includeMarks: false,
    pixelRatio: 2,
  })
  const overlayBlob = await canvasToBlob(overlayCanvas, 'image/png')
  const overlayBytes = new Uint8Array(await overlayBlob.arrayBuffer())

  const pages = pdfDocument.getPages()

  if (pages.length === 0) {
    pdfDocument.addPage([visibleProject.pdf.widthPt, visibleProject.pdf.heightPt])
  }

  const page = pdfDocument.getPage(0)
  const overlayImage = await pdfDocument.embedPng(overlayBytes)

  if (!hasSourcePdf) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
      color: hexToPdfRgb('#ffffff'),
      borderWidth: 0,
    })
  }

  if (hasSourcePdf && pdfBrightness < 1) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: page.getHeight(),
      color: hexToPdfRgb('#ffffff'),
      borderWidth: 0,
      opacity: 1 - pdfBrightness,
    })
  }

  page.drawImage(overlayImage, {
    x: 0,
    y: 0,
    width: page.getWidth(),
    height: page.getHeight(),
  })

  const bytes = await pdfDocument.save()
  const byteCopy = new Uint8Array(bytes.length)
  byteCopy.set(bytes)
  return new Blob([byteCopy], { type: 'application/pdf' })
}

export async function exportProjectPdf(
  project: LpProject,
  filenameBase: string,
  backgroundCanvas?: HTMLCanvasElement | null,
): Promise<void> {
  const blob = await renderProjectPdfBlob(project, backgroundCanvas)
  downloadBlob(`${filenameBase}.pdf`, blob)
}
