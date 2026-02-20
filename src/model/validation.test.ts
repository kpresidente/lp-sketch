import { describe, expect, it } from 'vitest'
import { createDefaultProject } from './defaultProject'
import { validateProject } from './validation'
import type { LpProject } from '../types/project'

function createSchemaValidProject(name: string): LpProject {
  const project = createDefaultProject(name)

  project.projectMeta = {
    id: 'project-validation-test',
    name,
    createdAt: '2026-02-12T00:00:00.000Z',
    updatedAt: '2026-02-12T00:00:00.000Z',
  }

  project.pdf = {
    sourceType: 'embedded',
    name: 'plan.pdf',
    sha256: 'a'.repeat(64),
    page: 1,
    widthPt: 1000,
    heightPt: 800,
    dataBase64: 'QQ==',
    path: null,
  }

  project.scale = {
    isSet: true,
    method: 'manual',
    realUnitsPerPoint: 0.25,
    displayUnits: 'ft-in',
  }

  return project
}

describe('project validation', () => {
  it('accepts a schema-valid project payload', () => {
    const project = createSchemaValidProject('Valid Payload')
    const result = validateProject(project)

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects invalid schema version and reports path details', () => {
    const project = createSchemaValidProject('Invalid Version')
    project.schemaVersion = '2.0.0'

    const result = validateProject(project)

    expect(result.valid).toBe(false)
    expect(result.errors.some((entry) => entry.includes('/schemaVersion'))).toBe(true)
  })

  it('rejects payloads missing required fields', () => {
    const project = createSchemaValidProject('Missing Required')
    delete (project.scale as unknown as Record<string, unknown>).realUnitsPerPoint

    const result = validateProject(project)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects brightness settings outside the supported range', () => {
    const project = createSchemaValidProject('Invalid Brightness')
    project.settings.pdfBrightness = 1.2

    const result = validateProject(project)

    expect(result.valid).toBe(false)
    expect(result.errors.some((entry) => entry.includes('/settings/pdfBrightness'))).toBe(true)
  })

  it('rejects unexpected additional properties', () => {
    const project = createSchemaValidProject('Unexpected Field') as unknown as Record<string, unknown>
    project.extraField = true

    const result = validateProject(project)

    expect(result.valid).toBe(false)
    expect(result.errors.some((entry) => entry.includes('must NOT have additional properties'))).toBe(true)
  })
})
