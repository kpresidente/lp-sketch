const SUPPORTED_SCHEMA_MAJOR = 1
export const LATEST_SCHEMA_VERSION = '1.9.0'

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

const DEFAULT_PAGE_WIDTH_PT = 1200
const DEFAULT_PAGE_HEIGHT_PT = 900
const DEFAULT_PAGE_NUMBER = 1
const DEFAULT_PAN_X = 24
const DEFAULT_PAN_Y = 24
const MIN_ZOOM = 0.25
const MAX_ZOOM = 8

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

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  const normalized = Math.trunc(value)
  if (normalized < 1) {
    return fallback
  }

  return normalized
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback
  }

  return value
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeZoom(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1
  }

  return clampNumber(value, MIN_ZOOM, MAX_ZOOM)
}

function normalizePointRecord(value: unknown, fallbackX: number, fallbackY: number): { x: number; y: number } {
  if (!isRecord(value)) {
    return { x: fallbackX, y: fallbackY }
  }

  const x = typeof value.x === 'number' && Number.isFinite(value.x) ? value.x : fallbackX
  const y = typeof value.y === 'number' && Number.isFinite(value.y) ? value.y : fallbackY
  return { x, y }
}

function normalizeScaleSnapshot(value: unknown): {
  isSet: boolean
  method: 'manual' | 'calibrated' | null
  realUnitsPerPoint: number | null
  displayUnits: 'ft-in' | 'decimal-ft' | 'm' | null
} {
  const source = isRecord(value) ? value : {}

  const isSet = typeof source.isSet === 'boolean' ? source.isSet : false
  const methodRaw = source.method
  const method: 'manual' | 'calibrated' | null =
    methodRaw === 'manual' || methodRaw === 'calibrated' || methodRaw === null
      ? methodRaw
      : null
  const unitsRaw = source.displayUnits
  const displayUnits: 'ft-in' | 'decimal-ft' | 'm' | null =
    unitsRaw === 'ft-in' || unitsRaw === 'decimal-ft' || unitsRaw === 'm' || unitsRaw === null
      ? unitsRaw
      : null
  const realUnits =
    typeof source.realUnitsPerPoint === 'number' && Number.isFinite(source.realUnitsPerPoint)
      ? source.realUnitsPerPoint
      : null

  if (!isSet) {
    return {
      isSet: false,
      method: null,
      realUnitsPerPoint: null,
      displayUnits: null,
    }
  }

  return {
    isSet: true,
    method: method ?? 'manual',
    realUnitsPerPoint: realUnits && realUnits > 0 ? realUnits : 1,
    displayUnits: displayUnits ?? 'ft-in',
  }
}

function normalizePage(value: unknown, pageCount: number, fallback: number): number {
  const normalized = normalizePositiveInteger(value, fallback)
  return clampNumber(normalized, 1, Math.max(1, pageCount))
}

