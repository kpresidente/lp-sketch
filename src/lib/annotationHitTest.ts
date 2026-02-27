import {
  textLineHeightPxForScale,
} from './annotationScale'
import { dimensionLabelWidthPx, dimensionTextLabel } from './dimensionText'
import { docToScreen } from './geometry'
import {
  textBlockApproxHeightPx,
  textBlockApproxWidthPx,
} from './textLayout'
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
  const width = textBlockApproxWidthPx(textElement.text, designScale)
  const height = textBlockApproxHeightPx(textElement.text, designScale)

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
  const pointScreen = docToScreen(point, projectState.view)
  const labelScreen = docToScreen(dimensionText.position, projectState.view)
  const height = textLineHeightPxForScale(designScale)
  const width = dimensionLabelWidthPx(label, designScale, 14 * designScale)

  return (
    pointScreen.x >= labelScreen.x - width / 2 - tolerancePx &&
    pointScreen.x <= labelScreen.x + width / 2 + tolerancePx &&
    pointScreen.y >= labelScreen.y - height / 2 - tolerancePx &&
    pointScreen.y <= labelScreen.y + height / 2 + tolerancePx
  )
}
