// @vitest-environment jsdom

import { vi } from 'vitest'

const {
  getDocumentMock,
  exportProjectImageMock,
  exportProjectPdfMock,
  downloadTextFileMock,
  sha256HexMock,
  arrayBufferToBase64Mock,
  migrateProjectForLoadMock,
  validateProjectMock,
} = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
  exportProjectImageMock: vi.fn(),
  exportProjectPdfMock: vi.fn(),
  downloadTextFileMock: vi.fn(),
  sha256HexMock: vi.fn(),
  arrayBufferToBase64Mock: vi.fn(),
  migrateProjectForLoadMock: vi.fn(),
  validateProjectMock: vi.fn(),
}))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: getDocumentMock,
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

vi.mock('./lib/export', () => ({
  exportProjectImage: exportProjectImageMock,
  exportProjectPdf: exportProjectPdfMock,
}))

vi.mock('./lib/files', async () => {
  const actual = await vi.importActual<typeof import('./lib/files')>('./lib/files')
  return {
    ...actual,
    downloadTextFile: downloadTextFileMock,
    sha256Hex: sha256HexMock,
    arrayBufferToBase64: arrayBufferToBase64Mock,
  }
})

vi.mock('./model/migration', async () => {
  const actual = await vi.importActual<typeof import('./model/migration')>('./model/migration')
  return {
    ...actual,
    migrateProjectForLoad: migrateProjectForLoadMock,
  }
})

vi.mock('./model/validation', async () => {
  const actual = await vi.importActual<typeof import('./model/validation')>('./model/validation')
  return {
    ...actual,
    validateProject: validateProjectMock,
  }
})

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_PDF_IMPORT_BYTES,
  MAX_PROJECT_LOAD_BYTES,
} from './config/runtimeLimits'
import { createDefaultProject } from './model/defaultProject'
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
})

beforeEach(() => {
  exportProjectImageMock.mockReset()
  exportProjectPdfMock.mockReset()
  downloadTextFileMock.mockReset()
  sha256HexMock.mockReset()
  arrayBufferToBase64Mock.mockReset()
  getDocumentMock.mockReset()
  migrateProjectForLoadMock.mockReset()
  validateProjectMock.mockReset()

  exportProjectImageMock.mockResolvedValue(undefined)
  exportProjectPdfMock.mockResolvedValue(undefined)
  downloadTextFileMock.mockImplementation(() => undefined)
  sha256HexMock.mockResolvedValue('f'.repeat(64))
  arrayBufferToBase64Mock.mockReturnValue('BASE64PDFDATA')
  getDocumentMock.mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getViewport: () => ({
          width: 640,
          height: 480,
        }),
        render: () => ({
          promise: Promise.resolve(),
        }),
      }),
    }),
  })
  migrateProjectForLoadMock.mockImplementation((parsed: unknown) => ({
    project: parsed,
    migrated: false,
    fromVersion: '1.2.0',
    toVersion: '1.2.0',
  }))
  validateProjectMock.mockReturnValue({
    valid: true,
    errors: [],
  })

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

function requirePdfInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"][accept="application/pdf"]') as HTMLInputElement | null
  expect(input).not.toBeNull()
  if (!input) {
    throw new Error('pdf input not found')
  }
  return input
}

function requireLoadInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector(
    'input[type="file"][accept="application/json,.json"]',
  ) as HTMLInputElement | null
  expect(input).not.toBeNull()
  if (!input) {
    throw new Error('load input not found')
  }
  return input
}

function requireDrawingStage(container: HTMLElement): HTMLDivElement {
  const stage = container.querySelector('.drawing-stage') as HTMLDivElement | null
  expect(stage).not.toBeNull()
  if (!stage) {
    throw new Error('drawing stage not found')
  }
  return stage
}

function requireOverlayLayer(container: HTMLElement): SVGSVGElement {
  const overlay = container.querySelector('svg.overlay-layer') as SVGSVGElement | null
  expect(overlay).not.toBeNull()
  if (!overlay) {
    throw new Error('overlay layer not found')
  }
  return overlay
}

