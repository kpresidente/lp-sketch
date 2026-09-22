import { cleanup } from '@solidjs/testing-library'
import { afterEach, beforeAll, beforeEach, vi } from 'vitest'

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
  measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
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

/**
 * The jsdom environment a shell test needs to render `App`: pointer capture
 * stubs, a fake canvas context, a fixed stage rectangle, synchronous animation
 * frames, and a cleared local storage around every test. Call it once at the
 * top level of a test file; the file keeps its own `vi.mock('pdfjs-dist')`.
 */
export function installAppTestEnvironment(): void {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame

  beforeAll(() => {
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
    window.localStorage.clear()
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
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(16)
      return 1
    }) as typeof globalThis.requestAnimationFrame
    globalThis.cancelAnimationFrame = ((_: number) => undefined) as typeof globalThis.cancelAnimationFrame
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    globalThis.requestAnimationFrame = originalRequestAnimationFrame
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame
    window.localStorage.clear()
  })
}
