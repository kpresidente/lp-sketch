// @vitest-environment jsdom

import { cleanup, render } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'
import SymbolGlyph from './SymbolGlyph'
import type { SymbolClass, SymbolElement, SymbolType } from '../types/project'

afterEach(() => {
  cleanup()
})

function renderSymbol(symbol: SymbolElement, selected = false) {
  return render(() => (
    <svg>
      <SymbolGlyph symbol={symbol} selected={selected} />
    </svg>
  ))
}

function makeSymbol(symbolType: SymbolType, className: SymbolClass = 'class1'): SymbolElement {
  return {
    id: `sym-${symbolType}`,
    symbolType,
    position: { x: 10, y: 20 },
    color: 'green',
    class: className,
  }
}

describe('SymbolGlyph', () => {
  it('positions the symbol at its document coordinates and applies direction rotation', () => {
    const symbol = makeSymbol('ground_rod', 'none')
    symbol.directionDeg = 45

    const { container } = renderSymbol(symbol)
    const outerGroup = container.querySelector('svg > g')
    const rotatedGroup = container.querySelector('svg > g > g')

    expect(outerGroup?.getAttribute('transform')).toBe('translate(10 20)')
    expect(rotatedGroup?.getAttribute('transform')).toBe('rotate(-45)')
  })

  it('uses directional rotation offset for roof-triangle symbols', () => {
    const symbol = makeSymbol('surface_downlead_roof', 'class1')
    symbol.directionDeg = 45

    const { container } = renderSymbol(symbol)
    const rotatedGroup = container.querySelector('svg > g > g')

    expect(rotatedGroup?.getAttribute('transform')).toBe('rotate(135)')
  })

  it('uses directional rotation offset for ground-chevron symbols', () => {
    const symbol = makeSymbol('surface_downlead_ground', 'class1')
    symbol.directionDeg = 45

    const { container } = renderSymbol(symbol)
    const rotatedGroup = container.querySelector('svg > g > g')

    expect(rotatedGroup?.getAttribute('transform')).toBe('rotate(-45)')
  })

  it('renders selection ring only when selected', () => {
    const symbol = makeSymbol('air_terminal', 'class1')

    const { container: unselectedContainer, unmount } = renderSymbol(symbol, false)
    const unselectedRing = unselectedContainer.querySelector('circle[r="9"][fill="none"]')
    expect(unselectedRing?.getAttribute('stroke')).toBe('none')
    unmount()

    const { container: selectedContainer } = renderSymbol(symbol, true)
    const selectedRing = selectedContainer.querySelector('circle[r="9"][fill="none"]')
    expect(selectedRing?.getAttribute('stroke')).toBe('#111827')
  })

  it('applies class-based fill/stroke behavior for air-terminal symbols', () => {
    const class1 = renderSymbol(makeSymbol('air_terminal', 'class1')).container.querySelector(
      'circle[r="6"]',
    )
    expect(class1?.getAttribute('fill')).toBe('#ffffff')
    expect(class1?.getAttribute('stroke-width')).toBe('1.45')

    const class2 = renderSymbol(makeSymbol('air_terminal', 'class2')).container.querySelector(
      'circle[r="6"]',
    )
    expect(class2?.getAttribute('fill')).toBe('#2e8b57')
    expect(class2?.getAttribute('stroke-width')).toBe('1.9')

    const none = renderSymbol(makeSymbol('air_terminal', 'none')).container.querySelector(
      'circle[r="6"]',
    )
    expect(none?.getAttribute('fill')).toBe('#ffffff')
  })

  it('renders cable-to-cable connection with class-aware fill variants', () => {
    const class1 = renderSymbol(makeSymbol('cable_to_cable_connection', 'class1')).container.querySelector(
      'circle[r="3.2"]',
    )
    expect(class1?.getAttribute('fill')).toBe('#ffffff')

    const class2 = renderSymbol(makeSymbol('cable_to_cable_connection', 'class2')).container.querySelector(
      'circle[r="3.2"]',
    )
    expect(class2?.getAttribute('fill')).toBe('#2e8b57')

    const none = renderSymbol(makeSymbol('cable_to_cable_connection', 'none')).container.querySelector(
      'circle[r="3.2"]',
    )
    expect(none?.getAttribute('fill')).toBe('#ffffff')
  })

  it('renders connect-existing with class-aware circle variants', () => {
    const class1 = renderSymbol(makeSymbol('connect_existing', 'class1')).container.querySelector(
      'circle[r="3.2"]',
    )
    expect(class1?.getAttribute('fill')).toBe('#ffffff')

    const class2 = renderSymbol(makeSymbol('connect_existing', 'class2')).container.querySelector(
      'circle[r="3.2"]',
    )
    expect(class2?.getAttribute('fill')).toBe('#2e8b57')
  })

  it('renders each symbol variant with its expected shape signature', () => {
    const cases: Array<{
      symbolType: SymbolType
      className?: SymbolClass
      selector: string
      minMatches?: number
    }> = [
      { symbolType: 'air_terminal', selector: 'circle[r="6"]' },
      { symbolType: 'bonded_air_terminal', selector: 'polygon' },
      { symbolType: 'bond', selector: 'polygon' },
      { symbolType: 'cadweld_connection', selector: 'rect[width="6.4"][height="6.4"]' },
      {
        symbolType: 'cadweld_crossrun_connection',
        selector: 'rect[width="11"][height="11"]',
      },
      { symbolType: 'continued', selector: 'path' },
      { symbolType: 'connect_existing', selector: 'circle[r="3.2"]' },
      { symbolType: 'mechanical_crossrun_connection', selector: 'circle[r="6"]' },
      { symbolType: 'conduit_downlead_ground', selector: 'rect[width="10.8"][height="10.8"]' },
      { symbolType: 'conduit_downlead_roof', selector: 'rect[width="10.8"][height="10.8"]' },
      { symbolType: 'surface_downlead_ground', selector: 'circle[r="6"]' },
      { symbolType: 'surface_downlead_roof', selector: 'circle[r="6"]' },
      { symbolType: 'through_roof_to_steel', selector: 'rect[width="11"][height="11"]' },
      { symbolType: 'through_wall_connector', selector: 'circle[r="6"]' },
      { symbolType: 'ground_rod', selector: 'line[stroke-width="2"]', minMatches: 4 },
      { symbolType: 'steel_bond', selector: 'polygon' },
      { symbolType: 'steel_bond', selector: 'line[stroke-linecap="round"]', minMatches: 3 },
      { symbolType: 'cable_to_cable_connection', selector: 'circle[r="3.2"]' },
    ]

    for (const testCase of cases) {
      const { container, unmount } = renderSymbol(
        makeSymbol(testCase.symbolType, testCase.className ?? 'class1'),
      )

      const matches = container.querySelectorAll(testCase.selector)
      if (testCase.minMatches) {
        expect(matches.length).toBeGreaterThanOrEqual(testCase.minMatches)
      } else {
        expect(matches.length).toBeGreaterThan(0)
      }

      unmount()
    }
  })

  it('anchors ground-rod basepoint at the stem extremity', () => {
    const { container } = renderSymbol(makeSymbol('ground_rod', 'none'))
    const stem = container.querySelector('line[x1="0"][y1="0"][x2="0"][y2="27"]')
    expect(stem).not.toBeNull()
  })

  it('renders continued as annotation black regardless of active material color', () => {
    const symbol = makeSymbol('continued', 'none')
    symbol.color = 'red'

    const { container } = renderSymbol(symbol)
    const path = container.querySelector('path')

    expect(path?.getAttribute('stroke')).toBe('#111827')
  })

  it('renders class2 ground rod with four bars and no diamond marker', () => {
    const symbol = makeSymbol('ground_rod', 'class2')
    const { container } = renderSymbol(symbol)

    expect(container.querySelectorAll('line[stroke-width="2"]')).toHaveLength(5)
    expect(container.querySelector('polygon')).toBeNull()
  })

  it('scales symbol geometry around a fixed basepoint when annotation scale changes', () => {
    const symbol = makeSymbol('air_terminal', 'class1')

    const medium = render(() => (
      <svg>
        <SymbolGlyph symbol={symbol} annotationScale={1.5} />
      </svg>
    ))
    const mediumGroup = medium.container.querySelector('g[data-symbol-type="air_terminal"]')
    const mediumCircle = medium.container.querySelector('g[data-symbol-type="air_terminal"] g > circle')
    expect(mediumGroup?.getAttribute('transform')).toBe('translate(10 20)')
    expect(mediumCircle?.getAttribute('r')).toBe('9')
    medium.unmount()

    const large = render(() => (
      <svg>
        <SymbolGlyph symbol={symbol} annotationScale={2} />
      </svg>
    ))
    const largeGroup = large.container.querySelector('g[data-symbol-type="air_terminal"]')
    const largeCircle = large.container.querySelector('g[data-symbol-type="air_terminal"] g > circle')
    expect(largeGroup?.getAttribute('transform')).toBe('translate(10 20)')
    expect(largeCircle?.getAttribute('r')).toBe('12')
  })

  it('reactively updates symbol geometry when annotation scale changes after mount', async () => {
    const symbol = makeSymbol('air_terminal', 'class1')
    const [scale, setScale] = createSignal(1)

    const view = render(() => (
      <svg>
        <SymbolGlyph symbol={symbol} annotationScale={scale()} />
      </svg>
    ))

    const beforeGroup = view.container.querySelector('g[data-symbol-type="air_terminal"]')
    const beforeCircle = view.container.querySelector('g[data-symbol-type="air_terminal"] g > circle')
    expect(beforeGroup?.getAttribute('transform')).toBe('translate(10 20)')
    expect(beforeCircle?.getAttribute('r')).toBe('6')

    setScale(2)
    await Promise.resolve()

    const afterGroup = view.container.querySelector('g[data-symbol-type="air_terminal"]')
    const afterCircle = view.container.querySelector('g[data-symbol-type="air_terminal"] g > circle')
    expect(afterGroup?.getAttribute('transform')).toBe('translate(10 20)')
    expect(afterCircle?.getAttribute('r')).toBe('12')
  })

  it('renders letter tags for lettered air terminals', () => {
    const symbol = makeSymbol('air_terminal', 'class1')
    symbol.letter = 'A'
    const { container } = renderSymbol(symbol)
    const letter = container.querySelector('text')
    expect(letter?.textContent).toBe('A')
    expect(letter?.getAttribute('x')).toBe('0')
    expect(letter?.getAttribute('y')).toBe('0.45')
    expect(letter?.getAttribute('text-anchor')).toBe('middle')
  })

  it('uses white letter fill for class2 lettered air terminals', () => {
    const class2AirTerminal = makeSymbol('air_terminal', 'class2')
    class2AirTerminal.letter = 'A'
    const class2AirTerminalRender = renderSymbol(class2AirTerminal)
    const class2AirTerminalLetter = class2AirTerminalRender.container.querySelector('text')
    expect(class2AirTerminalLetter?.getAttribute('fill')).toBe('#ffffff')
    class2AirTerminalRender.unmount()

    const class2BondedAirTerminal = makeSymbol('bonded_air_terminal', 'class2')
    class2BondedAirTerminal.letter = 'B'
    const class2BondedAirTerminalRender = renderSymbol(class2BondedAirTerminal)
    const class2BondedAirTerminalLetter = class2BondedAirTerminalRender.container.querySelector('text')
    expect(class2BondedAirTerminalLetter?.getAttribute('fill')).toBe('#ffffff')
    class2BondedAirTerminalRender.unmount()

    const class1AirTerminal = makeSymbol('air_terminal', 'class1')
    class1AirTerminal.letter = 'C'
    const class1AirTerminalRender = renderSymbol(class1AirTerminal)
    const class1AirTerminalLetter = class1AirTerminalRender.container.querySelector('text')
    expect(class1AirTerminalLetter?.getAttribute('fill')).toBe('#111827')
  })

  it('falls back to a default circle when symbol type is unknown', () => {
    const symbol: SymbolElement = {
      id: 'sym-unknown',
      symbolType: 'unknown_type' as unknown as SymbolType,
      position: { x: 10, y: 20 },
      color: 'purple',
      class: 'class1',
    }

    const { container } = renderSymbol(symbol)
    expect(container.querySelector('circle[r="6"]')).not.toBeNull()
  })
})
