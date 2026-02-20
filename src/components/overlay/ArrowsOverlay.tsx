import { For, Show } from 'solid-js'
import { COLOR_HEX } from '../../model/defaultProject'
import type { OverlayLayerProps } from './types'

type ArrowsOverlayProps = Pick<
  OverlayLayerProps,
  'project' | 'selected' | 'multiSelectedKeys' | 'hovered' | 'annotationScale'
>

export default function ArrowsOverlay(props: ArrowsOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  return (
    <For each={props.project.elements.arrows}>
      {(arrow) => {
        const isSelected = () =>
          (props.selected?.kind === 'arrow' && props.selected?.id === arrow.id) ||
          !!props.multiSelectedKeys?.has(`arrow:${arrow.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'arrow' &&
          props.hovered?.id === arrow.id &&
          !isSelected()
        const color = COLOR_HEX[arrow.color]

        return (
          <g>
            <Show when={isSelected() || isHovered()}>
              <line
                x1={arrow.tail.x}
                y1={arrow.tail.y}
                x2={arrow.head.x}
                y2={arrow.head.y}
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
            <line
              x1={arrow.tail.x}
              y1={arrow.tail.y}
              x2={arrow.head.x}
              y2={arrow.head.y}
              stroke={color}
              stroke-width={2 * designScale()}
              stroke-linecap="round"
              marker-end="url(#arrow-head)"
            />
          </g>
        )
      }}
    </For>
  )
}
