import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import { projectElementCount, projectHasRecoverableContent } from './projectLimits'

describe('project limits helpers', () => {
  it('includes page-scoped notes in element counting', () => {
    const project = createDefaultProject('Project Limits Count')
    project.generalNotes.notes = ['Global note']
    project.generalNotes.notesByPage = {
      1: ['Page one note'],
      2: ['Page two note', 'Page two note b'],
    }

    expect(projectElementCount(project)).toBe(4)
  })

  it('treats page-scoped notes as recoverable content', () => {
    const project = createDefaultProject('Project Limits Recoverable')
    project.generalNotes.notes = []
    project.generalNotes.notesByPage = {
      1: [],
      2: ['Page two note'],
    }

    expect(projectHasRecoverableContent(project)).toBe(true)
  })
})
