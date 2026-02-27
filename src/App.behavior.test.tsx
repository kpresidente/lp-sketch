// @vitest-environment jsdom

import { vi } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  PDFWorker: class { destroy = vi.fn() },
  getDocument: vi.fn(() => ({
    promise: Promise.reject(new Error('pdfjs not used in behavior tests')),
  })),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

import { cleanup, fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

vi.setConfig({ testTimeout: 15000 })

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

function requireDrawingStage(container: HTMLElement): HTMLDivElement {
  const stage = container.querySelector('.drawing-stage') as HTMLDivElement | null
  expect(stage).not.toBeNull()
  if (!stage) {
    throw new Error('drawing stage not found')
  }
  return stage
}

function requireCameraLayer(container: HTMLElement): HTMLDivElement {
  const layer = container.querySelector('.camera-layer') as HTMLDivElement | null
  expect(layer).not.toBeNull()
  if (!layer) {
    throw new Error('camera layer not found')
  }
  return layer
}

function requireToggleByLabel(container: HTMLElement, label: string): HTMLButtonElement {
  const rows = Array.from(container.querySelectorAll('.toggle-row'))
  const row = rows.find((entry) => {
    const rowLabel = entry.querySelector('.toggle-label')
    return rowLabel?.textContent?.trim() === label
  }) as HTMLDivElement | undefined

  expect(row).toBeTruthy()
  if (!row) {
    throw new Error(`toggle row "${label}" not found`)
  }

  const toggle = row.querySelector('.toggle-switch') as HTMLButtonElement | null
  expect(toggle).not.toBeNull()
  if (!toggle) {
    throw new Error(`toggle switch "${label}" not found`)
  }

  return toggle
}

function isToggleOn(toggle: HTMLElement): boolean {
  return toggle.classList.contains('on')
}

function requireMaterialItem(container: HTMLElement, name: string): HTMLButtonElement {
  const labels = Array.from(container.querySelectorAll('.material-item .mat-name'))
  const label = labels.find((entry) => entry.textContent?.trim() === name) as HTMLElement | undefined
  expect(label).toBeTruthy()
  if (!label) {
    throw new Error(`material "${name}" not found`)
  }

  const item = label.closest('.material-item') as HTMLButtonElement | null
  expect(item).not.toBeNull()
  if (!item) {
    throw new Error(`material row "${name}" not found`)
  }

  return item
}

async function applyManualScale(inches: string, feet: string) {
  const inchesInput = screen.getByLabelText('Scale inches') as HTMLInputElement
  const feetInput = screen.getByLabelText('Scale feet') as HTMLInputElement
  await fireEvent.input(inchesInput, { target: { value: inches } })
  await fireEvent.input(feetInput, { target: { value: feet } })
  await fireEvent.click(screen.getByRole('button', { name: 'Apply Scale' }))
}

describe('App behavior integration', () => {
  it('rejects invalid manual scale input', async () => {
    render(() => <App />)

    await applyManualScale('1', '0')
    expect(screen.getByText('Manual scale must be entered as positive values: X inches = Y feet.')).toBeTruthy()
  }, 15000)

  it('renders manual scale unit badges inside the scale inputs', () => {
    const { container } = render(() => <App />)
    const units = Array.from(container.querySelectorAll('.scale-input-unit'))
      .map((entry) => entry.textContent?.trim())
    expect(units).toEqual(['in', 'ft'])
  })

  it('shows and clears report repro steps based on report type', async () => {
    render(() => <App />)

    await fireEvent.click(screen.getByRole('button', { name: 'Bug' }))

    const dialog = screen.getByRole('dialog', { name: 'Report issue' })
    const dialogWithin = within(dialog)
    const repro = dialogWithin.getByLabelText('Report reproduction steps') as HTMLTextAreaElement
    await fireEvent.input(repro, { target: { value: 'step 1' } })
    expect(repro.value).toBe('step 1')

    await fireEvent.click(dialogWithin.getByRole('radio', { name: 'Feature' }))
    expect(dialogWithin.queryByLabelText('Report reproduction steps')).toBeNull()

    await fireEvent.click(dialogWithin.getByRole('radio', { name: 'Bug' }))
    const reproAfter = dialogWithin.getByLabelText('Report reproduction steps') as HTMLTextAreaElement
    expect(reproAfter.value).toBe('')
  })

  it('highlights apply scale when inputs are dirty and clears when reverted or applied', async () => {
    render(() => <App />)

    const applyButton = screen.getByRole('button', { name: 'Apply Scale' })
    const inchesInput = screen.getByLabelText('Scale inches') as HTMLInputElement
    const feetInput = screen.getByLabelText('Scale feet') as HTMLInputElement

    expect(applyButton.classList.contains('dirty')).toBe(false)

    await fireEvent.input(inchesInput, { target: { value: '1' } })
    await fireEvent.input(feetInput, { target: { value: '8' } })
    expect(applyButton.classList.contains('dirty')).toBe(true)

    await fireEvent.click(applyButton)
    expect(applyButton.classList.contains('dirty')).toBe(false)

    await fireEvent.input(feetInput, { target: { value: '9' } })
    expect(applyButton.classList.contains('dirty')).toBe(true)

    await fireEvent.input(feetInput, { target: { value: '8' } })
    expect(applyButton.classList.contains('dirty')).toBe(false)
  })

  it('supports pan drag and wheel zoom updates', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)
    const cameraLayer = requireCameraLayer(container)
    const pdfLayer = container.querySelector('.pdf-layer') as HTMLCanvasElement | null

    expect(cameraLayer.style.transform).toContain('translate(24px, 24px) scale(1)')
    expect(pdfLayer).toBeNull()
    expect(screen.getByText('Import a PDF to get started')).toBeTruthy()
    expect(stage.style.cursor).toBe('pointer')

    await fireEvent.click(screen.getByRole('button', { name: 'Pan' }))
    expect(stage.style.cursor).toBe('grab')

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 120,
      clientY: 140,
      pointerId: 201,
      pointerType: 'mouse',
    })
    expect(stage.style.cursor).toBe('grabbing')
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 180,
      clientY: 190,
      pointerId: 201,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 180,
      clientY: 190,
      pointerId: 201,
      pointerType: 'mouse',
    })
    expect(stage.style.cursor).toBe('grab')

    await fireEvent.pointerDown(stage, {
      button: 1,
      clientX: 220,
      clientY: 220,
      pointerId: 202,
      pointerType: 'mouse',
    })
    expect(stage.style.cursor).toBe('grabbing')
    await fireEvent.pointerUp(stage, {
      button: 1,
      clientX: 220,
      clientY: 220,
      pointerId: 202,
      pointerType: 'mouse',
    })
    expect(stage.style.cursor).toBe('grab')

    expect(cameraLayer.style.transform).toContain('translate(84px, 74px)')

    await fireEvent.wheel(stage, {
      deltaY: -600,
      clientX: 300,
      clientY: 260,
    })

    const zoomStatus = Array.from(container.querySelectorAll('.tb-status')).find(
      (entry) => entry.textContent?.includes('Zoom:'),
    )
    expect(zoomStatus).toBeTruthy()
    expect(zoomStatus?.textContent).not.toContain('100%')
  })

  it('validates second and third points in 3-point curve mode', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Curve' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 202,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 202,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Curve point 2 must be different from point 1.')).toBeTruthy()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 120,
      pointerId: 202,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 120,
      clientY: 120,
      pointerId: 202,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Curve point 3 must be different from points 1 and 2.')).toBeTruthy()
  })

  it('supports continuous curve mode for chained curve placement', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Curve' }))
    await fireEvent.click(screen.getByLabelText('Continuous curve mode'))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 120,
      clientY: 140,
      pointerId: 212,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 180,
      clientY: 100,
      pointerId: 212,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 240,
      clientY: 140,
      pointerId: 212,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 180,
      pointerId: 212,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 140,
      pointerId: 212,
      pointerType: 'mouse',
    })

    expect(container.querySelectorAll('svg.overlay-layer path[stroke="#2e8b57"]').length).toBe(2)
  })

  it('validates endpoint and pull-point constraints in circular arc mode', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Arc' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 200,
      clientY: 200,
      pointerId: 206,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 200,
      clientY: 200,
      pointerId: 206,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Arc endpoint 2 must be different from endpoint 1.')).toBeTruthy()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 200,
      pointerId: 206,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 200,
      clientY: 200,
      pointerId: 206,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Arc pull point must be different from both endpoints.')).toBeTruthy()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 200,
      pointerId: 206,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Arc pull point cannot be collinear with endpoints.')).toBeTruthy()
  })

  it('validates arrow head must differ from tail', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 280,
      pointerId: 203,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 280,
      pointerId: 203,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Arrow head must be different from tail.')).toBeTruthy()
  })

  it('requires an anchor before inside-corner measure-mark input and supports span reset', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await applyManualScale('1', '1')
    await fireEvent.click(screen.getByRole('button', { name: 'Mark' }))

    await fireEvent.pointerDown(stage, {
      button: 2,
      clientX: 300,
      clientY: 220,
      pointerId: 204,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Set a starting anchor before adding inside corners.')).toBeTruthy()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 220,
      pointerId: 204,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 2,
      clientX: 360,
      clientY: 260,
      pointerId: 204,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Inside corner added (no mark placed).')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Reset Span' }))
    expect(screen.getByText('Measure & Mark span reset.')).toBeTruthy()
  }, 15000)

  it('supports keyboard undo/redo shortcuts and escape to clear transient line state', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 120,
      clientY: 140,
      pointerId: 205,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 180,
      pointerId: 205,
      pointerType: 'mouse',
    })

    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).not.toBeNull()

    await fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).toBeNull()

    await fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).not.toBeNull()

    await fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).not.toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 220,
      pointerId: 206,
      pointerType: 'mouse',
    })
    await fireEvent.keyDown(window, { key: 'Escape' })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 260,
      pointerId: 206,
      pointerType: 'mouse',
    })

    const lineCount = container.querySelectorAll('svg.overlay-layer line[stroke="#2e8b57"]').length
    expect(lineCount).toBe(1)
  })

  it('applies class/color/style toggles to newly drawn lines', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Class II' }))

    const aluminum = requireMaterialItem(container, 'Aluminum')
    await fireEvent.click(aluminum)

    const snapSwitch = requireToggleByLabel(container, 'Snap to Points')
    const angleSwitch = requireToggleByLabel(container, 'Angle Snap (15°)')
    await fireEvent.click(snapSwitch)
    await fireEvent.click(angleSwitch)
    expect(isToggleOn(snapSwitch)).toBe(false)
    expect(isToggleOn(angleSwitch)).toBe(false)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 150,
      clientY: 250,
      pointerId: 207,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 270,
      clientY: 270,
      pointerId: 207,
      pointerType: 'mouse',
    })

    const line = container.querySelector('svg.overlay-layer line[stroke="#2563eb"]:not([stroke-dasharray])')
    expect(line).not.toBeNull()
    expect(line?.getAttribute('stroke-dasharray')).toBeNull()
  }, 15000)

  it('applies design-size scaling to annotation stroke widths', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('radio', { name: 'Medium' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 120,
      clientY: 200,
      pointerId: 209,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 240,
      pointerId: 209,
      pointerType: 'mouse',
    })

    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"][stroke-width="3"]')).not.toBeNull()

    await fireEvent.click(screen.getByRole('radio', { name: 'Large' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 260,
      pointerId: 210,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 300,
      pointerId: 210,
      pointerType: 'mouse',
    })

    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"][stroke-width="4"]')).not.toBeNull()
  })

  it('labels color swatches with material mappings', () => {
    const { container } = render(() => <App />)

    expect(requireMaterialItem(container, 'Copper')).toBeTruthy()
    expect(requireMaterialItem(container, 'Aluminum')).toBeTruthy()
    expect(requireMaterialItem(container, 'Bimetallic')).toBeTruthy()
    expect(requireMaterialItem(container, 'Grounding')).toBeTruthy()
    expect(container.querySelector('.material-item[aria-label="Tinned"]')).toBeNull()

    const labels = Array.from(container.querySelectorAll('.material-item .mat-name'))
      .map((entry) => entry.textContent?.trim())
    expect(labels).toEqual(['Copper', 'Aluminum', 'Bimetallic', 'Grounding'])
  })

  it('disables component buttons according to material constraints', async () => {
    const { container } = render(() => <App />)
    const byName = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement

    // Copper
    expect(byName('Ground Rod').disabled).toBe(true)
    expect(byName('Cadweld').disabled).toBe(false)

    // Aluminum
    await fireEvent.click(requireMaterialItem(container, 'Aluminum'))
    expect(byName('Ground Rod').disabled).toBe(true)
    expect(byName('Cadweld').disabled).toBe(true)
    expect(byName('Linear').disabled).toBe(false)

    // Bimetallic
    await fireEvent.click(requireMaterialItem(container, 'Bimetallic'))
    expect(byName('Linear').disabled).toBe(true)
    expect(byName('Arc').disabled).toBe(true)
    expect(byName('Curve').disabled).toBe(true)
    expect(byName('AT').disabled).toBe(true)
    expect(byName('Bonded AT').disabled).toBe(true)
    expect(byName('Linear AT').disabled).toBe(true)
    expect(byName('Arc AT').disabled).toBe(true)
    expect(byName('Steel Bond').disabled).toBe(true)
    expect(byName('Ground Rod').disabled).toBe(true)
    expect(byName('Cadweld').disabled).toBe(true)
    expect(byName('Continued').disabled).toBe(false)
    expect(screen.getByRole('button', { name: /Connect\s+Existing/ }).hasAttribute('disabled')).toBe(false)

    // Grounding
    await fireEvent.click(requireMaterialItem(container, 'Grounding'))
    expect(byName('AT').disabled).toBe(true)
    expect(byName('Bonded AT').disabled).toBe(true)
    expect(byName('Linear AT').disabled).toBe(true)
    expect(byName('Arc AT').disabled).toBe(true)
    expect(byName('Linear').disabled).toBe(false)
    expect(byName('Cadweld').disabled).toBe(false)
  })

  it('falls back to Select when material changes to one that disallows the active component mode', async () => {
    const { container } = render(() => <App />)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    expect((screen.getByRole('button', { name: 'Linear' }) as HTMLButtonElement).className).toContain('active')

    await fireEvent.click(requireMaterialItem(container, 'Bimetallic'))

    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'Linear' }) as HTMLButtonElement).className).not.toContain('active')
      expect((screen.getByRole('button', { name: 'Select' }) as HTMLButtonElement).className).toContain('active')
    })
    expect(screen.getByText(/Switched to Select\.$/)).toBeTruthy()
  })

  it('uses custom icons for arc auto-spacing, connector buttons, and class-II steel bond', async () => {
    const { container } = render(() => <App />)

    const arcAutoSpacingButtonInitial = screen.getByRole('button', { name: 'Arc AT' })
    expect(arcAutoSpacingButtonInitial.querySelector('[data-custom-icon="at-arc"]')).not.toBeNull()

    const cadweldButtonInitial = screen.getByRole('button', { name: 'Cadweld' })
    expect(cadweldButtonInitial.querySelector('[data-custom-icon="cadweld-connection"]')).not.toBeNull()

    const mechanicalCrossrunButtonInitial = screen.getByRole('button', { name: /Mechanical\s+Crossrun/ })
    expect(mechanicalCrossrunButtonInitial.querySelector('[data-custom-icon="mechanical-crossrun-connection"]')).not.toBeNull()

    const cadweldCrossrunButtonInitial = screen.getByRole('button', { name: /Cadweld\s+Crossrun/ })
    expect(cadweldCrossrunButtonInitial.querySelector('[data-custom-icon="cadweld-crossrun-connection"]')).not.toBeNull()

    const steelBondButtonInitial = screen.getByRole('button', { name: 'Steel Bond' })
    expect(steelBondButtonInitial.querySelector('[data-custom-icon="steel-bond-filled"]')).toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Class II' }))

    const steelBondButtonClass2 = screen.getByRole('button', { name: 'Steel Bond' })
    expect(steelBondButtonClass2.querySelector('[data-custom-icon="steel-bond-filled"]')).not.toBeNull()

    const activeToolBadge = container.querySelector('.toolbar-active-tool')
    expect(activeToolBadge).not.toBeNull()
  }, 15000)

  it('exposes semantic controls for toggles, material radios, and icon actions', async () => {
    const { container } = render(() => <App />)

    const snapSwitch = requireToggleByLabel(container, 'Snap to Points')
    expect(snapSwitch.getAttribute('role')).toBe('switch')
    expect(snapSwitch.getAttribute('aria-checked')).toBe('true')
    await fireEvent.click(snapSwitch)
    expect(snapSwitch.getAttribute('aria-checked')).toBe('false')

    const materialGroup = screen.getByRole('radiogroup', { name: 'Material' })
    expect(materialGroup).toBeTruthy()

    const aluminum = screen.getByRole('radio', { name: 'Aluminum' })
    expect(aluminum.getAttribute('aria-checked')).toBe('false')
    await fireEvent.click(aluminum)
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Aluminum' }).getAttribute('aria-checked')).toBe('true')
    })

    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeTruthy()
  })

  it('renders a compact properties bar with tool-aware inline controls', async () => {
    const { container } = render(() => <App />)

    expect(container.querySelector('[data-properties-bar="active"]')).not.toBeNull()
    expect(container.querySelector('.properties-row')).not.toBeNull()
    expect(container.querySelector('.properties-tool-options-inline')?.textContent).toContain('No tool-specific properties.')

    await fireEvent.click(screen.getByRole('button', { name: 'AT' }))

    expect(container.querySelector('.toolbar-active-tool')?.textContent).toContain('Component')
    expect(container.querySelector('.properties-row')?.textContent).toContain('Air terminal')
    await waitFor(() => {
      expect(container.querySelector('.properties-tool-options-inline')?.textContent).toContain('Letter')
      expect(container.querySelector('.properties-tool-options-inline')?.textContent).toContain('Legend Suffix')
    })
  }, 15000)

  it('renders persistent quick tools in the properties bar and wires tool/history actions', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    expect(container.querySelector('[data-toolbar-quick-tools="active"]')).not.toBeNull()

    const quickPan = screen.getByRole('button', { name: 'Quick pan mode' })
    await fireEvent.click(quickPan)
    expect(container.querySelector('.toolbar-active-tool')?.textContent).toContain('Pan')

    await fireEvent.click(screen.getByRole('button', { name: 'Quick multi-select mode' }))
    expect(
      container.querySelector('[data-toolbar-quick-tools="active"] [data-custom-icon="multi-select-hand-plus"]'),
    ).not.toBeNull()

    const quickUndo = screen.getByRole('button', { name: 'Quick undo' }) as HTMLButtonElement
    const quickRedo = screen.getByRole('button', { name: 'Quick redo' }) as HTMLButtonElement
    expect(quickUndo.disabled).toBe(true)
    expect(quickRedo.disabled).toBe(true)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 140,
      clientY: 200,
      pointerId: 520,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 240,
      pointerId: 520,
      pointerType: 'mouse',
    })

    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).not.toBeNull()
    expect((screen.getByRole('button', { name: 'Quick undo' }) as HTMLButtonElement).disabled).toBe(false)

    await fireEvent.click(screen.getByRole('button', { name: 'Quick undo' }))
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).toBeNull()
    expect((screen.getByRole('button', { name: 'Quick redo' }) as HTMLButtonElement).disabled).toBe(false)
  }, 15000)

  it('uses integer spinner steps for spacing/mark inputs and keeps scale inputs decimal-typable', async () => {
    render(() => <App />)

    await applyManualScale('1', '1')
    await fireEvent.click(screen.getByRole('button', { name: 'Linear AT' }))
    const linearIntervalInput = screen.getByLabelText('Linear auto-spacing max interval') as HTMLInputElement
    expect(linearIntervalInput.step).toBe('1')

    await fireEvent.click(screen.getByRole('button', { name: 'Arc AT' }))
    const arcIntervalInput = screen.getByLabelText('Arc auto-spacing max interval') as HTMLInputElement
    expect(arcIntervalInput.step).toBe('1')

    await fireEvent.click(screen.getByRole('button', { name: 'Mark' }))
    const markTargetInput = screen.getByLabelText('Target distance feet') as HTMLInputElement
    expect(markTargetInput.step).toBe('1')

    const scaleInchesInput = screen.getAllByLabelText('Scale inches')[0] as HTMLInputElement
    const scaleFeetInput = screen.getAllByLabelText('Scale feet')[0] as HTMLInputElement
    expect(scaleInchesInput.step).toBe('1')
    expect(scaleFeetInput.step).toBe('1')

    await fireEvent.input(scaleInchesInput, { target: { value: '1.5' } })
    await fireEvent.input(scaleFeetInput, { target: { value: '20.25' } })
    expect(scaleInchesInput.value).toBe('1.5')
    expect(scaleFeetInput.value).toBe('20.25')
  }, 15000)

  it('does not show a separate perpendicular snap toggle', () => {
    render(() => <App />)
    expect(screen.queryByLabelText('Perpendicular snap')).toBeNull()
  })

  it('resets auto-spacing trace from the sidebar button', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await applyManualScale('1', '36')

    await fireEvent.click(screen.getByRole('button', { name: 'Linear AT' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 208,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 208,
      pointerType: 'mouse',
    })

    const verticesStatus = Array.from(container.querySelectorAll('.tb-status')).find(
      (entry) => entry.textContent?.includes('Vertices:'),
    )
    expect(verticesStatus?.textContent).toContain('2')

    await fireEvent.click(screen.getByRole('button', { name: 'Reset Trace' }))
    expect(screen.getByText('Linear auto-spacing trace reset.')).toBeTruthy()
    const verticesStatusAfterReset = Array.from(container.querySelectorAll('.tb-status')).find(
      (entry) => entry.textContent?.includes('Vertices:'),
    )
    expect(verticesStatusAfterReset?.textContent).toContain('0')
  }, 15000)
})
