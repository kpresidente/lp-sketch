import { approximateTextWidthForScale } from './annotationScale'

export const GENERAL_NOTES_TITLE = 'General Notes'
export const MAX_GENERAL_NOTES_COUNT = 15
export const MAX_GENERAL_NOTE_LENGTH = 120

export interface GeneralNotesUiMetrics {
  titleFontSizePx: number
  textFontSizePx: number
  paddingXPx: number
  paddingYPx: number
  titleHeightPx: number
  rowHeightPx: number
}

export function scaledGeneralNotesMetrics(scale: number): GeneralNotesUiMetrics {
  return {
    titleFontSizePx: 13 * scale,
    textFontSizePx: 12 * scale,
    paddingXPx: 8 * scale,
    paddingYPx: 8 * scale,
    titleHeightPx: 18 * scale,
    rowHeightPx: 20 * scale,
  }
}

export function normalizeGeneralNoteText(value: string): string {
  return value.trim().slice(0, MAX_GENERAL_NOTE_LENGTH)
}

export function normalizeGeneralNotesList(notes: readonly string[]): string[] {
  const normalized: string[] = []
  for (const raw of notes) {
    const note = normalizeGeneralNoteText(raw)
    if (note.length === 0) {
      continue
    }

    normalized.push(note)
    if (normalized.length >= MAX_GENERAL_NOTES_COUNT) {
      break
    }
  }

  return normalized
}

export function generalNoteLineText(note: string, index: number): string {
  return `${index + 1}. ${note}`
}

export function generalNotesDisplayLines(notes: readonly string[]): string[] {
  if (notes.length === 0) {
    return ['No notes added.']
  }

  return notes.map((note, index) => generalNoteLineText(note, index))
}

export function generalNotesBoxSize(
  notes: readonly string[],
  designScale: number,
): { width: number; height: number } {
  const metrics = scaledGeneralNotesMetrics(designScale)
  const lines = generalNotesDisplayLines(notes)
  const widestText = lines.reduce(
    (max, line) => Math.max(max, approximateTextWidthForScale(line, designScale)),
    approximateTextWidthForScale(GENERAL_NOTES_TITLE, designScale),
  )

  const width = Math.max(
    220 * designScale,
    metrics.paddingXPx * 2 + widestText + 12 * designScale,
  )
  const height =
    metrics.paddingYPx * 2 +
    metrics.titleHeightPx +
    lines.length * metrics.rowHeightPx

  return { width, height }
}
