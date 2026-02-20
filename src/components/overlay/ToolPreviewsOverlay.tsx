import { For, Match, Show, Switch } from 'solid-js'
import {
  dimensionBarLineSegments,
  dimensionExtensionLineSegments,
  dimensionLineworkGeometry,
} from '../../lib/dimensionText'
import type {
  OverlayLayerProps,
  SelectionHandlePreview,
  SnapPointPreview,
} from './types'

const SNAP_MARKER_HALF_PX = 7
const SNAP_MARKER_POINT_RADIUS_PX = 3.6
const SNAP_MARKER_STROKE_PX = 2.2
const SNAP_MARKER_COLOR = '#ef4444'
const SELECTION_HANDLE_RADIUS_PX = 6
const SELECTION_HANDLE_STROKE_PX = 1.8
const SELECTION_HANDLE_GUIDE_STROKE_PX = 1.4
const SELECTION_HANDLE_COLOR = '#0f172a'
const SELECTION_HANDLE_FILL = '#ffffff'

type ToolPreviewsOverlayProps = Pick<
  OverlayLayerProps,
  | 'arcChordPreview'
  | 'arcCurvePreview'
  | 'annotationScale'
  | 'linePreview'
  | 'directionPreview'
  | 'arrowPreview'
  | 'calibrationLinePreview'
  | 'snapPointPreview'
  | 'selectionHandlePreview'
  | 'selectionDebugLabel'
> & {
  dimensionTextPreview?: OverlayLayerProps['dimensionTextPreview']
  viewZoom?: number
}

function SnapMarker(props: {
  preview: SnapPointPreview
  halfSize: number
  pointRadius: number
  strokeWidth: number
}) {
  const point = () => props.preview.point
  const kind = () => props.preview.kind

  return (
    <g data-snap-marker="active" data-snap-marker-kind={kind()}>
      <Switch>
        <Match when={kind() === 'endpoint'}>
          <rect
            data-snap-shape="square"
            x={point().x - props.halfSize}
            y={point().y - props.halfSize}
            width={props.halfSize * 2}
            height={props.halfSize * 2}
            fill="#ffffff"
            stroke={SNAP_MARKER_COLOR}
            stroke-width={props.strokeWidth}
            opacity={0.95}
          />
        </Match>
        <Match when={kind() === 'intersection'}>
          <>
            <line
              data-snap-shape="x"
              x1={point().x - props.halfSize}
              y1={point().y - props.halfSize}
              x2={point().x + props.halfSize}
              y2={point().y + props.halfSize}
              stroke={SNAP_MARKER_COLOR}
              stroke-width={props.strokeWidth}
              stroke-linecap="round"
              opacity={0.95}
            />
            <line
              data-snap-shape="x"
              x1={point().x - props.halfSize}
              y1={point().y + props.halfSize}
              x2={point().x + props.halfSize}
              y2={point().y - props.halfSize}
              stroke={SNAP_MARKER_COLOR}
              stroke-width={props.strokeWidth}
              stroke-linecap="round"
              opacity={0.95}
            />
          </>
        </Match>
        <Match when={kind() === 'nearest'}>
          <circle
            data-snap-shape="point"
            cx={point().x}
            cy={point().y}
            r={props.pointRadius}
            fill={SNAP_MARKER_COLOR}
            stroke="#ffffff"
            stroke-width={props.strokeWidth * 0.6}
            opacity={0.95}
          />
        </Match>
        <Match when={kind() === 'perpendicular'}>
          <>
            <line
              data-snap-shape="perpendicular"
              x1={point().x - props.halfSize}
              y1={point().y + props.halfSize}
              x2={point().x - props.halfSize}
              y2={point().y - props.halfSize}
              stroke={SNAP_MARKER_COLOR}
              stroke-width={props.strokeWidth}
              stroke-linecap="round"
              opacity={0.95}
            />
            <line
              data-snap-shape="perpendicular"
              x1={point().x - props.halfSize}
              y1={point().y - props.halfSize}
              x2={point().x + props.halfSize}
              y2={point().y - props.halfSize}
              stroke={SNAP_MARKER_COLOR}
              stroke-width={props.strokeWidth}
              stroke-linecap="round"
              opacity={0.95}
            />
          </>
        </Match>
        <Match when={kind() === 'basepoint'}>
          <rect
            data-snap-shape="square-rotated"
            x={point().x - props.halfSize}
            y={point().y - props.halfSize}
            width={props.halfSize * 2}
            height={props.halfSize * 2}
            fill="#ffffff"
            stroke={SNAP_MARKER_COLOR}
            stroke-width={props.strokeWidth}
            opacity={0.95}
            transform={`rotate(45 ${point().x} ${point().y})`}
          />
        </Match>
        <Match when={true}>
          <>
            <line
              data-snap-shape="plus"
              x1={point().x - props.halfSize}
              y1={point().y}
              x2={point().x + props.halfSize}
              y2={point().y}
              stroke={SNAP_MARKER_COLOR}
              stroke-width={props.strokeWidth}
              stroke-linecap="round"
              opacity={0.95}
            />
            <line
              data-snap-shape="plus"
              x1={point().x}
              y1={point().y - props.halfSize}
              x2={point().x}
              y2={point().y + props.halfSize}
              stroke={SNAP_MARKER_COLOR}
              stroke-width={props.strokeWidth}
              stroke-linecap="round"
              opacity={0.95}
            />
          </>
        </Match>
      </Switch>
    </g>
  )
}

