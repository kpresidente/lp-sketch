import {
  AUTOSAVE_MAX_BYTES,
  AUTOSAVE_STORAGE_KEY,
} from '../config/runtimeLimits'
import type { LpProject } from '../types/project'
import { cloneProject } from './projectState'

export interface AutosaveEnvelope {
  version: 1
  savedAt: string
  degraded: boolean
  project: LpProject
}

export type PersistAutosaveResult =
  | { status: 'saved'; degraded: boolean }
  | { status: 'skipped'; reason: 'storage-unavailable' | 'too-large' }
  | { status: 'error'; error: unknown }

export type LoadAutosaveResult =
  | { status: 'none' }
  | { status: 'ok'; envelope: AutosaveEnvelope }
  | { status: 'invalid'; error: unknown }

const DEFAULT_PAGE_WIDTH_PT = 1200
const DEFAULT_PAGE_HEIGHT_PT = 900
const DEFAULT_PAN_X = 24
const DEFAULT_PAN_Y = 24
const MIN_ZOOM = 0.25
const MAX_ZOOM = 8
const MAX_GENERAL_NOTES_COUNT = 15
const MAX_GENERAL_NOTE_LENGTH = 120

function isBrowserStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function toUtf8ByteLength(content: string): number {
  return new TextEncoder().encode(content).byteLength
}

function makeEnvelope(project: LpProject, degraded: boolean): AutosaveEnvelope {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    degraded,
    project,
  }
}

function normalizePositiveInt(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  const normalized = Math.trunc(value ?? fallback)
  if (normalized < 1) {
    return fallback
  }

  return normalized
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampBrightness(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return clamp(value ?? fallback, 0, 1)
}

function normalizeNotesList(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  const normalized: string[] = []
  for (const raw of input) {
    if (typeof raw !== 'string') {
      continue
    }

    const note = raw.trim().slice(0, MAX_GENERAL_NOTE_LENGTH)
    if (note.length === 0) {
      continue
    }

    normalized.push(note)
    if (normalized.length >= MAX_GENERAL_NOTES_COUNT) {
      break
    }
  }

  return normalized
}

function normalizeProjectForAutosaveStorage(project: LpProject): LpProject {
  const normalized = cloneProject(project)

  const fallbackWidth =
    Number.isFinite(normalized.pdf.widthPt) && normalized.pdf.widthPt > 0
      ? normalized.pdf.widthPt
      : DEFAULT_PAGE_WIDTH_PT
  const fallbackHeight =
    Number.isFinite(normalized.pdf.heightPt) && normalized.pdf.heightPt > 0
      ? normalized.pdf.heightPt
      : DEFAULT_PAGE_HEIGHT_PT

  const pageCount = normalizePositiveInt(
    normalized.pdf.pageCount,
    Math.max(1, normalized.pdf.pages.length),
  )
  const pages: Array<{ page: number; widthPt: number; heightPt: number }> = []
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const existing = normalized.pdf.pages[pageIndex]
    const prior = pages[pageIndex - 1]
    pages.push({
      page: pageIndex + 1,
      widthPt:
        existing && Number.isFinite(existing.widthPt) && existing.widthPt > 0
          ? existing.widthPt
          : prior?.widthPt ?? fallbackWidth,
      heightPt:
        existing && Number.isFinite(existing.heightPt) && existing.heightPt > 0
          ? existing.heightPt
          : prior?.heightPt ?? fallbackHeight,
    })
  }
  normalized.pdf.pageCount = pageCount
  normalized.pdf.pages = pages

  const preferredPage = clamp(
    normalizePositiveInt(normalized.view.currentPage, normalizePositiveInt(normalized.pdf.page, 1)),
    1,
    pageCount,
  )
  normalized.view.currentPage = preferredPage
  normalized.pdf.page = preferredPage
  const activePage = pages[preferredPage - 1] ?? pages[0]
  normalized.pdf.widthPt = activePage.widthPt
  normalized.pdf.heightPt = activePage.heightPt

  const fallbackView = {
    zoom:
      Number.isFinite(normalized.view.zoom)
        ? clamp(normalized.view.zoom, MIN_ZOOM, MAX_ZOOM)
        : 1,
    pan: {
      x: Number.isFinite(normalized.view.pan.x) ? normalized.view.pan.x : DEFAULT_PAN_X,
      y: Number.isFinite(normalized.view.pan.y) ? normalized.view.pan.y : DEFAULT_PAN_Y,
    },
  }
  const nextViewByPage: LpProject['view']['byPage'] = {}
  for (let page = 1; page <= pageCount; page += 1) {
    const existing = normalized.view.byPage[page]
    nextViewByPage[page] = {
      zoom:
        existing && Number.isFinite(existing.zoom)
          ? clamp(existing.zoom, MIN_ZOOM, MAX_ZOOM)
          : fallbackView.zoom,
      pan: {
        x: existing && Number.isFinite(existing.pan.x) ? existing.pan.x : fallbackView.pan.x,
        y: existing && Number.isFinite(existing.pan.y) ? existing.pan.y : fallbackView.pan.y,
      },
    }
  }
  normalized.view.byPage = nextViewByPage
  normalized.view.zoom = nextViewByPage[preferredPage].zoom
  normalized.view.pan = nextViewByPage[preferredPage].pan

  type ScaleSnapshot = LpProject['scale']['byPage'][number]
  const fallbackScaleSnapshot: ScaleSnapshot = normalized.scale.isSet
    ? {
      isSet: true as const,
      method: (normalized.scale.method === 'calibrated' ? 'calibrated' : 'manual') as 'manual' | 'calibrated',
      realUnitsPerPoint:
        Number.isFinite(normalized.scale.realUnitsPerPoint) && (normalized.scale.realUnitsPerPoint ?? 0) > 0
          ? normalized.scale.realUnitsPerPoint
          : 1,
      displayUnits:
        normalized.scale.displayUnits === 'decimal-ft' || normalized.scale.displayUnits === 'm'
          ? normalized.scale.displayUnits
          : 'ft-in',
    }
    : {
      isSet: false as const,
      method: null,
      realUnitsPerPoint: null,
      displayUnits: null,
    }
  const nextScaleByPage: LpProject['scale']['byPage'] = {}
  for (let page = 1; page <= pageCount; page += 1) {
    const existing = normalized.scale.byPage[page]
    if (existing?.isSet) {
      nextScaleByPage[page] = {
        isSet: true,
        method: existing.method === 'calibrated' ? 'calibrated' : 'manual',
        realUnitsPerPoint:
          Number.isFinite(existing.realUnitsPerPoint) && (existing.realUnitsPerPoint ?? 0) > 0
            ? existing.realUnitsPerPoint
            : 1,
        displayUnits:
          existing.displayUnits === 'decimal-ft' || existing.displayUnits === 'm'
            ? existing.displayUnits
            : 'ft-in',
      }
      continue
    }

    nextScaleByPage[page] = { ...fallbackScaleSnapshot }
  }
  normalized.scale.byPage = nextScaleByPage
  normalized.scale = {
    ...nextScaleByPage[preferredPage],
    byPage: nextScaleByPage,
  }

  const fallbackBrightness = clampBrightness(normalized.settings.pdfBrightness, 1)
  const nextBrightnessByPage: Record<number, number> = {}
  for (let page = 1; page <= pageCount; page += 1) {
    nextBrightnessByPage[page] = clampBrightness(normalized.settings.pdfBrightnessByPage[page], fallbackBrightness)
  }
  normalized.settings.pdfBrightnessByPage = nextBrightnessByPage
  normalized.settings.pdfBrightness = nextBrightnessByPage[preferredPage] ?? fallbackBrightness

  normalized.generalNotes.notes = normalizeNotesList(normalized.generalNotes.notes)
  const nextNotesByPage: Record<number, string[]> = {}
  for (let page = 1; page <= pageCount; page += 1) {
    nextNotesByPage[page] = normalizeNotesList(normalized.generalNotes.notesByPage[page])
  }
  normalized.generalNotes.notesByPage = nextNotesByPage

  if (!normalized.pdf.name) {
    normalized.pdf.name = 'source.pdf'
  }

  if (normalized.pdf.sourceType === 'referenced' && !normalized.pdf.path) {
    normalized.pdf.path = normalized.pdf.name || 'source.pdf'
  }

  if (normalized.pdf.sourceType === 'embedded' && !normalized.pdf.dataBase64) {
    normalized.pdf.sourceType = 'referenced'
    normalized.pdf.path = normalized.pdf.path || normalized.pdf.name || 'source.pdf'
  }

  return normalized
}

