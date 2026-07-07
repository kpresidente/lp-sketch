import { For, Show } from 'solid-js'
import SymbolGlyph from '../SymbolGlyph'
import {
  downleadFootageLabelPosition,
  downleadFootageLabelText,
} from '../../lib/conductorFootage'
import type { OverlayLayerProps } from './types'

type SymbolsOverlayProps = Pick<
  OverlayLayerProps,
  'project' | 'selected' | 'multiSelectedKeys' | 'hovered' | 'annotationScale' | 'textFontSizePx'
>

export default function SymbolsOverlay(props: SymbolsOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  return (
    <For each={props.project.elements.symbols}>
      {(symbol) => {
        const downleadLabel = () => {
          const position = downleadFootageLabelPosition(symbol, designScale())
          const text = downleadFootageLabelText(symbol)
          return position && text ? { position, text } : null
        }
        const isSelected = () =>
          (props.selected?.kind === 'symbol' && props.selected?.id === symbol.id) ||
          !!props.multiSelectedKeys?.has(`symbol:${symbol.id}`)

        return (
          <g>
            <SymbolGlyph
              symbol={symbol}
              annotationScale={designScale()}
              selected={isSelected()}
              hovered={
                props.hovered?.kind === 'symbol' &&
                props.hovered?.id === symbol.id &&
                !isSelected()
              }
            />
            <Show when={downleadLabel()}>
              {(label) => (
                <text
                  data-vertical-footage-indicator="active"
                  x={label().position.x}
                  y={label().position.y}
                  fill="#111827"
                  font-size={`${props.textFontSizePx}px`}
                  font-family="Segoe UI, Arial, sans-serif"
                  dominant-baseline="hanging"
                  pointer-events="none"
                >
                  {label().text}
                </text>
              )}
            </Show>
          </g>
        )
      }}
    </For>
  )
}
