import { expect, test } from '@playwright/test'
import { gotoApp } from './helpers'

// Classic's shell spec: the collapsible sidebar, its section flyouts, and their dismissal.
test.use({ hasTouch: true })

test('collapsed sections reclaim canvas space and settings stay open', async ({ page }) => {
  const stage = await gotoApp(page, { shell: 'classic' })
  const expanded = await stage.boundingBox()
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  const collapsed = await stage.boundingBox()
  expect(collapsed!.width).toBeGreaterThan(expanded!.width + 200)
  const sidebar = page.getByRole('complementary', { name: 'Primary controls' })
  expect((await sidebar.boundingBox())!.width).toBe(64)

  for (const name of ['Project', 'Tools', 'Components', 'Material', 'Scale', 'Layers']) {
    const button = page.getByRole('button', { name: `${name} section` })
    await expect(button).toBeVisible()
    const bounds = await button.boundingBox()
    expect(bounds!.width).toBeGreaterThanOrEqual(44)
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
    await button.click()
    await expect(page.getByRole('region', { name: `${name} flyout` })).toBeVisible()
    expect(await stage.boundingBox()).toEqual(collapsed)
  }
  await page.getByRole('switch', { name: 'Rooftop layer', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Layers flyout' })).toBeVisible()
  await page.getByRole('button', { name: 'Tools section' }).click()
  const snap = page.getByRole('switch', { name: 'Snap to points' })
  const checked = await snap.getAttribute('aria-checked')
  await snap.click()
  await expect(snap).toHaveAttribute('aria-checked', checked === 'true' ? 'false' : 'true')
  await expect(page.getByRole('region', { name: 'Tools flyout' })).toBeVisible()
  await page.getByRole('button', { name: 'Material section' }).click()
  await page.getByRole('radio', { name: 'Aluminum' }).click()
  await expect(page.getByRole('region', { name: 'Material flyout' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Material section' })).toBeFocused()
  await expect(page.locator('.sidebar-flyout')).toBeHidden()
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  await expect(page.getByRole('radio', { name: 'Aluminum' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
  await expect(page.locator('.sidebar-flyout')).toBeHidden()
  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible()
})

for (const pointerType of ['mouse', 'touch', 'pen'] as const) {
  test(`outside ${pointerType} dismissal does not place an endpoint or move the plan`, async ({ page, context }) => {
    const stage = await gotoApp(page, { shell: 'classic' })
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await page.getByRole('button', { name: 'Components section' }).click()
    await page.getByRole('button', { name: /Linear$/ }).click()
    await expect(page.locator('.sidebar-flyout')).toBeHidden()
    const bounds = await stage.boundingBox()
    if (!bounds) throw new Error('Canvas has no bounds')
    const input = await context.newCDPSession(page)
    const penTap = async (offset: number) => {
      const point = { x: bounds.x + offset, y: bounds.y + 180 }
      await input.send('Input.dispatchMouseEvent', {
        type: 'mousePressed', ...point, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5,
      })
      await input.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased', ...point, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1,
      })
    }
    await penTap(420)
    await page.getByRole('button', { name: 'Project section' }).click()
    const camera = page.locator('.camera-layer')
    const before = await camera.getAttribute('style')
    if (pointerType === 'pen') await penTap(540)
    else if (pointerType === 'touch') await page.touchscreen.tap(bounds.x + 540, bounds.y + 180)
    else await page.mouse.click(bounds.x + 540, bounds.y + 180)
    await expect(page.locator('.sidebar-flyout')).toBeHidden()
    const lines = page.locator('svg.overlay-layer line[stroke="#2e8b57"][stroke-linecap="round"]')
    await expect(lines).toHaveCount(0)
    await expect(camera).toHaveAttribute('style', before!)
    await penTap(660)
    await expect(lines).toHaveCount(1)

    // An outside tap on a visible toolbar button must only dismiss, too.
    await page.getByRole('button', { name: 'Project section' }).click()
    const undo = page.getByRole('button', { name: 'Quick undo', includeHidden: true })
    const undoBounds = await undo.boundingBox()
    if (!undoBounds) throw new Error('Undo has no bounds')
    await page.mouse.click(undoBounds.x + undoBounds.width / 2, undoBounds.y + undoBounds.height / 2)
    await expect(page.locator('.sidebar-flyout')).toBeHidden()
    await expect(lines).toHaveCount(1)
    await undo.click()
    await expect(lines).toHaveCount(0)
    await input.detach()
  })
}

for (const section of ['Project', 'Scale']) {
  test(`Enter in ${section} cannot finish a conductor behind the flyout`, async ({ page }) => {
    const stage = await gotoApp(page, { shell: 'classic' })
    await page.getByRole('button', { name: /Linear$/ }).click()
    await page.getByRole('switch', { name: 'Continuous line mode' }).click()
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await stage.click({ position: { x: 420, y: 180 } })
    const bounds = await stage.boundingBox()
    if (!bounds) throw new Error('Canvas has no bounds')
    await page.mouse.move(bounds.x + 560, bounds.y + 180)
    await page.getByRole('button', { name: `${section} section` }).click()
    const input = section === 'Project'
      ? page.getByPlaceholder('Project name...')
      : page.getByRole('spinbutton', { name: 'Scale inches' })
    await input.press('Enter')
    // Input commits schedule canvas focus on the next frame.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await expect(stage).not.toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('region', { name: `${section} flyout` })).toBeVisible()
    const lines = page.locator('svg.overlay-layer line[stroke="#2e8b57"][stroke-linecap="round"]')
    await expect(lines).toHaveCount(0)
    // Tabbing past the flyout must skip the covered canvas and quick toolbar.
    const buttons = page.locator('.sidebar-flyout button:visible:not(:disabled)')
    await buttons.last().focus()
    await page.keyboard.press('Tab')
    expect(await page.locator('.workspace').evaluate((element) => element.contains(document.activeElement))).toBe(false)
    await input.focus()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: `${section} section` })).toBeFocused()
    await stage.click({ position: { x: 660, y: 180 } })
    await expect(lines).toHaveCount(1)
  })
}

test('tool selection closes the flyout and portrait controls remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  const stage = await gotoApp(page, { shell: 'classic' })
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  const stageBounds = await stage.boundingBox()
  expect(stageBounds!.x).toBe(64)
  expect(stageBounds!.height).toBeGreaterThan(900)
  await page.getByRole('button', { name: 'Material section' }).tap()
  await page.getByRole('radio', { name: 'Grounding' }).tap()
  await page.getByRole('button', { name: 'Components section' }).tap()
  await page.getByRole('button', { name: /Ground Rod$/ }).tap()
  await expect(page.locator('.sidebar-flyout')).toBeHidden()
  await page.getByRole('button', { name: 'Scale section' }).tap()
  await page.getByRole('spinbutton', { name: 'Scale inches' }).fill('1')
  await page.getByRole('spinbutton', { name: 'Scale feet' }).fill('20')
  await page.getByRole('button', { name: 'Apply Scale' }).click()
  await expect(page.getByRole('region', { name: 'Scale flyout' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Manual scale applied.')
  await expect(page.getByRole('status')).toBeVisible()
  await page.getByRole('button', { name: /Calibrate$/ }).tap()
  await expect(page.locator('.sidebar-flyout')).toBeHidden()
  await page.setViewportSize({ width: 1180, height: 820 })
  await page.getByRole('button', { name: 'Tools section' }).tap()
  const flyout = page.getByRole('region', { name: 'Tools flyout' })
  const flyoutBounds = await flyout.boundingBox()
  expect(flyoutBounds!.y).toBeGreaterThanOrEqual(0)
  expect(flyoutBounds!.y + flyoutBounds!.height).toBeLessThanOrEqual(820)
  await page.getByRole('button', { name: /Break$/ }).tap()
  await expect(flyout).toBeHidden()
})

test('keyboard navigation from Quick Access leaves one dismissible sidebar panel', async ({ page }) => {
  await gotoApp(page, { shell: 'classic' })
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await page.getByRole('button', { name: 'Customize quick-access toolbar' }).click()
  await expect(page.locator('.quick-access-customizer')).toBeVisible()
  const section = page.getByRole('button', { name: 'Project section' })
  // Focus and Enter deliberately avoid pointerdown's existing outside dismissal.
  await section.focus()
  await section.press('Enter')
  await expect(page.getByRole('region', { name: 'Project flyout' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.sidebar-flyout')).toBeHidden()
  await expect(page.locator('.quick-access-customizer')).toBeHidden()
  await expect(section).toBeFocused()
})