function buildAutosaveEnvelope(project: LpProject): AutosaveEnvelope | null {
  const fullProject = normalizeProjectForAutosaveStorage(project)
  const fullEnvelope = makeEnvelope(fullProject, false)
  const fullSerialized = JSON.stringify(fullEnvelope)

  if (toUtf8ByteLength(fullSerialized) <= AUTOSAVE_MAX_BYTES) {
    return fullEnvelope
  }

  if (!fullProject.pdf.dataBase64) {
    return null
  }

  const degradedProject = cloneProject(fullProject)
  const fallbackPath = (degradedProject.pdf.path ?? degradedProject.pdf.name) || 'source.pdf'
  degradedProject.pdf = {
    ...degradedProject.pdf,
    sourceType: 'referenced',
    dataBase64: null,
    path: fallbackPath,
  }

  const degradedEnvelope = makeEnvelope(degradedProject, true)
  const degradedSerialized = JSON.stringify(degradedEnvelope)
  if (toUtf8ByteLength(degradedSerialized) > AUTOSAVE_MAX_BYTES) {
    return null
  }

  return degradedEnvelope
}

export function persistAutosaveDraft(project: LpProject): PersistAutosaveResult {
  if (!isBrowserStorageAvailable()) {
    return { status: 'skipped', reason: 'storage-unavailable' }
  }

  const envelope = buildAutosaveEnvelope(project)
  if (!envelope) {
    return { status: 'skipped', reason: 'too-large' }
  }

  try {
    window.localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(envelope))
    return {
      status: 'saved',
      degraded: envelope.degraded,
    }
  } catch (error) {
    return {
      status: 'error',
      error,
    }
  }
}

function isAutosaveEnvelope(input: unknown): input is AutosaveEnvelope {
  if (!input || typeof input !== 'object') {
    return false
  }

  const candidate = input as Partial<AutosaveEnvelope>
  return (
    candidate.version === 1 &&
    typeof candidate.savedAt === 'string' &&
    typeof candidate.degraded === 'boolean' &&
    typeof candidate.project === 'object' &&
    candidate.project !== null
  )
}

export function loadAutosaveDraft(): LoadAutosaveResult {
  if (!isBrowserStorageAvailable()) {
    return { status: 'none' }
  }

  const raw = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY)
  if (!raw) {
    return { status: 'none' }
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isAutosaveEnvelope(parsed)) {
      return {
        status: 'invalid',
        error: new Error('Autosave payload shape is invalid.'),
      }
    }

    return {
      status: 'ok',
      envelope: parsed,
    }
  } catch (error) {
    return {
      status: 'invalid',
      error,
    }
  }
}

export function clearAutosaveDraft() {
  if (!isBrowserStorageAvailable()) {
    return
  }

  window.localStorage.removeItem(AUTOSAVE_STORAGE_KEY)
}
