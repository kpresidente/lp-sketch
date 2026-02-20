import { For, Show } from 'solid-js'
import { COLOR_HEX } from '../../model/defaultProject'
import {
  wireDashPatternSvgForScale,
  wireStrokeWidthForScale,
} from '../../lib/annotationScale'
import type { OverlayLayerProps } from './types'

type LinesOverlayProps = Pick<
  OverlayLayerProps,
  'project' | 'selected' | 'multiSelectedKeys' | 'hovered' | 'annotationScale'
>

export default function LinesOverlay(props: LinesOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  return (
    <For each={props.project.elements.lines}>
      {(line) => {
        const isSelected = () =>
          (props.selected?.kind === 'line' && props.selected?.id === line.id) ||
          !!props.multiSelectedKeys?.has(`line:${line.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'line' &&
          props.hovered?.id === line.id &&
          !isSelected()

        return (
          <g>
            <line
              x1={line.start.x}
              y1={line.start.y}
              x2={line.end.x}
              y2={line.end.y}
              stroke={COLOR_HEX[line.color]}
              stroke-width={wireStrokeWidthForScale(line.class, designScale())}
              stroke-dasharray={wireDashPatternSvgForScale(line.class, designScale())}
              stroke-linecap="round"
            />
            <Show when={isSelected() || isHovered()}>
              <line
                x1={line.start.x}
                y1={line.start.y}
                x2={line.end.x}
                y2={line.end.y}
                stroke={isSelected() ? '#111827' : '#0369a1'}
                stroke-width={(isSelected() ? 7 : 6) * designScale()}
                stroke-dasharray={
                  isSelected()
                    ? `${5 * designScale()} ${3 * designScale()}`
                    : `${6 * designScale()} ${4 * designScale()}`
                }
                stroke-linecap="round"
                fill="none"
                opacity={isSelected() ? 0.45 : 0.3}
              />
            </Show>
          </g>
        )
      }}
    </For>
  )
}
