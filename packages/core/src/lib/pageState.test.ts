import { describe, expect, it } from 'vitest'
import {
  clampPageNumber,
  DEFAULT_PAGE_NUMBER,
  getPageScopedValue,
  normalizePageCount,
  pageNumbers,
  resolveCurrentPage,
  setPageScopedValue,
  type PageScopedMap,
} from './pageState'

describe('page state helpers', () => {
  it('normalizes page count to at least one', () => {
    expect(normalizePageCount(0)).toBe(1)
    expect(normalizePageCount(-5)).toBe(1)
    expect(normalizePageCount(Number.NaN)).toBe(1)
    expect(normalizePageCount(3.9)).toBe(3)
  })

  it('clamps page number within [1, pageCount]', () => {
    expect(clampPageNumber(0, 3)).toBe(1)
    expect(clampPageNumber(5, 3)).toBe(3)
    expect(clampPageNumber(2.8, 3)).toBe(2)
  })

  it('resolves current page with nullish fallback', () => {
    expect(resolveCurrentPage(undefined, 3)).toBe(DEFAULT_PAGE_NUMBER)
    expect(resolveCurrentPage(null, 3)).toBe(DEFAULT_PAGE_NUMBER)
    expect(resolveCurrentPage(2, 3)).toBe(2)
  })

  it('returns sequential page numbers', () => {
    expect(pageNumbers(1)).toEqual([1])
    expect(pageNumbers(3)).toEqual([1, 2, 3])
  })

  it('reads and writes page-scoped values', () => {
    const initial: PageScopedMap<string> = { 1: 'a' }
    expect(getPageScopedValue(initial, 1)).toBe('a')
    expect(getPageScopedValue(initial, 2)).toBeUndefined()

    const next = setPageScopedValue(initial, 2, 'b')
    expect(next).toEqual({ 1: 'a', 2: 'b' })
    expect(initial).toEqual({ 1: 'a' })
  })
})
