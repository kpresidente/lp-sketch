import { expect, test } from '@playwright/test'
import {
  applyManualScale,
  clickStage,
  expectStatus,
  gotoApp,
  panelRegion,
} from './helpers'

test.describe('geometry and annotation tools', () => {
  test('line tool supports placement and quick undo/redo', async ({ page }) => {
    await gotoApp(page)
    await panelRegion(page, 'Components').locator('button[title="Linear Conductor"]').click()

    await clickStage(page, { x: 120, y: 140 })
    await clickStage(page, { x: 320, y: 220 })

    await expectStatus(page, 'Line segment added.')
    const line = page.locator('svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]').first()
    await expect(line).toHaveCount(1)

    await page.getByRole('button', { name: 'Quick undo' }).click()
    await expect(line).toHaveCount(0)

    await page.getByRole('button', { name: 'Quick redo' }).click()
    await expect(line).toHaveCount(1)
  })

  test('arc and curve tools place geometry', async ({ page }) => {
    await gotoApp(page)
    const components = panelRegion(page, 'Components')

    await components.locator('button[title="Arc Conductor"]').click()
    await clickStage(page, { x: 400, y: 300 })
    await clickStage(page, { x: 350, y: 386 })
    await clickStage(page, { x: 350, y: 214 })
    await expect(page.locator('svg.overlay-layer path[stroke="#2e8b57"]')).toHaveCount(1)

    await components.locator('button[title="Curve Conductor"]').click()
    await clickStage(page, { x: 200, y: 380 })
    await clickStage(page, { x: 340, y: 300 })
    await clickStage(page, { x: 520, y: 360 })
    await expectStatus(page, 'Curve added.')

    const paths = page.locator('svg.overlay-layer path[stroke="#2e8b57"]')
    await expect(paths).toHaveCount(2)
  })

  test('text, arrow, and dimension text placement work together', async ({ page }) => {
    await gotoApp(page)
    await applyManualScale(page, '1', '20')
    const tools = panelRegion(page, 'Tools')

    await tools.locator('button[title="Text"]').click()
    await page.getByLabel('Text').fill('E2E NOTE')
    await clickStage(page, { x: 340, y: 220 })
    await expectStatus(page, 'Text note placed.')
    await expect(page.locator('svg.overlay-layer text', { hasText: 'E2E NOTE' })).toHaveCount(1)

    await tools.locator('button[title="Arrow"]').click()
    await clickStage(page, { x: 360, y: 280 })
    await clickStage(page, { x: 520, y: 340 })
    await expectStatus(page, 'Arrow placed.')
    await expect(page.locator('svg.overlay-layer line[marker-end="url(#arrow-head)"]')).toHaveCount(1)

    await tools.locator('button[title="Dimension Text"]').click()
    const extensionLinesSwitch = page.getByRole('switch', { name: 'Dimension extension lines' })
    if ((await extensionLinesSwitch.getAttribute('aria-checked')) === 'false') {
      await extensionLinesSwitch.click()
    }
    await clickStage(page, { x: 180, y: 480 })
    await clickStage(page, { x: 420, y: 480 })
    await clickStage(page, { x: 300, y: 520 })
    await expectStatus(page, 'Dimension text placed.')
    await expect(page.locator('svg.overlay-layer g[data-dimension-linework="active"]')).toHaveCount(1)
  })

  test('measure and mark workflows clear correctly', async ({ page }) => {
    await gotoApp(page)
    const tools = panelRegion(page, 'Tools')

    await tools.locator('button[title="Measure"]').click()
    await clickStage(page, { x: 180, y: 180 })
    await clickStage(page, { x: 420, y: 180 })
    await expectStatus(page, 'Measurement point added.')
    await page.getByRole('button', { name: 'Clear', exact: true }).click()
    await expectStatus(page, 'Measurement path cleared.')

    await tools.locator('button[title="Mark"]').click()
    await clickStage(page, { x: 220, y: 280 })
    await clickStage(page, { x: 360, y: 280 })
    await expectStatus(page, 'Mark placed. New span starts from this mark.')
    await expect(page.locator('svg.overlay-layer line[stroke="#b91c1c"]')).toHaveCount(2)

    await page.getByRole('button', { name: 'Clear All', exact: true }).click()
    await expectStatus(page, 'Cleared all marks.')
    await expect(page.locator('svg.overlay-layer line[stroke="#b91c1c"]')).toHaveCount(0)
  })

  test('calibration sets scale from two points', async ({ page }) => {
    await gotoApp(page)
    await panelRegion(page, 'Scale').getByRole('button', { name: /Calibrate/ }).click()

    page.once('dialog', (dialog) => dialog.accept('25'))
    await clickStage(page, { x: 180, y: 160 })
    await clickStage(page, { x: 480, y: 160 })

    await expectStatus(page, 'Scale calibrated from two points.')
  })
})
