import { expect, test, type Locator, type Page } from '@playwright/test'
import { clickStage, expectStatus, gotoApp } from './helpers'

// Hover's shell spec: the dock and its popovers, the setup popover, the material rail,
// the iPad viewports, and the layout switch. Behavior specs cover the blocks themselves.
test.use({ hasTouch: true })

const dock = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const popover = (page: Page, name: string) => page.getByRole('region', { name: `${name} popover` })
const workspaceInert = (page: Page) => page.locator('.workspace').evaluate((element) => element.hasAttribute('inert'))

async function expectInsideViewport(locator: Locator, width: number, height: number) {
  const box = await locator.boundingBox()
  expect(box, 'pill has a box').not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(height)
}

test('the dock opens one popover at a time and the workspace goes inert behind it', async ({ page }) => {
  await gotoApp(page, { shell: 'hover' })
  await expect(page.getByRole('toolbar', { name: 'Properties' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Conductors' })).toBeHidden()

  await dock(page, 'Conductors').click()
  await expect(popover(page, 'Conductors')).toBeVisible()
  await expect(popover(page, 'Conductors').getByRole('group', { name: 'Conductors' })).toBeVisible()
  expect(await workspaceInert(page)).toBe(true)

  await dock(page, 'Air Terminals').click()
  await expect(popover(page, 'Conductors')).toBeHidden()
  await expect(popover(page, 'Air Terminals')).toBeVisible()

  await dock(page, 'Air Terminals').click()
  await expect(popover(page, 'Air Terminals')).toBeHidden()
  expect(await workspaceInert(page)).toBe(false)
})

test('choosing a tool, Escape, and an outside tap close the popover without drawing', async ({ page }) => {
  const stage = await gotoApp(page, { shell: 'hover' })

  await dock(page, 'Conductors').click()
  await popover(page, 'Conductors').getByRole('button', { name: /Linear$/ }).click()
  await expect(popover(page, 'Conductors')).toBeHidden()
  await expect(page.locator('.toolbar-active-tool')).toContainText('Linear')
  await expect(dock(page, 'Conductors')).toHaveClass(/current/)

  await dock(page, 'Annotate').click()
  await expect(popover(page, 'Annotate').getByRole('group', { name: 'Layers' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popover(page, 'Annotate')).toBeHidden()
  await expect(dock(page, 'Annotate')).toBeFocused()

  // A ground rod needs the grounding material; the rail sets it without opening anything.
  await page.getByRole('radio', { name: 'Grounding' }).click()
  await dock(page, 'Downleads').click()
  await popover(page, 'Downleads').getByRole('button', { name: /Ground Rod$/ }).click()
  await expect(popover(page, 'Downleads')).toBeHidden()
  await expect(page.locator('.toolbar-active-tool')).toContainText('Component')

  // The first outside tap only dismisses: no ground rod lands under it.
  await dock(page, 'Setup').click()
  await expect(popover(page, 'Setup')).toBeVisible()
  const bounds = await stage.boundingBox()
  await page.mouse.click(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2 + 120)
  await expect(popover(page, 'Setup')).toBeHidden()
  await expect(page.locator('svg.overlay-layer g[data-symbol-type="ground_rod"]')).toHaveCount(0)
})

test('the setup popover holds the project controls and the material rail sets the stroke', async ({ page }) => {
  await gotoApp(page, { shell: 'hover' })

  await dock(page, 'Setup').click()
  const setup = popover(page, 'Setup')
  await setup.getByPlaceholder('Project name...').fill('Hover E2E')
  await expect(page.locator('.hover-project-title')).toHaveText('Hover E2E')
  await setup.getByRole('spinbutton', { name: 'Scale inches' }).fill('1')
  await setup.getByRole('spinbutton', { name: 'Scale feet' }).fill('20')
  await setup.getByRole('button', { name: 'Apply Scale' }).click()
  await expectStatus(page, 'Manual scale applied.')
  await expect(page.getByRole('group', { name: 'Readouts' })).toContainText('Scale: 1" = 20\'')
  await page.keyboard.press('Escape')
  await expect(setup).toBeHidden()

  await page.getByRole('radio', { name: 'Aluminum' }).click()
  await page.getByRole('button', { name: 'Class II' }).click()
  await dock(page, 'Conductors').click()
  await popover(page, 'Conductors').getByRole('button', { name: /Linear$/ }).click()
  await clickStage(page, { x: 200, y: 300 })
  await clickStage(page, { x: 420, y: 300 })
  await expectStatus(page, 'Line segment added.')
  const line = page.locator('svg.overlay-layer line[stroke-linecap="round"]')
  await expect(line).toHaveCount(1)
  await expect(line).not.toHaveAttribute('stroke', '#2e8b57')

  // Layers live beside the annotation tools; hiding Rooftop hides the line.
  await dock(page, 'Annotate').click()
  await popover(page, 'Annotate').getByRole('switch', { name: 'Rooftop layer', exact: true }).click()
  await expect(line).toHaveCount(0)
  await expect(popover(page, 'Annotate')).toBeVisible()
})

test('iPad portrait and landscape keep every pill inside the viewport and the popovers reachable', async ({ page }) => {
  for (const viewport of [{ width: 820, height: 1180 }, { width: 1180, height: 820 }]) {
    await page.setViewportSize(viewport)
    await gotoApp(page, { shell: 'hover' })
    const pills = ['.hover-project', '.hover-dock', '.hover-actions', '.hover-materials', '.hover-context', '.hover-snapping', '.quick-access-rail']
    for (const pill of pills) {
      await expectInsideViewport(page.locator(pill), viewport.width, viewport.height)
    }
    const project = await page.locator('.hover-project').boundingBox()
    const dockBox = await page.locator('.hover-dock').boundingBox()
    const overlaps = dockBox!.x < project!.x + project!.width && dockBox!.y < project!.y + project!.height
    expect(overlaps, 'dock clears the project pill').toBe(false)

    await dock(page, 'Annotate').tap()
    await expectInsideViewport(popover(page, 'Annotate'), viewport.width, viewport.height)
    await popover(page, 'Annotate').getByRole('button', { name: /Break$/ }).tap()
    await expect(popover(page, 'Annotate')).toBeHidden()
    await expect(page.locator('.toolbar-active-tool')).toContainText('Component')
  }
})

test('the layout picker switches back to Tempered', async ({ page }) => {
  await gotoApp(page, { shell: 'hover' })
  await dock(page, 'Setup').click()
  await popover(page, 'Setup').getByRole('radio', { name: 'Tempered' }).click()
  await expect(page.getByRole('tab', { name: 'Draw' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conductors', exact: true })).toHaveCount(0)
  // The pinned shell is re-applied on every load, so check the stored choice rather than reloading.
  expect(await page.evaluate(() => window.localStorage.getItem('lp-sketch.shell.v1'))).toBe('tempered')
})
