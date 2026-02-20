import { For, Show } from 'solid-js'
import { COLOR_HEX } from '../../model/defaultProject'
import {
  wireDashPatternSvgForScale,
  wireStrokeWidthForScale,
} from '../../lib/annotationScale'
import { circularArcPathFromThreePoints } from '../../lib/geometry'
import type { OverlayLayerProps } from './types'

type ArcsOverlayProps = Pick<
  OverlayLayerProps,
  'project' | 'selected' | 'multiSelectedKeys' | 'hovered' | 'annotationScale'
>

export function ArcsOverlay(props: ArcsOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  return (
    <For each={props.project.elements.arcs}>
      {(arc) => {
        const path =
          circularArcPathFromThreePoints(arc.start, arc.through, arc.end) ??
          `M ${arc.start.x} ${arc.start.y} L ${arc.end.x} ${arc.end.y}`
        const isSelected = () =>
          (props.selected?.kind === 'arc' && props.selected?.id === arc.id) ||
          !!props.multiSelectedKeys?.has(`arc:${arc.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'arc' &&
          props.hovered?.id === arc.id &&
          !isSelected()

        return (
          <g>
            <path
              d={path}
              fill="none"
              stroke={COLOR_HEX[arc.color]}
              stroke-width={wireStrokeWidthForScale(arc.class, designScale())}
              stroke-dasharray={wireDashPatternSvgForScale(arc.class, designScale())}
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

export default ArcsOverlay
