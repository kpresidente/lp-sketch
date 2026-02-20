import { expect, type FilePayload, type Locator, type Page } from '@playwright/test'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type StagePoint = { x: number; y: number }

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function gotoApp(page: Page): Promise<Locator> {
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
  await panelRegion(page, 'Project').locator('button[title="Import PDF"]').click()
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
  const project = {
    schemaVersion: '1.8.0',
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
      widthPt: 1200,
      heightPt: 900,
      dataBase64: null,
      path: 'source.pdf',
    },
    scale: {
      isSet: false,
      method: null,
      realUnitsPerPoint: null,
      displayUnits: null,
    },
    settings: {
      activeColor: 'green',
      activeClass: 'class1',
      designScale: 'medium',
      pdfBrightness: 1,
      snapEnabled: true,
      autoConnectorsEnabled: true,
      autoConnectorType: 'mechanical',
      angleSnapEnabled: true,
      angleIncrementDeg: 15,
    },
    view: {
      zoom: 1,
      pan: { x: 24, y: 24 },
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
      placements: [],
    },
  }

  return {
    name: options?.fileName ?? 'e2e-loaded.lpsketch.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project, null, 2)),
  }
}

export async function applyManualScale(page: Page, inches: string, feet: string) {
  await page.getByLabel('Scale inches').fill(inches)
  await page.getByLabel('Scale feet').fill(feet)
  await page.getByRole('button', { name: 'Apply Scale', exact: true }).click()
  await expectStatus(page, 'Manual scale applied.')
}
