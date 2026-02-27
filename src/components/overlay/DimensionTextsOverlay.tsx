import { createMemo, For, Show } from 'solid-js'
import {
  dimensionBarLineSegments,
  dimensionLabelWidthPx,
  dimensionExtensionLineSegments,
  dimensionLineworkGeometry,
} from '../../lib/dimensionText'
import type { OverlayLayerProps } from './types'

type DimensionTextsOverlayProps = Pick<
  OverlayLayerProps,
  | 'project'
  | 'annotationScale'
  | 'selected'
  | 'multiSelectedKeys'
  | 'hovered'
  | 'approximateTextWidth'
  | 'textFontSizePx'
  | 'textLineHeightPx'
  | 'dimensionTextLabel'
>

export default function DimensionTextsOverlay(props: DimensionTextsOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  return (
    <For each={props.project.elements.dimensionTexts}>
      {(dimensionText) => {
        const isSelected = () =>
          (props.selected?.kind === 'dimension_text' && props.selected?.id === dimensionText.id) ||
          !!props.multiSelectedKeys?.has(`dimension_text:${dimensionText.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'dimension_text' &&
          props.hovered?.id === dimensionText.id &&
          !isSelected()
        const label = () => props.dimensionTextLabel(dimensionText)
        const labelWidth = () =>
          dimensionLabelWidthPx(label(), designScale(), props.textFontSizePx)
        const selectedWidth = () => labelWidth()
        const geometry = dimensionText.showLinework
          ? dimensionLineworkGeometry(
            {
              start: dimensionText.start,
              end: dimensionText.end,
              position: dimensionText.position,
            },
          )
          : null
        const extensionSegments = createMemo(() =>
          geometry
            ? dimensionExtensionLineSegments(geometry, 6 * designScale())
            : null,
        )
        const barSegments = createMemo(() =>
          geometry
            ? dimensionBarLineSegments(
              geometry,
              dimensionText.position,
              labelWidth(),
              props.textLineHeightPx,
              4 * designScale(),
            )
            : [],
        )

        return (
          <g>
            <Show when={geometry}>
              <g data-dimension-linework="active">
                <line
                  x1={extensionSegments()?.[0].start.x}
                  y1={extensionSegments()?.[0].start.y}
                  x2={extensionSegments()?.[0].end.x}
                  y2={extensionSegments()?.[0].end.y}
                  stroke="#111827"
                  stroke-width={1.25 * designScale()}
                />
                <line
                  x1={extensionSegments()?.[1].start.x}
                  y1={extensionSegments()?.[1].start.y}
                  x2={extensionSegments()?.[1].end.x}
                  y2={extensionSegments()?.[1].end.y}
                  stroke="#111827"
                  stroke-width={1.25 * designScale()}
                />
                <For each={barSegments()}>
                  {(segment) => (
                    <line
                      x1={segment.start.x}
                      y1={segment.start.y}
                      x2={segment.end.x}
                      y2={segment.end.y}
                      stroke="#111827"
                      stroke-width={1.5 * designScale()}
                    />
                  )}
                </For>
              </g>
            </Show>
            <Show when={isSelected() || isHovered()}>
              <rect
                x={dimensionText.position.x - selectedWidth() / 2 - 4 * designScale()}
                y={dimensionText.position.y - props.textLineHeightPx / 2 - 3 * designScale()}
                width={selectedWidth() + 8 * designScale()}
                height={props.textLineHeightPx + 6 * designScale()}
                fill="none"
                stroke={isSelected() ? '#111827' : '#0369a1'}
                stroke-width={1.2 * designScale()}
                stroke-dasharray={`${4 * designScale()} ${2 * designScale()}`}
                rx={3 * designScale()}
                opacity={isSelected() ? 1 : 0.45}
              />
            </Show>
            <text
              x={dimensionText.position.x}
              y={dimensionText.position.y}
              fill="#111827"
              font-size={`${props.textFontSizePx}px`}
              font-family="Segoe UI, Arial, sans-serif"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {label()}
            </text>
          </g>
        )
      }}
    </For>
  )
}
