// @vitest-environment jsdom

import { vi } from 'vitest'

let latestPdfRendererOptions: Record<string, unknown> | null = null

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  PDFWorker: class { destroy = vi.fn() },
  getDocument: vi.fn(() => ({
    promise: Promise.reject(new Error('pdfjs not used in pdf background tests')),
  })),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

vi.mock('./hooks/usePdfCanvasRenderer', () => ({
  usePdfCanvasRenderer: vi.fn((options) => {
    latestPdfRendererOptions = options as Record<string, unknown>
    return {
      bindPdfCanvasRef: vi.fn(),
    }
  }),
}))

import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

const fakeCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  scale: vi.fn(),
  drawImage: vi.fn(),
  setLineDash: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  closePath: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  font: '',
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  textAlign: 'left' as CanvasTextAlign,
}

beforeAll(() => {
  if (typeof globalThis.PointerEvent === 'undefined') {
    vi.stubGlobal('PointerEvent', MouseEvent)
  }
})

beforeEach(() => {
  latestPdfRendererOptions = null

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

  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function requireDrawingStage(container: HTMLElement): HTMLDivElement {
  const stage = container.querySelector('.drawing-stage') as HTMLDivElement | null
  expect(stage).not.toBeNull()
  if (!stage) {
    throw new Error('drawing stage not found')
  }
  return stage
}

describe('App pdf background interaction wiring', () => {
  it('marks background rendering active during wheel zoom and settles afterward', () => {
    const { container } = render(() => <App />)
    const stage = requireDrawingStage(container)

    const renderScale = latestPdfRendererOptions?.renderScale as (() => number) | undefined
    const interactionActive = latestPdfRendererOptions?.interactionActive as (() => boolean) | undefined

    expect(renderScale).toBeTypeOf('function')
    expect(interactionActive).toBeTypeOf('function')
    if (!renderScale || !interactionActive) {
      throw new Error('pdf renderer accessors were not provided')
    }

    const beforeZoom = renderScale()
    fireEvent.wheel(stage, { deltaY: -100, clientX: 400, clientY: 300 })

    expect(interactionActive()).toBe(true)
    expect(renderScale()).toBeGreaterThan(beforeZoom)

    vi.advanceTimersByTime(150)
    expect(interactionActive()).toBe(false)
  })
})
