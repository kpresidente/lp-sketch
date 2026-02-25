import { For } from 'solid-js'
import SymbolGlyph from '../SymbolGlyph'
import {
  downleadFootageLabelPosition,
  isDownleadSymbolType,
  symbolVerticalFootageFt,
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
        const labelPosition = downleadFootageLabelPosition(symbol, designScale())
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
            {isDownleadSymbolType(symbol.symbolType) && labelPosition && (
              <text
                data-vertical-footage-indicator="active"
                x={labelPosition.x}
                y={labelPosition.y}
                fill="#111827"
                font-size={`${props.textFontSizePx}px`}
                font-family="Segoe UI, Arial, sans-serif"
                dominant-baseline="hanging"
                pointer-events="none"
              >
                {symbolVerticalFootageFt(symbol)}
              </text>
            )}
          </g>
        )
      }}
    </For>
  )
}
