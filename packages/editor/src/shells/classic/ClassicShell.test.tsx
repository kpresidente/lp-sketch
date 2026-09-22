// @vitest-environment jsdom

import { vi } from 'vitest'

vi.setConfig({ testTimeout: 15000 })

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  PDFWorker: class { destroy = vi.fn() },
  getDocument: vi.fn(() => ({
    promise: Promise.reject(new Error('pdfjs not used in shell tests')),
    destroy: vi.fn(async () => {}),
  })),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

import { fireEvent, render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { SHELL_PREFERENCE_KEY } from '../registry'
import { installAppTestEnvironment } from '../testing/installAppTestEnvironment'
import { SIDEBAR_COLLAPSED_KEY } from './useSidebarLayout'

installAppTestEnvironment()

// Classic's shell test: pins Classic, then exercises the chrome only Classic has.
beforeEach(() => window.localStorage.setItem(SHELL_PREFERENCE_KEY, 'classic'))

const collapse = () => fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
const openSection = (name: string) => fireEvent.click(screen.getByRole('button', { name: `${name} section` }))
const drawingStage = () => screen.getByRole('region', { name: 'Drawing canvas' })

describe('Classic shell', () => {
  it('exposes the sidebar landmark and binds panel headers to their regions', async () => {
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
    expect(screen.queryByRole('region', { name: 'Project', exact: true })).toBeNull()
  })

  it('composes every block into its six panels', () => {
    render(() => <App />)
    for (const name of ['Project', 'Tools', 'Components', 'Material', 'Scale', 'Layers']) {
      expect(screen.getByRole('region', { name, exact: true })).toBeTruthy()
    }
    expect(screen.getByRole('group', { name: 'Conductors' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Layout' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Stroke' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Readouts' })).toBeNull()
  })

  it('opens one section at a time and restores the full sidebar accordion state', async () => {
    render(() => <App />)
    await fireEvent.click(screen.getByRole('button', { name: 'Tools', exact: true }))
    await collapse()
    for (const name of ['Project', 'Tools', 'Components', 'Material', 'Scale', 'Layers']) {
      expect(screen.getByRole('button', { name: `${name} section` }).getAttribute('aria-expanded')).toBe('false')
      expect(screen.queryByRole('region', { name, exact: true })).toBeNull()
    }
    await openSection('Tools')
    expect(screen.getByRole('switch', { name: 'Snap to points' })).toBeTruthy()
    await openSection('Components')
    expect(screen.queryByRole('region', { name: 'Tools', exact: true })).toBeNull()
    expect(screen.getByRole('button', { name: 'Linear', exact: true })).toBeTruthy()
    await openSection('Components')
    expect(screen.queryByRole('region', { name: 'Components', exact: true })).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(screen.queryByRole('region', { name: 'Tools', exact: true })).toBeNull()
    expect(screen.getByRole('region', { name: 'Components', exact: true })).toBeTruthy()
  })

  it('keeps settings open and preserves inputs when switching sections or expanding', async () => {
    render(() => <App />)
    await collapse()
    await openSection('Tools')
    const snap = screen.getByRole('switch', { name: 'Snap to points' })
    const before = snap.getAttribute('aria-checked')
    await fireEvent.click(snap)
    expect(snap.getAttribute('aria-checked')).not.toBe(before)
    expect(screen.getByRole('region', { name: 'Tools flyout' })).toBeTruthy()
    await openSection('Material')
    await fireEvent.click(screen.getByRole('radio', { name: 'Aluminum' }))
    expect(screen.getByRole('region', { name: 'Material flyout' })).toBeTruthy()
    await openSection('Scale')
    await fireEvent.input(screen.getByRole('spinbutton', { name: 'Scale inches' }), { target: { value: '7' } })
    await openSection('Tools')
    await openSection('Scale')
    expect((screen.getByRole('spinbutton', { name: 'Scale inches' }) as HTMLInputElement).value).toBe('7')
    await fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect((screen.getByRole('spinbutton', { name: 'Scale inches' }) as HTMLInputElement).value).toBe('7')
    expect(screen.getByRole('radio', { name: 'Aluminum' }).getAttribute('aria-checked')).toBe('true')
  })

  it.each([true, false])('closes for tools and components, including the current tool (touch drawing: %s)', async (touchDrawingEnabled) => {
    render(() => <App touchDrawingEnabled={touchDrawingEnabled} />)
    await collapse()
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await openSection('Components')
      await fireEvent.click(screen.getByRole('button', { name: 'Linear', exact: true }))
      expect(screen.queryByRole('region', { name: 'Components flyout' })).toBeNull()
    }
    await openSection('Components')
    await fireEvent.click(screen.getByRole('button', { name: 'AT', exact: true }))
    expect(screen.queryByRole('region', { name: 'Components flyout' })).toBeNull()
    await openSection('Tools')
    await fireEvent.click(screen.getByRole('button', { name: 'Pan', exact: true }))
    expect(screen.queryByRole('region', { name: 'Tools flyout' })).toBeNull()
    await openSection('Scale')
    await fireEvent.click(screen.getByRole('button', { name: 'Calibrate', exact: true }))
    expect(screen.queryByRole('region', { name: 'Scale flyout' })).toBeNull()
  })

  it('leaves the flyout open when an unavailable tool cannot be selected', async () => {
    render(() => <App />)
    await collapse()
    await openSection('Components')
    const button = screen.getByRole('button', { name: 'Linear AT', exact: true }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    await fireEvent.click(button)
    expect(screen.getByRole('region', { name: 'Components flyout' })).toBeTruthy()
  })

  it('Escape dismisses the flyout without cancelling the pending conductor endpoint', async () => {
    const { container } = render(() => <App />)
    const stage = drawingStage()
    await fireEvent.click(screen.getByRole('button', { name: 'Linear', exact: true }))
    await fireEvent.pointerDown(stage, { clientX: 220, clientY: 220, button: 0, ctrlKey: true, shiftKey: true })
    await fireEvent.pointerUp(stage, { clientX: 220, clientY: 220, button: 0 })
    await collapse()
    await openSection('Project')
    const name = screen.getByPlaceholderText('Project name...')
    name.focus()
    await fireEvent.keyDown(name, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Project flyout' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Project section' }))
    await fireEvent.pointerDown(stage, { clientX: 420, clientY: 220, button: 0, ctrlKey: true, shiftKey: true })
    await fireEvent.pointerUp(stage, { clientX: 420, clientY: 220, button: 0 })
    expect(container.querySelectorAll('svg.overlay-layer line[stroke="#2e8b57"][stroke-linecap="round"]')).toHaveLength(1)
  })

  it('remembers the collapsed layout but does not reopen a flyout on restart', async () => {
    let app = render(() => <App />)
    await collapse()
    await openSection('Layers')
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('true')
    app.unmount()
    app = render(() => <App />)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Layers flyout' })).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    app.unmount()
    render(() => <App />)
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeTruthy()
  })
})
