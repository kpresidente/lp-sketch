import { expect, test } from '@playwright/test'
import { gotoApp } from './helpers'

test.describe('quick-access toolbar', () => {
  test('customizer can add tools and persist them across reloads', async ({ page }) => {
    await gotoApp(page)

    await page.getByRole('button', { name: 'Customize quick-access toolbar' }).click()
    await expect(page.getByRole('dialog', { name: 'Customize quick-access toolbar' })).toBeVisible()

    await page.getByLabel('All quick-access tools').selectOption({ label: 'Curve' })
    await page.getByRole('button', { name: 'Add >>', exact: true }).click()
    const curveQuickButton = page.getByRole('button', { name: 'Curve', exact: true })
    await expect(curveQuickButton).toBeVisible()

    await page.getByRole('button', { name: 'Customize quick-access toolbar' }).click()
    await curveQuickButton.click()
    await expect(page.locator('.toolbar-active-tool')).toContainText('Curve')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Curve', exact: true })).toBeVisible()
  })
})

