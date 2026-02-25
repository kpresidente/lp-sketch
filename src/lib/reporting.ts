import type { LpProject } from '../types/project'

export type ReportType = 'bug' | 'feature'

export interface ReportDraft {
  type: ReportType
  title: string
  details: string
  reproSteps: string
}

export interface ReportProjectSummary {
  schemaVersion: string
  currentPage: number
  pageCount: number
  hasPdf: boolean
  activeToolHints: {
    activeColor: LpProject['settings']['activeColor']
    activeClass: LpProject['settings']['activeClass']
    designScale: LpProject['settings']['designScale']
  }
  elementCounts: {
    lines: number
    arcs: number
    curves: number
    symbols: number
    texts: number
    arrows: number
    dimensionTexts: number
    marks: number
    legendPlacements: number
    notesPlacements: number
  }
}

export interface ReportPayload {
  type: ReportType
  title: string
  details: string
  reproSteps: string | null
  metadata: {
    submittedAt: string
    appVersion: string
    appEnvironment: string
    userAgent: string | null
    projectSummary: ReportProjectSummary
  }
}

export interface ReportSubmissionResult {
  ok: boolean
  status: number
  message: string | null
  reportId: string | null
}

export const REPORT_TITLE_MAX_LENGTH = 120
export const REPORT_DETAILS_MAX_LENGTH = 4000
export const REPORT_REPRO_MAX_LENGTH = 4000

function clampText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength)
}

export function createDefaultReportDraft(): ReportDraft {
  return {
    type: 'bug',
    title: '',
    details: '',
    reproSteps: '',
  }
}

export function normalizeReportDraft(draft: ReportDraft): ReportDraft {
  return {
    type: draft.type === 'feature' ? 'feature' : 'bug',
    title: clampText(draft.title, REPORT_TITLE_MAX_LENGTH),
    details: clampText(draft.details, REPORT_DETAILS_MAX_LENGTH),
    reproSteps: clampText(draft.reproSteps, REPORT_REPRO_MAX_LENGTH),
  }
}

export function validateReportDraft(draft: ReportDraft): string[] {
  const errors: string[] = []

  if (draft.title.length < 3) {
    errors.push('Title must be at least 3 characters.')
  }

  if (draft.details.length < 10) {
    errors.push('Details must be at least 10 characters.')
  }

  return errors
}

export function buildReportProjectSummary(project: LpProject): ReportProjectSummary {
  return {
    schemaVersion: project.schemaVersion,
    currentPage: project.view.currentPage,
    pageCount: project.pdf.pageCount,
    hasPdf: Boolean(project.pdf.dataBase64),
    activeToolHints: {
      activeColor: project.settings.activeColor,
      activeClass: project.settings.activeClass,
      designScale: project.settings.designScale,
    },
    elementCounts: {
      lines: project.elements.lines.length,
      arcs: project.elements.arcs.length,
      curves: project.elements.curves.length,
      symbols: project.elements.symbols.length,
      texts: project.elements.texts.length,
      arrows: project.elements.arrows.length,
      dimensionTexts: project.elements.dimensionTexts.length,
      marks: project.construction.marks.length,
      legendPlacements: project.legend.placements.length,
      notesPlacements: project.generalNotes.placements.length,
    },
  }
}

function resolveEnvValue(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function buildReportPayload(
  draft: ReportDraft,
  project: LpProject,
  now = new Date(),
  env: Record<string, unknown> = import.meta.env,
): ReportPayload {
  const normalized = normalizeReportDraft(draft)

  return {
    type: normalized.type,
    title: normalized.title,
    details: normalized.details,
    reproSteps: normalized.reproSteps.length > 0 ? normalized.reproSteps : null,
    metadata: {
      submittedAt: now.toISOString(),
      appVersion: resolveEnvValue(env.VITE_APP_VERSION, 'dev'),
      appEnvironment: resolveEnvValue(env.VITE_APP_ENV, resolveEnvValue(env.MODE, 'unknown')),
      userAgent: typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
        ? navigator.userAgent
        : null,
      projectSummary: buildReportProjectSummary(project),
    },
  }
}

function parseSubmissionMessage(body: unknown): { reportId: string | null; message: string | null } {
  if (!body || typeof body !== 'object') {
    return { reportId: null, message: null }
  }

  const record = body as Record<string, unknown>
  const reportId = typeof record.reportId === 'string' ? record.reportId : null
  const message = typeof record.message === 'string'
    ? record.message
    : typeof record.error === 'string'
      ? record.error
      : null

  return { reportId, message }
}

export async function submitReport(
  payload: ReportPayload,
  endpoint = '/api/report',
): Promise<ReportSubmissionResult> {
  if (typeof fetch !== 'function') {
    return {
      ok: false,
      status: 0,
      reportId: null,
      message: 'Reporting is unavailable in this environment.',
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null
    const parsed = parseSubmissionMessage(body)

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        reportId: parsed.reportId,
        message: parsed.message,
      }
    }

    return {
      ok: false,
      status: response.status,
      reportId: parsed.reportId,
      message: parsed.message ?? `Report submission failed (${response.status}).`,
    }
  } catch {
    return {
      ok: false,
      status: 0,
      reportId: null,
      message: 'Unable to reach report service.',
    }
  }
}
