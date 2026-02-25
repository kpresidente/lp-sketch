// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { AUTOSAVE_MAX_BYTES, AUTOSAVE_STORAGE_KEY } from '../config/runtimeLimits'
import { createDefaultProject } from '../model/defaultProject'
import type { LpProject } from '../types/project'
import {
  clearAutosaveDraft,
  loadAutosaveDraft,
  persistAutosaveDraft,
} from './autosave'

describe('autosave storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists and loads a regular draft payload', () => {
    const project = createDefaultProject('Autosave Roundtrip')
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 10, y: 20 },
      end: { x: 40, y: 20 },
      color: 'green',
      class: 'class1',
    })

    const result = persistAutosaveDraft(project)
    expect(result).toEqual({ status: 'saved', degraded: false })

    const loaded = loadAutosaveDraft()
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') {
      return
    }

    expect(loaded.envelope.project.projectMeta.name).toBe('Autosave Roundtrip')
    expect(loaded.envelope.project.elements.lines).toHaveLength(1)
    expect(loaded.envelope.degraded).toBe(false)
  })

  it('degrades oversized payloads by omitting embedded PDF bytes', () => {
    const project = createDefaultProject('Autosave Oversized')
    project.pdf.sourceType = 'embedded'
    project.pdf.path = null
    project.pdf.name = 'large.pdf'
    project.pdf.dataBase64 = 'A'.repeat(AUTOSAVE_MAX_BYTES)

    const result = persistAutosaveDraft(project)
    expect(result).toEqual({ status: 'saved', degraded: true })

    const loaded = loadAutosaveDraft()
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') {
      return
    }

    expect(loaded.envelope.degraded).toBe(true)
    expect(loaded.envelope.project.pdf.sourceType).toBe('referenced')
    expect(loaded.envelope.project.pdf.dataBase64).toBeNull()
    expect(loaded.envelope.project.pdf.path).toBe('large.pdf')
  })

  it('normalizes and fills multi-page scoped maps before persisting', () => {
    const project = createDefaultProject('Autosave Multi-page Normalize')
    project.pdf.pageCount = 3
    project.pdf.pages = [{ page: 1, widthPt: 900, heightPt: 700 }]
    project.pdf.page = 99
    project.pdf.widthPt = 0
    project.pdf.heightPt = Number.NaN

    project.view.currentPage = 99
    project.view.byPage = {} as LpProject['view']['byPage']

    project.scale.byPage = {} as LpProject['scale']['byPage']
    project.settings.pdfBrightnessByPage = { 1: 0.25 } as Record<number, number>
    project.generalNotes.notesByPage = { 1: ['  Page one  '] } as Record<number, string[]>
    project.generalNotes.notes = ['  Global note  ', '']

    const result = persistAutosaveDraft(project)
    expect(result).toEqual({ status: 'saved', degraded: false })

    const loaded = loadAutosaveDraft()
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') {
      return
    }

    const restored = loaded.envelope.project
    expect(restored.pdf.pageCount).toBe(3)
    expect(restored.pdf.pages).toHaveLength(3)
    expect(restored.pdf.page).toBe(3)
    expect(restored.view.currentPage).toBe(3)
    expect(Object.keys(restored.view.byPage).sort()).toEqual(['1', '2', '3'])
    expect(Object.keys(restored.scale.byPage).sort()).toEqual(['1', '2', '3'])
    expect(Object.keys(restored.settings.pdfBrightnessByPage).sort()).toEqual(['1', '2', '3'])
    expect(restored.generalNotes.notes).toEqual(['Global note'])
    expect(restored.generalNotes.notesByPage[1]).toEqual(['Page one'])
    expect(restored.generalNotes.notesByPage[2]).toEqual([])
    expect(restored.generalNotes.notesByPage[3]).toEqual([])
  })

  it('preserves active page metadata when degrading embedded multi-page drafts', () => {
    const project = createDefaultProject('Autosave Multi-page Degrade')
    project.pdf.sourceType = 'embedded'
    project.pdf.dataBase64 = 'A'.repeat(AUTOSAVE_MAX_BYTES)
    project.pdf.path = null
    project.pdf.name = 'multi-large.pdf'
    project.pdf.pageCount = 2
    project.pdf.pages = [
      { page: 1, widthPt: 1000, heightPt: 800 },
      { page: 2, widthPt: 640, heightPt: 420 },
    ]
    project.pdf.page = 2
    project.pdf.widthPt = 640
    project.pdf.heightPt = 420
    project.view.currentPage = 2
    project.view.byPage[2] = { zoom: 1.2, pan: { x: 30, y: 30 } }

    const result = persistAutosaveDraft(project)
    expect(result).toEqual({ status: 'saved', degraded: true })

    const loaded = loadAutosaveDraft()
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') {
      return
    }

    expect(loaded.envelope.degraded).toBe(true)
    expect(loaded.envelope.project.pdf.sourceType).toBe('referenced')
    expect(loaded.envelope.project.pdf.dataBase64).toBeNull()
    expect(loaded.envelope.project.pdf.path).toBe('multi-large.pdf')
    expect(loaded.envelope.project.pdf.pageCount).toBe(2)
    expect(loaded.envelope.project.pdf.pages).toEqual([
      { page: 1, widthPt: 1000, heightPt: 800 },
      { page: 2, widthPt: 640, heightPt: 420 },
    ])
    expect(loaded.envelope.project.pdf.page).toBe(2)
    expect(loaded.envelope.project.view.currentPage).toBe(2)
  })

  it('clears stored autosave drafts', () => {
    const project = createDefaultProject('Autosave Clear')
    expect(persistAutosaveDraft(project).status).toBe('saved')
    expect(window.localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toBeTruthy()

    clearAutosaveDraft()
    expect(window.localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toBeNull()
    expect(loadAutosaveDraft().status).toBe('none')
  })
})
