import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import {
  downleadFootageLabelPosition,
  isDownleadSymbolType,
  normalizeVerticalFootageFt,
  summarizeConductorFootage,
} from './conductorFootage'

describe('conductor footage helpers', () => {
  it('identifies downlead symbol types', () => {
    expect(isDownleadSymbolType('conduit_downlead_ground')).toBe(true)
    expect(isDownleadSymbolType('surface_downlead_roof')).toBe(true)
    expect(isDownleadSymbolType('bond')).toBe(false)
  })

  it('normalizes vertical footage values to 0..999 integer feet', () => {
    expect(normalizeVerticalFootageFt(undefined)).toBe(0)
    expect(normalizeVerticalFootageFt(-12)).toBe(0)
    expect(normalizeVerticalFootageFt(21.6)).toBe(22)
    expect(normalizeVerticalFootageFt(5000)).toBe(999)
  })

  it('positions downlead footage label above and to the right of the symbol', () => {
    const symbol = {
      symbolType: 'conduit_downlead_ground' as const,
      position: { x: 100, y: 200 },
    }

    expect(downleadFootageLabelPosition(symbol, 1)).toEqual({ x: 108, y: 186 })
    expect(downleadFootageLabelPosition(symbol, 1.5)).toEqual({ x: 112, y: 179 })
  })

  it('summarizes horizontal and vertical footage by material and class', () => {
    const project = createDefaultProject('Footage Summary')
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 0, y: 0 },
      end: { x: 120, y: 0 },
      color: 'green',
      class: 'class1',
    })
    project.elements.arcs.push({
      id: 'arc-1',
      start: { x: -10, y: 0 },
      through: { x: 0, y: 10 },
      end: { x: 10, y: 0 },
      color: 'blue',
      class: 'class1',
    })
    project.elements.symbols.push({
      id: 'downlead-1',
      symbolType: 'conduit_downlead_ground',
      position: { x: 50, y: 50 },
      verticalFootageFt: 15,
      color: 'green',
      class: 'class1',
    })

    const summaries = summarizeConductorFootage(project)
    const green = summaries.find(
      (entry) => entry.material === 'green' && entry.wireClass === 'class1',
    )
    const blue = summaries.find(
      (entry) => entry.material === 'blue' && entry.wireClass === 'class1',
    )

    expect(green).toBeTruthy()
    expect(blue).toBeTruthy()
    expect(green?.horizontalPt).toBeCloseTo(120, 6)
    expect(green?.verticalFt).toBe(15)
    expect(green?.hasHorizontal).toBe(true)
    expect(green?.hasVerticalCarrier).toBe(true)
    expect(blue?.horizontalPt).toBeGreaterThan(31)
    expect(blue?.horizontalPt).toBeLessThan(32)
  })
})
