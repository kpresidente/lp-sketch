import { describe, expect, it } from 'vitest'
import {
  splitTextIntoLines,
  textBlockApproxHeightPx,
  textBlockApproxWidthPx,
} from './textLayout'

describe('text layout helpers', () => {
  it('splits multiline text and normalizes CRLF endings', () => {
    expect(splitTextIntoLines('Line 1\r\nLine 2\rLine 3')).toEqual([
      'Line 1',
      'Line 2',
      'Line 3',
    ])
  })

  it('computes width from the longest line', () => {
    const singleLineWidth = textBlockApproxWidthPx('short', 1)
    const multilineWidth = textBlockApproxWidthPx('short\nthis is much longer', 1)
    expect(multilineWidth).toBeGreaterThan(singleLineWidth)
  })

  it('computes height from line count', () => {
    const oneLineHeight = textBlockApproxHeightPx('one', 1)
    const threeLineHeight = textBlockApproxHeightPx('one\ntwo\nthree', 1)
    expect(threeLineHeight).toBe(oneLineHeight * 3)
  })
})

