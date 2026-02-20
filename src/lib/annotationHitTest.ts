import {
  approximateTextWidthForScale,
  textLineHeightPxForScale,
} from './annotationScale'
import { dimensionTextLabel } from './dimensionText'
import { docToScreen } from './geometry'
import type {
  DimensionTextElement,
  LpProject,
  Point,
  TextElement,
} from '../types/project'

export function pointHitsText(
  point: Point,
  textElement: TextElement,
  view: LpProject['view'],
  tolerancePx: number,
  designScale: number,
): boolean {
  const pointScreen = docToScreen(point, view)
  const textScreen = docToScreen(textElement.position, view)
  const width = approximateTextWidthForScale(textElement.text, designScale)
  const height = textLineHeightPxForScale(designScale)

  return (
    pointScreen.x >= textScreen.x - tolerancePx &&
    pointScreen.x <= textScreen.x + width + tolerancePx &&
    pointScreen.y >= textScreen.y - tolerancePx &&
    pointScreen.y <= textScreen.y + height + tolerancePx
  )
}

export function pointHitsDimensionText(
  point: Point,
  dimensionText: DimensionTextElement,
  projectState: LpProject,
  tolerancePx: number,
  designScale: number,
): boolean {
  const label = dimensionTextLabel(dimensionText, projectState.scale)
  return pointHitsText(
    point,
    {
      id: dimensionText.id,
      position: dimensionText.position,
      text: label,
      color: 'red',
      layer: 'annotation',
    },
    projectState.view,
    tolerancePx,
    designScale,
  )
}
