import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { resolvedGeneralNotesForPage } from './generalNotes'

describe('resolvedGeneralNotesForPage', () => {
  it('uses global notes when scope is global', () => {
    const project = createDefaultProject('Global Notes Scope')
    project.settings.notesDataScope = 'global'
    project.generalNotes.notes = ['Global A', 'Global B']
    project.generalNotes.notesByPage = {
      1: ['Page 1'],
      2: ['Page 2'],
    }

    expect(resolvedGeneralNotesForPage(project, 1)).toEqual(['Global A', 'Global B'])
    expect(resolvedGeneralNotesForPage(project, 2)).toEqual(['Global A', 'Global B'])
  })

  it('uses page notes when scope is page', () => {
    const project = createDefaultProject('Page Notes Scope')
    project.settings.notesDataScope = 'page'
    project.generalNotes.notes = ['Global A']
    project.generalNotes.notesByPage = {
      1: ['Page 1'],
      2: ['Page 2'],
    }

    expect(resolvedGeneralNotesForPage(project, 1)).toEqual(['Page 1'])
    expect(resolvedGeneralNotesForPage(project, 2)).toEqual(['Page 2'])
    expect(resolvedGeneralNotesForPage(project, 3)).toEqual([])
  })
})
