import { Show, type JSX } from 'solid-js'
import { COLOR_HEX } from '../model/defaultProject'
import type { SymbolElement } from '../types/project'
import { resolvedSymbolClass } from '../lib/symbolClass'

const SYMBOL_SIZE = 14
const HALF = SYMBOL_SIZE / 2
const ANNOTATION_SYMBOL_COLOR = '#111827'
const LETTERED_AIR_TERMINAL_SYMBOLS = new Set<SymbolElement['symbolType']>([
  'air_terminal',
  'bonded_air_terminal',
])

interface SymbolGlyphProps {
  symbol: SymbolElement
  selected?: boolean
  hovered?: boolean
  annotationScale?: number
}

function classFill(className: SymbolElement['class'], color: string) {
  if (className === 'class2') {
    return color
  }

  if (className === 'class1') {
    return '#ffffff'
  }

  return 'none'
}

function classStrokeWidth(className: SymbolElement['class'], scale: number) {
  return (className === 'class2' ? 1.9 : 1.45) * scale
}

function commonStyle(symbol: SymbolElement, scale: number) {
  const className = resolvedSymbolClass(symbol)
  const color = symbol.symbolType === 'continued'
    ? ANNOTATION_SYMBOL_COLOR
    : COLOR_HEX[symbol.color]
  return {
    className,
    color,
    fill: classFill(className, color),
    strokeWidth: classStrokeWidth(className, scale),
    innerStroke: className === 'class2' ? '#ffffff' : color,
  }
}

function symbolRotationDeg(symbol: SymbolElement): number {
  const direction = symbol.directionDeg ?? 0

  switch (symbol.symbolType) {
    case 'conduit_downlead_roof':
    case 'surface_downlead_roof':
      // Chevron glyphs are authored with an "up" tip; directionDeg uses +X as 0 deg.
      return direction + 90
    case 'conduit_downlead_ground':
    case 'surface_downlead_ground':
      // Double-chevron glyphs are authored with a "down" tip; directionDeg uses +X as 0 deg.
      return direction - 90
    case 'ground_rod':
      // Ground rod glyph uses stem-top as basepoint and extends downward by default.
      return direction - 90
    default:
      return direction
  }
}

function symbolLetterFill(symbol: SymbolElement): string {
  if (!LETTERED_AIR_TERMINAL_SYMBOLS.has(symbol.symbolType)) {
    return '#111827'
  }

  return resolvedSymbolClass(symbol) === 'class2' ? '#ffffff' : '#111827'
}

function starShape(color: string, scale: number): JSX.Element {
  return (
    <>
      {/* Match Tabler's asterisk geometry used in square-asterisk variants. */}
      <line x1={0} y1={-3.5 * scale} x2={0} y2={3.5 * scale} stroke={color} stroke-width={2 * scale} stroke-linecap="round" />
      <line x1={-3 * scale} y1={-2 * scale} x2={3 * scale} y2={2 * scale} stroke={color} stroke-width={2 * scale} stroke-linecap="round" />
      <line x1={-3 * scale} y1={2 * scale} x2={3 * scale} y2={-2 * scale} stroke={color} stroke-width={2 * scale} stroke-linecap="round" />
    </>
  )
}

function doubleChevronsDownShape(color: string, scale: number): JSX.Element {
  return (
    <>
      <polyline
        points={`${-2 * scale},${-2 * scale} 0,0 ${2 * scale},${-2 * scale}`}
        fill="none"
        stroke={color}
        stroke-width={1.6 * scale}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <polyline
        points={`${-2 * scale},${0.667 * scale} 0,${2.667 * scale} ${2 * scale},${0.667 * scale}`}
        fill="none"
        stroke={color}
        stroke-width={1.6 * scale}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </>
  )
}

function chevronUpShape(color: string, scale: number): JSX.Element {
  return (
    <polyline
      points={`${-2 * scale},${0.667 * scale} 0,${-1.333 * scale} ${2 * scale},${0.667 * scale}`}
      fill="none"
      stroke={color}
      stroke-width={1.6 * scale}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  )
}

