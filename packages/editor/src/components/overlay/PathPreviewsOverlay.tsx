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
              class="ov-measure-path"
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
            class="ov-measure-point"
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
              class="ov-mark-path"
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
            class="ov-mark-point"
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
              class="ov-auto-path"
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
                class="ov-auto-vertex ov-auto-vertex--inside"
                stroke-width={1.3}
              />
            )
          }

          return (
            <circle
              cx={point.x}
              cy={point.y}
              r={3.6}
              class="ov-auto-vertex"
              stroke-width={1.3}
            />
          )
        }}
      </For>
    </>
  )
}
