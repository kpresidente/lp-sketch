import { For, Show } from 'solid-js'
import { COLOR_HEX } from '../../model/defaultProject'
import { splitTextIntoLines } from '../../lib/textLayout'
import type { OverlayLayerProps } from './types'

type TextsOverlayProps = Pick<
  OverlayLayerProps,
  | 'project'
  | 'annotationScale'
  | 'selected'
  | 'multiSelectedKeys'
  | 'hovered'
  | 'approximateTextWidth'
  | 'textFontSizePx'
  | 'textLineHeightPx'
>

export default function TextsOverlay(props: TextsOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  return (
    <For each={props.project.elements.texts}>
      {(textElement) => {
        const isSelected = () =>
          (props.selected?.kind === 'text' && props.selected?.id === textElement.id) ||
          !!props.multiSelectedKeys?.has(`text:${textElement.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'text' &&
          props.hovered?.id === textElement.id &&
          !isSelected()
        const lines = splitTextIntoLines(textElement.text)
        const selectedWidth = lines.reduce(
          (max, line) => Math.max(max, props.approximateTextWidth(line)),
          0,
        )
        const selectedHeight = Math.max(props.textLineHeightPx, lines.length * props.textLineHeightPx)

        return (
          <g>
            <Show when={isSelected() || isHovered()}>
              <rect
                x={textElement.position.x - 4 * designScale()}
                y={textElement.position.y - 3 * designScale()}
                width={selectedWidth + 8 * designScale()}
                height={selectedHeight + 6 * designScale()}
                fill="none"
                stroke={isSelected() ? '#111827' : '#0369a1'}
                stroke-width={1.2 * designScale()}
                stroke-dasharray={`${4 * designScale()} ${2 * designScale()}`}
                rx={3 * designScale()}
                opacity={isSelected() ? 1 : 0.45}
              />
            </Show>
            <text
              x={textElement.position.x}
              y={textElement.position.y}
              fill={COLOR_HEX[textElement.color]}
              font-size={`${props.textFontSizePx}px`}
              font-family="Segoe UI, Arial, sans-serif"
              dominant-baseline="hanging"
            >
              <For each={lines}>
                {(line, lineIndex) => (
                  <tspan
                    x={textElement.position.x}
                    y={textElement.position.y + lineIndex() * props.textLineHeightPx}
                  >
                    {line.length > 0 ? line : ' '}
                  </tspan>
                )}
              </For>
            </text>
          </g>
        )
      }}
    </For>
  )
}
