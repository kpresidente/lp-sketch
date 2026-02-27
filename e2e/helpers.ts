import { expect, type FilePayload, type Locator, type Page } from '@playwright/test'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type StagePoint = { x: number; y: number }

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function disableNativeFileDialogs(page: Page) {
  await page.addInitScript(() => {
    const win = window as Window & {
      showOpenFilePicker?: unknown
      showSaveFilePicker?: unknown
    }

    try {
      Object.defineProperty(win, 'showOpenFilePicker', {
        configurable: true,
        writable: true,
        value: undefined,
      })
    } catch {
      win.showOpenFilePicker = undefined
    }

    try {
      Object.defineProperty(win, 'showSaveFilePicker', {
        configurable: true,
        writable: true,
        value: undefined,
      })
    } catch {
      win.showSaveFilePicker = undefined
    }
  })
}

export async function gotoApp(page: Page): Promise<Locator> {
  await disableNativeFileDialogs(page)
  await page.goto('/')
  const drawingStage = page.locator('.drawing-stage')
  await expect(drawingStage).toBeVisible()
  return drawingStage
}

export function panelRegion(page: Page, label: string): Locator {
  return page.getByRole('region', { name: label })
}

export async function clickStage(
  page: Page,
  point: StagePoint,
  options?: Parameters<Locator['click']>[0],
) {
  await page.locator('.drawing-stage').click({
    position: point,
    ...options,
  })
}

export async function dragBetweenStagePoints(page: Page, start: StagePoint, end: StagePoint) {
  const drawingStage = page.locator('.drawing-stage')
  const box = await drawingStage.boundingBox()
  if (!box) {
    throw new Error('Drawing stage bounding box is unavailable.')
  }

  await page.mouse.move(box.x + start.x, box.y + start.y)
  await page.mouse.down()
  await page.mouse.move(box.x + end.x, box.y + end.y)
  await page.mouse.up()
}

export async function dragLocatorToStagePoint(
  page: Page,
  locator: Locator,
  target: StagePoint,
) {
  const drawingStage = page.locator('.drawing-stage')
  const stageBox = await drawingStage.boundingBox()
  const handleBox = await locator.boundingBox()
  if (!stageBox || !handleBox) {
    throw new Error('Unable to resolve drag geometry.')
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(stageBox.x + target.x, stageBox.y + target.y)
  await page.mouse.up()
}

export async function expectStatus(page: Page, text: string | RegExp) {
  const locator = page.locator('.sidebar .status-msg').filter({
    hasText: text instanceof RegExp ? text : new RegExp(escapeRegExp(text)),
  })
  await expect(locator.last()).toBeVisible()
}

export async function expectError(page: Page, text: string | RegExp) {
  const locator = page.locator('.sidebar .status-msg.error').filter({
    hasText: text instanceof RegExp ? text : new RegExp(escapeRegExp(text)),
  })
  await expect(locator.last()).toBeVisible()
}

export async function createSamplePdfPayload(name = 'e2e-sample.pdf'): Promise<FilePayload> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([1200, 900])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  page.drawText('LP Sketch E2E Fixture', {
    x: 48,
    y: 848,
    size: 18,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })
  const bytes = await pdfDoc.save()
  return {
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from(bytes),
  }
}

export async function importPdfFromProjectPanel(page: Page, fileName = 'e2e-import.pdf') {
  const chooserPromise = page.waitForEvent('filechooser')
  await panelRegion(page, 'Project').getByRole('button', { name: /Import PDF$/ }).click()
  const chooser = await chooserPromise
  await chooser.setFiles(await createSamplePdfPayload(fileName))
  await expectStatus(page, new RegExp(`Imported ${escapeRegExp(fileName)}`))
}

export function createProjectJsonPayload(options?: {
  name?: string
  fileName?: string
  withLine?: boolean
  withText?: boolean
}): FilePayload {
  const now = new Date().toISOString()
  const projectName = options?.name ?? 'Loaded E2E Project'
  const defaultScale = {
    isSet: false,
    method: null,
    realUnitsPerPoint: null,
    displayUnits: null,
  } as const
  const project = {
    schemaVersion: '1.9.0',
    projectMeta: {
      id: 'project-e2e',
      name: projectName,
      createdAt: now,
      updatedAt: now,
    },
    pdf: {
      sourceType: 'referenced',
      name: 'source.pdf',
      sha256: '0'.repeat(64),
      page: 1,
      pageCount: 1,
      pages: [{ page: 1, widthPt: 1200, heightPt: 900 }],
      widthPt: 1200,
      heightPt: 900,
      dataBase64: null,
      path: 'source.pdf',
    },
    scale: {
      ...defaultScale,
      byPage: { 1: { ...defaultScale } },
    },
    settings: {
      activeColor: 'green',
      activeClass: 'class1',
      designScale: 'medium',
      pdfBrightness: 1,
      pdfBrightnessByPage: { 1: 1 },
      legendDataScope: 'global',
      notesDataScope: 'global',
      snapEnabled: true,
      autoConnectorsEnabled: true,
      autoConnectorType: 'mechanical',
      angleSnapEnabled: true,
      angleIncrementDeg: 15,
    },
    view: {
      currentPage: 1,
      zoom: 1,
      pan: { x: 24, y: 24 },
      byPage: {
        1: {
          zoom: 1,
          pan: { x: 24, y: 24 },
        },
      },
    },
    layers: {
      rooftop: true,
      downleads: true,
      grounding: true,
      annotation: true,
    },
    elements: {
      lines: options?.withLine
        ? [
          {
            id: 'line-e2e',
            start: { x: 120, y: 160 },
            end: { x: 320, y: 160 },
            color: 'green',
            class: 'class1',
          },
        ]
        : [],
      arcs: [],
      curves: [],
      symbols: [],
      texts: options?.withText
        ? [
          {
            id: 'text-e2e',
            position: { x: 180, y: 210 },
            text: 'Loaded text',
            color: 'green',
            layer: 'annotation',
          },
        ]
        : [],
      arrows: [],
      dimensionTexts: [],
    },
    construction: {
      marks: [],
    },
    legend: {
      items: [],
      placements: [],
      customSuffixes: {},
    },
    generalNotes: {
      notes: [],
      notesByPage: { 1: [] },
      placements: [],
    },
  }

  return {
    name: options?.fileName ?? 'e2e-loaded.lpsketch.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project, null, 2)),
  }
}

