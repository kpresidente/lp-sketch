import { describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import type { DimensionTextElement } from '../types/project'
import { pointHitsDimensionText } from './annotationHitTest'
import { dimensionLabelWidthPx, dimensionTextLabel } from './dimensionText'

describe('annotation hit testing', () => {
  it('treats dimension text hit region as centered around the label anchor', () => {
    const project = createDefaultProject('Dimension Hit Test')
    project.view.zoom = 1
    project.view.pan = { x: 0, y: 0 }
    project.scale = {
      ...project.scale,
      isSet: true,
      method: 'manual',
      realUnitsPerPoint: 1,
      displayUnits: 'ft-in',
    }

    const dimension: DimensionTextElement = {
      id: 'dim-1',
      start: { x: 50, y: 100 },
      end: { x: 150, y: 100 },
      position: { x: 100, y: 110 },
      showLinework: true,
      layer: 'annotation',
    }

    const label = dimensionTextLabel(dimension, project.scale)
    const width = dimensionLabelWidthPx(label, 1, 14)

    const insideLeft = { x: 100 - width / 2 + 1, y: 112 }
    const insideRight = { x: 100 + width / 2 - 1, y: 112 }
    const outsideRight = { x: 100 + width / 2 + 3, y: 112 }

    expect(pointHitsDimensionText(insideLeft, dimension, project, 0, 1)).toBe(true)
    expect(pointHitsDimensionText(insideRight, dimension, project, 0, 1)).toBe(true)
    expect(pointHitsDimensionText(outsideRight, dimension, project, 0, 1)).toBe(false)
  })
})

