// @vitest-environment jsdom

import { vi } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  PDFWorker: class { destroy = vi.fn() },
  getDocument: vi.fn(() => ({
    promise: Promise.reject(new Error('pdfjs not used in shell tests')),
  })),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

import { fireEvent, render, screen, within } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { SHELL_PREFERENCE_KEY } from '../registry'
import { installAppTestEnvironment } from '../testing/installAppTestEnvironment'

installAppTestEnvironment()

// Hover's shell test: pins Hover, which loads lazily, so the first lookup waits for it.
beforeEach(() => window.localStorage.setItem(SHELL_PREFERENCE_KEY, 'hover'))

const dock = (name: string) => screen.getByRole('button', { name, exact: true })
const popover = (name: string) => screen.getByRole('region', { name: `${name} popover` })
const queryPopover = (name: string) => screen.queryByRole('region', { name: `${name} popover` })
const workspaceInert = () => {
  const main = document.querySelector('main.workspace') as (HTMLElement & { inert?: boolean }) | null
  return main?.hasAttribute('inert') || main?.inert === true
}

async function renderHover() {
  const result = render(() => <App />)
  await screen.findByRole('button', { name: 'Conductors', exact: true })
  return result
}

describe('Hover shell', () => {
  it('loads lazily and floats every pill over the workspace with the popovers closed', async () => {
    await renderHover()
    expect(screen.getByRole('complementary', { name: 'Primary controls' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Drawing canvas' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Mode' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'History' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Material' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Class' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Snapping' })).toBeTruthy()
    expect(screen.getByRole('toolbar', { name: 'Properties' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Readouts' })).toBeTruthy()
    expect(screen.getByRole('toolbar', { name: 'Quick access' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Ready')
    for (const name of ['Conductors', 'Air Terminals', 'Connections', 'Downleads', 'Annotate', 'Setup']) {
      expect(dock(name).getAttribute('aria-expanded')).toBe('false')
      expect(queryPopover(name)).toBeNull()
    }
    expect(screen.queryByRole('group', { name: 'Conductors' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'File' })).toBeNull()
    expect(workspaceInert()).toBe(false)
  })

  it('opens one popover at a time with the workspace inert, and closes it on tool choice', async () => {
    await renderHover()
    await fireEvent.click(dock('Conductors'))
    expect(within(popover('Conductors')).getByRole('group', { name: 'Conductors' })).toBeTruthy()
    expect(dock('Conductors').getAttribute('aria-expanded')).toBe('true')
    expect(workspaceInert()).toBe(true)

    await fireEvent.click(dock('Air Terminals'))
    expect(queryPopover('Conductors')).toBeNull()
    expect(within(popover('Air Terminals')).getByRole('group', { name: 'Air Terminals' })).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'AT', exact: true }))
    expect(queryPopover('Air Terminals')).toBeNull()
    expect(workspaceInert()).toBe(false)
    expect(document.querySelector('.toolbar-active-tool')?.textContent).toContain('Component')
    expect(dock('Air Terminals').classList.contains('current')).toBe(true)
    expect(dock('Conductors').classList.contains('current')).toBe(false)
  })

  it('closes on Escape with focus back on the dock button, and the same button toggles', async () => {
    await renderHover()
    await fireEvent.click(dock('Annotate'))
    const annotate = popover('Annotate')
    expect(within(annotate).getByRole('group', { name: 'Annotation' })).toBeTruthy()
    expect(within(annotate).getByRole('group', { name: 'Layers' })).toBeTruthy()

    const text = within(annotate).getByRole('button', { name: 'Text', exact: true })
    text.focus()
    await fireEvent.keyDown(text, { key: 'Escape' })
    expect(queryPopover('Annotate')).toBeNull()
    expect(document.activeElement).toBe(dock('Annotate'))

    await fireEvent.click(dock('Downleads'))
    expect(within(popover('Downleads')).getByRole('group', { name: 'Grounding' })).toBeTruthy()
    await fireEvent.click(dock('Downleads'))
    expect(queryPopover('Downleads')).toBeNull()
  })

  it('keeps the project blocks in the setup popover behind the project pill', async () => {
    await renderHover()
    await fireEvent.click(dock('Setup'))
    const setup = popover('Setup')
    for (const name of ['Project name', 'File', 'Export', 'Report', 'Pages', 'PDF background', 'Drawing scale']) {
      expect(within(setup).getByRole('group', { name })).toBeTruthy()
    }
    for (const name of ['Annotation size', 'Theme', 'Layout']) {
      expect(within(setup).getByRole('radiogroup', { name })).toBeTruthy()
    }
    await fireEvent.input(within(setup).getByPlaceholderText('Project name...'), { target: { value: 'Hover Test' } })
    expect(screen.getByText('Hover Test', { selector: '.hover-project-title' })).toBeTruthy()
  })

  it('switches to Tempered through the layout picker', async () => {
    await renderHover()
    await fireEvent.click(dock('Setup'))
    await fireEvent.click(screen.getByRole('radio', { name: 'Tempered' }))
    expect(window.localStorage.getItem(SHELL_PREFERENCE_KEY)).toBe('tempered')
    expect(await screen.findByRole('tab', { name: 'Draw' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Conductors', exact: true })).toBeNull()
  })
})
