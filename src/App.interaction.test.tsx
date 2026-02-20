// @vitest-environment jsdom

import { vi } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.reject(new Error('pdfjs not used in interaction tests')),
  })),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { distanceToQuadratic } from './lib/geometry'

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

function historyButton(container: HTMLElement, index: 0 | 1): HTMLButtonElement {
  const buttons = container.querySelectorAll('.history-bar .btn-icon')
  const button = buttons.item(index) as HTMLButtonElement | null
  expect(button).not.toBeNull()
  if (!button) {
    throw new Error(`history button ${index} not found`)
  }
  return button
}

function requireToggleByLabel(container: HTMLElement, label: string): HTMLDivElement {
  const rows = Array.from(container.querySelectorAll('.toggle-row'))
  const row = rows.find((entry) => {
    const rowLabel = entry.querySelector('.toggle-label')
    return rowLabel?.textContent?.trim() === label
  }) as HTMLDivElement | undefined

  expect(row).toBeTruthy()
  if (!row) {
    throw new Error(`toggle row "${label}" not found`)
  }

  const toggle = row.querySelector('.toggle-switch') as HTMLDivElement | null
  expect(toggle).not.toBeNull()
  if (!toggle) {
    throw new Error(`toggle switch "${label}" not found`)
  }

  return toggle
}

async function applyManualScale(inches: string, feet: string) {
  const inchesInput = screen.getByLabelText('Scale inches') as HTMLInputElement
  const feetInput = screen.getByLabelText('Scale feet') as HTMLInputElement
  await fireEvent.input(inchesInput, { target: { value: inches } })
  await fireEvent.input(feetInput, { target: { value: feet } })
  await fireEvent.click(screen.getByRole('button', { name: 'Apply Scale' }))
}

function isToggleOn(toggle: HTMLElement): boolean {
  return toggle.classList.contains('on')
}

async function selectMaterial(name: 'Copper' | 'Aluminum' | 'Bimetallic' | 'Grounding') {
  await fireEvent.click(screen.getByRole('radio', { name }))
}

function getToolbarStatus(prefix: string): HTMLElement {
  return screen.getByText((_, node) => {
    if (!(node instanceof HTMLElement)) {
      return false
    }
    if (!node.classList.contains('tb-status')) {
      return false
    }
    const text = node.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    return text.startsWith(prefix)
  })
}

function cameraViewFromContainer(container: HTMLElement): { panX: number; panY: number; zoom: number } {
  const transform = requireCameraLayer(container).style.transform
  const match = transform.match(
    /^\s*translate\((-?\d*\.?\d+)px,\s*(-?\d*\.?\d+)px\)\s*scale\((-?\d*\.?\d+)\)\s*$/,
  )

  if (!match) {
    throw new Error(`Unexpected camera transform format: ${transform}`)
  }

  return {
    panX: Number.parseFloat(match[1]),
    panY: Number.parseFloat(match[2]),
    zoom: Number.parseFloat(match[3]),
  }
}

function screenToOverlayDoc(container: HTMLElement, point: { x: number; y: number }) {
  const rect = requireDrawingStage(container).getBoundingClientRect()
  const view = cameraViewFromContainer(container)

  return {
    x: (point.x - rect.left - view.panX) / view.zoom,
    y: (point.y - rect.top - view.panY) / view.zoom,
  }
}

function overlayDocToScreen(container: HTMLElement, point: { x: number; y: number }) {
  const rect = requireDrawingStage(container).getBoundingClientRect()
  const view = cameraViewFromContainer(container)

  return {
    x: point.x * view.zoom + view.panX + rect.left,
    y: point.y * view.zoom + view.panY + rect.top,
  }
}

function parseNumericAttr(element: Element, name: string): number {
  const raw = element.getAttribute(name)
  if (raw === null) {
    throw new Error(`missing numeric attribute ${name}`)
  }

  return Number.parseFloat(raw)
}

