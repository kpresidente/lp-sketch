import { expect, test } from '@playwright/test'
import { clickStage, expectStatus, gotoApp, openBlock } from './helpers'

// Tempered's shell spec: tabs, the stroke widget, the collapsed rail and its flyouts,
// the layout picker, and the iPad viewports. Behavior specs cover the blocks themselves.
test.use({ hasTouch: true })

const flyout = (page: Parameters<typeof gotoApp>[0]) => page.locator('.tempered-flyout')

test('tabs switch the sidebar content, support arrow keys, and remember the choice', async ({ page }) => {
  await gotoApp(page)
  const annotate = page.getByRole('tab', { name: 'Annotate' })
  const setup = page.getByRole('tab', { name: 'Setup' })
  await expect(page.getByRole('tab', { name: 'Draw' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('group', { name: 'Conductors' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Annotation' })).toBeHidden()

  await annotate.click()
  await expect(page.getByRole('group', { name: 'Annotation' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Layers' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Conductors' })).toBeHidden()

  await annotate.press('ArrowRight')
  await expect(setup).toHaveAttribute('aria-selected', 'true')
  await expect(setup).toBeFocused()
  await expect(page.getByRole('group', { name: 'File' })).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Layout' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('tab', { name: 'Setup' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('group', { name: 'Drawing scale' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Conductors' })).toBeHidden()
})

test('the stroke widget stays in view and mirrors material, class, and size', async ({ page }) => {
  await gotoApp(page)
  const stroke = page.getByRole('group', { name: 'Stroke' })
  await expect(stroke).toContainText('Copper · Class I')
  await expect(stroke).toContainText('Medium')

  await page.getByRole('radio', { name: 'Aluminum' }).click()
  await page.getByRole('button', { name: 'Class II' }).click()
  await page.getByRole('radio', { name: 'Large' }).click()
  await expect(stroke).toContainText('Aluminum · Class II')
  await expect(stroke).toContainText('Large')

  await page.getByRole('tab', { name: 'Setup' }).click()
  await expect(stroke).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Material' })).toBeVisible()

  // The next conductor uses the chosen stroke.
  await (await openBlock(page, 'Conductors')).getByRole('button', { name: /Linear$/ }).click()
  await clickStage(page, { x: 160, y: 200 })
  await clickStage(page, { x: 360, y: 200 })
  await expectStatus(page, 'Line segment added.')
  const line = page.locator('svg.overlay-layer line[stroke-linecap="round"]')
  await expect(line).toHaveCount(1)
  await expect(line).not.toHaveAttribute('stroke', '#2e8b57')
})

test('the collapsed rail opens flyouts that close on tool choice, Escape, and outside taps, and persists', async ({ page }) => {
  const stage = await gotoApp(page)
  const expanded = await stage.boundingBox()
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  const collapsed = await stage.boundingBox()
  expect(collapsed!.width).toBeGreaterThan(expanded!.width + 200)
  const sidebar = page.getByRole('complementary', { name: 'Primary controls' })
  expect((await sidebar.boundingBox())!.width).toBe(64)

  for (const name of ['Draw', 'Annotate', 'Setup']) {
    const button = page.getByRole('button', { name: `${name} section` })
    await expect(button).toBeVisible()
    const bounds = await button.boundingBox()
    expect(bounds!.width).toBeGreaterThanOrEqual(44)
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
    await button.click()
    const region = page.getByRole('region', { name: `${name} flyout` })
    await expect(region).toBeVisible()
    await expect(region.getByRole('group', { name: 'Stroke' })).toBeVisible()
    expect(await stage.boundingBox()).toEqual(collapsed)
  }

  // Settings keep the flyout open while the covered workspace is inert.
  await page.getByRole('radio', { name: 'Grounding' }).click()
  await expect(page.getByRole('region', { name: 'Setup flyout' })).toBeVisible()
  expect(await page.locator('.workspace').evaluate((element) => element.hasAttribute('inert'))).toBe(true)

  // Escape closes it and returns focus to its section button.
  await page.getByPlaceholder('Project name...').focus()
  await page.keyboard.press('Escape')
  await expect(flyout(page)).toBeHidden()
  await expect(page.getByRole('button', { name: 'Setup section' })).toBeFocused()
  expect(await page.locator('.workspace').evaluate((element) => element.hasAttribute('inert'))).toBe(false)

  // Choosing a tool closes the flyout.
  await page.getByRole('button', { name: 'Draw section' }).click()
  await page.getByRole('button', { name: /Ground Rod$/ }).click()
  await expect(flyout(page)).toBeHidden()
  await expect(page.locator('.toolbar-active-tool')).toContainText('Component')

  // An outside tap only dismisses: no component lands under it.
  await page.getByRole('button', { name: 'Annotate section' }).click()
  await expect(page.getByRole('region', { name: 'Annotate flyout' })).toBeVisible()
  const bounds = await stage.boundingBox()
  await page.mouse.click(bounds!.x + 400, bounds!.y + 200)
  await expect(flyout(page)).toBeHidden()
  await expect(page.locator('svg.overlay-layer g[data-symbol-type="ground_rod"]')).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
  await expect(flyout(page)).toBeHidden()
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  await expect(page.getByRole('tab', { name: 'Annotate' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('group', { name: 'Annotation' })).toBeVisible()
})

test('iPad portrait and landscape keep the sidebar beside the stage and the tabs reachable', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  const stage = await gotoApp(page)
  let bounds = await stage.boundingBox()
  expect(bounds!.x).toBe(296)
  expect(bounds!.height).toBeGreaterThan(900)
  await expect(page.getByRole('toolbar', { name: 'Properties' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Readouts' })).toBeVisible()

  await page.getByRole('tab', { name: 'Setup' }).tap()
  await page.getByRole('spinbutton', { name: 'Scale inches' }).fill('1')
  await page.getByRole('spinbutton', { name: 'Scale feet' }).fill('20')
  await page.getByRole('button', { name: 'Apply Scale' }).tap()
  await expect(page.getByRole('status')).toHaveText('Manual scale applied.')
  await expect(page.getByRole('group', { name: 'Readouts' })).toContainText('Scale: 1" = 20\'')

  await page.setViewportSize({ width: 1180, height: 820 })
  bounds = await stage.boundingBox()
  expect(bounds!.x).toBe(296)
  await page.getByRole('button', { name: 'Collapse sidebar' }).tap()
  expect((await stage.boundingBox())!.x).toBe(64)
  await page.getByRole('button', { name: 'Annotate section' }).tap()
  const region = page.getByRole('region', { name: 'Annotate flyout' })
  const regionBounds = await region.boundingBox()
  expect(regionBounds!.y).toBeGreaterThanOrEqual(0)
  expect(regionBounds!.y + regionBounds!.height).toBeLessThanOrEqual(820)
  await page.getByRole('button', { name: /Break$/ }).tap()
  await expect(region).toBeHidden()
  await expect(page.locator('.toolbar-active-tool')).toContainText('Component')
})

test('the layout picker switches to Classic and back with the drawing intact', async ({ page }) => {
  await gotoApp(page)
  await page.getByRole('button', { name: /Linear$/ }).click()
  await clickStage(page, { x: 160, y: 220 })
  await clickStage(page, { x: 380, y: 220 })
  const lines = page.locator('svg.overlay-layer line[stroke="#2e8b57"][stroke-linecap="round"]')
  await expect(lines).toHaveCount(1)

  await page.getByRole('tab', { name: 'Setup' }).click()
  await page.getByRole('radio', { name: 'Classic' }).click()
  await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tools', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Draw' })).toHaveCount(0)
  await expect(lines).toHaveCount(1)
  await expect(page.locator('.toolbar-active-tool')).toContainText('Linear')

  await page.reload()
  await expect(page.getByRole('region', { name: 'Tools', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: 'Tempered' }).click()
  await expect(page.getByRole('tab', { name: 'Draw' })).toBeVisible()

  // The workspace still draws after two chrome swaps.
  const before = await lines.count()
  // Tempered comes back on the remembered Setup tab, so reveal the Draw tab's block first.
  await (await openBlock(page, 'Conductors')).getByRole('button', { name: /Linear$/ }).click()
  await clickStage(page, { x: 160, y: 320 })
  await clickStage(page, { x: 380, y: 320 })
  await expect(lines).toHaveCount(before + 1)
})
