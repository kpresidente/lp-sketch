import { describe, expect, it } from 'vitest'
import { createDefaultProject } from './defaultProject'
import { migrateProjectForLoad } from './migration'
import { validateProject } from './validation'
import type { LpProject } from '../types/project'

function createSchemaValidProject(name: string): LpProject {
  const project = createDefaultProject(name)

  project.projectMeta = {
    id: 'project-test',
    name,
    createdAt: '2026-02-12T00:00:00.000Z',
    updatedAt: '2026-02-12T00:00:00.000Z',
  }

  project.pdf = {
    sourceType: 'embedded',
    name: 'plan.pdf',
    sha256: 'a'.repeat(64),
    page: 1,
    pageCount: 1,
    pages: [{ page: 1, widthPt: 1000, heightPt: 800 }],
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
    byPage: {
      1: {
        isSet: true,
        method: 'manual',
        realUnitsPerPoint: 0.25,
        displayUnits: 'ft-in',
      },
    },
  }

  return project
}

describe('project migration', () => {
  it('normalizes compatible 1.x payloads before schema validation', () => {
    const legacyProject = createSchemaValidProject('Legacy')
    legacyProject.schemaVersion = '1.0.7'

    ;(legacyProject.settings as unknown as Record<string, unknown>).perpendicularSnapEnabled = true
    delete (legacyProject.settings as unknown as Record<string, unknown>).angleIncrementDeg
    delete (legacyProject.settings as unknown as Record<string, unknown>).designScale
    delete (legacyProject.settings as unknown as Record<string, unknown>).pdfBrightness
    delete (legacyProject.settings as unknown as Record<string, unknown>).autoConnectorsEnabled
    delete (legacyProject.settings as unknown as Record<string, unknown>).autoConnectorType
    delete (legacyProject as unknown as Record<string, unknown>).layers
    delete (legacyProject.elements as unknown as Record<string, unknown>).curves
    delete (legacyProject.elements as unknown as Record<string, unknown>).texts
    delete (legacyProject.elements as unknown as Record<string, unknown>).arrows
    delete (legacyProject.elements as unknown as Record<string, unknown>).dimensionTexts
    delete (legacyProject.legend as unknown as Record<string, unknown>).placements
    delete (legacyProject.legend as unknown as Record<string, unknown>).customSuffixes

    const migration = migrateProjectForLoad(legacyProject)
    const result = migration.project as typeof legacyProject

    expect(migration.migrated).toBe(true)
    expect(migration.fromVersion).toBe('1.0.7')
    expect(migration.toVersion).toBe('1.9.0')
    expect(result.schemaVersion).toBe('1.9.0')
    expect('perpendicularSnapEnabled' in (result.settings as unknown as Record<string, unknown>)).toBe(false)
    expect(result.settings.angleIncrementDeg).toBe(15)
    expect(result.settings.designScale).toBe('small')
    expect(result.settings.pdfBrightness).toBe(1)
    expect(result.settings.autoConnectorsEnabled).toBe(true)
    expect(result.settings.autoConnectorType).toBe('mechanical')
    expect(result.settings.legendDataScope).toBe('global')
    expect(result.settings.notesDataScope).toBe('global')
    expect(result.settings.pdfBrightnessByPage[1]).toBe(1)
    expect(result.pdf.pageCount).toBe(1)
    expect(result.pdf.pages).toEqual([{ page: 1, widthPt: 1000, heightPt: 800 }])
    expect(result.view.currentPage).toBe(1)
    expect(result.view.byPage[1]).toEqual({ zoom: 1, pan: { x: 24, y: 24 } })
    expect(result.scale.byPage[1]).toEqual({
      isSet: true,
      method: 'manual',
      realUnitsPerPoint: 0.25,
      displayUnits: 'ft-in',
    })
    expect(Array.isArray(result.elements.arcs)).toBe(true)
    expect(Array.isArray(result.elements.curves)).toBe(true)
    expect(result.elements.arcs).toHaveLength(0)
    expect(Array.isArray(result.elements.texts)).toBe(true)
    expect(Array.isArray(result.elements.arrows)).toBe(true)
    expect(Array.isArray(result.elements.dimensionTexts)).toBe(true)
    expect(Array.isArray(result.legend.placements)).toBe(true)
    expect(result.legend.customSuffixes).toEqual({})
    expect(result.layers).toEqual({
      rooftop: true,
      downleads: true,
      grounding: true,
      annotation: true,
    })

    const validation = validateProject(result)
    expect(validation.valid).toBe(true)
  })

  it('rejects unknown major schema versions', () => {
    const incompatible = createSchemaValidProject('Future')
    incompatible.schemaVersion = '2.0.0'

    expect(() => migrateProjectForLoad(incompatible)).toThrowError(
      'Unsupported project schema major version 2. This build supports 1.x.x only.',
    )
  })

  it('rejects invalid schema version format', () => {
    const incompatible = createSchemaValidProject('Bad Semver')
    incompatible.schemaVersion = '1.0'

    expect(() => migrateProjectForLoad(incompatible)).toThrowError(
      'Invalid schemaVersion "1.0". Expected semantic version format x.y.z.',
    )
  })

  it('rejects non-object root payloads', () => {
    expect(() => migrateProjectForLoad('not-an-object')).toThrowError(
      'Project root must be an object.',
    )
  })

  it('is deterministic for the same input payload', () => {
    const legacyProject = createSchemaValidProject('Deterministic')
    legacyProject.schemaVersion = '1.0.3'

    delete (legacyProject.settings as unknown as Record<string, unknown>).angleIncrementDeg
    delete (legacyProject.elements as unknown as Record<string, unknown>).curves
    delete (legacyProject.elements as unknown as Record<string, unknown>).texts
    delete (legacyProject.elements as unknown as Record<string, unknown>).arrows
    delete (legacyProject.elements as unknown as Record<string, unknown>).dimensionTexts

    const first = migrateProjectForLoad(legacyProject)
    const second = migrateProjectForLoad(legacyProject)

    expect(first).toEqual(second)
  })

  it('keeps current schema payloads unchanged', () => {
    const current = createSchemaValidProject('Current')
    const migration = migrateProjectForLoad(current)

    expect(migration.migrated).toBe(false)
    expect(migration.fromVersion).toBe('1.9.0')
    expect(migration.toVersion).toBe('1.9.0')
    expect(migration.project).toEqual(current)
  })

  it('normalizes invalid layer values for annotation elements and layer visibility map', () => {
    const legacyProject = createSchemaValidProject('Legacy Layers')
    legacyProject.schemaVersion = '1.4.2'

    ;(legacyProject as unknown as Record<string, unknown>).layers = {
      rooftop: 'yes',
      downleads: false,
      grounding: null,
    }

    ;(legacyProject.elements as unknown as Record<string, unknown>).texts = [
      {
        id: 'text-1',
        position: { x: 10, y: 12 },
        text: 'NOTE',
        color: 'green',
        layer: 'bad-layer',
      },
    ]
    ;(legacyProject.elements as unknown as Record<string, unknown>).arrows = [
      {
        id: 'arrow-1',
        tail: { x: 20, y: 22 },
        head: { x: 44, y: 66 },
        color: 'blue',
      },
    ]
    ;(legacyProject.elements as unknown as Record<string, unknown>).dimensionTexts = [
      {
        id: 'dimension-text-1',
        start: { x: 40, y: 42 },
        end: { x: 80, y: 42 },
        position: { x: 60, y: 48 },
        layer: 'also-bad',
      },
    ]

    const migration = migrateProjectForLoad(legacyProject)
    const result = migration.project as LpProject

    expect(result.layers).toEqual({
      rooftop: true,
      downleads: false,
      grounding: true,
      annotation: true,
    })
    expect(result.elements.texts[0].layer).toBe('annotation')
    expect(result.elements.arrows[0].layer).toBe('annotation')
    expect(result.elements.dimensionTexts[0].layer).toBe('annotation')

    const validation = validateProject(result)
    expect(validation.valid).toBe(true)
  })

  it('normalizes invalid auto-connector type values', () => {
    const legacyProject = createSchemaValidProject('Legacy Connector Type')
    legacyProject.schemaVersion = '1.5.2'
    ;(legacyProject.settings as unknown as Record<string, unknown>).autoConnectorType = 'invalid'

    const migration = migrateProjectForLoad(legacyProject)
    const result = migration.project as LpProject

    expect(result.settings.autoConnectorType).toBe('mechanical')
    expect(migration.migrated).toBe(true)
  })

  it('clamps invalid PDF brightness values into the supported range', () => {
    const legacyProject = createSchemaValidProject('Legacy Brightness')
    legacyProject.schemaVersion = '1.5.2'
    ;(legacyProject.settings as unknown as Record<string, unknown>).pdfBrightness = 1.8

    const migration = migrateProjectForLoad(legacyProject)
    const result = migration.project as LpProject
    expect(result.settings.pdfBrightness).toBe(1)
    expect(migration.migrated).toBe(true)

    ;(legacyProject.settings as unknown as Record<string, unknown>).pdfBrightness = -0.5
    const secondMigration = migrateProjectForLoad(legacyProject)
    const secondResult = secondMigration.project as LpProject
    expect(secondResult.settings.pdfBrightness).toBe(0)
    expect(secondMigration.migrated).toBe(true)
  })

  it('creates and normalizes notesByPage for legacy projects', () => {
    const legacyProject = createSchemaValidProject('Legacy Notes By Page')
    legacyProject.schemaVersion = '1.3.0'
    ;(legacyProject.generalNotes as unknown as Record<string, unknown>).notes = ['  Note A  ', '', 42]
    delete (legacyProject.generalNotes as unknown as Record<string, unknown>).notesByPage

    const migration = migrateProjectForLoad(legacyProject)
    const result = migration.project as LpProject

    expect(result.generalNotes.notes).toEqual(['Note A'])
    expect(result.generalNotes.notesByPage).toEqual({ 1: [] })
    expect(migration.migrated).toBe(true)
  })

  it('drops invalid dimension linework flags and preserves valid booleans', () => {
    const legacyProject = createSchemaValidProject('Legacy Dimension Linework')
    legacyProject.schemaVersion = '1.6.4'
    legacyProject.elements.dimensionTexts.push({
      id: 'dimension-text-1',
      start: { x: 10, y: 10 },
      end: { x: 50, y: 10 },
      position: { x: 30, y: 24 },
      layer: 'annotation',
      showLinework: true,
    })
    legacyProject.elements.dimensionTexts.push({
      id: 'dimension-text-2',
      start: { x: 20, y: 20 },
      end: { x: 60, y: 20 },
      position: { x: 40, y: 34 },
      layer: 'annotation',
      showLinework: 'yes' as unknown as boolean,
    })

    const migration = migrateProjectForLoad(legacyProject)
    const result = migration.project as LpProject

    expect(result.elements.dimensionTexts[0].showLinework).toBe(true)
    expect('showLinework' in result.elements.dimensionTexts[1]).toBe(false)
    expect(migration.migrated).toBe(true)
  })
})
