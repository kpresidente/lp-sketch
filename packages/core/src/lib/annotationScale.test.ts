import { describe, expect, it } from 'vitest'
import {
  legendConductorSampleXRangeForScale,
  scaledLegendMetrics,
  wireStrokeWidthForScale,
} from './annotationScale'

describe('annotation scale metrics', () => {
  it('aligns legend conductor sample paint to the left padding edge', () => {
    const metrics = scaledLegendMetrics(1)

    for (const wireClass of ['class1', 'class2'] as const) {
      const sample = legendConductorSampleXRangeForScale(metrics, wireClass, 1)
      const paintedStartX = sample.x1 - wireStrokeWidthForScale(wireClass, 1) / 2

      expect(paintedStartX).toBe(metrics.paddingXPx)
      expect(sample.x2 - sample.x1).toBe(20)
    }

    expect(metrics.textOffsetXPx - metrics.symbolCenterXPx).toBe(18)
  })
})
