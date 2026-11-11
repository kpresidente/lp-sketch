// @vitest-environment jsdom

// Regression tests for transitions between the editor's interaction states:
// what happens when a drag, a selection, a pending request, or a failing
// autosave overlaps another action. Each test states what the user should get.

import { vi } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  PDFWorker: class { destroy = vi.fn() },
  getDocument: vi.fn(() => ({
    promise: Promise.reject(new Error('pdfjs not used in state transition tests')),
    destroy: vi.fn(async () => {}),
  })),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

import { fireEvent, render, waitFor, within } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AUTOSAVE_STORAGE_KEY, AUTOSAVE_WRITE_DEBOUNCE_MS } from './config/runtimeLimits'
import { installAppTestEnvironment } from './shells/testing/installAppTestEnvironment'
// Runs on the default shell; this screen reveals the sidebar tab holding a control.
import { screen } from './testing/screen'

vi.setConfig({ testTimeout: 15000 })

installAppTestEnvironment()

const CONDUCTOR_LINE = 'svg.overlay-layer line[stroke="#2e8b57"]'

function requireDrawingStage(container: HTMLElement): HTMLDivElement {
  const stage = container.querySelector('.drawing-stage') as HTMLDivElement | null
  if (!stage) {
    throw new Error('drawing stage not found')
  }
  return stage
}

function cameraZoom(container: HTMLElement): number {
  const layer = container.querySelector('.camera-layer') as HTMLDivElement | null
  const match = layer?.style.transform.match(/scale\((-?\d*\.?\d+(?:e-?\d+)?)\)/)
  if (!match) {
    throw new Error(`Unexpected camera transform: ${layer?.style.transform}`)
  }
  return Number.parseFloat(match[1])
}

function mouse(clientX: number, clientY: number, pointerId: number) {
  return { button: 0, clientX, clientY, pointerId, pointerType: 'mouse' }
}

async function drawLine(stage: HTMLDivElement) {
  await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
  await fireEvent.pointerDown(stage, mouse(100, 120, 1))
  await fireEvent.pointerDown(stage, mouse(220, 180, 1))
}

/** Selects the line from `drawLine` and drags it, leaving the pointer down. */
async function beginLineDrag(stage: HTMLDivElement) {
  await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
  await fireEvent.pointerDown(stage, mouse(160, 150, 2))
  await fireEvent.pointerMove(stage, mouse(210, 200, 2))
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('App state transitions', () => {
  it('shows the calibration distance input while a placed legend is still selected', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Legend' }))
    await fireEvent.pointerDown(stage, mouse(664, 104, 1))
    expect(screen.getByText('Legend placed.')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Calibrate' }))
    await fireEvent.pointerDown(stage, mouse(100, 320, 1))
    await fireEvent.pointerDown(stage, mouse(200, 320, 1))
    expect(screen.getByText('Calibration span set. Enter real distance and apply.')).toBeTruthy()

    // Placing the legend selected it, and the selection outlives the tool
    // change. The properties bar must still show the active tool's controls.
    expect(screen.queryByLabelText('Calibration distance in feet')).not.toBeNull()
  })

  it('keeps a line deleted when Delete is pressed in the middle of dragging it', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await drawLine(stage)
    expect(container.querySelector(CONDUCTOR_LINE)).not.toBeNull()

    await beginLineDrag(stage)
    await fireEvent.keyDown(window, { key: 'Delete' })
    await fireEvent.pointerUp(stage, mouse(210, 200, 2))

    // The toolbar delete cancels an active drag before deleting. The keyboard
    // path must not let the drop write the pre-delete snapshot back.
    expect(container.querySelector(CONDUCTOR_LINE)).toBeNull()
  })

  it('keeps a wheel zoom made in the middle of a drag once the drag is dropped', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await drawLine(stage)
    await beginLineDrag(stage)

    await fireEvent.wheel(stage, { deltaY: -600, clientX: 300, clientY: 260 })
    const zoomDuringDrag = cameraZoom(container)
    expect(zoomDuringDrag).toBeGreaterThan(1)

    await fireEvent.pointerUp(stage, mouse(210, 200, 2))

    expect(cameraZoom(container)).toBeCloseTo(zoomDuringDrag, 6)
  })

  it('keeps the current zoom when an earlier edit is undone', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await drawLine(stage)
    await fireEvent.wheel(stage, { deltaY: -600, clientX: 300, clientY: 260 })
    const zoomBeforeUndo = cameraZoom(container)
    expect(zoomBeforeUndo).toBeGreaterThan(1)

    await fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    expect(container.querySelector(CONDUCTOR_LINE)).toBeNull()
    // Zoom never enters history, so undoing the line should leave it alone.
    expect(cameraZoom(container)).toBeCloseTo(zoomBeforeUndo, 6)
  })

  it('lets the user leave the report dialog when the report request never settles', async () => {
    const originalFetch = globalThis.fetch
    // Never settles on its own; rejects only if the caller aborts it.
    const hangingFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      }))
    globalThis.fetch = hangingFetch as typeof globalThis.fetch

    try {
      render(() => <App />)

      await fireEvent.click(screen.getByRole('button', { name: 'Bug' }))
      const dialog = screen.getByRole('dialog', { name: 'Report issue' })
      const dialogWithin = within(dialog)
      await fireEvent.input(dialogWithin.getByLabelText('Report title'), {
        target: { value: 'Hung request' },
      })
      await fireEvent.input(dialogWithin.getByLabelText('Report details'), {
        target: { value: 'The report service never answers.' },
      })

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
      await fireEvent.click(dialogWithin.getByRole('button', { name: 'Submit' }))
      expect(hangingFetch).toHaveBeenCalledTimes(1)

      // Two minutes covers any reasonable request timeout. After it, either the
      // request has been abandoned or cancelling is allowed; both free the user.
      await vi.advanceTimersByTimeAsync(120_000)
      vi.useRealTimers()

      await fireEvent.keyDown(dialog, { key: 'Escape' })
      const cancelButton = within(dialog).queryByRole('button', { name: 'Cancel' })
      if (cancelButton && dialog.isConnected) {
        await fireEvent.click(cancelButton)
      }

      expect(screen.queryByRole('dialog', { name: 'Report issue' })).toBeNull()
    } finally {
      vi.useRealTimers()
      globalThis.fetch = originalFetch
    }
  })

  it('keeps telling the user that autosave is failing after other status messages', async () => {
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === AUTOSAVE_STORAGE_KEY) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
      originalSetItem.call(this, key, value)
    })

    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    // The first failed write is announced.
    await waitFor(
      () => expect(screen.queryByText(/autosave failed/i)).not.toBeNull(),
      { timeout: AUTOSAVE_WRITE_DEBOUNCE_MS + 2000 },
    )

    // An unrelated status replaces the announcement, and the edit queues
    // another write that fails the same way.
    await drawLine(stage)
    expect(screen.getByText('Line segment added.')).toBeTruthy()
    await wait(AUTOSAVE_WRITE_DEBOUNCE_MS + 400)

    // Autosave is still broken, so the user must still be able to see that.
    expect(screen.queryAllByText(/autosave/i).length).toBeGreaterThan(0)
  })
})
