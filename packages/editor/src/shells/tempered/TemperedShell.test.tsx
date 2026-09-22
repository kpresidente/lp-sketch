// @vitest-environment jsdom

import { vi } from 'vitest'

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

import { fireEvent, render, screen, within } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { SHELL_PREFERENCE_KEY } from '../registry'
import { installAppTestEnvironment } from '../testing/installAppTestEnvironment'
import { TEMPERED_COLLAPSED_KEY, TEMPERED_TAB_KEY } from './useTemperedLayout'

installAppTestEnvironment()

const tab = (name: string) => screen.getByRole('tab', { name })
const group = (name: string) => screen.getByRole('group', { name })
const queryGroup = (name: string) => screen.queryByRole('group', { name })
const workspaceInert = () => {
  const main = document.querySelector('main.workspace') as (HTMLElement & { inert?: boolean }) | null
  return main?.hasAttribute('inert') || main?.inert === true
}

describe('Tempered shell', () => {
  it('is the default shell and opens on the Draw tab with the stroke widget in view', () => {
    render(() => <App />)
    expect(screen.getByRole('complementary', { name: 'Primary controls' })).toBeTruthy()
    expect(tab('Draw').getAttribute('aria-selected')).toBe('true')
    expect(group('Conductors')).toBeTruthy()
    expect(group('Stroke')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Material' })).toBeTruthy()
    expect(queryGroup('Annotation')).toBeNull()
    expect(queryGroup('File')).toBeNull()
    expect(screen.getByRole('toolbar', { name: 'Properties' })).toBeTruthy()
    expect(screen.getByRole('toolbar', { name: 'Quick access' })).toBeTruthy()
    expect(group('Readouts').textContent).toContain('Page 1 / 1')
    expect(screen.getByRole('status').textContent).toContain('Ready')
    expect(workspaceInert()).toBe(false)
  })

  it('switches tabs by click and arrow keys and remembers the tab', async () => {
    let app = render(() => <App />)
    await fireEvent.click(tab('Annotate'))
    expect(tab('Annotate').getAttribute('aria-selected')).toBe('true')
    expect(group('Annotation')).toBeTruthy()
    expect(group('Layers')).toBeTruthy()
    expect(queryGroup('Conductors')).toBeNull()

    await fireEvent.keyDown(tab('Annotate'), { key: 'ArrowRight' })
    expect(tab('Setup').getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(tab('Setup'))
    expect(group('File')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Layout' })).toBeTruthy()
    expect(window.localStorage.getItem(TEMPERED_TAB_KEY)).toBe('setup')

    app.unmount()
    app = render(() => <App />)
    expect(tab('Setup').getAttribute('aria-selected')).toBe('true')
    expect(queryGroup('Conductors')).toBeNull()
  })

  it('summarizes the material, class, and size the next stroke will use', async () => {
    render(() => <App />)
    const stroke = group('Stroke')
    expect(stroke.textContent).toContain('Copper · Class I')
    expect(stroke.textContent).toContain('Medium')

    await fireEvent.click(screen.getByRole('radio', { name: 'Aluminum' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Class II' }))
    await fireEvent.click(screen.getByRole('radio', { name: 'Large' }))
    expect(stroke.textContent).toContain('Aluminum · Class II')
    expect(stroke.textContent).toContain('Large')

    // The widget stays above the tabs, so it is still there on Setup.
    await fireEvent.click(tab('Setup'))
    expect(group('Stroke')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Aluminum' }).getAttribute('aria-checked')).toBe('true')
  })

  it('collapses to a rail whose sections open flyouts that close on tool choice and Escape', async () => {
    render(() => <App />)
    await fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    for (const name of ['Draw', 'Annotate', 'Setup']) {
      expect(screen.getByRole('button', { name: `${name} section` }).getAttribute('aria-expanded')).toBe('false')
    }
    expect(screen.queryByRole('tab', { name: 'Draw' })).toBeNull()
    expect(queryGroup('Conductors')).toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Setup section' }))
    const flyout = screen.getByRole('region', { name: 'Setup flyout' })
    expect(within(flyout).getByRole('group', { name: 'File' })).toBeTruthy()
    expect(within(flyout).getByRole('group', { name: 'Stroke' })).toBeTruthy()
    expect(workspaceInert()).toBe(true)

    // Settings keep the flyout open.
    await fireEvent.click(within(flyout).getByRole('radio', { name: 'Aluminum' }))
    expect(screen.getByRole('region', { name: 'Setup flyout' })).toBeTruthy()

    // Escape closes it and returns focus to its section button.
    const name = screen.getByPlaceholderText('Project name...')
    name.focus()
    await fireEvent.keyDown(name, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Setup flyout' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Setup section' }))
    expect(workspaceInert()).toBe(false)

    // Choosing a tool closes the flyout.
    await fireEvent.click(screen.getByRole('button', { name: 'Draw section' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Linear', exact: true }))
    expect(screen.queryByRole('region', { name: 'Draw flyout' })).toBeNull()
    expect(document.querySelector('.toolbar-active-tool')?.textContent).toContain('Linear')

    // The same section again toggles it closed.
    await fireEvent.click(screen.getByRole('button', { name: 'Annotate section' }))
    expect(screen.getByRole('region', { name: 'Annotate flyout' })).toBeTruthy()
    await fireEvent.click(screen.getByRole('button', { name: 'Annotate section' }))
    expect(screen.queryByRole('region', { name: 'Annotate flyout' })).toBeNull()
  })

  it('remembers the collapsed rail but never reopens a flyout on restart', async () => {
    let app = render(() => <App />)
    await fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Annotate section' }))
    expect(window.localStorage.getItem(TEMPERED_COLLAPSED_KEY)).toBe('true')

    app.unmount()
    app = render(() => <App />)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Annotate flyout' })).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(tab('Annotate').getAttribute('aria-selected')).toBe('true')
    expect(group('Annotation')).toBeTruthy()
  })

  it('switches to Classic and back through the layout picker without losing the tool state', async () => {
    render(() => <App />)
    await fireEvent.click(screen.getByRole('button', { name: 'Linear', exact: true }))
    await fireEvent.click(tab('Setup'))
    await fireEvent.click(screen.getByRole('radio', { name: 'Classic' }))
    expect(window.localStorage.getItem(SHELL_PREFERENCE_KEY)).toBe('classic')
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Tools', exact: true })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'Draw' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Drawing canvas' })).toBeTruthy()
    expect(document.querySelector('.toolbar-active-tool')?.textContent).toContain('Linear')

    await fireEvent.click(screen.getByRole('radio', { name: 'Tempered' }))
    expect(window.localStorage.getItem(SHELL_PREFERENCE_KEY)).toBe('tempered')
    expect(tab('Setup').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('region', { name: 'Drawing canvas' })).toBeTruthy()
    expect(document.querySelector('.toolbar-active-tool')?.textContent).toContain('Linear')
  })
})