function ArcPointMarker(props: {
  point: { x: number; y: number }
  label: '1' | '2' | '3'
  scale: number
}) {
  return (
    <g data-arc-point-marker={props.label}>
      <circle
        cx={props.point.x}
        cy={props.point.y}
        r={5 * props.scale}
        fill="#ffffff"
        stroke="#334155"
        stroke-width={1.4 * props.scale}
      />
      <text
        x={props.point.x + 7 * props.scale}
        y={props.point.y - 7 * props.scale}
        fill="#334155"
        font-size={`${11 * props.scale}px`}
        font-family="Segoe UI, Arial, sans-serif"
        dominant-baseline="middle"
      >
        {props.label}
      </text>
    </g>
  )
}

function SelectionHandleMarker(props: {
  point: { x: number; y: number }
  kind: string
  radius: number
  strokeWidth: number
}) {
  return (
    <circle
      data-selection-handle={props.kind}
      cx={props.point.x}
      cy={props.point.y}
      r={props.radius}
      fill={SELECTION_HANDLE_FILL}
      stroke={SELECTION_HANDLE_COLOR}
      stroke-width={props.strokeWidth}
    />
  )
}

function SelectionHandleOverlay(props: {
  preview: SelectionHandlePreview
  radius: number
  strokeWidth: number
  guideStrokeWidth: number
}) {
  const fontSize = `${props.radius * (11 / SELECTION_HANDLE_RADIUS_PX)}px`
  const dash = `${props.radius * (4 / SELECTION_HANDLE_RADIUS_PX)} ${props.radius * (3 / SELECTION_HANDLE_RADIUS_PX)}`

  if (props.preview.kind === 'line' || props.preview.kind === 'arrow') {
    const start = props.preview.kind === 'line' ? props.preview.start : props.preview.tail
    const end = props.preview.kind === 'line' ? props.preview.end : props.preview.head
    const startHandle = props.preview.kind === 'line' ? 'line-start' : 'arrow-tail'
    const endHandle = props.preview.kind === 'line' ? 'line-end' : 'arrow-head'

    return (
      <g data-selection-handles="active">
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={SELECTION_HANDLE_COLOR}
          stroke-width={props.guideStrokeWidth}
          stroke-dasharray={dash}
          opacity={0.45}
        />
        <SelectionHandleMarker
          kind={startHandle}
          point={start}
          radius={props.radius}
          strokeWidth={props.strokeWidth}
        />
        <SelectionHandleMarker
          kind={endHandle}
          point={end}
          radius={props.radius}
          strokeWidth={props.strokeWidth}
        />
      </g>
    )
  }

  if (props.preview.kind === 'arc' || props.preview.kind === 'curve') {
    const handlePrefix = props.preview.kind === 'arc' ? 'arc' : 'curve'
    return (
      <g data-selection-handles="active">
        <SelectionHandleMarker
          kind={`${handlePrefix}-start`}
          point={props.preview.start}
          radius={props.radius}
          strokeWidth={props.strokeWidth}
        />
        <SelectionHandleMarker
          kind={`${handlePrefix}-through`}
          point={props.preview.through}
          radius={props.radius}
          strokeWidth={props.strokeWidth}
        />
        <SelectionHandleMarker
          kind={`${handlePrefix}-end`}
          point={props.preview.end}
          radius={props.radius}
          strokeWidth={props.strokeWidth}
        />
        <text
          x={props.preview.start.x + props.radius + 2}
          y={props.preview.start.y - props.radius - 1}
          fill={SELECTION_HANDLE_COLOR}
          font-size={fontSize}
          font-family="Segoe UI, Arial, sans-serif"
        >
          1
        </text>
        <text
          x={props.preview.through.x + props.radius + 2}
          y={props.preview.through.y - props.radius - 1}
          fill={SELECTION_HANDLE_COLOR}
          font-size={fontSize}
          font-family="Segoe UI, Arial, sans-serif"
        >
          2
        </text>
        <text
          x={props.preview.end.x + props.radius + 2}
          y={props.preview.end.y - props.radius - 1}
          fill={SELECTION_HANDLE_COLOR}
          font-size={fontSize}
          font-family="Segoe UI, Arial, sans-serif"
        >
          3
        </text>
      </g>
    )
  }

  return (
    <g data-selection-handles="active">
      <line
        x1={props.preview.center.x}
        y1={props.preview.center.y}
        x2={props.preview.handle.x}
        y2={props.preview.handle.y}
        stroke={SELECTION_HANDLE_COLOR}
        stroke-width={props.guideStrokeWidth}
        stroke-dasharray={dash}
        opacity={0.45}
      />
      <SelectionHandleMarker
        kind="symbol-direction"
        point={props.preview.handle}
        radius={props.radius}
        strokeWidth={props.strokeWidth}
      />
    </g>
  )
}

