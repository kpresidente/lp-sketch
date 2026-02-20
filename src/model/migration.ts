const SUPPORTED_SCHEMA_MAJOR = 1
export const LATEST_SCHEMA_VERSION = '1.8.0'

type UnknownRecord = Record<string, unknown>

export interface MigrationResult {
  project: unknown
  fromVersion: string
  toVersion: string
  migrated: boolean
}

interface ParsedVersion {
  major: number
  minor: number
  patch: number
}

const DOWNLEAD_SYMBOL_TYPES = new Set([
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
])
const LETTERED_SYMBOL_TYPES = new Set([
  'air_terminal',
  'bonded_air_terminal',
])
const MAX_LEGEND_SUFFIX_LENGTH = 24
const MAX_GENERAL_NOTES_COUNT = 15
const MAX_GENERAL_NOTE_LENGTH = 120

function parseSemver(version: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim())
  if (!match) {
    return null
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ensureRecord(parent: UnknownRecord, key: string): { record: UnknownRecord; changed: boolean } {
  const existing = parent[key]
  if (isRecord(existing)) {
    return { record: existing, changed: false }
  }

  const record: UnknownRecord = {}
  parent[key] = record
  return { record, changed: true }
}

function ensureArray(parent: UnknownRecord, key: string): boolean {
  if (Array.isArray(parent[key])) {
    return false
  }

  parent[key] = []
  return true
}

function ensureLiteralNumber(parent: UnknownRecord, key: string, value: number): boolean {
  if (typeof parent[key] === 'number') {
    return false
  }

  parent[key] = value
  return true
}

function ensureLiteralBoolean(parent: UnknownRecord, key: string, value: boolean): boolean {
  if (typeof parent[key] === 'boolean') {
    return false
  }

  parent[key] = value
  return true
}

function ensureOneOfString(
  parent: UnknownRecord,
  key: string,
  allowedValues: readonly string[],
  defaultValue: string,
): boolean {
  const existing = parent[key]

  if (typeof existing === 'string' && allowedValues.includes(existing)) {
    return false
  }

  parent[key] = defaultValue
  return true
}

function removeProperty(parent: UnknownRecord, key: string): boolean {
  if (!(key in parent)) {
    return false
  }

  delete parent[key]
  return true
}

function normalizeVerticalFootageValue(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(999, Math.round(value)))
}

function normalizePdfBrightness(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1
  }

  return Math.max(0, Math.min(1, value))
}

function normalizeSymbolLetter(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim().toUpperCase()
  if (!/^[A-Z]$/.test(trimmed)) {
    return undefined
  }

  return trimmed
}

function normalizeAutoConnectorFlag(value: unknown): boolean | undefined {
  if (typeof value !== 'boolean') {
    return undefined
  }
  return value
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value !== 'boolean') {
    return undefined
  }
  return value
}

function normalizeLayerId(value: unknown): 'rooftop' | 'downleads' | 'grounding' | 'annotation' | undefined {
  if (value === 'rooftop' || value === 'downleads' || value === 'grounding' || value === 'annotation') {
    return value
  }

  return undefined
}