describe('App file actions integration', () => {
  it('saves project and invokes export actions with normalized filename base', async () => {
    render(() => <App />)

    await fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(downloadTextFileMock).toHaveBeenCalledTimes(1)
    expect(downloadTextFileMock.mock.calls[0][0]).toBe('Untitled LP Sketch.lpsketch.json')
    expect(screen.getByText('Saved Untitled LP Sketch.lpsketch.json')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'PNG' }))
    await fireEvent.click(screen.getByRole('button', { name: 'JPG' }))
    await fireEvent.click(screen.getByRole('button', { name: 'PDF' }))

    expect(exportProjectImageMock).toHaveBeenCalledTimes(2)
    expect(exportProjectImageMock.mock.calls[0][1]).toBe('png')
    expect(exportProjectImageMock.mock.calls[1][1]).toBe('jpg')
    expect(exportProjectImageMock.mock.calls[0][2]).toBe('Untitled-LP-Sketch')
    expect(exportProjectPdfMock).toHaveBeenCalledTimes(1)
    expect(exportProjectPdfMock.mock.calls[0][1]).toBe('Untitled-LP-Sketch')
  })

  it('passes the rendered PDF canvas into PDF export after importing a source PDF', async () => {
    const { container } = render(() => <App />)
    const pdfInput = requirePdfInput(container)
    const pdfBytes = new Uint8Array([11, 12, 13, 14])
    const validPdf = new File([pdfBytes], 'export-source.pdf', { type: 'application/pdf' })
    Object.defineProperty(validPdf, 'arrayBuffer', {
      value: async () => pdfBytes.buffer.slice(0),
    })

    await fireEvent.change(pdfInput, { target: { files: [validPdf] } })
    expect(await screen.findByText('Imported export-source.pdf')).toBeTruthy()

    await fireEvent.click(screen.getByRole('button', { name: 'PDF' }))

    expect(exportProjectPdfMock).toHaveBeenCalledTimes(1)
    expect(exportProjectPdfMock.mock.calls[0][1]).toBe('Untitled-LP-Sketch')
    expect(exportProjectPdfMock.mock.calls[0][2]).toBeInstanceOf(HTMLCanvasElement)
  })

  it('shows export error messages for both explicit errors and fallback paths', async () => {
    render(() => <App />)

    exportProjectImageMock.mockRejectedValueOnce(new Error('Image export failed.'))
    await fireEvent.click(screen.getByRole('button', { name: 'PNG' }))
    expect(screen.getByText('Image export failed.')).toBeTruthy()

    exportProjectPdfMock.mockRejectedValueOnce('boom')
    await fireEvent.click(screen.getByRole('button', { name: 'PDF' }))
    expect(screen.getByText('Unable to export PDF.')).toBeTruthy()
  })

  it('loads projects with migrated status and reports validation and fallback load errors', async () => {
    const { container } = render(() => <App />)
    const loadInput = requireLoadInput(container)

    const loadedProject = createDefaultProject('Loaded From File')
    migrateProjectForLoadMock.mockReturnValueOnce({
      project: loadedProject,
      migrated: true,
      fromVersion: '0.9.0',
      toVersion: '1.2.0',
    })
    validateProjectMock.mockReturnValueOnce({
      valid: true,
      errors: [],
    })

    const migratedFile = new File(['{"schemaVersion":"0.9.0"}'], 'legacy.lpsketch.json', {
      type: 'application/json',
    })
    Object.defineProperty(migratedFile, 'text', {
      value: async () => '{"schemaVersion":"0.9.0"}',
    })

    await fireEvent.change(loadInput, { target: { files: [migratedFile] } })
    expect(screen.getByText('Loaded legacy.lpsketch.json (migrated 0.9.0 -> 1.2.0)')).toBeTruthy()

    validateProjectMock.mockReturnValueOnce({
      valid: false,
      errors: ['missing required property schemaVersion'],
    })

    const invalidFile = new File(['{}'], 'invalid.lpsketch.json', {
      type: 'application/json',
    })
    Object.defineProperty(invalidFile, 'text', {
      value: async () => '{}',
    })

    await fireEvent.change(loadInput, { target: { files: [invalidFile] } })
    expect(screen.getByText(/Project file failed schema validation\./)).toBeTruthy()

    migrateProjectForLoadMock.mockImplementationOnce(() => {
      throw 'bad-load'
    })

    const fallbackFile = new File(['{"schemaVersion":"1.2.0"}'], 'fallback.lpsketch.json', {
      type: 'application/json',
    })
    Object.defineProperty(fallbackFile, 'text', {
      value: async () => '{"schemaVersion":"1.2.0"}',
    })

    await fireEvent.change(loadInput, { target: { files: [fallbackFile] } })
    expect(screen.getByText('Unable to load project file.')).toBeTruthy()
  })

  it('imports PDFs across invalid, success, and fallback error paths', async () => {
    const { container } = render(() => <App />)
    const pdfInput = requirePdfInput(container)

    const notPdf = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    await fireEvent.change(pdfInput, { target: { files: [notPdf] } })
    expect(screen.getByText('Please select a PDF file.')).toBeTruthy()

    const pdfBytes = new Uint8Array([1, 2, 3, 4])
    const validPdf = new File([pdfBytes], 'roof-plan.pdf', { type: 'application/pdf' })
    Object.defineProperty(validPdf, 'arrayBuffer', {
      value: async () => pdfBytes.buffer.slice(0),
    })

    await fireEvent.change(pdfInput, { target: { files: [validPdf] } })
    expect(sha256HexMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Imported roof-plan.pdf')).toBeTruthy()
    expect(screen.getByText('roof-plan.pdf loaded')).toBeTruthy()
    const overlay = requireOverlayLayer(container)
    expect(overlay.getAttribute('width')).toBe('640')
    expect(overlay.getAttribute('height')).toBe('480')

    getDocumentMock.mockReturnValueOnce({
      promise: Promise.reject('broken-pdf'),
    })

    const badPdf = new File([pdfBytes], 'broken.pdf', { type: 'application/pdf' })
    Object.defineProperty(badPdf, 'arrayBuffer', {
      value: async () => pdfBytes.buffer.slice(0),
    })

    await fireEvent.change(pdfInput, { target: { files: [badPdf] } })
    expect(await screen.findByText('Unable to import PDF.')).toBeTruthy()
  })

  it('rejects oversized PDF imports before parsing', async () => {
    const { container } = render(() => <App />)
    const pdfInput = requirePdfInput(container)

    const oversizedPdf = new File(['x'], 'oversized.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversizedPdf, 'size', {
      value: MAX_PDF_IMPORT_BYTES + 1,
      configurable: true,
    })

    getDocumentMock.mockClear()
    await fireEvent.change(pdfInput, { target: { files: [oversizedPdf] } })

    expect(screen.getByText(/PDF file exceeds/)).toBeTruthy()
    expect(getDocumentMock).not.toHaveBeenCalled()
  })

  it('rejects oversized project loads before parsing', async () => {
    const { container } = render(() => <App />)
    const loadInput = requireLoadInput(container)

    const oversizedProject = new File(['{}'], 'oversized.lpsketch.json', {
      type: 'application/json',
    })
    Object.defineProperty(oversizedProject, 'size', {
      value: MAX_PROJECT_LOAD_BYTES + 1,
      configurable: true,
    })
    Object.defineProperty(oversizedProject, 'text', {
      value: async () => '{"schemaVersion":"1.8.0"}',
    })

    migrateProjectForLoadMock.mockClear()
    validateProjectMock.mockClear()
    await fireEvent.change(loadInput, { target: { files: [oversizedProject] } })

    expect(screen.getByText(/Project file exceeds/)).toBeTruthy()
    expect(migrateProjectForLoadMock).not.toHaveBeenCalled()
    expect(validateProjectMock).not.toHaveBeenCalled()
  })

  it('does not re-render PDF bytes while zooming an already imported page', async () => {
    const { container } = render(() => <App />)
    const pdfInput = requirePdfInput(container)
    const stage = requireDrawingStage(container)

    const pdfBytes = new Uint8Array([7, 8, 9, 10])
    const validPdf = new File([pdfBytes], 'zoom-check.pdf', { type: 'application/pdf' })
    Object.defineProperty(validPdf, 'arrayBuffer', {
      value: async () => pdfBytes.buffer.slice(0),
    })

    await fireEvent.change(pdfInput, { target: { files: [validPdf] } })
    expect(await screen.findByText('Imported zoom-check.pdf')).toBeTruthy()

    getDocumentMock.mockClear()

    await fireEvent.wheel(stage, {
      deltaY: -500,
      clientX: 320,
      clientY: 250,
    })
    await fireEvent.wheel(stage, {
      deltaY: 350,
      clientX: 320,
      clientY: 250,
    })

    expect(getDocumentMock).toHaveBeenCalledTimes(0)
  })
})
