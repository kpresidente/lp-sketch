import { expect, test } from '@playwright/test'
import {
  createMultiPageProjectJsonPayload,
  expectStatus,
  gotoApp,
  loadProjectFromProjectPanel,
  panelRegion,
} from './helpers'

test.describe('multi-page workflows', () => {
  test('page navigation scopes visible geometry to current page', async ({ page }) => {
    await gotoApp(page)
    await loadProjectFromProjectPanel(page, await createMultiPageProjectJsonPayload())

    const project = panelRegion(page, 'Project')
    await expect(project.locator('.page-nav-value')).toHaveText('1 of 2')
    await expect(page.locator('svg.overlay-layer line[x1="120"][y1="160"]')).toHaveCount(1)
    await expect(page.locator('svg.overlay-layer line[x1="520"][y1="160"]')).toHaveCount(0)

    await project.getByRole('button', { name: /Forward$/ }).click()
    await expectStatus(page, 'Page 2 of 2')
    await expect(project.locator('.page-nav-value')).toHaveText('2 of 2')
    await expect(page.locator('svg.overlay-layer line[x1="120"][y1="160"]')).toHaveCount(0)
    await expect(page.locator('svg.overlay-layer line[x1="520"][y1="160"]')).toHaveCount(1)
  })

  test('notes scope modes render page vs global note content', async ({ page }) => {
    await gotoApp(page)

    await loadProjectFromProjectPanel(
      page,
      await createMultiPageProjectJsonPayload({
        fileName: 'e2e-multipage-page-scope.lpsketch.json',
        notesScope: 'page',
      }),
    )
    const project = panelRegion(page, 'Project')

    await expect(page.getByText('1. Page 1 note')).toBeVisible()
    await project.getByRole('button', { name: /Forward$/ }).click()
    await expectStatus(page, 'Page 2 of 2')
    await expect(page.getByText('1. Page 2 note')).toBeVisible()

    await loadProjectFromProjectPanel(
      page,
      await createMultiPageProjectJsonPayload({
        fileName: 'e2e-multipage-global-scope.lpsketch.json',
        notesScope: 'global',
      }),
    )

    await expect(page.getByText('1. Global note')).toBeVisible()
    await project.getByRole('button', { name: /Forward$/ }).click()
    await expectStatus(page, 'Page 2 of 2')
    await expect(page.getByText('1. Global note')).toBeVisible()
  })
})
