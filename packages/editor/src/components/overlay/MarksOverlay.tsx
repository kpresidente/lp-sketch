import { For } from 'solid-js'
import type { OverlayLayerProps } from './types'

type MarksOverlayProps = Pick<
  OverlayLayerProps,
  'project' | 'selected' | 'multiSelectedKeys' | 'hovered' | 'annotationScale'
>

export default function MarksOverlay(props: MarksOverlayProps) {
  return (
    <For each={props.project.construction.marks}>
      {(mark) => {
        const isSelected = () =>
          (props.selected?.kind === 'mark' && props.selected?.id === mark.id) ||
          !!props.multiSelectedKeys?.has(`mark:${mark.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'mark' &&
          props.hovered?.id === mark.id &&
          !isSelected()

        return (
          <g>
            {isSelected() || isHovered() ? (
              <circle
                cx={mark.position.x}
                cy={mark.position.y}
                r={8}
                fill="none"
                stroke={isSelected() ? '#111827' : '#0369a1'}
                stroke-width={1.4}
                stroke-dasharray="4 2"
                opacity={isSelected() ? 0.55 : 0.4}
              />
            ) : null}
            <line
              x1={mark.position.x - 5}
              y1={mark.position.y - 5}
              x2={mark.position.x + 5}
              y2={mark.position.y + 5}
              stroke="#b91c1c"
              stroke-width={1.8}
            />
            <line
              x1={mark.position.x - 5}
              y1={mark.position.y + 5}
              x2={mark.position.x + 5}
              y2={mark.position.y - 5}
              stroke="#b91c1c"
              stroke-width={1.8}
            />
          </g>
        )
      }}
    </For>
  )
}
