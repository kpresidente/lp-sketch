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

function normalizeProjectForAutosaveStorage(project: LpProject): LpProject {
  const normalized = cloneProject(project)
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

  const degradedProject = cloneProject(project)
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
