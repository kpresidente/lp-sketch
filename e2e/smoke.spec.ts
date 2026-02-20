import { expect, test, type Locator, type Page } from '@playwright/test'

async function stage(page: Page): Promise<Locator> {
  const drawingStage = page.locator('.drawing-stage')
  await expect(drawingStage).toBeVisible()
  return drawingStage
}

async function clickStage(
  drawingStage: Locator,
  x: number,
  y: number,
  options?: Parameters<Locator['click']>[0],
) {
  await drawingStage.click({
    position: { x, y },
    ...options,
  })
}

test.describe('LP Sketch smoke flows', () => {
  test('landing skeleton import button opens file picker', async ({ page }) => {
    await page.goto('/')

    const chooserPromise = page.waitForEvent('filechooser')
    await page.locator('.canvas-watermark .wm-import-btn').click()
    await chooserPromise
  })

  test('line placement with undo/redo', async ({ page }) => {
    await page.goto('/')
    const drawingStage = await stage(page)

    await page.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(drawingStage, 120, 140)
    await clickStage(drawingStage, 280, 200)

    await expect(page.getByText('Line segment added.')).toBeVisible()

    const line = page.locator('svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]')
    await expect(line).toHaveCount(1)

    await page.getByRole('button', { name: 'Quick undo' }).click()
    await expect(line).toHaveCount(0)

    await page.getByRole('button', { name: 'Quick redo' }).click()
    await expect(line).toHaveCount(1)
  })

  test('manual scale + auto-spacing completion', async ({ page }) => {
    await page.goto('/')
    const drawingStage = await stage(page)

    await page.getByLabel('Scale inches').fill('1')
    await page.getByLabel('Scale feet').fill('20')
    await page.getByRole('button', { name: 'Apply Scale', exact: true }).click()
    await expect(page.getByText('Manual scale applied.')).toBeVisible()

    await page.getByRole('button', { name: /Linear AT$/ }).click()

    await clickStage(drawingStage, 220, 220)
    await clickStage(drawingStage, 520, 220)

    await page.getByRole('button', { name: 'Finish Open' }).click()

    await expect(page.getByText(/Linear auto-spacing complete: placed/)).toBeVisible()
    const terminalCount = await page
      .locator('svg.overlay-layer g[data-symbol-type="air_terminal"]')
      .count()
    expect(terminalCount).toBeGreaterThan(0)
  })

  test('text and arrow placement', async ({ page }) => {
    await page.goto('/')
    const drawingStage = await stage(page)

    await page.getByRole('button', { name: /^\S+\sText$/ }).click()
    await page.getByLabel('Text').fill('E2E NOTE')
    await clickStage(drawingStage, 350, 220)

    await expect(page.getByText('Text note placed.')).toBeVisible()
    await expect(page.getByText('E2E NOTE')).toBeVisible()

    await page.getByRole('button', { name: /Arrow$/ }).click()
    await clickStage(drawingStage, 360, 280)
    await clickStage(drawingStage, 520, 340)

    await expect(page.getByText('Arrow placed.')).toBeVisible()
    await expect(
      page.locator('svg.overlay-layer line[stroke="#2e8b57"][marker-end="url(#arrow-head)"]'),
    ).toHaveCount(1)
  })

  test('PNG export triggers browser download', async ({ page }) => {
    await page.goto('/')

    await page.getByPlaceholder('Project name...').fill('E2E Smoke Plan')

    await page.getByRole('button', { name: /PNG$/ }).click()
    await expect(page.getByText('Exported PNG output.')).toBeVisible()
  })
})
