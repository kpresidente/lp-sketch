import { expect, test } from '@playwright/test'
import {
  createMultiPageProjectJsonPayload,
  expectStatus,
  gotoApp,
  loadProjectFromProjectPanel,
  openBlock,
} from './helpers'

test.describe('multi-page workflows', () => {
  test('page navigation scopes visible geometry to current page', async ({ page }) => {
    await gotoApp(page)
    await loadProjectFromProjectPanel(page, await createMultiPageProjectJsonPayload())

    const pages = await openBlock(page, 'Pages')
    await expect(pages.locator('.page-nav-value')).toHaveText('1 of 2')
    await expect(page.locator('svg.overlay-layer line[x1="120"][y1="160"]')).toHaveCount(1)
    await expect(page.locator('svg.overlay-layer line[x1="520"][y1="160"]')).toHaveCount(0)

    await pages.getByRole('button', { name: /Forward$/ }).click()
    await expectStatus(page, 'Page 2 of 2')
    await expect(pages.locator('.page-nav-value')).toHaveText('2 of 2')
    await expect(page.locator('svg.overlay-layer line[x1="120"][y1="160"]')).toHaveCount(0)
    await expect(page.locator('svg.overlay-layer line[x1="520"][y1="160"]')).toHaveCount(1)
  })

  test('notes scope modes render page vs global note content', async ({ page }) => {
    await gotoApp(page)

    await loadProjectFromProjectPanel(
      page,
      await createMultiPageProjectJsonPayload({
        fileName: 'e2e-multipage-page-scope.lps',
        notesScope: 'page',
      }),
    )
    const pages = await openBlock(page, 'Pages')

    await expect(page.getByText('1. Page 1 note')).toBeVisible()
    await pages.getByRole('button', { name: /Forward$/ }).click()
    await expectStatus(page, 'Page 2 of 2')
    await expect(page.getByText('1. Page 2 note')).toBeVisible()

    await loadProjectFromProjectPanel(
      page,
      await createMultiPageProjectJsonPayload({
        fileName: 'e2e-multipage-global-scope.lps',
        notesScope: 'global',
      }),
    )

    await expect(page.getByText('1. Global note')).toBeVisible()
    await pages.getByRole('button', { name: /Forward$/ }).click()
    await expectStatus(page, 'Page 2 of 2')
    await expect(page.getByText('1. Global note')).toBeVisible()
  })
})
