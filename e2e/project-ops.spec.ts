import { expect, test } from '@playwright/test'
import {
  createProjectJsonPayload,
  expectStatus,
  gotoApp,
  importPdfFromProjectPanel,
  panelRegion,
} from './helpers'

test.describe('project operations', () => {
  test('landing skeleton import button opens file picker', async ({ page }) => {
    await page.goto('/')

    const chooserPromise = page.waitForEvent('filechooser')
    await page.locator('.canvas-watermark .wm-import-btn').click()
    await chooserPromise
  })

  test('importing a PDF enables background brightness control', async ({ page }) => {
    await gotoApp(page)
    const brightness = page.getByLabel('PDF background brightness')
    await expect(brightness).toBeDisabled()

    await importPdfFromProjectPanel(page, 'brightness-check.pdf')
    await expect(brightness).toBeEnabled()
  })

  test('save and load project JSON', async ({ page }) => {
    await gotoApp(page)
    const project = panelRegion(page, 'Project')

    await page.getByPlaceholder('Project name...').fill('E2E Save Load')

    const downloadPromise = page.waitForEvent('download')
    await project.locator('button[title="Save Project"]').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('E2E Save Load.lpsketch.json')
    await expectStatus(page, 'Saved E2E Save Load.lpsketch.json')

    const chooserPromise = page.waitForEvent('filechooser')
    await project.locator('button[title="Load Project"]').click()
    const chooser = await chooserPromise
    await chooser.setFiles(createProjectJsonPayload({ withLine: true }))

    await expectStatus(page, /Loaded e2e-loaded\.lpsketch\.json/)
    await expect(page.getByPlaceholder('Project name...')).toHaveValue('Loaded E2E Project')
    await expect(page.locator('svg.overlay-layer line[stroke="#2e8b57"]')).toHaveCount(1)
  })

  test('exports png, jpg, and pdf', async ({ page }) => {
    await gotoApp(page)
    await importPdfFromProjectPanel(page, 'export-check.pdf')

    const project = panelRegion(page, 'Project')
    await project.locator('button[title="Export PNG"]').click()
    await expectStatus(page, 'Exported PNG output.')

    await project.locator('button[title="Export JPG"]').click()
    await expectStatus(page, 'Exported JPG output.')

    await project.locator('button[title="Export PDF"]').click()
    await expectStatus(page, 'Exported PDF output.')
  })
})