async function createMultiPagePdfBase64(): Promise<string> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const page1 = pdfDoc.addPage([1200, 900])
  page1.drawText('LP Sketch E2E Multi-page Fixture: Page 1', {
    x: 48,
    y: 848,
    size: 18,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })

  const page2 = pdfDoc.addPage([1200, 900])
  page2.drawText('LP Sketch E2E Multi-page Fixture: Page 2', {
    x: 48,
    y: 848,
    size: 18,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })

  const bytes = await pdfDoc.save()
  return Buffer.from(bytes).toString('base64')
}

export async function createMultiPageProjectJsonPayload(options?: {
  fileName?: string
  notesScope?: 'page' | 'global'
}): Promise<FilePayload> {
  const now = new Date().toISOString()
  const notesScope = options?.notesScope ?? 'page'
  const embeddedPdfBase64 = await createMultiPagePdfBase64()
  const defaultScale = {
    isSet: false,
    method: null,
    realUnitsPerPoint: null,
    displayUnits: null,
  } as const

  const project = {
    schemaVersion: '1.9.0',
    projectMeta: {
      id: 'project-e2e-multipage',
      name: 'Loaded E2E Multi-page Project',
      createdAt: now,
      updatedAt: now,
    },
    pdf: {
      sourceType: 'embedded',
      name: 'multi-source.pdf',
      sha256: '0'.repeat(64),
      page: 1,
      pageCount: 2,
      pages: [
        { page: 1, widthPt: 1200, heightPt: 900 },
        { page: 2, widthPt: 1200, heightPt: 900 },
      ],
      widthPt: 1200,
      heightPt: 900,
      dataBase64: embeddedPdfBase64,
      path: null,
    },
    scale: {
      ...defaultScale,
      byPage: {
        1: { ...defaultScale },
        2: { ...defaultScale },
      },
    },
    settings: {
      activeColor: 'green',
      activeClass: 'class1',
      designScale: 'medium',
      pdfBrightness: 1,
      pdfBrightnessByPage: { 1: 1, 2: 1 },
      legendDataScope: 'global',
      notesDataScope: notesScope,
      snapEnabled: true,
      autoConnectorsEnabled: true,
      autoConnectorType: 'mechanical',
      angleSnapEnabled: true,
      angleIncrementDeg: 15,
    },
    view: {
      currentPage: 1,
      zoom: 1,
      pan: { x: 24, y: 24 },
      byPage: {
        1: { zoom: 1, pan: { x: 24, y: 24 } },
        2: { zoom: 1, pan: { x: 24, y: 24 } },
      },
    },
    layers: {
      rooftop: true,
      downleads: true,
      grounding: true,
      annotation: true,
    },
    elements: {
      lines: [
        {
          id: 'line-page-1',
          page: 1,
          start: { x: 120, y: 160 },
          end: { x: 320, y: 160 },
          color: 'green',
          class: 'class1',
        },
        {
          id: 'line-page-2',
          page: 2,
          start: { x: 520, y: 160 },
          end: { x: 760, y: 160 },
          color: 'green',
          class: 'class1',
        },
      ],
      arcs: [],
      curves: [],
      symbols: [],
      texts: [],
      arrows: [],
      dimensionTexts: [],
    },
    construction: {
      marks: [],
    },
    legend: {
      items: [],
      placements: [],
      customSuffixes: {},
    },
    generalNotes: {
      notes: ['Global note'],
      notesByPage: {
        1: ['Page 1 note'],
        2: ['Page 2 note'],
      },
      placements: [
        {
          id: 'notes-page-1',
          page: 1,
          position: { x: 140, y: 260 },
        },
        {
          id: 'notes-page-2',
          page: 2,
          position: { x: 540, y: 260 },
        },
      ],
    },
  }

  return {
    name: options?.fileName ?? 'e2e-multipage.lpsketch.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project, null, 2)),
  }
}

export async function loadProjectFromProjectPanel(page: Page, payload: FilePayload) {
  const chooserPromise = page.waitForEvent('filechooser')
  await panelRegion(page, 'Project').getByRole('button', { name: /Load$/ }).click()
  const chooser = await chooserPromise
  await chooser.setFiles(payload)
  await expectStatus(page, /Loaded .*\.lpsketch\.json/)
}

export async function applyManualScale(page: Page, inches: string, feet: string) {
  await page.getByLabel('Scale inches').fill(inches)
  await page.getByLabel('Scale feet').fill(feet)
  await page.getByRole('button', { name: 'Apply Scale', exact: true }).click()
  await expectStatus(page, 'Manual scale applied.')
}
