import { expect, test } from '@playwright/test'
import {
  clickStage,
  dragLocatorToStagePoint,
  expectStatus,
  gotoApp,
  openBlock,
} from './helpers'

test.describe('selection and symbols', () => {
  test('browser mouse selection still moves immediately with a two-pixel drag', async ({ page }) => {
    const stage = await gotoApp(page)
    await (await openBlock(page, 'Conductors')).getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 180, y: 200 })
    await clickStage(page, { x: 340, y: 200 })
    await page.getByRole('button', { name: 'Quick select mode' }).click()
    const line = page.locator('svg.overlay-layer line[stroke="#2e8b57"][stroke-linecap="round"]')
    const before = Number(await line.getAttribute('x1'))
    const bounds = await stage.boundingBox()
    if (!bounds) throw new Error('Canvas has no bounds')
    await page.keyboard.down('Control')
    await page.keyboard.down('Shift')
    await page.mouse.move(bounds.x + 260, bounds.y + 200)
    await page.mouse.down()
    await page.mouse.move(bounds.x + 262, bounds.y + 200)
    await expect.poll(async () => Number(await line.getAttribute('x1'))).toBe(before + 2)
    await page.mouse.up()
    await page.keyboard.up('Shift')
    await page.keyboard.up('Control')
  })

  test('selecting a line exposes endpoint handles and supports endpoint drag', async ({ page }) => {
    await gotoApp(page)
    const conductors = await openBlock(page, 'Conductors')
    const mode = await openBlock(page, 'Mode')

    await conductors.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 140, y: 180 })
    await clickStage(page, { x: 360, y: 240 })
    await expectStatus(page, 'Line segment added.')

    await mode.getByRole('button', { name: /Select$/ }).click()
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
    const conductors = await openBlock(page, 'Conductors')
    const mode = await openBlock(page, 'Mode')

    await conductors.getByRole('button', { name: /Arc$/ }).click()
    await clickStage(page, { x: 400, y: 300 })
    await clickStage(page, { x: 350, y: 386 })
    await clickStage(page, { x: 350, y: 214 })
    await expectStatus(page, 'Arc added.')

    await mode.getByRole('button', { name: /Select$/ }).click()
    await clickStage(page, { x: 400, y: 300 })

    await expect(page.locator('circle[data-selection-handle="arc-start"]')).toHaveCount(1)
    await expect(page.locator('circle[data-selection-handle="arc-through"]')).toHaveCount(1)
    await expect(page.locator('circle[data-selection-handle="arc-end"]')).toHaveCount(1)
  })

  test('directional symbol placement and vertical footage editing work', async ({ page }) => {
    await gotoApp(page)
    const downleads = await openBlock(page, 'Downleads')
    const mode = await openBlock(page, 'Mode')

    await downleads.getByRole('button', { name: /Conduit to Ground$/ }).click()
    await clickStage(page, { x: 300, y: 260 })
    await clickStage(page, { x: 300, y: 360 })
    await expectStatus(page, 'Directional symbol placed.')

    const verticalIndicator = page.locator('svg.overlay-layer text[data-vertical-footage-indicator="active"]')
    await expect(verticalIndicator).toHaveCount(0)

    await mode.getByRole('button', { name: /Select$/ }).click()
    await clickStage(page, { x: 300, y: 260 })

    await expect(page.locator('circle[data-selection-handle="symbol-direction"]')).toHaveCount(1)
    const verticalInput = page.getByLabel('Selected downlead vertical feet')
    await verticalInput.fill('50')
    await verticalInput.press('Enter')
    await expectStatus(page, 'Vertical distance updated.')
    await expect(verticalIndicator).toHaveCount(1)
    await expect(verticalIndicator).toContainText('50')
  })

  test('layer visibility toggles hide and restore rooftop geometry', async ({ page }) => {
    await gotoApp(page)
    const conductors = await openBlock(page, 'Conductors')

    await conductors.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 140, y: 420 })
    await clickStage(page, { x: 380, y: 420 })
    await expectStatus(page, 'Line segment added.')

    const line = page.locator('svg.overlay-layer line[stroke="#2e8b57"]').first()
    await expect(line).toHaveCount(1)

    const layers = await openBlock(page, 'Layers')
    const rooftopToggle = layers.locator('.toggle-row', { hasText: 'Rooftop' }).getByRole('switch')
    await rooftopToggle.click()
    await expect(line).toHaveCount(0)
    await rooftopToggle.click()
    await expect(line).toHaveCount(1)
  })

  test('annotation size scaling updates annotation stroke widths', async ({ page }) => {
    await gotoApp(page)
    const conductors = await openBlock(page, 'Conductors')
    const size = await openBlock(page, 'Annotation size', 'radiogroup')

    await conductors.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 120, y: 500 })
    await clickStage(page, { x: 360, y: 500 })

    const line = page.locator('svg.overlay-layer line[stroke="#2e8b57"]').first()

    await size.getByRole('radio', { name: 'Small' }).click()
    const smallStroke = Number.parseFloat((await line.getAttribute('stroke-width')) || '0')

    await size.getByRole('radio', { name: 'Large' }).click()
    const largeStroke = Number.parseFloat((await line.getAttribute('stroke-width')) || '0')

    expect(largeStroke).toBeGreaterThan(smallStroke)
  })
})
