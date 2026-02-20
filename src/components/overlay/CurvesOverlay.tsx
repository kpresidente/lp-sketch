import { For, Show } from 'solid-js'
import { COLOR_HEX } from '../../model/defaultProject'
import {
  wireDashPatternSvgForScale,
  wireStrokeWidthForScale,
} from '../../lib/annotationScale'
import type { OverlayLayerProps } from './types'

type CurvesOverlayProps = Pick<
  OverlayLayerProps,
  'project' | 'selected' | 'multiSelectedKeys' | 'hovered' | 'annotationScale'
>

export default function CurvesOverlay(props: CurvesOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  return (
    <For each={props.project.elements.curves}>
      {(curve) => {
        const path = `M ${curve.start.x} ${curve.start.y} Q ${curve.through.x} ${curve.through.y} ${curve.end.x} ${curve.end.y}`
        const isSelected = () =>
          (props.selected?.kind === 'curve' && props.selected?.id === curve.id) ||
          !!props.multiSelectedKeys?.has(`curve:${curve.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'curve' &&
          props.hovered?.id === curve.id &&
          !isSelected()

        return (
          <g>
            <path
              d={path}
              fill="none"
              stroke={COLOR_HEX[curve.color]}
              stroke-width={wireStrokeWidthForScale(curve.class, designScale())}
              stroke-dasharray={wireDashPatternSvgForScale(curve.class, designScale())}
              stroke-linecap="round"
            />
            <Show when={isSelected() || isHovered()}>
              <path
                d={path}
                fill="none"
                stroke={isSelected() ? '#111827' : '#0369a1'}
                stroke-width={(isSelected() ? 7 : 6) * designScale()}
                stroke-dasharray={
                  isSelected()
                    ? `${5 * designScale()} ${3 * designScale()}`
                    : `${6 * designScale()} ${4 * designScale()}`
                }
                stroke-linecap="round"
                opacity={isSelected() ? 0.45 : 0.3}
              />
            </Show>
          </g>
        )
      }}
    </For>
  )
}
