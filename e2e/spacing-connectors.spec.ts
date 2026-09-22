import { expect, test } from '@playwright/test'
import {
  applyManualScale,
  clickStage,
  expectStatus,
  gotoApp,
  openBlock,
} from './helpers'

test.describe('spacing and connector workflows', () => {
  test('linear auto-spacing places air terminals on a traced segment', async ({ page }) => {
    await gotoApp(page)
    await applyManualScale(page, '1', '20')

    await (await openBlock(page, 'Air Terminals')).getByRole('button', { name: /Linear AT$/ }).click()
    await clickStage(page, { x: 220, y: 220 })
    await clickStage(page, { x: 620, y: 220 })
    await page.getByRole('button', { name: 'Finish Open', exact: true }).click()

    await expectStatus(page, /Linear auto-spacing complete: placed \d+ air terminal/)
    const terminals = page.locator('svg.overlay-layer g[data-symbol-type="air_terminal"]')
    expect(await terminals.count()).toBeGreaterThan(0)
  })

  test('arc auto-spacing places air terminals on a selected arc target', async ({ page }) => {
    await gotoApp(page)
    await applyManualScale(page, '1', '36')
    const conductors = await openBlock(page, 'Conductors')

    await conductors.getByRole('button', { name: /Arc$/ }).click()
    await clickStage(page, { x: 180, y: 320 })
    await clickStage(page, { x: 420, y: 320 })
    await clickStage(page, { x: 300, y: 180 })
    await expectStatus(page, 'Arc added.')

    await (await openBlock(page, 'Air Terminals')).getByRole('button', { name: /Arc AT$/ }).click()
    await clickStage(page, { x: 300, y: 180 })
    await expectStatus(page, /Arc selected\./)
    await page.getByRole('button', { name: 'Apply Spacing', exact: true }).click()

    await expectStatus(page, /Arc auto-spacing complete: placed \d+ air terminal/)
    const terminals = page.locator('svg.overlay-layer g[data-symbol-type="air_terminal"]')
    expect(await terminals.count()).toBeGreaterThan(0)
  })

  test('auto-connectors support mechanical and cadweld modes', async ({ page }) => {
    await gotoApp(page)
    const conductors = await openBlock(page, 'Conductors')
    const snapping = await openBlock(page, 'Snapping')

    await conductors.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 120, y: 180 })
    await clickStage(page, { x: 420, y: 180 })
    await clickStage(page, { x: 270, y: 80 })
    await clickStage(page, { x: 270, y: 280 })

    const mechanical = page.locator(
      'svg.overlay-layer g[data-symbol-type="cable_to_cable_connection"], svg.overlay-layer g[data-symbol-type="mechanical_crossrun_connection"]',
    )
    expect(await mechanical.count()).toBeGreaterThan(0)

    await snapping.locator('button[aria-label="Auto-connector type cadweld"]').click()
    await expectStatus(page, 'Auto-connector type: Cadweld.')

    await clickStage(page, { x: 520, y: 120 })
    await clickStage(page, { x: 820, y: 120 })
    await clickStage(page, { x: 680, y: 40 })
    await clickStage(page, { x: 680, y: 260 })

    const cadweld = page.locator(
      'svg.overlay-layer g[data-symbol-type="cadweld_connection"], svg.overlay-layer g[data-symbol-type="cadweld_crossrun_connection"]',
    )
    expect(await cadweld.count()).toBeGreaterThan(0)
  })

  test('legend and general notes dialogs are reachable from placed items', async ({ page }) => {
    await gotoApp(page)
    await applyManualScale(page, '1', '20')
    const conductors = await openBlock(page, 'Conductors')

    await conductors.getByRole('button', { name: /Linear$/ }).click()
    await clickStage(page, { x: 120, y: 520 })
    await clickStage(page, { x: 380, y: 520 })

    await (await openBlock(page, 'Annotation')).getByRole('button', { name: /Legend$/ }).click()
    // Clear of the import placeholder at the stage center, whose position depends on the shell's bars.
    await clickStage(page, { x: 520, y: 160 })
    await expectStatus(page, 'Legend placed.')

    await (await openBlock(page, 'Mode')).getByRole('button', { name: /Select$/ }).click()
    await clickStage(page, { x: 560, y: 200 })
    await page.getByRole('button', { name: 'Edit Labels', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Legend labels editor' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()

    await (await openBlock(page, 'Annotation')).getByRole('button', { name: /Notes$/ }).click()
    await clickStage(page, { x: 900, y: 560 })
    await expectStatus(page, 'General notes placed.')

    await (await openBlock(page, 'Mode')).getByRole('button', { name: /Select$/ }).click()
    await clickStage(page, { x: 900, y: 560 })
    await page.getByRole('button', { name: 'Edit Notes', exact: true }).click()
    const notesDialog = page.getByRole('dialog', { name: /General Notes editor/ })
    await expect(notesDialog).toBeVisible()
    await notesDialog.getByRole('button', { name: 'Add Note', exact: true }).click()
    await notesDialog.locator('input[id="general-note-row-0"]').fill('Install per plan')
    await notesDialog.getByRole('button', { name: 'Apply', exact: true }).click()
    await expectStatus(page, 'General notes updated.')
  })
})
