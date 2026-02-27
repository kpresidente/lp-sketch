import { expect, test } from '@playwright/test'
import { gotoApp } from './helpers'

test.describe('quick-access toolbar', () => {
  test('customizer can add tools and persist them across reloads', async ({ page }) => {
    await gotoApp(page)

    await page.getByRole('button', { name: 'Customize quick-access toolbar' }).click()
    const customizer = page.getByRole('dialog', { name: 'Customize quick-access toolbar' })
    await expect(customizer).toBeVisible()

    await customizer.getByLabel('Search quick-access tools').fill('Curve')
    await customizer.locator('.quick-access-available-item', { hasText: /Curve$/ }).first().click()
    await customizer.getByRole('button', { name: 'Add >>', exact: true }).click()
    const curveQuickButton = page.locator('.quick-access-rail').getByRole('button', { name: /Curve$/ }).first()
    await expect(curveQuickButton).toBeVisible()

    await page.getByRole('button', { name: 'Customize quick-access toolbar' }).click()
    await curveQuickButton.click()
    await expect(page.locator('.toolbar-active-tool')).toContainText('Curve')

    await page.reload()
    await expect(page.locator('.quick-access-rail').getByRole('button', { name: /Curve$/ }).first()).toBeVisible()
  })
})