export default function ToolPreviewsOverlay(props: ToolPreviewsOverlayProps) {
  const markerHalfSize = () =>
    SNAP_MARKER_HALF_PX / Math.max(0.01, props.viewZoom ?? 1)
  const markerPointRadius = () =>
    SNAP_MARKER_POINT_RADIUS_PX / Math.max(0.01, props.viewZoom ?? 1)
  const markerStroke = () =>
    SNAP_MARKER_STROKE_PX / Math.max(0.01, props.viewZoom ?? 1)
  const selectionHandleRadius = () =>
    SELECTION_HANDLE_RADIUS_PX / Math.max(0.01, props.viewZoom ?? 1)
  const selectionHandleStroke = () =>
    SELECTION_HANDLE_STROKE_PX / Math.max(0.01, props.viewZoom ?? 1)
  const selectionHandleGuideStroke = () =>
    SELECTION_HANDLE_GUIDE_STROKE_PX / Math.max(0.01, props.viewZoom ?? 1)
  const debugFontSize = () => `${12 / Math.max(0.01, props.viewZoom ?? 1)}px`
  const debugStrokeWidth = () => 3 / Math.max(0.01, props.viewZoom ?? 1)
  const debugX = () => 12 / Math.max(0.01, props.viewZoom ?? 1)
  const debugY = () => 18 / Math.max(0.01, props.viewZoom ?? 1)

  return (
    <>
      <Show when={props.selectionDebugLabel}>
        {(label) => (
          <text
            data-selection-debug-text="active"
            x={debugX()}
            y={debugY()}
            fill="#0f172a"
            stroke="#ffffff"
            stroke-width={debugStrokeWidth()}
            paint-order="stroke"
            font-size={debugFontSize()}
            font-family="Consolas, 'Courier New', monospace"
            dominant-baseline="hanging"
          >
            {label()}
          </text>
        )}
      </Show>

      <Show when={props.selectionHandlePreview} keyed>
        {(preview) => (
          <SelectionHandleOverlay
            preview={preview}
            radius={selectionHandleRadius()}
            strokeWidth={selectionHandleStroke()}
            guideStrokeWidth={selectionHandleGuideStroke()}
          />
        )}
      </Show>

      <Show when={props.snapPointPreview}>
        {(preview) => (
          <SnapMarker
            preview={preview()}
            halfSize={markerHalfSize()}
            pointRadius={markerPointRadius()}
            strokeWidth={markerStroke()}
          />
        )}
      </Show>

      <Show when={props.arcChordPreview}>
        {(preview) => (
          <g>
            <line
              x1={preview().start.x}
              y1={preview().start.y}
              x2={preview().end.x}
              y2={preview().end.y}
              stroke="#334155"
              stroke-width={2}
              stroke-dasharray="6 4"
            />
            <ArcPointMarker point={preview().start} label="1" scale={1} />
            <ArcPointMarker point={preview().end} label="2" scale={1} />
          </g>
        )}
      </Show>

      <Show when={props.arcCurvePreview}>
        {(preview) => (
          <g>
            <path
              d={preview().path}
              fill="none"
              stroke="#334155"
              stroke-width={2}
              stroke-dasharray="6 4"
            />
            <ArcPointMarker point={preview().start} label="1" scale={1} />
            <ArcPointMarker point={preview().through} label="2" scale={1} />
            <ArcPointMarker point={preview().end} label="3" scale={1} />
          </g>
        )}
      </Show>

      <Show when={props.linePreview}>
        {(preview) => (
          <line
            x1={preview().start.x}
            y1={preview().start.y}
            x2={preview().end.x}
            y2={preview().end.y}
            stroke="#374151"
            stroke-width={2}
            stroke-dasharray="6 4"
          />
        )}
      </Show>

      <Show when={props.dimensionTextPreview}>
        {(previewAccessor) => {
          const preview = previewAccessor()
          const placementPreview = preview.phase === 'placement' ? preview : null
          const linework =
            placementPreview && preview.showLinework
              ? dimensionLineworkGeometry(
                {
                  start: preview.start,
                  end: preview.end,
                  position: placementPreview.position,
                },
                8,
              )
              : null
          const lineworkExtensions = linework
            ? dimensionExtensionLineSegments(linework, 3)
            : null
          const lineworkBars = linework
            ? dimensionBarLineSegments(
              linework,
              placementPreview?.position ?? preview.start,
              54,
              16,
              4,
            )
            : []
          const mid = {
            x: (preview.start.x + preview.end.x) / 2,
            y: (preview.start.y + preview.end.y) / 2,
          }

          return (
            <g data-dimension-preview="active">
              <line
                x1={preview.start.x}
                y1={preview.start.y}
                x2={preview.end.x}
                y2={preview.end.y}
                stroke="#111827"
                stroke-width={2}
                stroke-dasharray="6 4"
              />
              <Show when={linework}>
                {(_geometry) => (
                  <g data-dimension-preview-linework="active">
                    <line
                      x1={lineworkExtensions?.[0].start.x}
                      y1={lineworkExtensions?.[0].start.y}
                      x2={lineworkExtensions?.[0].end.x}
                      y2={lineworkExtensions?.[0].end.y}
                      stroke="#111827"
                      stroke-width={1.4}
                      stroke-dasharray="4 3"
                      opacity={0.8}
                    />
                    <line
                      x1={lineworkExtensions?.[1].start.x}
                      y1={lineworkExtensions?.[1].start.y}
                      x2={lineworkExtensions?.[1].end.x}
                      y2={lineworkExtensions?.[1].end.y}
                      stroke="#111827"
                      stroke-width={1.4}
                      stroke-dasharray="4 3"
                      opacity={0.8}
                    />
                    <For each={lineworkBars}>
                      {(segment) => (
                        <line
                          x1={segment.start.x}
                          y1={segment.start.y}
                          x2={segment.end.x}
                          y2={segment.end.y}
                          stroke="#111827"
                          stroke-width={1.8}
                          stroke-dasharray="6 4"
                        />
                      )}
                    </For>
                  </g>
                )}
              </Show>
              <Show when={placementPreview}>
                {(placement) => (
                  <>
                    <line
                      x1={mid.x}
                      y1={mid.y}
                      x2={placement().position.x}
                      y2={placement().position.y}
                      stroke="#111827"
                      stroke-width={1.4}
                      stroke-dasharray="4 4"
                      opacity={0.7}
                    />
                    <rect
                      x={placement().position.x - 4}
                      y={placement().position.y - 3}
                      width={(placement().label.length * 7.4) + 8}
                      height={18}
                      fill="rgba(255,255,255,0.92)"
                      stroke="#111827"
                      stroke-width={0.9}
                      rx={3}
                    />
                    <text
                      x={placement().position.x}
                      y={placement().position.y}
                      fill="#111827"
                      font-size="12px"
                      font-family="Segoe UI, Arial, sans-serif"
                      dominant-baseline="hanging"
                    >
                      {placement().label}
                    </text>
                  </>
                )}
              </Show>
            </g>
          )
        }}
      </Show>

      <Show when={props.directionPreview}>
        {(preview) => (
          <line
            x1={preview().start.x}
            y1={preview().start.y}
            x2={preview().end.x}
            y2={preview().end.y}
            stroke="#1f2937"
            stroke-width={2}
            stroke-dasharray="4 4"
            marker-end="url(#preview-arrow)"
          />
        )}
      </Show>

      <Show when={props.arrowPreview}>
        {(preview) => (
          <line
            x1={preview().start.x}
            y1={preview().start.y}
            x2={preview().end.x}
            y2={preview().end.y}
            stroke="#1f2937"
            stroke-width={2}
            stroke-dasharray="4 4"
            marker-end="url(#preview-arrow)"
          />
        )}
      </Show>

      <Show when={props.calibrationLinePreview}>
        {(preview) => (
          <line
            x1={preview().start.x}
            y1={preview().start.y}
            x2={preview().end.x}
            y2={preview().end.y}
            stroke="#0f766e"
            stroke-width={2}
            stroke-dasharray="8 3"
          />
        )}
      </Show>
    </>
  )
}
