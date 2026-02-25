export const DEFAULT_PAGE_NUMBER = 1

export type PageScopedMap<T> = Partial<Record<number, T>>

function normalizeFiniteInteger(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null
  }

  return Math.trunc(value)
}

export function normalizePageCount(pageCount: number): number {
  const normalized = normalizeFiniteInteger(pageCount)
  if (normalized === null || normalized < DEFAULT_PAGE_NUMBER) {
    return DEFAULT_PAGE_NUMBER
  }

  return normalized
}

export function clampPageNumber(page: number, pageCount: number): number {
  const normalizedPage = normalizeFiniteInteger(page)
  const totalPages = normalizePageCount(pageCount)

  if (normalizedPage === null || normalizedPage < DEFAULT_PAGE_NUMBER) {
    return DEFAULT_PAGE_NUMBER
  }

  return Math.min(normalizedPage, totalPages)
}

export function resolveCurrentPage(requestedPage: number | null | undefined, pageCount: number): number {
  if (typeof requestedPage !== 'number') {
    return DEFAULT_PAGE_NUMBER
  }

  return clampPageNumber(requestedPage, pageCount)
}

export function pageNumbers(pageCount: number): number[] {
  const totalPages = normalizePageCount(pageCount)
  return Array.from({ length: totalPages }, (_, index) => index + DEFAULT_PAGE_NUMBER)
}

export function getPageScopedValue<T>(
  valuesByPage: PageScopedMap<T>,
  page: number,
): T | undefined {
  const normalizedPage = clampPageNumber(page, Number.MAX_SAFE_INTEGER)
  return valuesByPage[normalizedPage]
}

export function setPageScopedValue<T>(
  valuesByPage: PageScopedMap<T>,
  page: number,
  value: T,
): PageScopedMap<T> {
  const normalizedPage = clampPageNumber(page, Number.MAX_SAFE_INTEGER)
  return {
    ...valuesByPage,
    [normalizedPage]: value,
  }
}