export function migrateProjectForLoad(input: unknown): MigrationResult {
  if (!isRecord(input)) {
    throw new Error('Project root must be an object.')
  }

  const project = structuredClone(input) as UnknownRecord
  const versionValue = project.schemaVersion

  if (typeof versionValue !== 'string') {
    throw new Error('Project schemaVersion is missing or invalid.')
  }

  const parsedVersion = parseSemver(versionValue)
  if (!parsedVersion) {
    throw new Error(`Invalid schemaVersion "${versionValue}". Expected semantic version format x.y.z.`)
  }

  if (parsedVersion.major !== SUPPORTED_SCHEMA_MAJOR) {
    throw new Error(
      `Unsupported project schema major version ${parsedVersion.major}. This build supports ${SUPPORTED_SCHEMA_MAJOR}.x.x only.`,
    )
  }

  let migrated = false

  if (versionValue !== LATEST_SCHEMA_VERSION) {
    project.schemaVersion = LATEST_SCHEMA_VERSION
    migrated = true
  }

  const elementsResult = ensureRecord(project, 'elements')
  migrated = elementsResult.changed || migrated
  const hadArcs = Array.isArray(elementsResult.record.arcs)
  const hadCurves = Array.isArray(elementsResult.record.curves)
  const legacyArcs = hadArcs ? structuredClone(elementsResult.record.arcs) : []
  migrated = ensureArray(elementsResult.record, 'arcs') || migrated
  if (!hadCurves) {
    elementsResult.record.curves = legacyArcs
    migrated = true
  }
  if (parsedVersion.minor < 1 && hadArcs && !hadCurves) {
    elementsResult.record.arcs = []
    migrated = true
  }
  migrated = ensureArray(elementsResult.record, 'curves') || migrated
  migrated = ensureArray(elementsResult.record, 'texts') || migrated
  migrated = ensureArray(elementsResult.record, 'arrows') || migrated
  migrated = ensureArray(elementsResult.record, 'dimensionTexts') || migrated
  migrated = ensureArray(elementsResult.record, 'symbols') || migrated

  const symbols = elementsResult.record.symbols
  if (Array.isArray(symbols)) {
    for (const symbol of symbols) {
      if (!isRecord(symbol)) {
        continue
      }

      const symbolType = symbol.symbolType
      if (typeof symbolType !== 'string') {
        continue
      }

      if (!DOWNLEAD_SYMBOL_TYPES.has(symbolType)) {
        if ('verticalFootageFt' in symbol) {
          delete symbol.verticalFootageFt
          migrated = true
        }
      } else {
        const normalized = normalizeVerticalFootageValue(symbol.verticalFootageFt)
        if (symbol.verticalFootageFt !== normalized) {
          symbol.verticalFootageFt = normalized
          migrated = true
        }
      }

      if (LETTERED_SYMBOL_TYPES.has(symbolType)) {
        const normalizedLetter = normalizeSymbolLetter(symbol.letter)
        if (normalizedLetter) {
          if (symbol.letter !== normalizedLetter) {
            symbol.letter = normalizedLetter
            migrated = true
          }
        } else if ('letter' in symbol) {
          delete symbol.letter
          migrated = true
        }
      } else if ('letter' in symbol) {
        delete symbol.letter
        migrated = true
      }

      const normalizedAutoConnector = normalizeAutoConnectorFlag(symbol.autoConnector)
      if (normalizedAutoConnector === undefined) {
        if ('autoConnector' in symbol) {
          delete symbol.autoConnector
          migrated = true
        }
      } else if (
        symbolType === 'cable_to_cable_connection' ||
        symbolType === 'cadweld_connection'
      ) {
        if (symbol.autoConnector !== normalizedAutoConnector) {
          symbol.autoConnector = normalizedAutoConnector
          migrated = true
        }
      } else if ('autoConnector' in symbol) {
        delete symbol.autoConnector
        migrated = true
      }
    }
  }

  const texts = elementsResult.record.texts
  if (Array.isArray(texts)) {
    for (const textElement of texts) {
      if (!isRecord(textElement)) {
        continue
      }

      const normalizedLayer = normalizeLayerId(textElement.layer) ?? 'annotation'
      if (textElement.layer !== normalizedLayer) {
        textElement.layer = normalizedLayer
        migrated = true
      }
    }
  }

  const arrows = elementsResult.record.arrows
  if (Array.isArray(arrows)) {
    for (const arrowElement of arrows) {
      if (!isRecord(arrowElement)) {
        continue
      }

      const normalizedLayer = normalizeLayerId(arrowElement.layer) ?? 'annotation'
      if (arrowElement.layer !== normalizedLayer) {
        arrowElement.layer = normalizedLayer
        migrated = true
      }
    }
  }

  const dimensionTexts = elementsResult.record.dimensionTexts
  if (Array.isArray(dimensionTexts)) {
    for (const dimensionText of dimensionTexts) {
      if (!isRecord(dimensionText)) {
        continue
      }

      const normalizedLayer = normalizeLayerId(dimensionText.layer) ?? 'annotation'
      if (dimensionText.layer !== normalizedLayer) {
        dimensionText.layer = normalizedLayer
        migrated = true
      }

      const normalizedShowLinework = normalizeOptionalBoolean(dimensionText.showLinework)
      if (normalizedShowLinework === undefined) {
        if ('showLinework' in dimensionText) {
          delete dimensionText.showLinework
          migrated = true
        }
      } else if (dimensionText.showLinework !== normalizedShowLinework) {
        dimensionText.showLinework = normalizedShowLinework
        migrated = true
      }
    }
  }

  const layersResult = ensureRecord(project, 'layers')
  migrated = layersResult.changed || migrated
  const layerKeys = ['rooftop', 'downleads', 'grounding', 'annotation'] as const
  for (const key of layerKeys) {
    migrated = ensureLiteralBoolean(layersResult.record, key, true) || migrated
  }

  const constructionResult = ensureRecord(project, 'construction')
  migrated = constructionResult.changed || migrated
  migrated = ensureArray(constructionResult.record, 'marks') || migrated

  const legendResult = ensureRecord(project, 'legend')
  migrated = legendResult.changed || migrated
  migrated = ensureArray(legendResult.record, 'items') || migrated
  migrated = ensureArray(legendResult.record, 'placements') || migrated
  const customSuffixesResult = ensureRecord(legendResult.record, 'customSuffixes')
  migrated = customSuffixesResult.changed || migrated
  for (const [key, rawValue] of Object.entries(customSuffixesResult.record)) {
    if (typeof rawValue !== 'string') {
      delete customSuffixesResult.record[key]
      migrated = true
      continue
    }

    const normalized = rawValue.trim().slice(0, MAX_LEGEND_SUFFIX_LENGTH)
    if (normalized.length === 0) {
      delete customSuffixesResult.record[key]
      migrated = true
      continue
    }

    if (normalized !== rawValue) {
      customSuffixesResult.record[key] = normalized
      migrated = true
    }
  }

  const generalNotesResult = ensureRecord(project, 'generalNotes')
  migrated = generalNotesResult.changed || migrated
  migrated = ensureArray(generalNotesResult.record, 'notes') || migrated
  migrated = ensureArray(generalNotesResult.record, 'placements') || migrated
  if (Array.isArray(generalNotesResult.record.notes)) {
    const existingNotes = generalNotesResult.record.notes
    const normalizedNotes: string[] = []
    for (const rawNote of existingNotes) {
      if (typeof rawNote !== 'string') {
        migrated = true
        continue
      }

      const normalized = rawNote.trim().slice(0, MAX_GENERAL_NOTE_LENGTH)
      if (normalized.length === 0) {
        migrated = true
        continue
      }

      normalizedNotes.push(normalized)
      if (normalizedNotes.length >= MAX_GENERAL_NOTES_COUNT) {
        if (existingNotes.length > MAX_GENERAL_NOTES_COUNT) {
          migrated = true
        }
        break
      }
    }

    if (
      normalizedNotes.length !== existingNotes.length ||
      normalizedNotes.some((note, index) => note !== existingNotes[index])
    ) {
      generalNotesResult.record.notes = normalizedNotes
      migrated = true
    }
  }

  const settingsResult = ensureRecord(project, 'settings')
  migrated = settingsResult.changed || migrated
  migrated = ensureLiteralBoolean(settingsResult.record, 'snapEnabled', true) || migrated
  migrated = ensureLiteralBoolean(settingsResult.record, 'autoConnectorsEnabled', true) || migrated
  migrated = ensureOneOfString(
    settingsResult.record,
    'autoConnectorType',
    ['mechanical', 'cadweld'],
    'mechanical',
  ) || migrated
  migrated = ensureLiteralBoolean(settingsResult.record, 'angleSnapEnabled', true) || migrated
  migrated = ensureLiteralNumber(settingsResult.record, 'angleIncrementDeg', 15) || migrated
  const normalizedPdfBrightness = normalizePdfBrightness(settingsResult.record.pdfBrightness)
  if (settingsResult.record.pdfBrightness !== normalizedPdfBrightness) {
    settingsResult.record.pdfBrightness = normalizedPdfBrightness
    migrated = true
  }
  migrated = ensureOneOfString(
    settingsResult.record,
    'designScale',
    ['small', 'medium', 'large'],
    'small',
  ) || migrated
  migrated = removeProperty(settingsResult.record, 'perpendicularSnapEnabled') || migrated

  return {
    project,
    fromVersion: versionValue,
    toVersion: String(project.schemaVersion),
    migrated,
  }
}
