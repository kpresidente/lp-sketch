// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { AUTOSAVE_MAX_BYTES, AUTOSAVE_STORAGE_KEY } from '../config/runtimeLimits'
import { createDefaultProject } from '../model/defaultProject'
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

  it('clears stored autosave drafts', () => {
    const project = createDefaultProject('Autosave Clear')
    expect(persistAutosaveDraft(project).status).toBe('saved')
    expect(window.localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toBeTruthy()

    clearAutosaveDraft()
    expect(window.localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toBeNull()
    expect(loadAutosaveDraft().status).toBe('none')
  })
})