function parseStylePx(value: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Unexpected pixel style value: ${value}`)
  }

  return parsed
}

function hasDashedLineAt(
  container: HTMLElement,
  expected: { x1: number; y1: number; x2: number; y2: number },
  epsilon = 0.01,
): boolean {
  const lines = container.querySelectorAll(
    'svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]',
  )

  return Array.from(lines).some((line) => {
    const x1 = parseNumericAttr(line, 'x1')
    const y1 = parseNumericAttr(line, 'y1')
    const x2 = parseNumericAttr(line, 'x2')
    const y2 = parseNumericAttr(line, 'y2')

    return (
      Math.abs(x1 - expected.x1) <= epsilon &&
      Math.abs(y1 - expected.y1) <= epsilon &&
      Math.abs(x2 - expected.x2) <= epsilon &&
      Math.abs(y2 - expected.y2) <= epsilon
    )
  })
}

function hasDashedLineStartAt(
  container: HTMLElement,
  expected: { x1: number; y1: number },
  epsilon = 0.01,
): boolean {
  const lines = container.querySelectorAll(
    'svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]',
  )

  return Array.from(lines).some((line) => {
    const x1 = parseNumericAttr(line, 'x1')
    const y1 = parseNumericAttr(line, 'y1')

    return (
      Math.abs(x1 - expected.x1) <= epsilon &&
      Math.abs(y1 - expected.y1) <= epsilon
    )
  })
}

function firstDashedLine(container: HTMLElement): Element {
  const line = container.querySelector(
    'svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]',
  )
  if (!line) {
    throw new Error('expected dashed line not found')
  }
  return line
}

function countPlacedAirTerminals(container: HTMLElement): number {
  return container.querySelectorAll('svg.overlay-layer g[data-symbol-type="air_terminal"]').length
}

function firstPlacedArrow(container: HTMLElement): Element {
  const arrow = container.querySelector(
    'svg.overlay-layer line[stroke="#2e8b57"][marker-end="url(#arrow-head)"]',
  )
  if (!arrow) {
    throw new Error('expected placed arrow not found')
  }
  return arrow
}

function parseQuadraticPath(path: string): {
  start: { x: number; y: number }
  control: { x: number; y: number }
  end: { x: number; y: number }
} {
  const match = path.match(
    /^\s*M\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+Q\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s*$/,
  )
  if (!match) {
    throw new Error(`Unexpected quadratic path format: ${path}`)
  }

  return {
    start: { x: Number.parseFloat(match[1]), y: Number.parseFloat(match[2]) },
    control: { x: Number.parseFloat(match[3]), y: Number.parseFloat(match[4]) },
    end: { x: Number.parseFloat(match[5]), y: Number.parseFloat(match[6]) },
  }
}

function parseArcPath(path: string): {
  start: { x: number; y: number }
  radius: number
  largeArcFlag: 0 | 1
  sweepFlag: 0 | 1
  end: { x: number; y: number }
} {
  const match = path.match(
    /^\s*M\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+A\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+0\s+([01])\s+([01])\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s*$/,
  )
  if (!match) {
    throw new Error(`Unexpected arc path format: ${path}`)
  }

  return {
    start: { x: Number.parseFloat(match[1]), y: Number.parseFloat(match[2]) },
    radius: Number.parseFloat(match[3]),
    largeArcFlag: Number.parseInt(match[5], 10) as 0 | 1,
    sweepFlag: Number.parseInt(match[6], 10) as 0 | 1,
    end: { x: Number.parseFloat(match[7]), y: Number.parseFloat(match[8]) },
  }
}

function lineAngleDegrees(line: Element): number {
  const x1 = parseNumericAttr(line, 'x1')
  const y1 = parseNumericAttr(line, 'y1')
  const x2 = parseNumericAttr(line, 'x2')
  const y2 = parseNumericAttr(line, 'y2')
  const raw = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  return (raw + 360) % 360
}

function pointAngleDegrees(start: { x: number; y: number }, end: { x: number; y: number }): number {
  const raw = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI
  return (raw + 360) % 360
}

function firstSymbolRotationDeg(container: HTMLElement): number {
  const rotationNode = container.querySelector(
    'svg.overlay-layer g[transform^="translate("] > g[transform^="rotate("]',
  )
  if (!rotationNode) {
    throw new Error('expected rotated symbol node not found')
  }

  const transform = rotationNode.getAttribute('transform')
  if (!transform) {
    throw new Error('missing symbol rotation transform')
  }

  const match = transform.match(/rotate\((-?\d*\.?\d+)\)/)
  if (!match) {
    throw new Error(`Unexpected symbol rotation format: ${transform}`)
  }

  return Number.parseFloat(match[1])
}

function verticalFootageLabels(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll('text[data-vertical-footage-indicator="active"]'),
  ).map((entry) => entry.textContent?.trim() ?? '')
}

describe('App interaction integration', () => {
  it('creates a line segment from two line-tool clicks', async () => {
    const { container } = render(() => <App />)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))

    const stage = container.querySelector('.drawing-stage') as HTMLDivElement | null
    expect(stage).not.toBeNull()

    if (!stage) {
      return
    }

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 100,
      clientY: 120,
      pointerId: 1,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 180,
      pointerId: 1,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Line segment added.')).toBeTruthy()

    const line = container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')
    expect(line).not.toBeNull()
  })

  it('supports inside-corner measure-mark input via Alt+click fallback', async () => {
    const { container } = render(() => <App />)

    await fireEvent.click(screen.getByRole('button', { name: 'Mark' }))

    const stage = container.querySelector('.drawing-stage') as HTMLDivElement | null
    expect(stage).not.toBeNull()

    if (!stage) {
      return
    }

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 2,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      altKey: true,
      clientX: 420,
      clientY: 280,
      pointerId: 2,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Inside corner added (no mark placed).')).toBeTruthy()
    expect(getToolbarStatus('Marks:').textContent).toContain('0')
  })

  it('snaps measure-mark span preview to the configured target distance and releases when moving away', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await applyManualScale('1', '1')
    await fireEvent.click(screen.getByRole('button', { name: 'Mark' }))

    const targetInput = screen.getByLabelText('Target distance feet') as HTMLInputElement
    await fireEvent.input(targetInput, { target: { value: '2' } })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 220,
      pointerId: 22,
      pointerType: 'mouse',
    })

    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 410,
      clientY: 220,
      pointerId: 22,
      pointerType: 'mouse',
    })

    const snappedSpanLabel = screen.getByText((value) => value.startsWith('Mark Span:'))
    expect(snappedSpanLabel.textContent).toContain(`2' 0"`)
    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="mark"] line[data-snap-shape="plus"]',
      ),
    ).not.toBeNull()

    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 520,
      clientY: 220,
      pointerId: 22,
      pointerType: 'mouse',
    })

    const movedSpanLabel = screen.getByText((value) => value.startsWith('Mark Span:'))
    expect(movedSpanLabel.textContent).not.toContain(`2' 0"`)
  })

  it('shows Clear All Marks in select mode when a mark is selected', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Mark' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 260,
      pointerId: 23,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 260,
      pointerId: 23,
      pointerType: 'mouse',
    })
    expect(screen.getByText('Mark placed. New span starts from this mark.')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 260,
      pointerId: 24,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 360,
      clientY: 260,
      pointerId: 24,
      pointerType: 'mouse',
    })

    const clearButton = screen.getByRole('button', { name: 'Clear All Marks' })
    expect(clearButton).toBeTruthy()
    await fireEvent.click(clearButton)
    expect(screen.getByText('Cleared all marks.')).toBeTruthy()
  })

  it('uses touch corner-mode toggle fallback for auto-spacing taps', async () => {
    const { container } = render(() => <App />)

    await applyManualScale('1', '18')

    await fireEvent.click(screen.getByRole('button', { name: 'Linear AT' }))
    await fireEvent.click(screen.getByRole('radio', { name: 'Inside' }))

    const stage = container.querySelector('.drawing-stage') as HTMLDivElement | null
    expect(stage).not.toBeNull()

    if (!stage) {
      return
    }

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 280,
      pointerId: 21,
      pointerType: 'touch',
    })

    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 280,
      clientY: 280,
      pointerId: 21,
      pointerType: 'touch',
    })

    expect(screen.getByText('First linear auto-spacing point must be an outside corner (left click).')).toBeTruthy()
  })

  it('places linear auto-spacing terminals incrementally on outside-corner clicks', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await applyManualScale('1', '18')
    await fireEvent.click(screen.getByRole('button', { name: 'Linear AT' }))

    const intervalInput = screen.getByLabelText('Linear auto-spacing max interval') as HTMLInputElement
    await fireEvent.input(intervalInput, { target: { value: '10000' } })

    expect(countPlacedAirTerminals(container)).toBe(0)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 611,
      pointerType: 'mouse',
    })
    expect(countPlacedAirTerminals(container)).toBe(0)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 220,
      pointerId: 611,
      pointerType: 'mouse',
    })
    expect(countPlacedAirTerminals(container)).toBe(2)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 560,
      clientY: 220,
      pointerId: 611,
      pointerType: 'mouse',
    })
    expect(countPlacedAirTerminals(container)).toBe(3)
  })

  it('skips exact-point duplicate terminals for linear auto-spacing', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await applyManualScale('1', '18')

    await fireEvent.click(screen.getByRole('button', { name: 'AT' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 240,
      pointerId: 612,
      pointerType: 'mouse',
    })
    expect(countPlacedAirTerminals(container)).toBe(1)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear AT' }))
    const intervalInput = screen.getByLabelText('Linear auto-spacing max interval') as HTMLInputElement
    await fireEvent.input(intervalInput, { target: { value: '10000' } })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 240,
      pointerId: 612,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 460,
      clientY: 240,
      pointerId: 612,
      pointerType: 'mouse',
    })

    expect(countPlacedAirTerminals(container)).toBe(2)
  })

  it('supports curve placement undo and redo as one transaction', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Curve' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 100,
      clientY: 140,
      pointerId: 31,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 140,
      pointerId: 31,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 170,
      clientY: 80,
      pointerId: 31,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Curve added.')).toBeTruthy()
    expect(container.querySelector('svg.overlay-layer path[stroke="#2e8b57"]')).not.toBeNull()

    await fireEvent.click(historyButton(container, 0))
    expect(container.querySelector('svg.overlay-layer path[stroke="#2e8b57"]')).toBeNull()

    await fireEvent.click(historyButton(container, 1))
    expect(container.querySelector('svg.overlay-layer path[stroke="#2e8b57"]')).not.toBeNull()
  })

  it('creates curve geometry that passes through the second clicked point', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Curve' }))

    const point1 = { x: 120, y: 320 }
    const point2 = { x: 220, y: 180 }
    const point3 = { x: 360, y: 220 }

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: point1.x,
      clientY: point1.y,
      pointerId: 311,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: point2.x,
      clientY: point2.y,
      pointerId: 311,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: point3.x,
      clientY: point3.y,
      pointerId: 311,
      pointerType: 'mouse',
    })

    const path = container.querySelector(
      'svg.overlay-layer path[stroke="#2e8b57"]',
    ) as SVGPathElement | null
    expect(path).not.toBeNull()
    if (!path) {
      return
    }

    const d = path.getAttribute('d')
    expect(d).not.toBeNull()
    if (!d) {
      return
    }

    const quadratic = parseQuadraticPath(d)
    const point2Doc = screenToOverlayDoc(container, point2)
    const distanceToSecond = distanceToQuadratic(
      point2Doc,
      quadratic.start,
      quadratic.control,
      quadratic.end,
      128,
    )
    expect(distanceToSecond).toBeLessThan(0.01)
  })

  it('creates circular arc geometry from two endpoints and supports major-arc spans', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Arc' }))

    const endpoint1 = { x: 400, y: 300 }
    const endpoint2 = { x: 350, y: 386 }
    const pullPoint = { x: 350, y: 214 }

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: endpoint1.x,
      clientY: endpoint1.y,
      pointerId: 312,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: endpoint2.x,
      clientY: endpoint2.y,
      pointerId: 312,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: pullPoint.x,
      clientY: pullPoint.y,
      pointerId: 312,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Arc added.')).toBeTruthy()

    const path = container.querySelector(
      'svg.overlay-layer path[stroke="#2e8b57"]',
    ) as SVGPathElement | null
    expect(path).not.toBeNull()
    if (!path) {
      return
    }

    const d = path.getAttribute('d')
    expect(d).not.toBeNull()
    if (!d) {
      return
    }

    const arc = parseArcPath(d)
    const endpoint1Doc = screenToOverlayDoc(container, endpoint1)
    const endpoint2Doc = screenToOverlayDoc(container, endpoint2)

    expect(arc.start.x).toBeCloseTo(endpoint1Doc.x, 6)
    expect(arc.start.y).toBeCloseTo(endpoint1Doc.y, 6)
    expect(arc.end.x).toBeCloseTo(endpoint2Doc.x, 6)
    expect(arc.end.y).toBeCloseTo(endpoint2Doc.y, 6)
    expect(arc.radius).toBeGreaterThan(1)
    expect(arc.largeArcFlag).toBe(1)
  })

  it('shows live previews for line, arc, arrow, and calibration workflows', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 120,
      clientY: 140,
      pointerId: 37,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 200,
      clientY: 170,
      pointerId: 37,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector('svg.overlay-layer line[stroke="#374151"][stroke-dasharray="6 4"]'),
    ).not.toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Arc' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 180,
      pointerId: 38,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 340,
      clientY: 180,
      pointerId: 38,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector('svg.overlay-layer line[stroke="#334155"][stroke-dasharray="6 4"]'),
    ).not.toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 180,
      pointerId: 38,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 300,
      clientY: 130,
      pointerId: 38,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector('svg.overlay-layer path[stroke="#334155"][stroke-dasharray="6 4"]'),
    ).not.toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 240,
      pointerId: 39,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 500,
      clientY: 290,
      pointerId: 39,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'svg.overlay-layer line[stroke="#1f2937"][stroke-dasharray="4 4"][marker-end="url(#preview-arrow)"]',
      ),
    ).not.toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Calibrate' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 220,
      pointerId: 40,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 610,
      clientY: 220,
      pointerId: 40,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector('svg.overlay-layer line[stroke="#0f766e"][stroke-dasharray="8 3"]'),
    ).not.toBeNull()
  })

  it('places and edits text notes, with undo for edits', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    const textInput = screen.getByLabelText('Text') as HTMLInputElement
    await fireEvent.input(textInput, { target: { value: 'Roof Note' } })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 190,
      pointerId: 42,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Text note placed.')).toBeTruthy()
    expect(screen.getByText('Roof Note')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.doubleClick(stage, {
      clientX: 340,
      clientY: 190,
    })
    const dialogInput = screen.getByDisplayValue('Roof Note') as HTMLInputElement
    await fireEvent.input(dialogInput, { target: { value: 'Roof Note Updated' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByText('Text updated.')).toBeTruthy()
    expect(screen.getByText('Roof Note Updated')).toBeTruthy()
    expect(screen.queryByText('Roof Note')).toBeNull()

    await fireEvent.click(historyButton(container, 0))
    expect(screen.getByText('Roof Note')).toBeTruthy()
    expect(screen.queryByText('Roof Note Updated')).toBeNull()
  })

  it('supports dimension linework toggle with preview and placed output', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await applyManualScale('1', '20')
    await fireEvent.click(screen.getByRole('button', { name: 'Dim Text' }))

    // Default placement (linework enabled)
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 951,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 220,
      pointerId: 951,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 280,
      pointerId: 951,
      pointerType: 'mouse',
    })
    expect(screen.getByText('Dimension text placed.')).toBeTruthy()
    expect(container.querySelector('g[data-dimension-linework="active"]')).not.toBeNull()

    // Disabled placement (linework off)
    const lineworkToggle = screen.getByLabelText('Dimension extension lines')
    await fireEvent.click(lineworkToggle)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 320,
      pointerId: 952,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 460,
      clientY: 320,
      pointerId: 952,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 370,
      pointerId: 952,
      pointerType: 'mouse',
    })

    await waitFor(() => {
      const groups = Array.from(container.querySelectorAll('g[data-dimension-linework="active"]'))
      expect(groups.length).toBe(1)
    })
  })

  it('supports layer reassignment from the annotation edit dialog and layer visibility toggles', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    const textInput = screen.getByLabelText('Text') as HTMLInputElement
    await fireEvent.input(textInput, { target: { value: 'Layered Note' } })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 220,
      pointerId: 420,
      pointerType: 'mouse',
    })
    expect(screen.getByText('Layered Note')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.doubleClick(stage, {
      clientX: 360,
      clientY: 220,
    })
    await fireEvent.click(screen.getByRole('radio', { name: 'Rooftop' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByText('Text updated.')).toBeTruthy()

    const rooftopLayerToggle = requireToggleByLabel(container, 'Rooftop')
    await fireEvent.click(rooftopLayerToggle)
    expect(screen.queryByText('Layered Note')).toBeNull()

    await fireEvent.click(rooftopLayerToggle)
    expect(screen.getByText('Layered Note')).toBeTruthy()
  })

  it('rejects blank text note placement', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Text' }))
    const textInput = screen.getByLabelText('Text') as HTMLInputElement
    await fireEvent.input(textInput, { target: { value: '   ' } })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 230,
      pointerId: 43,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Enter text in the Text tool before placing.')).toBeTruthy()
    expect(container.querySelector('svg.overlay-layer text')).toBeNull()
  })

  it('supports arrow reset, placement, undo, and redo', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 300,
      pointerId: 44,
      pointerType: 'mouse',
    })
    expect(screen.getByText('Arrow tail set. Click head point.')).toBeTruthy()
    expect(screen.getByText('Click head point')).toBeTruthy()

    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 500,
      clientY: 330,
      pointerId: 44,
      pointerType: 'mouse',
    })
    expect(
      container.querySelector(
        'svg.overlay-layer line[stroke="#1f2937"][stroke-dasharray="4 4"][marker-end="url(#preview-arrow)"]',
      ),
    ).not.toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Reset Arrow' }))
    expect(screen.getByText('Arrow operation reset.')).toBeTruthy()
    expect(screen.getByText('Click tail point')).toBeTruthy()
    expect(
      container.querySelector(
        'svg.overlay-layer line[stroke="#1f2937"][stroke-dasharray="4 4"][marker-end="url(#preview-arrow)"]',
      ),
    ).toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 300,
      pointerId: 45,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 350,
      pointerId: 45,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Arrow placed.')).toBeTruthy()
    expect(
      container.querySelector(
        'svg.overlay-layer line[stroke="#2e8b57"][marker-end="url(#arrow-head)"]',
      ),
    ).not.toBeNull()

    await fireEvent.click(historyButton(container, 0))
    expect(
      container.querySelector(
        'svg.overlay-layer line[stroke="#2e8b57"][marker-end="url(#arrow-head)"]',
      ),
    ).toBeNull()

    await fireEvent.click(historyButton(container, 1))
    expect(
      container.querySelector(
        'svg.overlay-layer line[stroke="#2e8b57"][marker-end="url(#arrow-head)"]',
      ),
    ).not.toBeNull()
  })

  it('supports legend label edits and undo sequence', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'AT' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 41,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Legend' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 664,
      clientY: 104,
      pointerId: 41,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Legend placed.')).toBeTruthy()
    await fireEvent.click(screen.getByRole('button', { name: 'Edit Labels' }))
    const roofAirInput = screen.getByDisplayValue('Air terminal A') as HTMLInputElement
    await fireEvent.input(roofAirInput, { target: { value: 'Roof Air' } })
    const legendApplyButton = container.querySelector(
      '.legend-label-dialog .btn-row .btn',
    ) as HTMLButtonElement | null
    expect(legendApplyButton).not.toBeNull()
    if (!legendApplyButton) {
      return
    }
    await fireEvent.click(legendApplyButton)
    expect(screen.getByText('Legend labels updated.')).toBeTruthy()
    expect(screen.getByText('Roof Air')).toBeTruthy()

    await fireEvent.click(historyButton(container, 0))
    expect(screen.queryByText('Roof Air')).toBeNull()
    expect(screen.getByText('Class I Copper Air terminal A')).toBeTruthy()

    await fireEvent.click(historyButton(container, 0))
    expect(screen.queryByText('Class I Copper Air terminal')).toBeNull()
  }, 15000)

  it('places and edits shared general notes content', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 364,
      clientY: 244,
      pointerId: 1011,
      pointerType: 'mouse',
    })

    expect(screen.getByText('General notes placed.')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.dblClick(stage, {
      button: 0,
      clientX: 364,
      clientY: 244,
    })

    expect(container.querySelector('.general-notes-dialog')).not.toBeNull()

    const noteInput = container.querySelector(
      '.general-notes-dialog .legend-label-input',
    ) as HTMLInputElement | null
    expect(noteInput).not.toBeNull()
    if (!noteInput) {
      return
    }

    await fireEvent.input(noteInput, { target: { value: 'Install per UL 96A.' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('General notes updated.')).toBeTruthy()
    expect(screen.getByText('1. Install per UL 96A.')).toBeTruthy()
  }, 15000)

  it('keeps legend label editor on-screen and supports dragging', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'AT' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 431,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Legend' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 1160,
      clientY: 760,
      pointerId: 432,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Edit Labels' }))

    const dialog = container.querySelector('.legend-label-dialog') as HTMLDivElement | null
    expect(dialog).not.toBeNull()
    if (!dialog) {
      return
    }

    const initialLeft = parseStylePx(dialog.style.left)
    const initialTop = parseStylePx(dialog.style.top)
    expect(initialLeft).toBeGreaterThanOrEqual(12)
    expect(initialTop).toBeGreaterThanOrEqual(12)
    expect(initialLeft).toBeLessThanOrEqual(548)
    expect(initialTop).toBeLessThanOrEqual(368)

    const titleBar = container.querySelector('.legend-label-titlebar') as HTMLDivElement | null
    expect(titleBar).not.toBeNull()
    if (!titleBar) {
      return
    }

    await fireEvent.pointerDown(titleBar, {
      button: 0,
      clientX: initialLeft + 24,
      clientY: initialTop + 12,
      pointerId: 433,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(titleBar, {
      button: 0,
      clientX: 220,
      clientY: 150,
      pointerId: 433,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(titleBar, {
      button: 0,
      clientX: 220,
      clientY: 150,
      pointerId: 433,
      pointerType: 'mouse',
    })

    const movedLeft = parseStylePx(dialog.style.left)
    const movedTop = parseStylePx(dialog.style.top)
    expect(movedLeft).not.toBe(initialLeft)
    expect(movedTop).not.toBe(initialTop)
    expect(movedLeft).toBeGreaterThanOrEqual(12)
    expect(movedTop).toBeGreaterThanOrEqual(12)
  })

  it('filters legend entries by visible layers', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 260,
      pointerId: 921,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 260,
      pointerId: 921,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Legend' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 650,
      clientY: 120,
      pointerId: 922,
      pointerType: 'mouse',
    })
    expect(screen.getByText('Class I Copper conductor footage')).toBeTruthy()

    const rooftopLayerToggle = requireToggleByLabel(container, 'Rooftop')
    await fireEvent.click(rooftopLayerToggle)
    expect(isToggleOn(rooftopLayerToggle)).toBe(false)
    await waitFor(() => {
      expect(screen.queryByText('Class I Copper conductor footage')).toBeNull()
    })
    expect(screen.getByText('No components used yet.')).toBeTruthy()

    await fireEvent.click(rooftopLayerToggle)
    expect(isToggleOn(rooftopLayerToggle)).toBe(true)
    expect(screen.getByText('Class I Copper conductor footage')).toBeTruthy()
  }, 15000)

  it('auto-connectors place connector symbols for junctions and remain consistent through undo/redo', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const autoConnectorToggle = requireToggleByLabel(container, 'Auto-Connectors')
    expect(isToggleOn(autoConnectorToggle)).toBe(true)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 260,
      pointerId: 901,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 260,
      pointerId: 901,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 140,
      pointerId: 902,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 380,
      pointerId: 902,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cable_to_cable_connection"] circle[stroke="#2e8b57"]',
      ),
    ).not.toBeNull()

    await fireEvent.click(historyButton(container, 0))
    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cable_to_cable_connection"] circle[stroke="#2e8b57"]',
      ),
    ).toBeNull()

    await fireEvent.click(historyButton(container, 1))
    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cable_to_cable_connection"] circle[stroke="#2e8b57"]',
      ),
    ).not.toBeNull()
  })

  it('supports auto-connector mode selection and disables mode buttons when auto-connectors are off', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const autoConnectorToggle = requireToggleByLabel(container, 'Auto-Connectors')
    const mechanicalModeButton = screen.getByRole('button', { name: 'Auto-connector type mechanical' })
    const cadweldModeButton = screen.getByRole('button', { name: 'Auto-connector type cadweld' })

    expect(isToggleOn(autoConnectorToggle)).toBe(true)
    expect(mechanicalModeButton.hasAttribute('disabled')).toBe(false)
    expect(cadweldModeButton.hasAttribute('disabled')).toBe(false)

    await fireEvent.click(cadweldModeButton)
    expect(screen.getByText('Auto-connector type: Cadweld.')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 260,
      pointerId: 903,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 260,
      pointerId: 903,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 140,
      pointerId: 904,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 380,
      pointerId: 904,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cadweld_connection"] circle[stroke="#2e8b57"]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cable_to_cable_connection"] circle[stroke="#2e8b57"]',
      ),
    ).toBeNull()

    await fireEvent.click(autoConnectorToggle)
    expect(isToggleOn(autoConnectorToggle)).toBe(false)
    expect(mechanicalModeButton.hasAttribute('disabled')).toBe(true)
    expect(cadweldModeButton.hasAttribute('disabled')).toBe(true)
  })

  it('keeps existing auto-connectors unchanged when connector mode changes, while new points use the new mode', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const mechanicalModeButton = screen.getByRole('button', { name: 'Auto-connector type mechanical' })
    const cadweldModeButton = screen.getByRole('button', { name: 'Auto-connector type cadweld' })
    expect(mechanicalModeButton.hasAttribute('disabled')).toBe(false)
    expect(cadweldModeButton.hasAttribute('disabled')).toBe(false)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))

    // Junction A: should create a mechanical connector.
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 260,
      pointerId: 905,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 260,
      pointerId: 905,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 140,
      pointerId: 906,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 380,
      pointerId: 906,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cable_to_cable_connection"] circle[stroke="#2e8b57"]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cadweld_connection"] circle[stroke="#2e8b57"]',
      ),
    ).toBeNull()

    // Switch mode; existing connector should remain mechanical.
    await fireEvent.click(cadweldModeButton)
    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cable_to_cable_connection"] circle[stroke="#2e8b57"]',
      ),
    ).not.toBeNull()

    // Junction B: should create a cadweld connector.
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 90,
      clientY: 430,
      pointerId: 907,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 290,
      clientY: 430,
      pointerId: 907,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 190,
      clientY: 350,
      pointerId: 908,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 190,
      clientY: 510,
      pointerId: 908,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cable_to_cable_connection"] circle[stroke="#2e8b57"]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector(
        'svg.overlay-layer g[data-symbol-type="cadweld_connection"] circle[stroke="#2e8b57"]',
      ),
    ).not.toBeNull()
  })

  it('deletes selected geometry and restores it with undo', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 100,
      clientY: 120,
      pointerId: 51,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 180,
      pointerId: 51,
      pointerType: 'mouse',
    })

    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).not.toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 160,
      clientY: 150,
      pointerId: 52,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 160,
      clientY: 150,
      pointerId: 52,
      pointerType: 'mouse',
    })

    await fireEvent.keyDown(window, { key: 'Delete' })
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).toBeNull()

    await fireEvent.click(historyButton(container, 0))
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"]')).not.toBeNull()
  })

  it('supports multi-select mode for grouped move and delete without handle editing', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 160,
      clientY: 220,
      pointerId: 520,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 220,
      pointerId: 520,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 160,
      clientY: 320,
      pointerId: 520,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 320,
      pointerId: 520,
      pointerType: 'mouse',
    })

    const line1Start = screenToOverlayDoc(container, { x: 160, y: 220 })
    const line1End = screenToOverlayDoc(container, { x: 280, y: 220 })
    const line2Start = screenToOverlayDoc(container, { x: 160, y: 320 })
    const line2End = screenToOverlayDoc(container, { x: 280, y: 320 })

    await fireEvent.click(screen.getByRole('button', { name: 'Multi' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 521,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 521,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 320,
      pointerId: 522,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 220,
      clientY: 320,
      pointerId: 522,
      pointerType: 'mouse',
    })

    expect(container.querySelectorAll('svg.overlay-layer line[stroke="#111827"]')).toHaveLength(2)
    expect(container.querySelector('circle[data-selection-handle]')).toBeNull()

    const dragStart = screenToOverlayDoc(container, { x: 220, y: 220 })
    const dragEnd = screenToOverlayDoc(container, { x: 260, y: 250 })
    const delta = {
      x: dragEnd.x - dragStart.x,
      y: dragEnd.y - dragStart.y,
    }

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 523,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      buttons: 1,
      clientX: 260,
      clientY: 250,
      pointerId: 523,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 260,
      clientY: 250,
      pointerId: 523,
      pointerType: 'mouse',
    })

    expect(
      hasDashedLineAt(container, {
        x1: line1Start.x + delta.x,
        y1: line1Start.y + delta.y,
        x2: line1End.x + delta.x,
        y2: line1End.y + delta.y,
      }),
    ).toBe(true)
    expect(
      hasDashedLineAt(container, {
        x1: line2Start.x + delta.x,
        y1: line2Start.y + delta.y,
        x2: line2End.x + delta.x,
        y2: line2End.y + delta.y,
      }),
    ).toBe(true)

    await fireEvent.keyDown(window, { key: 'Delete' })
    expect(container.querySelectorAll('svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]')).toHaveLength(0)
  })

  it('applies calibration from two points and updates scale display', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('20')

    await fireEvent.click(screen.getByRole('button', { name: 'Calibrate' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 100,
      clientY: 120,
      pointerId: 61,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 200,
      clientY: 120,
      pointerId: 61,
      pointerType: 'mouse',
    })

    expect(promptSpy).toHaveBeenCalled()
    expect(screen.getByText('Scale calibrated from two points.')).toBeTruthy()
    expect(screen.getByText(`Scale: 1" = 14.4'`)).toBeTruthy()
  })

  it('cancels calibration when prompt is dismissed', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)
    vi.spyOn(window, 'prompt').mockReturnValue(null)

    await fireEvent.click(screen.getByRole('button', { name: 'Calibrate' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 140,
      clientY: 130,
      pointerId: 62,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 130,
      pointerId: 62,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Calibration canceled.')).toBeTruthy()
    expect(screen.getByText('Scale: unset')).toBeTruthy()
  })

  it('rejects non-positive calibration distance input', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)
    vi.spyOn(window, 'prompt').mockReturnValue('0')

    await fireEvent.click(screen.getByRole('button', { name: 'Calibrate' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 160,
      clientY: 140,
      pointerId: 63,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 140,
      pointerId: 63,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Calibration distance must be a positive number.')).toBeTruthy()
    expect(screen.getByText('Scale: unset')).toBeTruthy()
  })

  it('supports right-click secondary action and suppresses stage context menu', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Mark' }))

    const contextEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
    })
    const dispatchResult = stage.dispatchEvent(contextEvent)
    expect(dispatchResult).toBe(false)
    expect(contextEvent.defaultPrevented).toBe(true)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 280,
      clientY: 220,
      pointerId: 64,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 2,
      clientX: 360,
      clientY: 260,
      pointerId: 64,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Inside corner added (no mark placed).')).toBeTruthy()
    expect(getToolbarStatus('Marks:').textContent).toContain('0')
  })

  it('selects an item with right-click and switches into select mode', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 240,
      clientY: 220,
      pointerId: 641,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 220,
      pointerId: 641,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 2,
      clientX: 320,
      clientY: 220,
      pointerId: 642,
      pointerType: 'mouse',
    })

    expect(container.querySelector('.toolbar-active-tool')?.textContent).toContain('Select')
    expect(container.querySelector('svg.overlay-layer line[stroke="#111827"]')).not.toBeNull()
  })

  it('supports touch long-press as secondary input for auto-spacing', async () => {
    vi.useFakeTimers()

    try {
      const { container } = render(() => <App />)
      const stage = requireDrawingStage(container)

      await applyManualScale('1', '18')

      await fireEvent.click(screen.getByRole('button', { name: 'Linear AT' }))

      await fireEvent.pointerDown(stage, {
        button: 0,
        clientX: 300,
        clientY: 240,
        pointerId: 71,
        pointerType: 'touch',
      })
      await fireEvent.pointerUp(stage, {
        button: 0,
        clientX: 300,
        clientY: 240,
        pointerId: 71,
        pointerType: 'touch',
      })

      await fireEvent.pointerDown(stage, {
        button: 0,
        clientX: 380,
        clientY: 280,
        pointerId: 72,
        pointerType: 'touch',
      })

      await vi.advanceTimersByTimeAsync(450)
      expect(screen.getByText('Inside corner added to linear auto-spacing trace.')).toBeTruthy()

      await fireEvent.pointerUp(stage, {
        button: 0,
        clientX: 380,
        clientY: 280,
        pointerId: 72,
        pointerType: 'touch',
      })

      expect(getToolbarStatus('Vertices:').textContent).toContain('2')
    } finally {
      vi.useRealTimers()
    }
  })

  it('applies arc auto-spacing to a selected arc target', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await applyManualScale('1', '36')

    await fireEvent.click(screen.getByRole('button', { name: 'Arc' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 180,
      clientY: 320,
      pointerId: 75,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 320,
      pointerId: 75,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 180,
      pointerId: 75,
      pointerType: 'mouse',
    })
    expect(screen.getByText('Arc added.')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Arc AT' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 180,
      pointerId: 76,
      pointerType: 'mouse',
    })
    expect(screen.getByText(/Arc selected\./)).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Apply Spacing' }))
    expect(screen.getByText(/Arc auto-spacing complete: placed \d+ air terminal/)).toBeTruthy()

    const placedAirTerminals = container.querySelectorAll(
      'svg.overlay-layer g[data-symbol-type="air_terminal"] circle[stroke="#2e8b57"]',
    )
    expect(placedAirTerminals.length).toBeGreaterThanOrEqual(2)
  })

  it('snaps line starts to marks and allows Shift bypass', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Mark' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 81,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 380,
      clientY: 220,
      pointerId: 81,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Mark placed. New span starts from this mark.')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    const snappedStart = screenToOverlayDoc(container, { x: 380, y: 220 })
    const unsnappedStart = screenToOverlayDoc(container, { x: 392, y: 232 })

    await fireEvent.pointerMove(stage, {
      clientX: 386,
      clientY: 226,
      pointerId: 82,
      pointerType: 'mouse',
    })

    const snapMarker = container.querySelector(
      'g[data-snap-marker="active"][data-snap-marker-kind="mark"] line[data-snap-shape="plus"]',
    )
    expect(snapMarker).not.toBeNull()
    if (snapMarker) {
      const x1 = parseNumericAttr(snapMarker, 'x1')
      const y1 = parseNumericAttr(snapMarker, 'y1')
      const x2 = parseNumericAttr(snapMarker, 'x2')
      const y2 = parseNumericAttr(snapMarker, 'y2')
      expect(Math.abs((x1 + x2) / 2 - snappedStart.x)).toBeLessThan(0.01)
      expect(Math.abs((y1 + y2) / 2 - snappedStart.y)).toBeLessThan(0.01)
    }

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 386,
      clientY: 226,
      pointerId: 82,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 470,
      clientY: 226,
      pointerId: 82,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      shiftKey: true,
      clientX: 392,
      clientY: 232,
      pointerId: 83,
      pointerType: 'mouse',
    })
    expect(container.querySelector('g[data-snap-marker="active"]')).toBeNull()
    await fireEvent.pointerDown(stage, {
      button: 0,
      shiftKey: true,
      clientX: 480,
      clientY: 232,
      pointerId: 83,
      pointerType: 'mouse',
    })

    expect(hasDashedLineStartAt(container, { x1: snappedStart.x, y1: snappedStart.y })).toBe(true)
    expect(hasDashedLineStartAt(container, { x1: unsnappedStart.x, y1: unsnappedStart.y })).toBe(true)
  })

  it('switches snap marker shape from endpoint to nearest and updates continuously along a line', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 240,
      clientY: 220,
      pointerId: 84,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 220,
      pointerId: 84,
      pointerType: 'mouse',
    })

    await fireEvent.pointerMove(stage, {
      clientX: 240,
      clientY: 220,
      pointerId: 85,
      pointerType: 'mouse',
    })

    const endpointMarker = container.querySelector(
      'g[data-snap-marker="active"][data-snap-marker-kind="endpoint"] rect[data-snap-shape="square"]',
    )
    expect(endpointMarker).not.toBeNull()
    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="nearest"] circle[data-snap-shape="point"]',
      ),
    ).toBeNull()

    await fireEvent.pointerMove(stage, {
      clientX: 300,
      clientY: 226,
      pointerId: 85,
      pointerType: 'mouse',
    })

    const firstNearest = container.querySelector(
      'g[data-snap-marker="active"][data-snap-marker-kind="nearest"] circle[data-snap-shape="point"]',
    )
    expect(firstNearest).not.toBeNull()
    const firstX = Number.parseFloat(firstNearest?.getAttribute('cx') ?? 'NaN')
    expect(Number.isFinite(firstX)).toBe(true)

    await fireEvent.pointerMove(stage, {
      clientX: 420,
      clientY: 226,
      pointerId: 85,
      pointerType: 'mouse',
    })

    const secondNearest = container.querySelector(
      'g[data-snap-marker="active"][data-snap-marker-kind="nearest"] circle[data-snap-shape="point"]',
    )
    expect(secondNearest).not.toBeNull()
    const secondX = Number.parseFloat(secondNearest?.getAttribute('cx') ?? 'NaN')
    expect(Number.isFinite(secondX)).toBe(true)
    expect(Math.abs(secondX - firstX)).toBeGreaterThan(40)
    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="endpoint"] rect[data-snap-shape="square"]',
      ),
    ).toBeNull()
  })

  it('prioritizes intersection snap over nearest when both are in range', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const angleSnapToggle = requireToggleByLabel(container, 'Angle Snap (15°)')
    await fireEvent.click(angleSnapToggle)
    expect(isToggleOn(angleSnapToggle)).toBe(false)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 260,
      pointerId: 808,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 260,
      pointerId: 808,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 390,
      clientY: 140,
      pointerId: 809,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 390,
      clientY: 380,
      pointerId: 809,
      pointerType: 'mouse',
    })

    const startDoc = screenToOverlayDoc(container, { x: 320, y: 320 })
    const intersectionDoc = screenToOverlayDoc(container, { x: 390, y: 260 })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 320,
      pointerId: 810,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      clientX: 396,
      clientY: 266,
      pointerId: 810,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="intersection"] line[data-snap-shape="x"]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="nearest"] circle[data-snap-shape="point"]',
      ),
    ).toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 396,
      clientY: 266,
      pointerId: 810,
      pointerType: 'mouse',
    })

    expect(
      hasDashedLineAt(container, {
        x1: startDoc.x,
        y1: startDoc.y,
        x2: intersectionDoc.x,
        y2: intersectionDoc.y,
      }, 0.35),
    ).toBe(true)
  })

  it('snaps line endpoint to a perpendicular projection when drawing from an anchored start', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 240,
      pointerId: 804,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 240,
      pointerId: 804,
      pointerType: 'mouse',
    })

    const startDoc = screenToOverlayDoc(container, { x: 460, y: 340 })
    const perpendicularEnd = screenToOverlayDoc(container, { x: 460, y: 240 })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 460,
      clientY: 340,
      pointerId: 805,
      pointerType: 'mouse',
    })

    await fireEvent.pointerMove(stage, {
      clientX: 460,
      clientY: 246,
      pointerId: 805,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="perpendicular"] line[data-snap-shape="perpendicular"]',
      ),
    ).not.toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 460,
      clientY: 246,
      pointerId: 805,
      pointerType: 'mouse',
    })

    expect(
      hasDashedLineAt(container, {
        x1: startDoc.x,
        y1: startDoc.y,
        x2: perpendicularEnd.x,
        y2: perpendicularEnd.y,
      }, 0.25),
    ).toBe(true)
  })

  it('prioritizes perpendicular snap over nearest when both are in range', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const angleSnapToggle = requireToggleByLabel(container, 'Angle Snap (15°)')
    await fireEvent.click(angleSnapToggle)
    expect(isToggleOn(angleSnapToggle)).toBe(false)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 240,
      pointerId: 811,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 240,
      pointerId: 811,
      pointerType: 'mouse',
    })

    const startDoc = screenToOverlayDoc(container, { x: 460, y: 340 })
    const perpendicularEnd = screenToOverlayDoc(container, { x: 460, y: 240 })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 460,
      clientY: 340,
      pointerId: 812,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      clientX: 466,
      clientY: 246,
      pointerId: 812,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="perpendicular"] line[data-snap-shape="perpendicular"]',
      ),
    ).not.toBeNull()
    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="nearest"] circle[data-snap-shape="point"]',
      ),
    ).toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 466,
      clientY: 246,
      pointerId: 812,
      pointerType: 'mouse',
    })

    expect(
      hasDashedLineAt(container, {
        x1: startDoc.x,
        y1: startDoc.y,
        x2: perpendicularEnd.x,
        y2: perpendicularEnd.y,
      }, 0.35),
    ).toBe(true)
  })

  it('snaps arrow head to a perpendicular projection when drawing from an anchored tail', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 240,
      pointerId: 806,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 240,
      pointerId: 806,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))

    const tailDoc = screenToOverlayDoc(container, { x: 460, y: 340 })
    const perpendicularHead = screenToOverlayDoc(container, { x: 460, y: 240 })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 460,
      clientY: 340,
      pointerId: 807,
      pointerType: 'mouse',
    })

    await fireEvent.pointerMove(stage, {
      clientX: 460,
      clientY: 246,
      pointerId: 807,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="perpendicular"] line[data-snap-shape="perpendicular"]',
      ),
    ).not.toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 460,
      clientY: 246,
      pointerId: 807,
      pointerType: 'mouse',
    })

    const arrow = firstPlacedArrow(container)
    expect(parseNumericAttr(arrow, 'x1')).toBeCloseTo(tailDoc.x, 3)
    expect(parseNumericAttr(arrow, 'y1')).toBeCloseTo(tailDoc.y, 3)
    expect(parseNumericAttr(arrow, 'x2')).toBeCloseTo(perpendicularHead.x, 3)
    expect(parseNumericAttr(arrow, 'y2')).toBeCloseTo(perpendicularHead.y, 3)
  })

  it('uses temporary hover highlight in select mode without showing snap markers', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 240,
      clientY: 220,
      pointerId: 851,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 220,
      pointerId: 851,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerMove(stage, {
      clientX: 300,
      clientY: 220,
      pointerId: 852,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector('svg.overlay-layer line[stroke="#0369a1"][stroke-dasharray]'),
    ).not.toBeNull()
    expect(container.querySelector('g[data-snap-marker="active"]')).toBeNull()

    await fireEvent.pointerMove(stage, {
      clientX: 1000,
      clientY: 700,
      pointerId: 852,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector('svg.overlay-layer line[stroke="#0369a1"][stroke-dasharray]'),
    ).toBeNull()
  })

  it('prefers mark hover/selection over overlapping line candidates in select mode', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 220,
      pointerId: 861,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 220,
      pointerId: 861,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Mark' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 862,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 380,
      clientY: 220,
      pointerId: 862,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Mark placed. New span starts from this mark.')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerMove(stage, {
      clientX: 380,
      clientY: 220,
      pointerId: 863,
      pointerType: 'mouse',
    })

    expect(container.querySelector('svg.overlay-layer circle[stroke="#0369a1"][stroke-dasharray]')).not.toBeNull()
    expect(
      container.querySelector('svg.overlay-layer line[stroke="#0369a1"][stroke-dasharray]'),
    ).toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 380,
      clientY: 220,
      pointerId: 864,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 380,
      clientY: 220,
      pointerId: 864,
      pointerType: 'mouse',
    })

    await fireEvent.keyDown(window, { key: 'Delete' })
    expect(container.querySelector('svg.overlay-layer line[stroke="#b91c1c"]')).toBeNull()
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]')).not.toBeNull()
  })

  it('selects curve handles at shared endpoints instead of falling back to line-handle mode', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 240,
      clientY: 280,
      pointerId: 871,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 280,
      pointerId: 871,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Curve' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 240,
      clientY: 280,
      pointerId: 872,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 380,
      clientY: 210,
      pointerId: 872,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 280,
      pointerId: 872,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 240,
      clientY: 280,
      pointerId: 873,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 240,
      clientY: 280,
      pointerId: 873,
      pointerType: 'mouse',
    })

    expect(container.querySelector('circle[data-selection-handle="curve-start"]')).not.toBeNull()
    expect(container.querySelector('circle[data-selection-handle="curve-through"]')).not.toBeNull()
    expect(container.querySelector('circle[data-selection-handle="curve-end"]')).not.toBeNull()
    expect(container.querySelector('circle[data-selection-handle="line-start"]')).toBeNull()
    expect(container.querySelector('circle[data-selection-handle="line-end"]')).toBeNull()
  })

  it('toggles in-canvas selection debug overlay text', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    expect(container.querySelector('text[data-selection-debug-text="active"]')).toBeNull()

    const debugToggle = screen.getByLabelText('Debug') as HTMLInputElement
    await fireEvent.click(debugToggle)
    expect(debugToggle.checked).toBe(true)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 220,
      pointerId: 881,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 220,
      pointerId: 881,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 310,
      clientY: 220,
      pointerId: 882,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 310,
      clientY: 220,
      pointerId: 882,
      pointerType: 'mouse',
    })

    const debugText = container.querySelector(
      'text[data-selection-debug-text="active"]',
    ) as SVGTextElement | null
    expect(debugText).not.toBeNull()
    expect(debugText?.textContent).toContain('selected={line:')

    await fireEvent.click(debugToggle)
    expect(debugToggle.checked).toBe(false)
    expect(container.querySelector('text[data-selection-debug-text="active"]')).toBeNull()
  })

  it('shows selection highlight immediately on click without requiring drag', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 220,
      pointerId: 86,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 360,
      clientY: 220,
      pointerId: 86,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 87,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 87,
      pointerType: 'mouse',
    })

    expect(container.querySelector('svg.overlay-layer line[stroke="#111827"][stroke-dasharray]')).not.toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 1000,
      clientY: 700,
      pointerId: 88,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 1000,
      clientY: 700,
      pointerId: 88,
      pointerType: 'mouse',
    })

    expect(container.querySelector('svg.overlay-layer line[stroke="#111827"][stroke-dasharray]')).toBeNull()
  })

  it('prefers symbol selection over overlapping line candidates', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 260,
      clientY: 220,
      pointerId: 91,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 220,
      pointerId: 91,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'AT' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 91,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector('svg.overlay-layer g[data-symbol-type="air_terminal"] circle[stroke="#2e8b57"]'),
    ).not.toBeNull()
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]')).not.toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 92,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 220,
      pointerId: 92,
      pointerType: 'mouse',
    })

    await fireEvent.keyDown(window, { key: 'Delete' })

    expect(
      container.querySelector('svg.overlay-layer g[data-symbol-type="air_terminal"] circle[stroke="#2e8b57"]'),
    ).toBeNull()
    expect(container.querySelector('svg.overlay-layer line[stroke="#2e8b57"][stroke-dasharray]')).not.toBeNull()

    await fireEvent.click(historyButton(container, 0))
    expect(
      container.querySelector('svg.overlay-layer g[data-symbol-type="air_terminal"] circle[stroke="#2e8b57"]'),
    ).not.toBeNull()
  })

  it('treats drag move as one undoable transaction', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 100,
      clientY: 120,
      pointerId: 101,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 180,
      pointerId: 101,
      pointerType: 'mouse',
    })

    const initialLine = firstDashedLine(container)
    const initialX1 = parseNumericAttr(initialLine, 'x1')
    const initialY1 = parseNumericAttr(initialLine, 'y1')
    const initialX2 = parseNumericAttr(initialLine, 'x2')
    const initialY2 = parseNumericAttr(initialLine, 'y2')

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 160,
      clientY: 150,
      pointerId: 102,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 210,
      clientY: 200,
      pointerId: 102,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 210,
      clientY: 200,
      pointerId: 102,
      pointerType: 'mouse',
    })

    let movedLine = firstDashedLine(container)
    const movedX1 = parseNumericAttr(movedLine, 'x1')
    const movedY1 = parseNumericAttr(movedLine, 'y1')
    const movedX2 = parseNumericAttr(movedLine, 'x2')
    const movedY2 = parseNumericAttr(movedLine, 'y2')

    expect(movedX1).not.toBeCloseTo(initialX1, 3)
    expect(movedY1).not.toBeCloseTo(initialY1, 3)
    expect(movedX2).not.toBeCloseTo(initialX2, 3)
    expect(movedY2).not.toBeCloseTo(initialY2, 3)

    await fireEvent.click(historyButton(container, 0))

    const restoredLine = firstDashedLine(container)
    expect(parseNumericAttr(restoredLine, 'x1')).toBeCloseTo(initialX1, 6)
    expect(parseNumericAttr(restoredLine, 'y1')).toBeCloseTo(initialY1, 6)
    expect(parseNumericAttr(restoredLine, 'x2')).toBeCloseTo(initialX2, 6)
    expect(parseNumericAttr(restoredLine, 'y2')).toBeCloseTo(initialY2, 6)

    await fireEvent.click(historyButton(container, 1))

    const redoneLine = firstDashedLine(container)
    expect(parseNumericAttr(redoneLine, 'x1')).toBeCloseTo(movedX1, 6)
    expect(parseNumericAttr(redoneLine, 'y1')).toBeCloseTo(movedY1, 6)
    expect(parseNumericAttr(redoneLine, 'x2')).toBeCloseTo(movedX2, 6)
    expect(parseNumericAttr(redoneLine, 'y2')).toBeCloseTo(movedY2, 6)
  })

  it('moves a selected line endpoint via handle drag without moving the opposite endpoint', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 131,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 220,
      pointerId: 131,
      pointerType: 'mouse',
    })

    const originalStart = screenToOverlayDoc(container, { x: 220, y: 220 })
    const originalEnd = screenToOverlayDoc(container, { x: 420, y: 220 })
    const movedStart = screenToOverlayDoc(container, { x: 220, y: 320 })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 132,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 132,
      pointerType: 'mouse',
    })

    expect(container.querySelector('circle[data-selection-handle="line-start"]')).not.toBeNull()
    expect(container.querySelector('circle[data-selection-handle="line-end"]')).not.toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: 220,
      clientY: 220,
      pointerId: 133,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: 220,
      clientY: 320,
      pointerId: 133,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: 220,
      clientY: 320,
      pointerId: 133,
      pointerType: 'mouse',
    })

    const movedLine = firstDashedLine(container)
    expect(parseNumericAttr(movedLine, 'x1')).toBeCloseTo(movedStart.x, 6)
    expect(parseNumericAttr(movedLine, 'y1')).toBeCloseTo(movedStart.y, 6)
    expect(parseNumericAttr(movedLine, 'x2')).toBeCloseTo(originalEnd.x, 6)
    expect(parseNumericAttr(movedLine, 'y2')).toBeCloseTo(originalEnd.y, 6)

    await fireEvent.click(historyButton(container, 0))
    const restoredLine = firstDashedLine(container)
    expect(parseNumericAttr(restoredLine, 'x1')).toBeCloseTo(originalStart.x, 6)
    expect(parseNumericAttr(restoredLine, 'y1')).toBeCloseTo(originalStart.y, 6)
    expect(parseNumericAttr(restoredLine, 'x2')).toBeCloseTo(originalEnd.x, 6)
    expect(parseNumericAttr(restoredLine, 'y2')).toBeCloseTo(originalEnd.y, 6)
  })

  it('keeps line handles aligned after moving a selected line and allows immediate handle edit without reselect', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 611,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 220,
      pointerId: 611,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 612,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 612,
      pointerType: 'mouse',
    })

    const originalStart = screenToOverlayDoc(container, { x: 220, y: 220 })
    const originalEnd = screenToOverlayDoc(container, { x: 420, y: 220 })
    const moveDelta = { x: 40, y: 40 }

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 613,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 360,
      clientY: 260,
      pointerId: 613,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 360,
      clientY: 260,
      pointerId: 613,
      pointerType: 'mouse',
    })

    const movedLineAfterDrag = firstDashedLine(container)
    expect(parseNumericAttr(movedLineAfterDrag, 'x1')).toBeCloseTo(originalStart.x + moveDelta.x, 6)
    expect(parseNumericAttr(movedLineAfterDrag, 'y1')).toBeCloseTo(originalStart.y + moveDelta.y, 6)
    expect(parseNumericAttr(movedLineAfterDrag, 'x2')).toBeCloseTo(originalEnd.x + moveDelta.x, 6)
    expect(parseNumericAttr(movedLineAfterDrag, 'y2')).toBeCloseTo(originalEnd.y + moveDelta.y, 6)

    const movedStartHandle = container.querySelector(
      'circle[data-selection-handle="line-start"]',
    )
    const movedEndHandle = container.querySelector(
      'circle[data-selection-handle="line-end"]',
    )
    expect(container.querySelectorAll('circle[data-selection-handle="line-start"]').length).toBe(1)
    expect(container.querySelectorAll('circle[data-selection-handle="line-end"]').length).toBe(1)
    expect(movedStartHandle).not.toBeNull()
    expect(movedEndHandle).not.toBeNull()
    if (!movedStartHandle || !movedEndHandle) {
      return
    }

    const movedStartDoc = {
      x: parseNumericAttr(movedStartHandle, 'cx'),
      y: parseNumericAttr(movedStartHandle, 'cy'),
    }
    const movedEndDoc = {
      x: parseNumericAttr(movedEndHandle, 'cx'),
      y: parseNumericAttr(movedEndHandle, 'cy'),
    }

    expect(movedStartDoc.x).toBeCloseTo(originalStart.x + moveDelta.x, 6)
    expect(movedStartDoc.y).toBeCloseTo(originalStart.y + moveDelta.y, 6)
    expect(movedEndDoc.x).toBeCloseTo(originalEnd.x + moveDelta.x, 6)
    expect(movedEndDoc.y).toBeCloseTo(originalEnd.y + moveDelta.y, 6)

    const movedStartScreen = overlayDocToScreen(container, movedStartDoc)
    const editedStartScreen = {
      x: movedStartScreen.x,
      y: movedStartScreen.y + 80,
    }

    await fireEvent.pointerDown(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: movedStartScreen.x,
      clientY: movedStartScreen.y,
      pointerId: 614,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: editedStartScreen.x,
      clientY: editedStartScreen.y,
      pointerId: 614,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: editedStartScreen.x,
      clientY: editedStartScreen.y,
      pointerId: 614,
      pointerType: 'mouse',
    })

    const editedLine = firstDashedLine(container)
    const editedStartDoc = screenToOverlayDoc(container, editedStartScreen)

    expect(parseNumericAttr(editedLine, 'x1')).toBeCloseTo(editedStartDoc.x, 6)
    expect(parseNumericAttr(editedLine, 'y1')).toBeCloseTo(editedStartDoc.y, 6)
    expect(parseNumericAttr(editedLine, 'x2')).toBeCloseTo(movedEndDoc.x, 6)
    expect(parseNumericAttr(editedLine, 'y2')).toBeCloseTo(movedEndDoc.y, 6)
  })

  it('shows snap marker and snaps endpoint while editing a selected line handle', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 200,
      clientY: 240,
      pointerId: 171,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 171,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 240,
      pointerId: 172,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 240,
      pointerId: 172,
      pointerType: 'mouse',
    })

    const line2Start = screenToOverlayDoc(container, { x: 420, y: 240 })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 250,
      clientY: 240,
      pointerId: 173,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 250,
      clientY: 240,
      pointerId: 173,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 174,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 414,
      clientY: 246,
      pointerId: 174,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="endpoint"] rect[data-snap-shape="square"]',
      ),
    ).not.toBeNull()

    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 414,
      clientY: 246,
      pointerId: 174,
      pointerType: 'mouse',
    })

    const movedLine = firstDashedLine(container)
    expect(parseNumericAttr(movedLine, 'x2')).toBeCloseTo(line2Start.x, 3)
    expect(parseNumericAttr(movedLine, 'y2')).toBeCloseTo(line2Start.y, 3)
  })

  it('does not show self-snap marker while dragging a selected line endpoint with no other targets', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 240,
      pointerId: 191,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 380,
      clientY: 240,
      pointerId: 191,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 192,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 192,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 380,
      clientY: 240,
      pointerId: 193,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 193,
      pointerType: 'mouse',
    })

    expect(container.querySelector('g[data-snap-marker="active"]')).toBeNull()
  })

  it('applies 15-degree angle snap while dragging a selected line endpoint when enabled', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 240,
      pointerId: 194,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 194,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 195,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 195,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 196,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 360,
      clientY: 290,
      pointerId: 196,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 360,
      clientY: 290,
      pointerId: 196,
      pointerType: 'mouse',
    })

    const movedLine = firstDashedLine(container)
    const angle = lineAngleDegrees(movedLine)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeLessThan(0.2)
  })

  it('does not apply 15-degree angle snap while dragging a selected line endpoint when disabled', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const angleSnapToggle = requireToggleByLabel(container, 'Angle Snap (15°)')
    await fireEvent.click(angleSnapToggle)
    expect(isToggleOn(angleSnapToggle)).toBe(false)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 240,
      pointerId: 197,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 197,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 198,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 198,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 199,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 360,
      clientY: 290,
      pointerId: 199,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 360,
      clientY: 290,
      pointerId: 199,
      pointerType: 'mouse',
    })

    const movedLine = firstDashedLine(container)
    const angle = lineAngleDegrees(movedLine)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeGreaterThan(1.5)
  })

  it('does not apply 15-degree angle snap while dragging a selected line endpoint with Ctrl held', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 240,
      pointerId: 1991,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 1991,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 1992,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 1992,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 1993,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      ctrlKey: true,
      clientX: 360,
      clientY: 290,
      pointerId: 1993,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      ctrlKey: true,
      clientX: 360,
      clientY: 290,
      pointerId: 1993,
      pointerType: 'mouse',
    })

    const movedLine = firstDashedLine(container)
    const angle = lineAngleDegrees(movedLine)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeGreaterThan(1.5)
  })

  it('moves a selected arrow endpoint via handle drag without moving the opposite endpoint', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 220,
      pointerId: 301,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 220,
      pointerId: 301,
      pointerType: 'mouse',
    })

    const originalTail = screenToOverlayDoc(container, { x: 220, y: 220 })
    const originalHead = screenToOverlayDoc(container, { x: 420, y: 220 })
    const movedTail = screenToOverlayDoc(container, { x: 220, y: 320 })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 302,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 320,
      clientY: 220,
      pointerId: 302,
      pointerType: 'mouse',
    })

    expect(container.querySelector('circle[data-selection-handle="arrow-tail"]')).not.toBeNull()
    expect(container.querySelector('circle[data-selection-handle="arrow-head"]')).not.toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: 220,
      clientY: 220,
      pointerId: 303,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: 220,
      clientY: 320,
      pointerId: 303,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      shiftKey: true,
      ctrlKey: true,
      clientX: 220,
      clientY: 320,
      pointerId: 303,
      pointerType: 'mouse',
    })

    const movedArrow = firstPlacedArrow(container)
    expect(parseNumericAttr(movedArrow, 'x1')).toBeCloseTo(movedTail.x, 6)
    expect(parseNumericAttr(movedArrow, 'y1')).toBeCloseTo(movedTail.y, 6)
    expect(parseNumericAttr(movedArrow, 'x2')).toBeCloseTo(originalHead.x, 6)
    expect(parseNumericAttr(movedArrow, 'y2')).toBeCloseTo(originalHead.y, 6)

    await fireEvent.click(historyButton(container, 0))
    const restoredArrow = firstPlacedArrow(container)
    expect(parseNumericAttr(restoredArrow, 'x1')).toBeCloseTo(originalTail.x, 6)
    expect(parseNumericAttr(restoredArrow, 'y1')).toBeCloseTo(originalTail.y, 6)
    expect(parseNumericAttr(restoredArrow, 'x2')).toBeCloseTo(originalHead.x, 6)
    expect(parseNumericAttr(restoredArrow, 'y2')).toBeCloseTo(originalHead.y, 6)
  })

  it('shows snap marker and snaps endpoint while editing a selected arrow handle', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 200,
      clientY: 240,
      pointerId: 311,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 311,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 420,
      clientY: 240,
      pointerId: 312,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 240,
      pointerId: 312,
      pointerType: 'mouse',
    })

    const arrow2Tail = screenToOverlayDoc(container, { x: 420, y: 240 })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 250,
      clientY: 240,
      pointerId: 313,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 250,
      clientY: 240,
      pointerId: 313,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 314,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 414,
      clientY: 246,
      pointerId: 314,
      pointerType: 'mouse',
    })

    expect(
      container.querySelector(
        'g[data-snap-marker="active"][data-snap-marker-kind="endpoint"] rect[data-snap-shape="square"]',
      ),
    ).not.toBeNull()

    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 414,
      clientY: 246,
      pointerId: 314,
      pointerType: 'mouse',
    })

    const movedArrow = firstPlacedArrow(container)
    expect(parseNumericAttr(movedArrow, 'x2')).toBeCloseTo(arrow2Tail.x, 3)
    expect(parseNumericAttr(movedArrow, 'y2')).toBeCloseTo(arrow2Tail.y, 3)
  })

  it('does not show self-snap marker while dragging a selected arrow endpoint with no other targets', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 240,
      pointerId: 321,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 380,
      clientY: 240,
      pointerId: 321,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 322,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 322,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 380,
      clientY: 240,
      pointerId: 323,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 323,
      pointerType: 'mouse',
    })

    expect(container.querySelector('g[data-snap-marker="active"]')).toBeNull()
  })

  it('applies 15-degree angle snap while dragging a selected arrow endpoint when enabled', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 240,
      pointerId: 324,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 324,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 325,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 325,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 326,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 360,
      clientY: 290,
      pointerId: 326,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 360,
      clientY: 290,
      pointerId: 326,
      pointerType: 'mouse',
    })

    const movedArrow = firstPlacedArrow(container)
    const angle = lineAngleDegrees(movedArrow)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeLessThan(0.2)
  })

  it('does not apply 15-degree angle snap while dragging a selected arrow endpoint when disabled', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const angleSnapToggle = requireToggleByLabel(container, 'Angle Snap (15°)')
    await fireEvent.click(angleSnapToggle)
    expect(isToggleOn(angleSnapToggle)).toBe(false)

    await fireEvent.click(screen.getByRole('button', { name: 'Arrow' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 220,
      clientY: 240,
      pointerId: 327,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 327,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 328,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 328,
      pointerType: 'mouse',
    })

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 340,
      clientY: 240,
      pointerId: 329,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 360,
      clientY: 290,
      pointerId: 329,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 360,
      clientY: 290,
      pointerId: 329,
      pointerType: 'mouse',
    })

    const movedArrow = firstPlacedArrow(container)
    const angle = lineAngleDegrees(movedArrow)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeGreaterThan(1.5)
  })

  it('moves a curve through-point via handle drag and preserves start/end points', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const point1 = { x: 240, y: 360 }
    const point2 = { x: 340, y: 240 }
    const point3 = { x: 460, y: 360 }
    const movedThrough = { x: 340, y: 200 }

    await fireEvent.click(screen.getByRole('button', { name: 'Curve' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: point1.x,
      clientY: point1.y,
      pointerId: 141,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: point2.x,
      clientY: point2.y,
      pointerId: 141,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: point3.x,
      clientY: point3.y,
      pointerId: 141,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: point2.x,
      clientY: point2.y,
      pointerId: 142,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: point2.x,
      clientY: point2.y,
      pointerId: 142,
      pointerType: 'mouse',
    })

    expect(container.querySelector('circle[data-selection-handle="curve-start"]')).not.toBeNull()
    expect(container.querySelector('circle[data-selection-handle="curve-through"]')).not.toBeNull()
    expect(container.querySelector('circle[data-selection-handle="curve-end"]')).not.toBeNull()

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: point2.x,
      clientY: point2.y,
      pointerId: 143,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: movedThrough.x,
      clientY: movedThrough.y,
      pointerId: 143,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: movedThrough.x,
      clientY: movedThrough.y,
      pointerId: 143,
      pointerType: 'mouse',
    })

    const movedPath = container.querySelector(
      'svg.overlay-layer path[stroke="#2e8b57"]',
    ) as SVGPathElement | null
    expect(movedPath).not.toBeNull()
    if (!movedPath) {
      return
    }

    const movedD = movedPath.getAttribute('d')
    expect(movedD).not.toBeNull()
    if (!movedD) {
      return
    }

    const quadratic = parseQuadraticPath(movedD)
    const point1Doc = screenToOverlayDoc(container, point1)
    const point3Doc = screenToOverlayDoc(container, point3)
    const movedThroughDoc = screenToOverlayDoc(container, movedThrough)

    expect(quadratic.start.x).toBeCloseTo(point1Doc.x, 6)
    expect(quadratic.start.y).toBeCloseTo(point1Doc.y, 6)
    expect(quadratic.end.x).toBeCloseTo(point3Doc.x, 6)
    expect(quadratic.end.y).toBeCloseTo(point3Doc.y, 6)

    const throughDistance = distanceToQuadratic(
      movedThroughDoc,
      quadratic.start,
      quadratic.control,
      quadratic.end,
      128,
    )
    expect(throughDistance).toBeLessThan(0.02)
  })

  it('rotates a selected directional symbol via direction handle drag', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await selectMaterial('Grounding')
    await fireEvent.click(screen.getByRole('button', { name: 'Ground Rod' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 151,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 600,
      clientY: 320,
      pointerId: 151,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 152,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 152,
      pointerType: 'mouse',
    })

    const directionHandle = container.querySelector(
      'circle[data-selection-handle="symbol-direction"]',
    )
    expect(directionHandle).not.toBeNull()
    if (!directionHandle) {
      return
    }

    const handleDoc = {
      x: parseNumericAttr(directionHandle, 'cx'),
      y: parseNumericAttr(directionHandle, 'cy'),
    }
    const handleScreen = overlayDocToScreen(container, handleDoc)

    const initialRotation = firstSymbolRotationDeg(container)
    expect(initialRotation).toBeCloseTo(-90, 1)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: handleScreen.x,
      clientY: handleScreen.y,
      pointerId: 153,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 520,
      clientY: 240,
      pointerId: 153,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 520,
      clientY: 240,
      pointerId: 153,
      pointerType: 'mouse',
    })

    const rotated = firstSymbolRotationDeg(container)
    expect(rotated).toBeGreaterThan(170)
    expect(rotated).toBeLessThan(190)
  })

  it('applies 15-degree angle snap to directional symbol preview while choosing direction', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await selectMaterial('Grounding')
    await fireEvent.click(screen.getByRole('button', { name: 'Ground Rod' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 161,
      pointerType: 'mouse',
    })

    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 560,
      clientY: 255,
      pointerId: 161,
      pointerType: 'mouse',
    })

    const preview = container.querySelector(
      'svg.overlay-layer line[stroke="#1f2937"][stroke-dasharray="4 4"][marker-end="url(#preview-arrow)"]',
    )
    expect(preview).not.toBeNull()
    if (!preview) {
      return
    }

    const angle = lineAngleDegrees(preview)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeLessThan(0.2)
  })

  it('does not apply 15-degree angle snap to directional symbol preview while Ctrl is held', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await selectMaterial('Grounding')
    await fireEvent.click(screen.getByRole('button', { name: 'Ground Rod' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 1611,
      pointerType: 'mouse',
    })

    await fireEvent.pointerMove(stage, {
      button: 0,
      ctrlKey: true,
      clientX: 560,
      clientY: 255,
      pointerId: 1611,
      pointerType: 'mouse',
    })

    const preview = container.querySelector(
      'svg.overlay-layer line[stroke="#1f2937"][stroke-dasharray="4 4"][marker-end="url(#preview-arrow)"]',
    )
    expect(preview).not.toBeNull()
    if (!preview) {
      return
    }

    const angle = lineAngleDegrees(preview)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeGreaterThan(1.5)
  })

  it('applies 15-degree angle snap while dragging a selected directional symbol handle when enabled', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await selectMaterial('Grounding')
    await fireEvent.click(screen.getByRole('button', { name: 'Ground Rod' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 155,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 600,
      clientY: 320,
      pointerId: 155,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 156,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 156,
      pointerType: 'mouse',
    })

    const directionHandle = container.querySelector(
      'circle[data-selection-handle="symbol-direction"]',
    )
    expect(directionHandle).not.toBeNull()
    if (!directionHandle) {
      return
    }

    const handleDoc = {
      x: parseNumericAttr(directionHandle, 'cx'),
      y: parseNumericAttr(directionHandle, 'cy'),
    }
    const handleScreen = overlayDocToScreen(container, handleDoc)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: handleScreen.x,
      clientY: handleScreen.y,
      pointerId: 157,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 560,
      clientY: 255,
      pointerId: 157,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 560,
      clientY: 255,
      pointerId: 157,
      pointerType: 'mouse',
    })

    const movedHandle = container.querySelector(
      'circle[data-selection-handle="symbol-direction"]',
    )
    expect(movedHandle).not.toBeNull()
    if (!movedHandle) {
      return
    }

    const baseDoc = screenToOverlayDoc(container, { x: 520, y: 320 })
    const movedHandleDoc = {
      x: parseNumericAttr(movedHandle, 'cx'),
      y: parseNumericAttr(movedHandle, 'cy'),
    }
    const angle = pointAngleDegrees(baseDoc, movedHandleDoc)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeLessThan(0.2)
  })

  it('does not apply 15-degree angle snap while dragging a selected directional symbol handle when disabled', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const angleSnapToggle = requireToggleByLabel(container, 'Angle Snap (15°)')
    await fireEvent.click(angleSnapToggle)
    expect(isToggleOn(angleSnapToggle)).toBe(false)

    await selectMaterial('Grounding')
    await fireEvent.click(screen.getByRole('button', { name: 'Ground Rod' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 158,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 600,
      clientY: 320,
      pointerId: 158,
      pointerType: 'mouse',
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 159,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 159,
      pointerType: 'mouse',
    })

    const directionHandle = container.querySelector(
      'circle[data-selection-handle="symbol-direction"]',
    )
    expect(directionHandle).not.toBeNull()
    if (!directionHandle) {
      return
    }

    const handleDoc = {
      x: parseNumericAttr(directionHandle, 'cx'),
      y: parseNumericAttr(directionHandle, 'cy'),
    }
    const handleScreen = overlayDocToScreen(container, handleDoc)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: handleScreen.x,
      clientY: handleScreen.y,
      pointerId: 160,
      pointerType: 'mouse',
    })
    await fireEvent.pointerMove(stage, {
      button: 0,
      clientX: 560,
      clientY: 255,
      pointerId: 160,
      pointerType: 'mouse',
    })
    await fireEvent.pointerUp(stage, {
      button: 0,
      clientX: 560,
      clientY: 255,
      pointerId: 160,
      pointerType: 'mouse',
    })

    const movedHandle = container.querySelector(
      'circle[data-selection-handle="symbol-direction"]',
    )
    expect(movedHandle).not.toBeNull()
    if (!movedHandle) {
      return
    }

    const baseDoc = screenToOverlayDoc(container, { x: 520, y: 320 })
    const movedHandleDoc = {
      x: parseNumericAttr(movedHandle, 'cx'),
      y: parseNumericAttr(movedHandle, 'cy'),
    }
    const angle = pointAngleDegrees(baseDoc, movedHandleDoc)
    const nearest15 = Math.round(angle / 15) * 15
    expect(Math.abs(angle - nearest15)).toBeGreaterThan(1.5)
  })

  it('orients a ground rod to the left when the direction click is left of the basepoint', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await selectMaterial('Grounding')
    await fireEvent.click(screen.getByRole('button', { name: 'Ground Rod' }))

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 154,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 440,
      clientY: 320,
      pointerId: 154,
      pointerType: 'mouse',
    })

    const rotation = firstSymbolRotationDeg(container)
    expect(rotation).toBeGreaterThan(80)
    expect(rotation).toBeLessThan(100)
  })

  it('uses the properties default vertical feet for new downleads without creating history until placement', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)
    const quickUndo = screen.getByRole('button', { name: 'Quick undo' }) as HTMLButtonElement

    expect(quickUndo.disabled).toBe(true)

    await fireEvent.click(screen.getByRole('button', { name: 'Conduit to Ground' }))
    const defaultInput = screen.getByLabelText('Default downlead vertical feet') as HTMLInputElement
    await fireEvent.input(defaultInput, { target: { value: '37' } })

    expect(defaultInput.value).toBe('37')
    expect(quickUndo.disabled).toBe(true)

    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 181,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 600,
      clientY: 320,
      pointerId: 181,
      pointerType: 'mouse',
    })

    expect(screen.getByText('Directional symbol placed.')).toBeTruthy()
    expect(verticalFootageLabels(container)).toContain('37')
    expect(quickUndo.disabled).toBe(false)
  })

  it('edits selected downlead vertical feet from properties and commits on blur with undo support', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await fireEvent.click(screen.getByRole('button', { name: 'Conduit to Ground' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 182,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 600,
      clientY: 320,
      pointerId: 182,
      pointerType: 'mouse',
    })

    expect(verticalFootageLabels(container)).toContain('0')

    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 520,
      clientY: 320,
      pointerId: 183,
      pointerType: 'mouse',
    })

    const selectedInput = screen.getByLabelText('Selected downlead vertical feet') as HTMLInputElement
    expect(selectedInput.value).toBe('0')

    await fireEvent.input(selectedInput, { target: { value: '58' } })
    expect(verticalFootageLabels(container)).toContain('0')
    expect(verticalFootageLabels(container)).not.toContain('58')

    await fireEvent.blur(selectedInput)

    expect(screen.getByText('Vertical distance updated.')).toBeTruthy()
    expect(verticalFootageLabels(container)).toContain('58')

    await fireEvent.doubleClick(stage, {
      clientX: 520,
      clientY: 320,
    })
    expect(screen.queryByText('Vertical Feet')).toBeNull()

    await fireEvent.click(historyButton(container, 0))
    expect(verticalFootageLabels(container)).toContain('0')
  })

  it('shows measure path distance in scaled real units', async () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    await applyManualScale('1', '36')

    await fireEvent.click(screen.getByRole('button', { name: 'Measure' }))
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 100,
      clientY: 240,
      pointerId: 111,
      pointerType: 'mouse',
    })
    await fireEvent.pointerDown(stage, {
      button: 0,
      clientX: 300,
      clientY: 240,
      pointerId: 111,
      pointerType: 'mouse',
    })

    expect(getToolbarStatus('Path:').textContent).toContain(`100' 0"`)
  })
})
