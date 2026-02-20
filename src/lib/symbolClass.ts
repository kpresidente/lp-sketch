import type { SymbolElement } from '../types/project'

const CLASS_OPTIONAL_SYMBOLS = new Set<SymbolElement['symbolType']>([
  'continued',
  'connect_existing',
])

export function resolvedSymbolClass(
  symbol: Pick<SymbolElement, 'symbolType' | 'class'>,
): SymbolElement['class'] {
  if (symbol.class !== 'none') {
    return symbol.class
  }

  if (CLASS_OPTIONAL_SYMBOLS.has(symbol.symbolType)) {
    return 'none'
  }

  return 'class1'
}

export function hasBothGroundRodClasses(
  symbols: ReadonlyArray<Pick<SymbolElement, 'symbolType' | 'class'>>,
): boolean {
  let hasClass1 = false
  let hasClass2 = false

  for (const symbol of symbols) {
    if (symbol.symbolType !== 'ground_rod') {
      continue
    }

    if (resolvedSymbolClass(symbol) === 'class2') {
      hasClass2 = true
    } else {
      hasClass1 = true
    }

    if (hasClass1 && hasClass2) {
      return true
    }
  }

  return false
}

export function groundRodClassLabel(
  symbol: Pick<SymbolElement, 'symbolType' | 'class'>,
): '1' | '2' | null {
  if (symbol.symbolType !== 'ground_rod') {
    return null
  }

  return resolvedSymbolClass(symbol) === 'class2' ? '2' : '1'
}