function symbolShape(
  symbol: SymbolElement,
  scale: number,
): JSX.Element {
  const style = commonStyle(symbol, scale)

  switch (symbol.symbolType) {
    case 'air_terminal':
      return <circle cx={0} cy={0} r={6 * scale} fill={style.fill} stroke={style.color} stroke-width={style.strokeWidth} />

    case 'bonded_air_terminal':
      return (
        <polygon
          points={`0,${-6.4 * scale} ${5.5 * scale},${-3.2 * scale} ${5.5 * scale},${3.2 * scale} 0,${6.4 * scale} ${-5.5 * scale},${3.2 * scale} ${-5.5 * scale},${-3.2 * scale}`}
          fill={style.fill}
          stroke={style.color}
          stroke-width={style.strokeWidth}
        />
      )

    case 'bond':
      return (
        <polygon
          points={`0,${-6.2 * scale} ${6.2 * scale},0 0,${6.2 * scale} ${-6.2 * scale},0`}
          fill={style.fill}
          stroke={style.color}
          stroke-width={style.strokeWidth}
          stroke-linejoin="round"
        />
      )

    case 'conduit_downlead_ground':
      return (
        <>
          <rect x={-5.4 * scale} y={-5.4 * scale} width={10.8 * scale} height={10.8 * scale} fill={style.fill} stroke={style.color} stroke-width={style.strokeWidth} />
          {doubleChevronsDownShape(style.innerStroke, scale)}
        </>
      )

    case 'conduit_downlead_roof':
      return (
        <>
          <rect x={-5.4 * scale} y={-5.4 * scale} width={10.8 * scale} height={10.8 * scale} fill={style.fill} stroke={style.color} stroke-width={style.strokeWidth} />
          {chevronUpShape(style.innerStroke, scale)}
        </>
      )

    case 'surface_downlead_ground':
      return (
        <>
          <circle cx={0} cy={0} r={6 * scale} fill={style.fill} stroke={style.color} stroke-width={style.strokeWidth} />
          {doubleChevronsDownShape(style.innerStroke, scale)}
        </>
      )

    case 'surface_downlead_roof':
      return (
        <>
          <circle cx={0} cy={0} r={6 * scale} fill={style.fill} stroke={style.color} stroke-width={style.strokeWidth} />
          {chevronUpShape(style.innerStroke, scale)}
        </>
      )

    case 'through_roof_to_steel':
      return (
        <>
          <rect x={-5.5 * scale} y={-5.5 * scale} width={11 * scale} height={11 * scale} fill={style.fill} stroke={style.color} stroke-width={style.strokeWidth} />
          {starShape(style.innerStroke, scale * 0.86)}
        </>
      )

    case 'through_wall_connector':
      return (
        <>
          <circle cx={0} cy={0} r={6 * scale} fill={style.fill} stroke={style.color} stroke-width={style.strokeWidth} />
          <polyline
            points={`${-1.333 * scale},${-1.333 * scale} ${-2.667 * scale},0 ${-1.333 * scale},${1.333 * scale}`}
            fill="none"
            stroke={style.innerStroke}
            stroke-width={1.6 * scale}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <polyline
            points={`${1.333 * scale},${-1.333 * scale} ${2.667 * scale},0 ${1.333 * scale},${1.333 * scale}`}
            fill="none"
            stroke={style.innerStroke}
            stroke-width={1.6 * scale}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </>
      )

    case 'ground_rod':
      return (
        <>
          <line x1={0} y1={0} x2={0} y2={27 * scale} stroke={style.color} stroke-width={2 * scale} stroke-linecap="round" />
          <Show when={style.className === 'class2'}>
            <line x1={-13 * scale} y1={23 * scale} x2={13 * scale} y2={23 * scale} stroke={style.color} stroke-width={2 * scale} stroke-linecap="round" />
          </Show>
          <line x1={-10 * scale} y1={27 * scale} x2={10 * scale} y2={27 * scale} stroke={style.color} stroke-width={2 * scale} stroke-linecap="round" />
          <line x1={-6.4 * scale} y1={31 * scale} x2={6.4 * scale} y2={31 * scale} stroke={style.color} stroke-width={2 * scale} stroke-linecap="round" />
          <line x1={-3.6 * scale} y1={35 * scale} x2={3.6 * scale} y2={35 * scale} stroke={style.color} stroke-width={2 * scale} stroke-linecap="round" />
        </>
      )

    case 'steel_bond':
      return (
        <>
          <polygon
            points={`0,${-6.2 * scale} ${6.2 * scale},0 0,${6.2 * scale} ${-6.2 * scale},0`}
            fill={style.fill}
            stroke={style.color}
            stroke-width={style.strokeWidth}
            stroke-linejoin="round"
          />
          {starShape(style.innerStroke, scale * 0.86)}
        </>
      )

    case 'cable_to_cable_connection':
      return (
        <circle
          cx={0}
          cy={0}
          r={3.2 * scale}
          fill={style.fill}
          stroke={style.color}
          stroke-width={style.strokeWidth}
        />
      )

    case 'mechanical_crossrun_connection': {
      const innerFill = style.className === 'class2' ? '#ffffff' : style.fill
      return (
        <>
          <circle
            cx={0}
            cy={0}
            r={6 * scale}
            fill={style.fill}
            stroke={style.color}
            stroke-width={style.strokeWidth}
          />
          <circle
            cx={0}
            cy={0}
            r={3.2 * scale}
            fill={innerFill}
            stroke={style.color}
            stroke-width={style.strokeWidth}
          />
        </>
      )
    }

    case 'cadweld_connection':
      return (
        <rect
          x={-3.2 * scale}
          y={-3.2 * scale}
          width={6.4 * scale}
          height={6.4 * scale}
          fill={style.fill}
          stroke={style.color}
          stroke-width={style.strokeWidth}
        />
      )

    case 'cadweld_crossrun_connection': {
      const innerFill = style.className === 'class2' ? '#ffffff' : style.fill
      return (
        <>
          <rect
            x={-5.5 * scale}
            y={-5.5 * scale}
            width={11 * scale}
            height={11 * scale}
            fill={style.fill}
            stroke={style.color}
            stroke-width={style.strokeWidth}
          />
          <rect
            x={-3.2 * scale}
            y={-3.2 * scale}
            width={6.4 * scale}
            height={6.4 * scale}
            fill={innerFill}
            stroke={style.color}
            stroke-width={style.strokeWidth}
          />
        </>
      )
    }

    case 'continued':
      return (
        <>
          <path
            d={`M${-6 * scale} ${5.333 * scale}c${5.333 * scale} 0 ${6.667 * scale} ${-10.667 * scale} ${12 * scale} ${-10.667 * scale}`}
            fill="none"
            stroke={style.color}
            stroke-width={1.55 * scale}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </>
      )

    case 'connect_existing':
      return (
        <>
          <path
            d={`M${-6 * scale} ${6 * scale}s${6.667 * scale} ${-10.667 * scale} ${12 * scale} ${-10.667 * scale}`}
            fill="none"
            stroke={style.color}
            stroke-width={1.55 * scale}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            cx={-4.667 * scale}
            cy={-4.667 * scale}
            r={1.333 * scale}
            fill="none"
            stroke={style.color}
            stroke-width={1.55 * scale}
          />
          <line
            x1={-3.333 * scale}
            y1={-4.667 * scale}
            x2={-2 * scale}
            y2={-4.667 * scale}
            stroke={style.color}
            stroke-width={1.55 * scale}
            stroke-linecap="round"
          />
          <line
            x1={1.333 * scale}
            y1={-4.667 * scale}
            x2={0}
            y2={-4.667 * scale}
            stroke={style.color}
            stroke-width={1.55 * scale}
            stroke-linecap="round"
          />
        </>
      )

    default:
      return <circle cx={0} cy={0} r={6 * scale} fill={style.fill} stroke={style.color} stroke-width={style.strokeWidth} />
  }
}

