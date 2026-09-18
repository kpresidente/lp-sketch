import { expect, test } from '@playwright/test'
import { gotoApp } from './helpers'

test.use({ hasTouch: true })

test('one-finger pan works without a switch before and after reload, even with an old off preference', async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lp-sketch.input.one-finger-pan.v1', 'false')
  })
  const stage = await gotoApp(page)
  const camera = page.locator('.camera-layer')
  const view = () => camera.evaluate((element) => {
    const transform = new DOMMatrix(getComputedStyle(element).transform)
    return { zoom: transform.a, x: transform.e, y: transform.f }
  })
  const input = await context.newCDPSession(page)
  for (const reload of [false, true]) {
    if (reload) await page.reload()
    await expect(stage).toBeVisible()
    await expect(page.getByRole('switch', { name: 'One-finger pan' })).toHaveCount(0)
    const before = await view()
    const bounds = await stage.boundingBox()
    if (!bounds) throw new Error('Canvas has no bounds')
    const point = (x: number, y = 180) => ({ id: 0, x: bounds.x + x, y: bounds.y + y })
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(180)] })
    await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(182)] })
    expect(await view()).toEqual(before)
    await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(280, 220)] })
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(view).toEqual({ zoom: before.zoom, x: before.x + 100, y: before.y + 40 })
    await expect(page.getByRole('button', { name: 'Quick undo' })).toBeDisabled()
  }
  await input.detach()
})

test('mobile bundle separates pen editing from finger navigation and toolbar taps', async ({ page, context }) => {
  const stage = await gotoApp(page)
  const deleteSelection = page.getByRole('button', { name: 'Delete selected objects' })
  await expect(deleteSelection).toBeDisabled()
  const input = await context.newCDPSession(page)
  const bounds = await stage.boundingBox()
  if (!bounds) throw new Error('Canvas has no bounds')
  const point = (id: number, x: number, y = 140) => ({ id, x: bounds.x + x, y: bounds.y + y })
  const endTouch = () => input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const fingerTap = async (x: number, y: number) => {
    await page.touchscreen.tap(x, y)
  }
  const penTap = async (x: number) => {
    const location = point(10, x)
    await input.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: location.x, y: location.y,
      pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5,
    })
    await input.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: location.x, y: location.y,
      pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1,
    })
  }

  // Browser input dispatch exercises capture and compatibility events without
  // replacing the app's handlers. It does not emulate iPad hardware rejection.
  const linearButton = page.getByRole('button', { name: /Linear$/ })
  await linearButton.scrollIntoViewIfNeeded()
  const linear = await linearButton.boundingBox()
  if (!linear) throw new Error('Linear tool has no bounds')
  await fingerTap(linear.x + linear.width / 2, linear.y + linear.height / 2)
  await expect(page.locator('.toolbar-active-tool')).toContainText('Linear')

  const firstTouch = point(1, 100)
  await fingerTap(firstTouch.x, firstTouch.y)
  await penTap(180)
  const lines = page.locator('svg.overlay-layer line[stroke="#2e8b57"][stroke-linecap="round"]')
  await expect(lines).toHaveCount(0)
  await penTap(340)
  await expect(lines).toHaveCount(1)
  await expect(page.getByText('Line segment added.')).toBeVisible()

  // Verify controls before raw CDP gestures: Chromium swallows the next tap
  // after those gestures even on a plain HTML button without app handlers.
  const undo = page.getByRole('button', { name: 'Quick undo' })
  await undo.tap()
  await expect(lines).toHaveCount(0)
  await page.getByRole('button', { name: 'Quick redo' }).tap()
  await expect(lines).toHaveCount(1)

  await page.getByRole('button', { name: 'Quick select mode' }).tap()
  await penTap(260)
  await expect(deleteSelection).toBeEnabled()
  await deleteSelection.tap()
  await expect(lines).toHaveCount(0)
  await expect(deleteSelection).toBeDisabled()
  await undo.tap()
  await expect(lines).toHaveCount(1)
  await expect(deleteSelection).toBeDisabled()
  await page.getByRole('button', { name: 'Quick redo' }).tap()
  await expect(lines).toHaveCount(0)
  await undo.tap()
  await expect(lines).toHaveCount(1)

  const camera = page.locator('.camera-layer')
  const beforeGesture = await camera.getAttribute('style')
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [point(0, 100), point(1, 200)],
  })
  await input.send('Input.dispatchTouchEvent', {
    type: 'touchMove', touchPoints: [point(0, 100), point(1, 300)],
  })
  await expect(camera).not.toHaveAttribute('style', beforeGesture!)
  await endTouch()
  const afterGesture = await camera.getAttribute('style')
  await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(0, 100)] })
  await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(0, 200)] })
  await endTouch()
  await expect(camera).not.toHaveAttribute('style', afterGesture!)
  await expect(lines).toHaveCount(1)

  await input.detach()
})
