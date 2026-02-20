import { For } from 'solid-js'
import type { OverlayLayerProps } from './types'

type PathPreviewsOverlayProps = Pick<
  OverlayLayerProps,
  | 'project'
  | 'annotationScale'
  | 'measurePathPreview'
  | 'markPathPreview'
  | 'linearAutoSpacingPathPreview'
  | 'linearAutoSpacingVertices'
  | 'linearAutoSpacingCorners'
>

export default function PathPreviewsOverlay(props: PathPreviewsOverlayProps) {
  return (
    <>
      <For each={props.measurePathPreview.slice(1)}>
        {(point, index) => {
          const previous = props.measurePathPreview[index()]
          return (
            <line
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              stroke="#0f766e"
              stroke-width={2}
              stroke-dasharray="7 4"
            />
          )
        }}
      </For>

      <For each={props.measurePathPreview}>
        {(point) => (
          <circle
            cx={point.x}
            cy={point.y}
            r={3.4}
            fill="#ffffff"
            stroke="#0f766e"
            stroke-width={1.4}
          />
        )}
      </For>

      <For each={props.markPathPreview.slice(1)}>
        {(point, index) => {
          const previous = props.markPathPreview[index()]
          return (
            <line
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              stroke="#b45309"
              stroke-width={2}
              stroke-dasharray="4 4"
            />
          )
        }}
      </For>

      <For each={props.markPathPreview}>
        {(point, index) => (
          <circle
            cx={point.x}
            cy={point.y}
            r={index() === 0 ? 4 : 3.2}
            fill="#fff7ed"
            stroke="#b45309"
            stroke-width={1.4}
          />
        )}
      </For>

      <For each={props.linearAutoSpacingPathPreview.slice(1)}>
        {(point, index) => {
          const previous = props.linearAutoSpacingPathPreview[index()]
          return (
            <line
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              stroke="#0369a1"
              stroke-width={2}
              stroke-dasharray="7 4"
            />
          )
        }}
      </For>

      <For each={props.linearAutoSpacingVertices}>
        {(point, index) => {
          const corner = props.linearAutoSpacingCorners[index()] ?? 'outside'

          if (corner === 'inside') {
            return (
              <rect
                x={point.x - 3.5}
                y={point.y - 3.5}
                width={7}
                height={7}
                fill="#fffbeb"
                stroke="#92400e"
                stroke-width={1.3}
              />
            )
          }

          return (
            <circle
              cx={point.x}
              cy={point.y}
              r={3.6}
              fill="#eff6ff"
              stroke="#1d4ed8"
              stroke-width={1.3}
            />
          )
        }}
      </For>
    </>
  )
}
