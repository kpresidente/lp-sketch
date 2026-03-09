import { For, Show } from 'solid-js'
import {
  dimensionLabelWidthPx,
} from '../lib/dimensionText'
import { circularArcPathFromThreePoints } from '../lib/geometry'
import { generalNotesBoxSize } from '../lib/generalNotes'
import { selectionKey } from '../lib/selection'
import { splitTextIntoLines } from '../lib/textLayout'
import type { Selection } from '../types/project'
import OverlayDefs from './overlay/OverlayDefs'
import PathPreviewsOverlay from './overlay/PathPreviewsOverlay'
import ToolPreviewsOverlay from './overlay/ToolPreviewsOverlay'
import type { WorkspaceInteractionOverlayProps } from './overlay/types'

const LINE_HIGHLIGHT_SELECTED_COLOR = '#111827'
const LINE_HIGHLIGHT_HOVER_COLOR = '#0369a1'
const SYMBOL_RING_BASE_RADIUS = 9

export default function WorkspaceInteractionOverlay(props: WorkspaceInteractionOverlayProps) {
  const designScale = () => props.annotationScale ?? 1

  const isSelected = (selection: Selection) =>
    (props.selected?.kind === selection.kind && props.selected.id === selection.id) ||
    !!props.multiSelectedKeys?.has(selectionKey(selection))

  const isHovered = (selection: Selection) =>
    props.hovered?.kind === selection.kind &&
    props.hovered.id === selection.id &&
    !isSelected(selection)

  return (
    <svg
      class="workspace-interaction-overlay"
      aria-label="drawing-interaction-overlay"
      width={Math.max(1, props.project.pdf.widthPt)}
      height={Math.max(1, props.project.pdf.heightPt)}
    >
      <For each={props.project.elements.arcs}>
        {(arc) => {
          const selection = { kind: 'arc', id: arc.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)
          const path =
            circularArcPathFromThreePoints(arc.start, arc.through, arc.end) ??
            `M ${arc.start.x} ${arc.start.y} L ${arc.end.x} ${arc.end.y}`

          return (
            <Show when={selected() || hovered()}>
              <path
                data-persisted-highlight-kind="arc"
                d={path}
                fill="none"
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={(selected() ? 7 : 6) * designScale()}
                stroke-dasharray={
                  selected()
                    ? `${5 * designScale()} ${3 * designScale()}`
                    : `${6 * designScale()} ${4 * designScale()}`
                }
                stroke-linecap="round"
                opacity={selected() ? 0.45 : 0.3}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.elements.curves}>
        {(curve) => {
          const selection = { kind: 'curve', id: curve.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)

          return (
            <Show when={selected() || hovered()}>
              <path
                data-persisted-highlight-kind="curve"
                d={`M ${curve.start.x} ${curve.start.y} Q ${curve.through.x} ${curve.through.y} ${curve.end.x} ${curve.end.y}`}
                fill="none"
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={(selected() ? 7 : 6) * designScale()}
                stroke-dasharray={
                  selected()
                    ? `${5 * designScale()} ${3 * designScale()}`
                    : `${6 * designScale()} ${4 * designScale()}`
                }
                stroke-linecap="round"
                opacity={selected() ? 0.45 : 0.3}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.elements.lines}>
        {(line) => {
          const selection = { kind: 'line', id: line.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)

          return (
            <Show when={selected() || hovered()}>
              <line
                data-persisted-highlight-kind="line"
                x1={line.start.x}
                y1={line.start.y}
                x2={line.end.x}
                y2={line.end.y}
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={(selected() ? 7 : 6) * designScale()}
                stroke-dasharray={
                  selected()
                    ? `${5 * designScale()} ${3 * designScale()}`
                    : `${6 * designScale()} ${4 * designScale()}`
                }
                stroke-linecap="round"
                fill="none"
                opacity={selected() ? 0.45 : 0.3}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.elements.symbols}>
        {(symbol) => {
          const selection = { kind: 'symbol', id: symbol.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)

          return (
            <Show when={selected() || hovered()}>
              <circle
                data-persisted-highlight-kind="symbol"
                cx={symbol.position.x}
                cy={symbol.position.y}
                r={SYMBOL_RING_BASE_RADIUS * designScale()}
                fill="none"
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={(selected() ? 1.2 : 1.1) * designScale()}
                stroke-dasharray={
                  selected()
                    ? `${4 * designScale()} ${2 * designScale()}`
                    : `${3 * designScale()} ${2 * designScale()}`
                }
                opacity={selected() ? 1 : 0.6}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.legend.placements}>
        {(placement) => {
          const selection = { kind: 'legend', id: placement.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)
          const entries = props.legendEntriesForPlacement(props.project.legend.items, placement)
          const size = props.legendBoxSize(entries)

          return (
            <Show when={selected() || hovered()}>
              <rect
                data-persisted-highlight-kind="legend"
                x={placement.position.x - 2 * designScale()}
                y={placement.position.y - 2 * designScale()}
                width={size.width + 4 * designScale()}
                height={size.height + 4 * designScale()}
                fill="none"
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={1.2 * designScale()}
                stroke-dasharray={`${4 * designScale()} ${2 * designScale()}`}
                rx={5 * designScale()}
                opacity={selected() ? 1 : 0.45}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.generalNotes.placements}>
        {(placement) => {
          const selection = { kind: 'general_note', id: placement.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)
          const size = generalNotesBoxSize(props.project.generalNotes.notes, designScale())

          return (
            <Show when={selected() || hovered()}>
              <rect
                data-persisted-highlight-kind="general_note"
                x={placement.position.x - 2 * designScale()}
                y={placement.position.y - 2 * designScale()}
                width={size.width + 4 * designScale()}
                height={size.height + 4 * designScale()}
                fill="none"
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={1.2 * designScale()}
                stroke-dasharray={`${4 * designScale()} ${2 * designScale()}`}
                rx={5 * designScale()}
                opacity={selected() ? 1 : 0.45}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.elements.texts}>
        {(textElement) => {
          const selection = { kind: 'text', id: textElement.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)
          const lines = splitTextIntoLines(textElement.text)
          const selectedWidth = lines.reduce(
            (max, line) => Math.max(max, props.approximateTextWidth(line)),
            0,
          )
          const selectedHeight = Math.max(
            props.textLineHeightPx,
            lines.length * props.textLineHeightPx,
          )

          return (
            <Show when={selected() || hovered()}>
              <rect
                data-persisted-highlight-kind="text"
                x={textElement.position.x - 4 * designScale()}
                y={textElement.position.y - 3 * designScale()}
                width={selectedWidth + 8 * designScale()}
                height={selectedHeight + 6 * designScale()}
                fill="none"
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={1.2 * designScale()}
                stroke-dasharray={`${4 * designScale()} ${2 * designScale()}`}
                rx={3 * designScale()}
                opacity={selected() ? 1 : 0.45}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.elements.dimensionTexts}>
        {(dimensionText) => {
          const selection = {
            kind: 'dimension_text',
            id: dimensionText.id,
          } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)
          const label = props.dimensionTextLabel(dimensionText)
          const selectedWidth = dimensionLabelWidthPx(
            label,
            designScale(),
            props.textFontSizePx,
          )

          return (
            <Show when={selected() || hovered()}>
              <rect
                data-persisted-highlight-kind="dimension_text"
                x={dimensionText.position.x - selectedWidth / 2 - 4 * designScale()}
                y={dimensionText.position.y - props.textLineHeightPx / 2 - 3 * designScale()}
                width={selectedWidth + 8 * designScale()}
                height={props.textLineHeightPx + 6 * designScale()}
                fill="none"
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={1.2 * designScale()}
                stroke-dasharray={`${4 * designScale()} ${2 * designScale()}`}
                rx={3 * designScale()}
                opacity={selected() ? 1 : 0.45}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.elements.arrows}>
        {(arrow) => {
          const selection = { kind: 'arrow', id: arrow.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)

          return (
            <Show when={selected() || hovered()}>
              <line
                data-persisted-highlight-kind="arrow"
                x1={arrow.tail.x}
                y1={arrow.tail.y}
                x2={arrow.head.x}
                y2={arrow.head.y}
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={(selected() ? 7 : 6) * designScale()}
                stroke-dasharray={
                  selected()
                    ? `${5 * designScale()} ${3 * designScale()}`
                    : `${6 * designScale()} ${4 * designScale()}`
                }
                stroke-linecap="round"
                opacity={selected() ? 0.45 : 0.3}
              />
            </Show>
          )
        }}
      </For>
      <For each={props.project.construction.marks}>
        {(mark) => {
          const selection = { kind: 'mark', id: mark.id } satisfies Selection
          const selected = () => isSelected(selection)
          const hovered = () => isHovered(selection)

          return (
            <Show when={selected() || hovered()}>
              <circle
                data-persisted-highlight-kind="mark"
                cx={mark.position.x}
                cy={mark.position.y}
                r={8}
                fill="none"
                stroke={selected() ? LINE_HIGHLIGHT_SELECTED_COLOR : LINE_HIGHLIGHT_HOVER_COLOR}
                stroke-width={1.4}
                stroke-dasharray="4 2"
                opacity={selected() ? 0.55 : 0.4}
              />
            </Show>
          )
        }}
      </For>
      <PathPreviewsOverlay {...props} />
      <ToolPreviewsOverlay {...props} viewZoom={props.project.view.zoom} />
      <OverlayDefs />
    </svg>
  )
}