export default function SymbolGlyph(props: SymbolGlyphProps): JSX.Element {
  const rotation = () => symbolRotationDeg(props.symbol)
  const designScale = () => props.annotationScale ?? 1
  const half = () => HALF * designScale()
  const stroke = () => {
    if (props.selected) {
      return '#111827'
    }
    if (props.hovered) {
      return '#0369a1'
    }
    return 'none'
  }

  return (
    <g
      data-symbol-id={props.symbol.id}
      data-symbol-type={props.symbol.symbolType}
      transform={`translate(${props.symbol.position.x} ${props.symbol.position.y})`}
    >
      <circle cx={0} cy={0} r={half() + 5 * designScale()} fill="transparent" stroke="none" />
      <g transform={`rotate(${rotation()})`}>
        {symbolShape(props.symbol, designScale())}
      </g>
      <Show when={props.symbol.letter}>
        {(letter) => (
          <text
            x={0}
            y={0.45 * designScale()}
            fill={symbolLetterFill(props.symbol)}
            font-size={`${8.2 * designScale()}px`}
            font-weight="700"
            font-family="Segoe UI, Arial, sans-serif"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {letter()}
          </text>
        )}
      </Show>
      <circle
        cx={0}
        cy={0}
        r={half() + 2 * designScale()}
        fill="none"
        stroke={stroke()}
        stroke-width={(props.selected ? 1.2 : 1.1) * designScale()}
        stroke-dasharray={
          props.selected
            ? `${4 * designScale()} ${2 * designScale()}`
            : `${3 * designScale()} ${2 * designScale()}`
        }
        opacity={props.selected ? 1 : 0.6}
      />
    </g>
  )
}
