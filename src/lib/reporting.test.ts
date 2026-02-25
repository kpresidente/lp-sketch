import { describe, expect, it, vi, afterEach } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import {
  buildReportPayload,
  buildReportProjectSummary,
  createDefaultReportDraft,
  normalizeReportDraft,
  submitReport,
  validateReportDraft,
} from './reporting'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reporting', () => {
  it('normalizes and validates report drafts', () => {
    const normalized = normalizeReportDraft({
      type: 'bug',
      title: '  Example title  ',
      details: '  A sufficiently long details body for validation.  ',
      reproSteps: '  Step 1  ',
    })

    expect(normalized.type).toBe('bug')
    expect(normalized.title).toBe('Example title')
    expect(normalized.details).toBe('A sufficiently long details body for validation.')
    expect(normalized.reproSteps).toBe('Step 1')
    expect(validateReportDraft(normalized)).toEqual([])
  })

  it('rejects short title and details', () => {
    const errors = validateReportDraft({
      type: 'feature',
      title: 'ab',
      details: 'too short',
      reproSteps: '',
    })

    expect(errors).toContain('Title must be at least 3 characters.')
    expect(errors).toContain('Details must be at least 10 characters.')
  })

  it('builds project summary counts from project state', () => {
    const project = createDefaultProject('Reporting test')
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 10, y: 10 },
      end: { x: 30, y: 20 },
      page: 1,
      color: 'green',
      class: 'class1',
    })
    project.elements.symbols.push({
      id: 'symbol-1',
      type: 'air_terminal',
      point: { x: 20, y: 20 },
      direction: 0,
      page: 1,
      color: 'green',
      class: 'class1',
      layer: 'rooftop',
    })
    project.legend.placements.push({
      id: 'legend-1',
      page: 1,
      anchor: { x: 10, y: 10 },
      widthPt: 250,
      rowHeightPt: 22,
    })

    const summary = buildReportProjectSummary(project)
    expect(summary.elementCounts.lines).toBe(1)
    expect(summary.elementCounts.symbols).toBe(1)
    expect(summary.elementCounts.legendPlacements).toBe(1)
    expect(summary.pageCount).toBe(1)
  })

  it('builds payload with metadata and null repro when blank', () => {
    const project = createDefaultProject('Metadata test')
    const payload = buildReportPayload(
      {
        type: 'feature',
        title: 'Add shortcut',
        details: 'Please add a keyboard shortcut for this action.',
        reproSteps: '  ',
      },
      project,
      new Date('2026-02-25T10:00:00.000Z'),
      {
        VITE_APP_VERSION: '1.2.3',
        VITE_APP_ENV: 'test',
      },
    )

    expect(payload.type).toBe('feature')
    expect(payload.reproSteps).toBeNull()
    expect(payload.metadata.submittedAt).toBe('2026-02-25T10:00:00.000Z')
    expect(payload.metadata.appVersion).toBe('1.2.3')
    expect(payload.metadata.appEnvironment).toBe('test')
  })

  it('submits reports successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: { get: () => 'application/json' },
      json: async () => ({ reportId: 'abc123', message: 'accepted' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await submitReport({
      type: 'bug',
      title: 'Title',
      details: 'Details long enough.',
      reproSteps: null,
      metadata: {
        submittedAt: '2026-02-25T10:00:00.000Z',
        appVersion: 'dev',
        appEnvironment: 'test',
        userAgent: null,
        projectSummary: buildReportProjectSummary(createDefaultProject()),
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(result.status).toBe(202)
    expect(result.reportId).toBe('abc123')
  })

  it('returns response message for non-ok status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'invalid' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await submitReport({
      type: 'bug',
      title: 'Title',
      details: 'Details long enough.',
      reproSteps: null,
      metadata: {
        submittedAt: '2026-02-25T10:00:00.000Z',
        appVersion: 'dev',
        appEnvironment: 'test',
        userAgent: null,
        projectSummary: buildReportProjectSummary(createDefaultProject()),
      },
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(400)
    expect(result.message).toBe('invalid')
  })

  it('handles fetch errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await submitReport({
      type: 'feature',
      title: 'Title',
      details: 'Details long enough.',
      reproSteps: null,
      metadata: {
        submittedAt: '2026-02-25T10:00:00.000Z',
        appVersion: 'dev',
        appEnvironment: 'test',
        userAgent: null,
        projectSummary: buildReportProjectSummary(createDefaultProject()),
      },
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(0)
    expect(result.message).toBe('Unable to reach report service.')
  })

  it('creates default draft', () => {
    expect(createDefaultReportDraft()).toEqual({
      type: 'bug',
      title: '',
      details: '',
      reproSteps: '',
    })
  })
})
