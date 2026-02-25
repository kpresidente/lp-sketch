// @vitest-environment jsdom

import { vi } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  PDFWorker: class { destroy = vi.fn() },
  getDocument: vi.fn(() => ({
    promise: Promise.reject(new Error('pdfjs not used in accessibility tests')),
  })),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

const fakeCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  scale: vi.fn(),
  drawImage: vi.fn(),
}

beforeAll(() => {
  if (typeof globalThis.Path2D === 'undefined') {
    class FakePath2D {
      constructor(_: string = '') {}
      arc(_: number, __: number, ___: number, ____: number, _____: number) {}
    }
    vi.stubGlobal('Path2D', FakePath2D)
  }

  if (typeof globalThis.PointerEvent === 'undefined') {
    vi.stubGlobal('PointerEvent', MouseEvent)
  }

  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => undefined
  }

  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }

  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
})

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeCanvasContext as unknown as CanvasRenderingContext2D,
  )

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1200,
    bottom: 800,
    width: 1200,
    height: 800,
    toJSON: () => ({}),
  } as DOMRect)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('App accessibility semantics', () => {
  it('exposes sidebar landmark, panel region bindings, and keyboard-importable skeleton actions', async () => {
    render(() => <App />)

    const sidebar = screen.getByLabelText('Primary controls')
    expect(sidebar.tagName).toBe('ASIDE')

    const projectPanelToggle = screen.getByRole('button', { name: 'Project' })
    const controlsId = projectPanelToggle.getAttribute('aria-controls')
    expect(projectPanelToggle.getAttribute('aria-expanded')).toBe('true')
    expect(controlsId).toBeTruthy()

    const projectPanelRegion = document.getElementById(controlsId || '')
    expect(projectPanelRegion).toBeTruthy()
    expect(projectPanelRegion?.getAttribute('role')).toBe('region')

    await fireEvent.click(projectPanelToggle)
    expect(projectPanelToggle.getAttribute('aria-expanded')).toBe('false')

    expect(screen.getByLabelText('Drawing canvas')).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: 'Import PDF by dropping a file or opening file picker',
      }),
    ).toBeTruthy()
  })

  it('announces status updates using status/alert live semantics', async () => {
    render(() => <App />)

    const readyStatus = screen.getByRole('status')
    expect(readyStatus.textContent).toContain('Ready')

    const scaleInchesInput = screen.getByLabelText('Scale inches') as HTMLInputElement
    const scaleFeetInput = screen.getByLabelText('Scale feet') as HTMLInputElement
    await fireEvent.input(scaleInchesInput, { target: { value: '1' } })
    await fireEvent.input(scaleFeetInput, { target: { value: '0' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Apply Scale' }))

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain(
      'Manual scale must be entered as positive values: X inches = Y feet.',
    )
  })

  it('exposes pressed-state semantics for key quick-access controls', async () => {
    render(() => <App />)

    const customize = screen.getByRole('button', { name: 'Customize quick-access toolbar' })
    expect(customize.getAttribute('aria-pressed')).toBe('false')
    await fireEvent.click(customize)
    expect(customize.getAttribute('aria-pressed')).toBe('true')

    const quickSelect = screen.getByRole('button', { name: 'Quick select mode' })
    const quickPan = screen.getByRole('button', { name: 'Quick pan mode' })
    expect(quickSelect.getAttribute('aria-pressed')).toBe('true')
    expect(quickPan.getAttribute('aria-pressed')).toBe('false')

    await fireEvent.click(quickPan)
    expect(screen.getByRole('button', { name: 'Quick select mode' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Quick pan mode' }).getAttribute('aria-pressed')).toBe('true')
  })
})
