import { For, Show } from 'solid-js'
import SymbolGlyph from '../SymbolGlyph'
import { COLOR_HEX } from '../../model/defaultProject'
import { legendSymbolCenterOffsetY, legendSymbolScale } from '../../lib/legendSymbolScale'
import { wireDashPatternSvgForScale, wireStrokeWidthForScale } from '../../lib/annotationScale'
import type { SymbolElement } from '../../types/project'
import type { OverlayLayerProps } from './types'

type LegendsOverlayProps = Pick<
  OverlayLayerProps,
  | 'project'
  | 'annotationScale'
  | 'selected'
  | 'multiSelectedKeys'
  | 'hovered'
  | 'legendUi'
  | 'legendEntriesForPlacement'
  | 'legendBoxSize'
  | 'legendLineText'
>

export default function LegendsOverlay(props: LegendsOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  return (
    <For each={props.project.legend.placements}>
      {(placement) => {
        const entries = () => props.legendEntriesForPlacement(props.project.legend.items, placement)
        const size = () => props.legendBoxSize(entries())
        const origin = placement.position
        const isSelected = () =>
          (props.selected?.kind === 'legend' && props.selected?.id === placement.id) ||
          !!props.multiSelectedKeys?.has(`legend:${placement.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'legend' &&
          props.hovered?.id === placement.id &&
          !isSelected()

        return (
          <g>
            <rect
              x={origin.x}
              y={origin.y}
              width={size().width}
              height={size().height}
              fill="#fffffff0"
              stroke="#334155"
              stroke-width={1.1 * designScale()}
              rx={4 * designScale()}
            />
            <Show when={isSelected() || isHovered()}>
              <rect
                x={origin.x - 2 * designScale()}
                y={origin.y - 2 * designScale()}
                width={size().width + 4 * designScale()}
                height={size().height + 4 * designScale()}
                fill="none"
                stroke={isSelected() ? '#111827' : '#0369a1'}
                stroke-width={1.2 * designScale()}
                stroke-dasharray={`${4 * designScale()} ${2 * designScale()}`}
                rx={5 * designScale()}
                opacity={isSelected() ? 1 : 0.45}
              />
            </Show>
            <text
              x={origin.x + props.legendUi.paddingXPx}
              y={origin.y + props.legendUi.paddingYPx}
              fill="#0f172a"
              font-size={`${props.legendUi.titleFontSizePx}px`}
              font-family="Segoe UI, Arial, sans-serif"
              dominant-baseline="hanging"
              font-weight={700}
            >
              {props.legendUi.title}
            </text>
            <line
              x1={origin.x + props.legendUi.paddingXPx}
              y1={origin.y + props.legendUi.paddingYPx + props.legendUi.titleHeightPx - 3}
              x2={origin.x + size().width - props.legendUi.paddingXPx}
              y2={origin.y + props.legendUi.paddingYPx + props.legendUi.titleHeightPx - 3}
              stroke="#cbd5e1"
              stroke-width={1 * designScale()}
            />

            <Show
              when={entries().length > 0}
              fallback={
                <text
                  x={origin.x + props.legendUi.paddingXPx}
                  y={origin.y + props.legendUi.paddingYPx + props.legendUi.titleHeightPx + 2}
                  fill="#64748b"
                  font-size={`${props.legendUi.textFontSizePx}px`}
                  font-family="Segoe UI, Arial, sans-serif"
                  dominant-baseline="hanging"
                >
                  No components used yet.
                </text>
              }
            >
              <text
                x={origin.x + props.legendUi.textOffsetXPx}
                y={origin.y + props.legendUi.paddingYPx + props.legendUi.titleHeightPx + 3 * designScale()}
                fill="#475569"
                font-size={`${props.legendUi.textFontSizePx}px`}
                font-family="Segoe UI, Arial, sans-serif"
                dominant-baseline="hanging"
                font-weight={700}
              >
                Description
              </text>
              <text
                x={origin.x + size().width - props.legendUi.paddingXPx}
                y={origin.y + props.legendUi.paddingYPx + props.legendUi.titleHeightPx + 3 * designScale()}
                fill="#475569"
                font-size={`${props.legendUi.textFontSizePx}px`}
                font-family="Segoe UI, Arial, sans-serif"
                dominant-baseline="hanging"
                font-weight={700}
                text-anchor="end"
              >
                Count
              </text>
              <line
                x1={origin.x + props.legendUi.paddingXPx}
                y1={origin.y + props.legendUi.paddingYPx + props.legendUi.titleHeightPx + props.legendUi.rowHeightPx - 3 * designScale()}
                x2={origin.x + size().width - props.legendUi.paddingXPx}
                y2={origin.y + props.legendUi.paddingYPx + props.legendUi.titleHeightPx + props.legendUi.rowHeightPx - 3 * designScale()}
                stroke="#cbd5e1"
                stroke-width={1 * designScale()}
              />

              <For each={entries()}>
                {(entry, index) => {
                  const rowTop =
                    origin.y +
                    props.legendUi.paddingYPx +
                    props.legendUi.titleHeightPx +
                    props.legendUi.rowHeightPx +
                    index() * props.legendUi.rowHeightPx
                  const symbolType = entry.symbolType ?? 'air_terminal'
                  const symbolScale = legendSymbolScale(symbolType, designScale())
                  const legendSymbol: SymbolElement = {
                    id: `legend-symbol-${entry.key}`,
                    symbolType,
                    position: {
                      x: origin.x + props.legendUi.symbolCenterXPx,
                      y:
                        rowTop +
                        props.legendUi.rowHeightPx / 2 +
                        legendSymbolCenterOffsetY(symbolType, symbolScale),
                    },
                    color: entry.color,
                    class: entry.class,
                  }

                  return (
                    <g>
                      <Show
                        when={entry.symbolKind === 'component' && entry.symbolType}
                        fallback={(
                          <line
                            data-legend-symbol="conductor"
                            x1={origin.x + props.legendUi.symbolCenterXPx - 10 * designScale()}
                            y1={rowTop + props.legendUi.rowHeightPx / 2}
                            x2={origin.x + props.legendUi.symbolCenterXPx + 10 * designScale()}
                            y2={rowTop + props.legendUi.rowHeightPx / 2}
                            stroke={COLOR_HEX[entry.color]}
                            stroke-width={wireStrokeWidthForScale(entry.class === 'class2' ? 'class2' : 'class1', designScale())}
                            stroke-linecap="round"
                            stroke-dasharray={wireDashPatternSvgForScale(entry.class === 'class2' ? 'class2' : 'class1', designScale())}
                          />
                        )}
                      >
                        <SymbolGlyph
                          symbol={legendSymbol}
                          annotationScale={symbolScale}
                        />
                      </Show>
                      <text
                        x={origin.x + props.legendUi.textOffsetXPx}
                        y={rowTop + 3 * designScale()}
                        fill="#1e293b"
                        font-size={`${props.legendUi.textFontSizePx}px`}
                        font-family="Segoe UI, Arial, sans-serif"
                        dominant-baseline="hanging"
                      >
                        {entry.label}
                      </text>
                      <text
                        x={origin.x + size().width - props.legendUi.paddingXPx}
                        y={rowTop + 3 * designScale()}
                        fill="#0f172a"
                        font-size={`${props.legendUi.textFontSizePx}px`}
                        font-family="Segoe UI, Arial, sans-serif"
                        dominant-baseline="hanging"
                        text-anchor="end"
                      >
                        {entry.countLabel}
                      </text>
                    </g>
                  )
                }}
              </For>
            </Show>
          </g>
        )
      }}
    </For>
  )
}
