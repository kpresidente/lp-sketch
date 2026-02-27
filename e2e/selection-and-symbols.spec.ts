import { expect, test } from '@playwright/test'
import {
  clickStage,
  dragLocatorToStagePoint,
  expectStatus,
  gotoApp,
  panelRegion,
} from './helpers'

test.describe('selection and symbols', () => {
  test('selecting a line exposes endpoint handles and supports endpoint drag', async ({ page }) => {
    await gotoApp(page)
    const components = panelRegion(page, 'Components')
    const tools = panelRegion(page, 'Tools')

    await components.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 140, y: 180 })
    await clickStage(page, { x: 360, y: 240 })
    await expectStatus(page, 'Line segment added.')

    await tools.getByRole('button', { name: /Select$/ }).click()
    await clickStage(page, { x: 250, y: 210 })

    const startHandle = page.locator('circle[data-selection-handle="line-start"]')
    const endHandle = page.locator('circle[data-selection-handle="line-end"]')
    await expect(startHandle).toHaveCount(1)
    await expect(endHandle).toHaveCount(1)

    const line = page.locator('svg.overlay-layer line[stroke="#2e8b57"]').first()
    const x1Before = await line.getAttribute('x1')
    await dragLocatorToStagePoint(page, startHandle, { x: 90, y: 150 })
    await expect.poll(async () => line.getAttribute('x1')).not.toBe(x1Before)
  })

  test('arc selection exposes all three arc handles', async ({ page }) => {
    await gotoApp(page)
    const components = panelRegion(page, 'Components')
    const tools = panelRegion(page, 'Tools')

    await components.getByRole('button', { name: /Arc$/ }).click()
    await clickStage(page, { x: 400, y: 300 })
    await clickStage(page, { x: 350, y: 386 })
    await clickStage(page, { x: 350, y: 214 })
    await expectStatus(page, 'Arc added.')

    await tools.getByRole('button', { name: /Select$/ }).click()
    await clickStage(page, { x: 400, y: 300 })

    await expect(page.locator('circle[data-selection-handle="arc-start"]')).toHaveCount(1)
    await expect(page.locator('circle[data-selection-handle="arc-through"]')).toHaveCount(1)
    await expect(page.locator('circle[data-selection-handle="arc-end"]')).toHaveCount(1)
  })

  test('directional symbol placement and vertical footage editing work', async ({ page }) => {
    await gotoApp(page)
    const components = panelRegion(page, 'Components')
    const tools = panelRegion(page, 'Tools')

    await components.getByRole('button', { name: /Conduit to Ground$/ }).click()
    await clickStage(page, { x: 300, y: 260 })
    await clickStage(page, { x: 300, y: 360 })
    await expectStatus(page, 'Directional symbol placed.')

    const verticalIndicator = page.locator('svg.overlay-layer text[data-vertical-footage-indicator="active"]')
    await expect(verticalIndicator).toHaveCount(1)
    await expect(verticalIndicator).toContainText('0')

    await tools.getByRole('button', { name: /Select$/ }).click()
    await clickStage(page, { x: 300, y: 260 })

    await expect(page.locator('circle[data-selection-handle="symbol-direction"]')).toHaveCount(1)
    const verticalInput = page.getByLabel('Selected downlead vertical feet')
    await verticalInput.fill('50')
    await verticalInput.press('Enter')
    await expectStatus(page, 'Vertical distance updated.')
    await expect(verticalIndicator).toContainText('50')
  })

  test('layer visibility toggles hide and restore rooftop geometry', async ({ page }) => {
    await gotoApp(page)
    const components = panelRegion(page, 'Components')
    const layers = panelRegion(page, 'Layers')

    await components.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 140, y: 420 })
    await clickStage(page, { x: 380, y: 420 })
    await expectStatus(page, 'Line segment added.')

    const line = page.locator('svg.overlay-layer line[stroke="#2e8b57"]').first()
    await expect(line).toHaveCount(1)

    const rooftopToggle = layers.locator('.toggle-row', { hasText: 'Rooftop' }).getByRole('switch')
    await rooftopToggle.click()
    await expect(line).toHaveCount(0)
    await rooftopToggle.click()
    await expect(line).toHaveCount(1)
  })

  test('annotation size scaling updates annotation stroke widths', async ({ page }) => {
    await gotoApp(page)
    const components = panelRegion(page, 'Components')
    const scale = panelRegion(page, 'Scale')

    await components.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 120, y: 500 })
    await clickStage(page, { x: 360, y: 500 })

    const line = page.locator('svg.overlay-layer line[stroke="#2e8b57"]').first()

    await scale.getByRole('radio', { name: 'Small' }).click()
    const smallStroke = Number.parseFloat((await line.getAttribute('stroke-width')) || '0')

    await scale.getByRole('radio', { name: 'Large' }).click()
    const largeStroke = Number.parseFloat((await line.getAttribute('stroke-width')) || '0')

    expect(largeStroke).toBeGreaterThan(smallStroke)
  })
})
