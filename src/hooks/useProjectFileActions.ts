import { getDocument } from 'pdfjs-dist'
import type { Accessor, Setter } from 'solid-js'
import {
  MAX_PDF_IMPORT_BYTES,
  MAX_PDF_VIEWPORT_PT,
  MAX_PROJECT_ELEMENT_COUNT,
  MAX_PROJECT_LOAD_BYTES,
} from '../config/runtimeLimits'
import { cloneProject } from '../lib/projectState'
import { arrayBufferToBase64, downloadTextFile, sha256Hex } from '../lib/files'
import { exportProjectImage, exportProjectPdf } from '../lib/export'
import { projectElementCount } from '../lib/projectLimits'
import { migrateProjectForLoad } from '../model/migration'
import { asProject, validateProject } from '../model/validation'
import type { LpProject, Selection } from '../types/project'

interface UseProjectFileActionsOptions {
  project: Accessor<LpProject>
  visibleProject: Accessor<LpProject>
  replaceProject: (nextProject: LpProject, resetHistory?: boolean) => void
  clearTransientToolState: () => void
  setSelected: Setter<Selection | null>
  setMultiSelection: Setter<Selection[]>
  setStatus: (message: string) => void
  setError: (message: string) => void
  getPdfCanvas: () => HTMLCanvasElement | undefined
}

export function useProjectFileActions(options: UseProjectFileActionsOptions) {
  function mbLimitLabel(bytes: number): string {
    return `${Math.round(bytes / (1024 * 1024))} MB`
  }

  function normalizedFilenameBase() {
    const raw = (options.project().projectMeta.name || 'lp-sketch').trim()
    const cleaned = raw
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    return cleaned || 'lp-sketch'
  }

  function resetSelectionAndTransient() {
    options.clearTransientToolState()
    options.setSelected(null)
    options.setMultiSelection([])
  }

  async function importPdfFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      options.setError('Please select a PDF file.')
      return
    }

    if (file.size > MAX_PDF_IMPORT_BYTES) {
      options.setError(`PDF file exceeds ${mbLimitLabel(MAX_PDF_IMPORT_BYTES)} limit.`)
      return
    }

    try {
      const original = new Uint8Array(await file.arrayBuffer())
      const hash = await sha256Hex(original.slice().buffer)
      const pdf = await getDocument({ data: original.slice() }).promise

      if (pdf.numPages !== 1) {
        throw new Error(`Only single-page PDFs are supported. Received ${pdf.numPages} pages.`)
      }

      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1 })
      if (
        !Number.isFinite(viewport.width) ||
        !Number.isFinite(viewport.height) ||
        viewport.width <= 0 ||
        viewport.height <= 0 ||
        viewport.width > MAX_PDF_VIEWPORT_PT ||
        viewport.height > MAX_PDF_VIEWPORT_PT
      ) {
        throw new Error(
          `PDF page dimensions exceed supported limits (${MAX_PDF_VIEWPORT_PT}pt max width/height).`,
        )
      }

      const base64Data = arrayBufferToBase64(original.buffer)
      const previous = options.project()

      const nextProject: LpProject = {
        ...cloneProject(previous),
        projectMeta: {
          ...previous.projectMeta,
          updatedAt: new Date().toISOString(),
        },
        pdf: {
          sourceType: 'embedded',
          name: file.name,
          sha256: hash,
          page: 1,
          widthPt: viewport.width,
          heightPt: viewport.height,
          dataBase64: base64Data,
          path: null,
        },
        view: {
          zoom: 1,
          pan: { x: 24, y: 24 },
        },
      }

      options.replaceProject(nextProject)
      resetSelectionAndTransient()
      options.setStatus(`Imported ${file.name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import PDF.'
      options.setError(message)
    }
  }

  async function handleImportPdf(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    target.value = ''

    if (!file) {
      return
    }

    await importPdfFile(file)
  }

  function handleImportPdfDrop(file: File) {
    void importPdfFile(file)
  }

  async function handleLoadProject(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    target.value = ''

    if (!file) {
      return
    }

    if (file.size > MAX_PROJECT_LOAD_BYTES) {
      options.setError(`Project file exceeds ${mbLimitLabel(MAX_PROJECT_LOAD_BYTES)} limit.`)
      return
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const migration = migrateProjectForLoad(parsed)
      const validation = validateProject(migration.project)

      if (!validation.valid) {
        const details = validation.errors.slice(0, 4).join('; ')
        throw new Error(`Project file failed schema validation. ${details}`)
      }

      const loadedProject = asProject(migration.project)
      const totalElements = projectElementCount(loadedProject)
      if (totalElements > MAX_PROJECT_ELEMENT_COUNT) {
        throw new Error(
          `Project exceeds safety limits: ${totalElements} elements (max ${MAX_PROJECT_ELEMENT_COUNT}).`,
        )
      }

      options.replaceProject(cloneProject(loadedProject))
      resetSelectionAndTransient()
      if (migration.migrated) {
        options.setStatus(`Loaded ${file.name} (migrated ${migration.fromVersion} -> ${migration.toVersion})`)
      } else {
        options.setStatus(`Loaded ${file.name}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load project file.'
      options.setError(message)
    }
  }

  function handleSaveProject() {
    const data = JSON.stringify(options.project(), null, 2)
    const filename = `${options.project().projectMeta.name || 'lp-sketch'}.lpsketch.json`
    downloadTextFile(filename, data)
    options.setStatus(`Saved ${filename}`)
  }

  async function handleExportImage(format: 'png' | 'jpg') {
    try {
      await exportProjectImage(
        options.visibleProject(),
        format,
        normalizedFilenameBase(),
        options.getPdfCanvas(),
      )
      options.setStatus(`Exported ${format.toUpperCase()} output.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to export ${format.toUpperCase()}.`
      options.setError(message)
    }
  }

  async function handleExportPdf() {
    try {
      await exportProjectPdf(
        options.visibleProject(),
        normalizedFilenameBase(),
        options.getPdfCanvas(),
      )
      options.setStatus('Exported PDF output.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export PDF.'
      options.setError(message)
    }
  }

  return {
    handleImportPdf,
    handleImportPdfDrop,
    handleLoadProject,
    handleSaveProject,
    handleExportImage,
    handleExportPdf,
  }
}
