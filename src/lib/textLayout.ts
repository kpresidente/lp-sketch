import {
  approximateTextWidthForScale,
  textLineHeightPxForScale,
} from './annotationScale'

export function splitTextIntoLines(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  return lines.length > 0 ? lines : ['']
}

export function textBlockApproxWidthPx(text: string, designScale: number): number {
  const lines = splitTextIntoLines(text)
  let maxWidth = 0

  for (const line of lines) {
    maxWidth = Math.max(maxWidth, approximateTextWidthForScale(line, designScale))
  }

  return maxWidth
}

export function textBlockApproxHeightPx(text: string, designScale: number): number {
  const lineCount = splitTextIntoLines(text).length
  return Math.max(1, lineCount) * textLineHeightPxForScale(designScale)
}