function normalizePageOnArray(
  entries: unknown,
  pageCount: number,
  fallbackPage: number,
): boolean {
  if (!Array.isArray(entries)) {
    return false
  }

  let changed = false
  for (const entry of entries) {
    if (!isRecord(entry)) {
      continue
    }

    const normalizedPage = normalizePage(entry.page, pageCount, fallbackPage)
    if (entry.page !== normalizedPage) {
      entry.page = normalizedPage
      changed = true
    }
  }

  return changed
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

  const pdfResult = ensureRecord(project, 'pdf')
  migrated = pdfResult.changed || migrated
  const pdfRecord = pdfResult.record

  const fallbackWidth = normalizePositiveNumber(pdfRecord.widthPt, DEFAULT_PAGE_WIDTH_PT)
  if (pdfRecord.widthPt !== fallbackWidth) {
    pdfRecord.widthPt = fallbackWidth
    migrated = true
  }

  const fallbackHeight = normalizePositiveNumber(pdfRecord.heightPt, DEFAULT_PAGE_HEIGHT_PT)
  if (pdfRecord.heightPt !== fallbackHeight) {
    pdfRecord.heightPt = fallbackHeight
    migrated = true
  }

  const originalPdfPages = Array.isArray(pdfRecord.pages) ? structuredClone(pdfRecord.pages) : null
  const rawPages = Array.isArray(pdfRecord.pages) ? pdfRecord.pages : []
  const normalizedPdfPages: Array<{ page: number; widthPt: number; heightPt: number }> = []
  for (const rawPage of rawPages) {
    if (!isRecord(rawPage)) {
      continue
    }

    normalizedPdfPages.push({
      page: normalizePositiveInteger(rawPage.page, normalizedPdfPages.length + 1),
      widthPt: normalizePositiveNumber(rawPage.widthPt, fallbackWidth),
      heightPt: normalizePositiveNumber(rawPage.heightPt, fallbackHeight),
    })
  }

  if (normalizedPdfPages.length === 0) {
    normalizedPdfPages.push({
      page: DEFAULT_PAGE_NUMBER,
      widthPt: fallbackWidth,
      heightPt: fallbackHeight,
    })
  }

  for (let index = 0; index < normalizedPdfPages.length; index += 1) {
    normalizedPdfPages[index].page = index + 1
  }

  const normalizedPageCount = normalizedPdfPages.length
  if (pdfRecord.pageCount !== normalizedPageCount) {
    pdfRecord.pageCount = normalizedPageCount
    migrated = true
  }

  pdfRecord.pages = normalizedPdfPages
  if (JSON.stringify(originalPdfPages) !== JSON.stringify(normalizedPdfPages)) {
    migrated = true
  }

  const normalizedPdfPage = normalizePage(pdfRecord.page, normalizedPageCount, DEFAULT_PAGE_NUMBER)
  if (pdfRecord.page !== normalizedPdfPage) {
    pdfRecord.page = normalizedPdfPage
    migrated = true
  }

  const activePdfPage = normalizedPdfPages[normalizedPdfPage - 1] ?? normalizedPdfPages[0]
  if (pdfRecord.widthPt !== activePdfPage.widthPt) {
    pdfRecord.widthPt = activePdfPage.widthPt
    migrated = true
  }
  if (pdfRecord.heightPt !== activePdfPage.heightPt) {
    pdfRecord.heightPt = activePdfPage.heightPt
    migrated = true
  }

  const viewResult = ensureRecord(project, 'view')
  migrated = viewResult.changed || migrated
  const viewRecord = viewResult.record
  const normalizedViewZoom = normalizeZoom(viewRecord.zoom)
  if (viewRecord.zoom !== normalizedViewZoom) {
    viewRecord.zoom = normalizedViewZoom
    migrated = true
  }
  const normalizedViewPan = normalizePointRecord(viewRecord.pan, DEFAULT_PAN_X, DEFAULT_PAN_Y)
  if (!isRecord(viewRecord.pan) || viewRecord.pan.x !== normalizedViewPan.x || viewRecord.pan.y !== normalizedViewPan.y) {
    viewRecord.pan = normalizedViewPan
    migrated = true
  }
  const normalizedCurrentPage = normalizePage(
    viewRecord.currentPage,
    normalizedPageCount,
    normalizedPdfPage,
  )
  if (viewRecord.currentPage !== normalizedCurrentPage) {
    viewRecord.currentPage = normalizedCurrentPage
    migrated = true
  }

  const originalViewByPage = isRecord(viewRecord.byPage) ? structuredClone(viewRecord.byPage) : null
  const normalizedViewByPage: Record<string, { zoom: number; pan: { x: number; y: number } }> = {}
  if (isRecord(viewRecord.byPage)) {
    for (const [pageKey, pageView] of Object.entries(viewRecord.byPage)) {
      const numericPage = normalizePositiveInteger(Number.parseInt(pageKey, 10), Number.NaN)
      if (!Number.isFinite(numericPage) || numericPage > normalizedPageCount) {
        continue
      }
      if (!isRecord(pageView)) {
        continue
      }

      normalizedViewByPage[String(numericPage)] = {
        zoom: normalizeZoom(pageView.zoom),
        pan: normalizePointRecord(pageView.pan, normalizedViewPan.x, normalizedViewPan.y),
      }
    }
  }

  if (!normalizedViewByPage[String(normalizedCurrentPage)]) {
    normalizedViewByPage[String(normalizedCurrentPage)] = {
      zoom: normalizedViewZoom,
      pan: normalizedViewPan,
    }
  }

  viewRecord.byPage = normalizedViewByPage
  if (JSON.stringify(originalViewByPage) !== JSON.stringify(normalizedViewByPage)) {
    migrated = true
  }
  const currentViewSnapshot = normalizedViewByPage[String(normalizedCurrentPage)]
  if (viewRecord.zoom !== currentViewSnapshot.zoom) {
    viewRecord.zoom = currentViewSnapshot.zoom
    migrated = true
  }
  if (
    !isRecord(viewRecord.pan) ||
    viewRecord.pan.x !== currentViewSnapshot.pan.x ||
    viewRecord.pan.y !== currentViewSnapshot.pan.y
  ) {
    viewRecord.pan = currentViewSnapshot.pan
    migrated = true
  }

  const scaleResult = ensureRecord(project, 'scale')
  migrated = scaleResult.changed || migrated
  const scaleRecord = scaleResult.record
  const normalizedScale = normalizeScaleSnapshot(scaleRecord)
  for (const [key, value] of Object.entries(normalizedScale)) {
    if (scaleRecord[key] !== value) {
      scaleRecord[key] = value
      migrated = true
    }
  }

  const originalScaleByPage = isRecord(scaleRecord.byPage) ? structuredClone(scaleRecord.byPage) : null
  const normalizedScaleByPage: Record<string, typeof normalizedScale> = {}
  if (isRecord(scaleRecord.byPage)) {
    for (const [pageKey, pageScale] of Object.entries(scaleRecord.byPage)) {
      const numericPage = normalizePositiveInteger(Number.parseInt(pageKey, 10), Number.NaN)
      if (!Number.isFinite(numericPage) || numericPage > normalizedPageCount) {
        continue
      }

      normalizedScaleByPage[String(numericPage)] = normalizeScaleSnapshot(pageScale)
    }
  }

  if (!normalizedScaleByPage[String(normalizedCurrentPage)]) {
    normalizedScaleByPage[String(normalizedCurrentPage)] = normalizedScale
  }

  scaleRecord.byPage = normalizedScaleByPage
  if (JSON.stringify(originalScaleByPage) !== JSON.stringify(normalizedScaleByPage)) {
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

  migrated = normalizePageOnArray(elementsResult.record.lines, normalizedPageCount, normalizedCurrentPage) || migrated
  migrated = normalizePageOnArray(elementsResult.record.arcs, normalizedPageCount, normalizedCurrentPage) || migrated
  migrated = normalizePageOnArray(elementsResult.record.curves, normalizedPageCount, normalizedCurrentPage) || migrated
  migrated = normalizePageOnArray(elementsResult.record.symbols, normalizedPageCount, normalizedCurrentPage) || migrated
  migrated = normalizePageOnArray(elementsResult.record.texts, normalizedPageCount, normalizedCurrentPage) || migrated
  migrated = normalizePageOnArray(elementsResult.record.arrows, normalizedPageCount, normalizedCurrentPage) || migrated
  migrated = normalizePageOnArray(
    elementsResult.record.dimensionTexts,
    normalizedPageCount,
    normalizedCurrentPage,
  ) || migrated

  const layersResult = ensureRecord(project, 'layers')
  migrated = layersResult.changed || migrated
  const layerKeys = ['rooftop', 'downleads', 'grounding', 'annotation'] as const
  for (const key of layerKeys) {
    migrated = ensureLiteralBoolean(layersResult.record, key, true) || migrated
  }

  const constructionResult = ensureRecord(project, 'construction')
  migrated = constructionResult.changed || migrated
  migrated = ensureArray(constructionResult.record, 'marks') || migrated
  migrated = normalizePageOnArray(constructionResult.record.marks, normalizedPageCount, normalizedCurrentPage) || migrated

  const legendResult = ensureRecord(project, 'legend')
  migrated = legendResult.changed || migrated
  migrated = ensureArray(legendResult.record, 'items') || migrated
  migrated = ensureArray(legendResult.record, 'placements') || migrated
  migrated = normalizePageOnArray(legendResult.record.placements, normalizedPageCount, normalizedCurrentPage) || migrated
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
  migrated =
    normalizePageOnArray(generalNotesResult.record.placements, normalizedPageCount, normalizedCurrentPage) || migrated
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
  const notesByPageResult = ensureRecord(generalNotesResult.record, 'notesByPage')
  migrated = notesByPageResult.changed || migrated
  const originalNotesByPage = isRecord(generalNotesResult.record.notesByPage)
    ? structuredClone(generalNotesResult.record.notesByPage)
    : null
  const normalizedNotesByPage: Record<string, string[]> = {}
  for (const [pageKey, rawNotes] of Object.entries(notesByPageResult.record)) {
    const numericPage = normalizePositiveInteger(Number.parseInt(pageKey, 10), Number.NaN)
    if (!Number.isFinite(numericPage) || numericPage > normalizedPageCount) {
      migrated = true
      continue
    }

    if (!Array.isArray(rawNotes)) {
      migrated = true
      continue
    }

    const normalizedPageNotes: string[] = []
    for (const rawNote of rawNotes) {
      if (typeof rawNote !== 'string') {
        migrated = true
        continue
      }

      const normalized = rawNote.trim().slice(0, MAX_GENERAL_NOTE_LENGTH)
      if (normalized.length === 0) {
        migrated = true
        continue
      }

      normalizedPageNotes.push(normalized)
      if (normalizedPageNotes.length >= MAX_GENERAL_NOTES_COUNT) {
        if (rawNotes.length > MAX_GENERAL_NOTES_COUNT) {
          migrated = true
        }
        break
      }
    }

    normalizedNotesByPage[String(numericPage)] = normalizedPageNotes
  }
  if (!Object.prototype.hasOwnProperty.call(normalizedNotesByPage, String(normalizedCurrentPage))) {
    normalizedNotesByPage[String(normalizedCurrentPage)] = []
    migrated = true
  }
  generalNotesResult.record.notesByPage = normalizedNotesByPage
  if (JSON.stringify(originalNotesByPage) !== JSON.stringify(normalizedNotesByPage)) {
    migrated = true
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
    'legendDataScope',
    ['page', 'global'],
    'global',
  ) || migrated
  migrated = ensureOneOfString(
    settingsResult.record,
    'notesDataScope',
    ['page', 'global'],
    'global',
  ) || migrated
  const originalPdfBrightnessByPage = isRecord(settingsResult.record.pdfBrightnessByPage)
    ? structuredClone(settingsResult.record.pdfBrightnessByPage)
    : null
  const normalizedBrightnessByPage: Record<string, number> = {}
  if (isRecord(settingsResult.record.pdfBrightnessByPage)) {
    for (const [pageKey, brightness] of Object.entries(settingsResult.record.pdfBrightnessByPage)) {
      const numericPage = normalizePositiveInteger(Number.parseInt(pageKey, 10), Number.NaN)
      if (!Number.isFinite(numericPage) || numericPage > normalizedPageCount) {
        continue
      }

      normalizedBrightnessByPage[String(numericPage)] = normalizePdfBrightness(brightness)
    }
  }
  normalizedBrightnessByPage[String(normalizedCurrentPage)] = normalizedPdfBrightness
  settingsResult.record.pdfBrightnessByPage = normalizedBrightnessByPage
  if (JSON.stringify(originalPdfBrightnessByPage) !== JSON.stringify(normalizedBrightnessByPage)) {
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
