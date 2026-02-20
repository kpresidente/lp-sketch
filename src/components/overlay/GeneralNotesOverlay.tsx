import { For, Show } from 'solid-js'
import { GENERAL_NOTES_TITLE, generalNotesBoxSize, generalNotesDisplayLines, scaledGeneralNotesMetrics } from '../../lib/generalNotes'
import type { OverlayLayerProps } from './types'

type GeneralNotesOverlayProps = Pick<
  OverlayLayerProps,
  | 'project'
  | 'annotationScale'
  | 'selected'
  | 'multiSelectedKeys'
  | 'hovered'
>

export default function GeneralNotesOverlay(props: GeneralNotesOverlayProps) {
  const designScale = () => props.annotationScale ?? 1
  const metrics = () => scaledGeneralNotesMetrics(designScale())
  const lines = () => generalNotesDisplayLines(props.project.generalNotes.notes)

  return (
    <For each={props.project.generalNotes.placements}>
      {(placement) => {
        const size = () => generalNotesBoxSize(props.project.generalNotes.notes, designScale())
        const isSelected = () =>
          (props.selected?.kind === 'general_note' && props.selected.id === placement.id) ||
          !!props.multiSelectedKeys?.has(`general_note:${placement.id}`)
        const isHovered = () =>
          props.hovered?.kind === 'general_note' &&
          props.hovered.id === placement.id &&
          !isSelected()
        const isEmpty = () => props.project.generalNotes.notes.length === 0

        return (
          <g>
            <rect
              x={placement.position.x}
              y={placement.position.y}
              width={size().width}
              height={size().height}
              fill="#fffffff0"
              stroke="#334155"
              stroke-width={1.1 * designScale()}
              rx={4 * designScale()}
            />
            <Show when={isSelected() || isHovered()}>
              <rect
                x={placement.position.x - 2 * designScale()}
                y={placement.position.y - 2 * designScale()}
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
              x={placement.position.x + metrics().paddingXPx}
              y={placement.position.y + metrics().paddingYPx}
              fill="#0f172a"
              font-size={`${metrics().titleFontSizePx}px`}
              font-family="Segoe UI, Arial, sans-serif"
              dominant-baseline="hanging"
              font-weight={700}
            >
              {GENERAL_NOTES_TITLE}
            </text>
            <line
              x1={placement.position.x + metrics().paddingXPx}
              y1={placement.position.y + metrics().paddingYPx + metrics().titleHeightPx - 3 * designScale()}
              x2={placement.position.x + size().width - metrics().paddingXPx}
              y2={placement.position.y + metrics().paddingYPx + metrics().titleHeightPx - 3 * designScale()}
              stroke="#cbd5e1"
              stroke-width={1 * designScale()}
            />
            <For each={lines()}>
              {(line, index) => {
                const rowTop =
                  placement.position.y +
                  metrics().paddingYPx +
                  metrics().titleHeightPx +
                  index() * metrics().rowHeightPx
                return (
                  <text
                    x={placement.position.x + metrics().paddingXPx}
                    y={rowTop + 3 * designScale()}
                    fill={isEmpty() ? '#64748b' : '#1e293b'}
                    font-size={`${metrics().textFontSizePx}px`}
                    font-family="Segoe UI, Arial, sans-serif"
                    dominant-baseline="hanging"
                  >
                    {line}
                  </text>
                )
              }}
            </For>
          </g>
        )
      }}
    </For>
  )
}
