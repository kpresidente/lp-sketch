// @vitest-environment jsdom

import { cleanup, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it } from 'vitest'
import { createDefaultProject } from '../../model/defaultProject'
import type { Point } from '../../types/project'
import ArrowsOverlay from './ArrowsOverlay'
import DimensionTextsOverlay from './DimensionTextsOverlay'
import GeneralNotesOverlay from './GeneralNotesOverlay'
import LegendsOverlay from './LegendsOverlay'
import LinesOverlay from './LinesOverlay'
import MarksOverlay from './MarksOverlay'
import PathPreviewsOverlay from './PathPreviewsOverlay'
import SymbolsOverlay from './SymbolsOverlay'
import ToolPreviewsOverlay from './ToolPreviewsOverlay'
import type { LegendDisplayEntry, LegendUiMetrics } from './types'

afterEach(() => {
  cleanup()
})

const legendUi: LegendUiMetrics = {
  title: 'Legend',
  titleFontSizePx: 13,
  textFontSizePx: 12,
  paddingXPx: 8,
  paddingYPx: 8,
  titleHeightPx: 18,
  rowHeightPx: 20,
  symbolCenterXPx: 12,
  symbolRadiusPx: 5,
  textOffsetXPx: 24,
}

describe('overlay branch rendering', () => {
  it('renders selected and unselected arrow overlays', () => {
    const project = createDefaultProject('Arrow Overlay')
    project.view = { currentPage: 1, zoom: 1, pan: { x: 0, y: 0 }, byPage: { 1: { zoom: 1, pan: { x: 0, y: 0 } } } }
    project.elements.arrows.push({
      id: 'arrow-1',
      tail: { x: 10, y: 20 },
      head: { x: 30, y: 40 },
      color: 'green',
      layer: 'annotation',
    })

    const { container, unmount } = render(() => (
      <svg>
        <ArrowsOverlay
          project={project}
          selected={{ kind: 'arrow', id: 'arrow-1' }}
          hovered={null}
        />
      </svg>
    ))

    expect(container.querySelector('line[stroke="#111827"][stroke-dasharray="5 3"]')).not.toBeNull()
    expect(container.querySelector('line[stroke="#2e8b57"][marker-end="url(#arrow-head)"]')).not.toBeNull()
    unmount()

    const { container: unselectedContainer } = render(() => (
      <svg>
        <ArrowsOverlay project={project} selected={null} hovered={null} />
      </svg>
    ))

    expect(unselectedContainer.querySelector('line[stroke="#111827"][stroke-dasharray="5 3"]')).toBeNull()
    expect(unselectedContainer.querySelector('line[stroke="#2e8b57"][marker-end="url(#arrow-head)"]')).not.toBeNull()
  })

  it('renders selection highlight when a line is multi-selected', () => {
    const project = createDefaultProject('Multi Select Line Overlay')
    project.view = { currentPage: 1, zoom: 1, pan: { x: 0, y: 0 }, byPage: { 1: { zoom: 1, pan: { x: 0, y: 0 } } } }
    project.elements.lines.push({
      id: 'line-1',
      start: { x: 20, y: 30 },
      end: { x: 120, y: 60 },
      color: 'green',
      class: 'class1',
    })

    const { container } = render(() => (
      <svg>
        <LinesOverlay
          project={project}
          selected={null}
          hovered={null}
          multiSelectedKeys={new Set(['line:line-1'])}
        />
      </svg>
    ))

    expect(container.querySelector('line[stroke="#111827"][stroke-dasharray="5 3"]')).not.toBeNull()
  })

  it('renders dimension linework when enabled on a dimension text element', () => {
    const project = createDefaultProject('Dimension Linework Overlay')
    project.view = { currentPage: 1, zoom: 1, pan: { x: 0, y: 0 }, byPage: { 1: { zoom: 1, pan: { x: 0, y: 0 } } } }
    project.elements.dimensionTexts.push({
      id: 'dimension-text-1',
      start: { x: 80, y: 120 },
      end: { x: 180, y: 120 },
      position: { x: 130, y: 148 },
      showLinework: true,
      layer: 'annotation',
    })

    const { container } = render(() => (
      <svg>
        <DimensionTextsOverlay
          project={project}
          annotationScale={1}
          selected={null}
          hovered={null}
          approximateTextWidth={() => 40}
          textFontSizePx={12}
          textLineHeightPx={16}
          dimensionTextLabel={() => '10\' 0"'}
        />
      </svg>
    ))

    expect(container.querySelector('g[data-dimension-linework="active"]')).not.toBeNull()
    expect(container.querySelector('g[data-dimension-linework="active"] line')).not.toBeNull()
  })

  it('renders mark selection highlight when a mark is selected', () => {
    const project = createDefaultProject('Mark Overlay')
    project.view = { currentPage: 1, zoom: 1, pan: { x: 0, y: 0 }, byPage: { 1: { zoom: 1, pan: { x: 0, y: 0 } } } }
    project.construction.marks.push({
      id: 'mark-1',
      position: { x: 42, y: 58 },
    })

    const { container, unmount } = render(() => (
      <svg>
        <MarksOverlay
          project={project}
          selected={{ kind: 'mark', id: 'mark-1' }}
          hovered={null}
        />
      </svg>
    ))

    expect(container.querySelector('circle[stroke="#111827"][stroke-dasharray="4 2"]')).not.toBeNull()
    unmount()

    const { container: unselectedContainer } = render(() => (
      <svg>
        <MarksOverlay project={project} selected={null} hovered={null} />
      </svg>
    ))

    expect(unselectedContainer.querySelector('circle[stroke="#111827"][stroke-dasharray="4 2"]')).toBeNull()
  })

  it('renders downlead footage text as black annotation text near the symbol', () => {
    const project = createDefaultProject('Downlead Label Overlay')
    project.view = { currentPage: 1, zoom: 1, pan: { x: 0, y: 0 }, byPage: { 1: { zoom: 1, pan: { x: 0, y: 0 } } } }
    project.elements.symbols.push({
      id: 'downlead-1',
      symbolType: 'conduit_downlead_ground',
      position: { x: 100, y: 100 },
      color: 'red',
      class: 'class1',
      verticalFootageFt: 42,
    })

    const { container } = render(() => (
      <svg>
        <SymbolsOverlay
          project={project}
          selected={null}
          hovered={null}
          annotationScale={1}
          textFontSizePx={14}
        />
      </svg>
    ))

    const label = container.querySelector('text[data-vertical-footage-indicator="active"]')
    expect(label).not.toBeNull()
    expect(label?.getAttribute('fill')).toBe('#111827')
    expect(label?.getAttribute('x')).toBe('108')
    expect(label?.getAttribute('y')).toBe('86')
    expect(label?.textContent).toBe('42')
  })

  it('keeps construction mark sizing stable when annotation scale changes', () => {
    const project = createDefaultProject('Mark Overlay Size')
    project.view = { currentPage: 1, zoom: 1, pan: { x: 0, y: 0 }, byPage: { 1: { zoom: 1, pan: { x: 0, y: 0 } } } }
    project.construction.marks.push({
      id: 'mark-1',
      position: { x: 42, y: 58 },
    })

    const { container } = render(() => (
      <svg>
        <MarksOverlay
          project={project}
          selected={{ kind: 'mark', id: 'mark-1' }}
          hovered={null}
          annotationScale={2}
        />
      </svg>
    ))

    const highlight = container.querySelector('circle[stroke="#111827"]')
    expect(highlight?.getAttribute('r')).toBe('8')
    expect(highlight?.getAttribute('stroke-width')).toBe('1.4')
    expect(
      container.querySelector('line[stroke="#b91c1c"][x1="37"][y1="53"][x2="47"][y2="63"]'),
    ).not.toBeNull()
  })

  it('renders legend fallback and symbol-specific per-class entries', () => {
    const project = createDefaultProject('Legend Overlay')
    project.view = { currentPage: 1, zoom: 1, pan: { x: 0, y: 0 }, byPage: { 1: { zoom: 1, pan: { x: 0, y: 0 } } } }
    project.legend.placements.push({
      id: 'legend-1',
      position: { x: 20, y: 24 },
      editedLabels: {},
    })

    const emptyEntries = () => [] as LegendDisplayEntry[]
    const legendBoxSize = () => ({ width: 240, height: 120 })
    const legendLineText = (entry: LegendDisplayEntry) => `${entry.label} ${entry.countLabel}`

    const { unmount } = render(() => (
      <svg>
        <LegendsOverlay
          project={project}
          selected={null}
          hovered={null}
          legendUi={legendUi}
          legendEntriesForPlacement={emptyEntries}
          legendBoxSize={legendBoxSize}
          legendLineText={legendLineText}
        />
      </svg>
    ))

    expect(screen.getByText('No components used yet.')).toBeTruthy()
    unmount()

    const populatedEntries = () =>
      [
        {
          key: 'entry-none',
          symbolKind: 'component',
          symbolType: 'bond',
          label: 'Bond',
          countLabel: '2',
          color: 'green',
          class: 'none',
        },
        {
          key: 'entry-class1',
          symbolKind: 'component',
          symbolType: 'air_terminal',
          label: 'Air terminal',
          countLabel: '1',
          color: 'blue',
          class: 'class1',
        },
        {
          key: 'entry-class2',
          symbolKind: 'component',
          symbolType: 'surface_downlead_roof',
          label: 'Roof terminal',
          countLabel: '3',
          color: 'red',
          class: 'class2',
        },
      ] satisfies LegendDisplayEntry[]

    const { container } = render(() => (
      <svg>
        <LegendsOverlay
          project={project}
          selected={{ kind: 'legend', id: 'legend-1' }}
          hovered={null}
          legendUi={legendUi}
          legendEntriesForPlacement={populatedEntries}
          legendBoxSize={legendBoxSize}
          legendLineText={legendLineText}
        />
      </svg>
    ))

    expect(container.querySelector('rect[stroke="#111827"][stroke-dasharray="4 2"]')).not.toBeNull()
    expect(container.querySelector('polygon[fill="#ffffff"][stroke="#2e8b57"]')).not.toBeNull()
    expect(container.querySelector('circle[fill="#ffffff"][stroke="#2563eb"]')).not.toBeNull()
    expect(container.querySelector('rect[fill="#DC143C"][stroke="#DC143C"]')).not.toBeNull()
    expect(screen.getByText('Description')).toBeTruthy()
    expect(screen.getByText('Count')).toBeTruthy()
    expect(screen.getByText('Bond')).toBeTruthy()
    expect(screen.getByText('Air terminal')).toBeTruthy()
    expect(screen.getByText('Roof terminal')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('renders general notes placements with numbered entries', () => {
    const project = createDefaultProject('General Notes Overlay')
    project.generalNotes.notes = ['Install per UL 96A.']
    project.generalNotes.placements.push({
      id: 'general-notes-1',
      position: { x: 24, y: 32 },
    })

    const { container } = render(() => (
      <svg>
        <GeneralNotesOverlay
          project={project}
          annotationScale={1}
          selected={{ kind: 'general_note', id: 'general-notes-1' }}
          hovered={null}
          multiSelectedKeys={new Set()}
        />
      </svg>
    ))

    expect(screen.getByText('General Notes')).toBeTruthy()
    expect(screen.getByText('1. Install per UL 96A.')).toBeTruthy()
    expect(container.querySelector('rect[stroke="#111827"]')).not.toBeNull()
  })

  it('renders direction preview lines when provided', () => {
    render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={{ start: { x: 5, y: 6 }, end: { x: 55, y: 66 } }}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={null}
        />
      </svg>
    ))

    const preview = document.querySelector(
      'line[stroke="#1f2937"][stroke-dasharray="4 4"][marker-end="url(#preview-arrow)"]',
    )
    expect(preview).not.toBeNull()
    expect(preview?.getAttribute('x1')).toBe('5')
    expect(preview?.getAttribute('y2')).toBe('66')
  })

  it('renders dimension preview linework when enabled in placement phase', () => {
    const { container } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={null}
          dimensionTextPreview={{
            phase: 'placement',
            start: { x: 50, y: 60 },
            end: { x: 150, y: 60 },
            position: { x: 100, y: 90 },
            label: '5\' 0"',
            showLinework: true,
          }}
        />
      </svg>
    ))

    expect(container.querySelector('g[data-dimension-preview-linework="active"]')).not.toBeNull()
  })

  it('renders selection handle overlays for line, arc, curve, and directional symbol selections', () => {
    const { container, unmount } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={{
            kind: 'line',
            start: { x: 10, y: 20 },
            end: { x: 50, y: 20 },
          }}
        />
      </svg>
    ))

    expect(container.querySelector('circle[data-selection-handle="line-start"]')).not.toBeNull()
    expect(container.querySelector('circle[data-selection-handle="line-end"]')).not.toBeNull()
    unmount()

    const { container: arrowContainer, unmount: unmountArrow } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={{
            kind: 'arrow',
            tail: { x: 10, y: 20 },
            head: { x: 50, y: 20 },
          }}
        />
      </svg>
    ))

    expect(arrowContainer.querySelector('circle[data-selection-handle="arrow-tail"]')).not.toBeNull()
    expect(arrowContainer.querySelector('circle[data-selection-handle="arrow-head"]')).not.toBeNull()
    unmountArrow()

    const { container: arcContainer, unmount: unmountArc } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={{
            kind: 'arc',
            start: { x: 10, y: 20 },
            through: { x: 30, y: 10 },
            end: { x: 50, y: 20 },
          }}
        />
      </svg>
    ))

    expect(arcContainer.querySelector('circle[data-selection-handle="arc-start"]')).not.toBeNull()
    expect(arcContainer.querySelector('circle[data-selection-handle="arc-through"]')).not.toBeNull()
    expect(arcContainer.querySelector('circle[data-selection-handle="arc-end"]')).not.toBeNull()
    unmountArc()

    const { container: curveHandleContainer, unmount: unmountCurve } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={{
            kind: 'curve',
            start: { x: 10, y: 20 },
            through: { x: 30, y: 10 },
            end: { x: 50, y: 20 },
          }}
        />
      </svg>
    ))

    expect(curveHandleContainer.querySelector('circle[data-selection-handle="curve-start"]')).not.toBeNull()
    expect(curveHandleContainer.querySelector('circle[data-selection-handle="curve-through"]')).not.toBeNull()
    expect(curveHandleContainer.querySelector('circle[data-selection-handle="curve-end"]')).not.toBeNull()
    unmountCurve()

    const { container: symbolContainer } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={{
            kind: 'symbol-direction',
            center: { x: 20, y: 30 },
            handle: { x: 42, y: 30 },
          }}
        />
      </svg>
    ))

    expect(symbolContainer.querySelector('circle[data-selection-handle="symbol-direction"]')).not.toBeNull()
  })

  it('renders arc point markers for 3-point arc preview flow', () => {
    const { container, unmount } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={{ start: { x: 20, y: 30 }, end: { x: 80, y: 90 } }}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={null}
        />
      </svg>
    ))

    expect(container.querySelector('g[data-arc-point-marker="1"]')).not.toBeNull()
    expect(container.querySelector('g[data-arc-point-marker="2"]')).not.toBeNull()
    expect(container.querySelector('g[data-arc-point-marker="3"]')).toBeNull()
    unmount()

    const { container: curveContainer } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={{
            start: { x: 20, y: 30 },
            through: { x: 60, y: 40 },
            end: { x: 100, y: 70 },
            path: 'M 20 30 Q 40 20 100 70',
          }}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={null}
        />
      </svg>
    ))

    expect(curveContainer.querySelector('g[data-arc-point-marker="1"]')).not.toBeNull()
    expect(curveContainer.querySelector('g[data-arc-point-marker="2"]')).not.toBeNull()
    expect(curveContainer.querySelector('g[data-arc-point-marker="3"]')).not.toBeNull()
  })

  it('renders snap marker variants for each snap kind', () => {
    const markerCases = [
      { kind: 'endpoint', shapeSelector: 'rect[data-snap-shape="square"]' },
      { kind: 'intersection', shapeSelector: 'line[data-snap-shape="x"]' },
      { kind: 'nearest', shapeSelector: 'circle[data-snap-shape="point"]' },
      { kind: 'perpendicular', shapeSelector: 'line[data-snap-shape="perpendicular"]' },
      { kind: 'basepoint', shapeSelector: 'rect[data-snap-shape="square-rotated"]' },
      { kind: 'mark', shapeSelector: 'line[data-snap-shape="plus"]' },
    ] as const

    for (const markerCase of markerCases) {
      const { container, unmount } = render(() => (
        <svg>
          <ToolPreviewsOverlay
            arcChordPreview={null}
            arcCurvePreview={null}
            linePreview={null}
            directionPreview={null}
            arrowPreview={null}
            calibrationLinePreview={null}
            snapPointPreview={{ point: { x: 48, y: 52 }, kind: markerCase.kind }}
            selectionHandlePreview={null}
          />
        </svg>
      ))

      expect(
        container.querySelector(
          `g[data-snap-marker="active"][data-snap-marker-kind="${markerCase.kind}"]`,
        ),
      ).not.toBeNull()
      expect(container.querySelector(markerCase.shapeSelector)).not.toBeNull()
      unmount()
    }
  })

  it('scales endpoint snap marker icon geometry with zoom to maintain screen size', () => {
    const { container, unmount } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={{ point: { x: 48, y: 52 }, kind: 'endpoint' }}
          selectionHandlePreview={null}
        />
      </svg>
    ))

    const defaultMarkerSquare = container.querySelector(
      'rect[data-snap-shape="square"]',
    )
    expect(defaultMarkerSquare?.getAttribute('stroke')).toBe('#ef4444')
    expect(Number.parseFloat(defaultMarkerSquare?.getAttribute('stroke-width') ?? '0')).toBeCloseTo(2.2, 2)
    unmount()

    const { container: annotationScaleContainer, unmount: unmountAnnotationScale } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          annotationScale={2}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={{ point: { x: 48, y: 52 }, kind: 'endpoint' }}
          selectionHandlePreview={null}
        />
      </svg>
    ))

    const annotationScaleMarkerSquare = annotationScaleContainer.querySelector(
      'rect[data-snap-shape="square"]',
    )
    expect(Number.parseFloat(annotationScaleMarkerSquare?.getAttribute('stroke-width') ?? '0')).toBeCloseTo(2.2, 2)
    unmountAnnotationScale()

    const { container: zoomedMarkerContainer, unmount: unmountZoomedMarker } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={{ point: { x: 48, y: 52 }, kind: 'endpoint' }}
          viewZoom={2}
          selectionHandlePreview={null}
        />
      </svg>
    ))

    const zoomedMarkerSquare = zoomedMarkerContainer.querySelector('rect[data-snap-shape="square"]')
    expect(Number.parseFloat(zoomedMarkerSquare?.getAttribute('x') ?? '0')).toBeCloseTo(44.5, 3)
    expect(Number.parseFloat(zoomedMarkerSquare?.getAttribute('stroke-width') ?? '0')).toBeCloseTo(1.1, 2)
    unmountZoomedMarker()

    const { container: noMarkerContainer } = render(() => (
      <svg>
        <ToolPreviewsOverlay
          arcChordPreview={null}
          arcCurvePreview={null}
          linePreview={null}
          directionPreview={null}
          arrowPreview={null}
          calibrationLinePreview={null}
          snapPointPreview={null}
          selectionHandlePreview={null}
        />
      </svg>
    ))

    expect(noMarkerContainer.querySelector('g[data-snap-marker="active"]')).toBeNull()
  })

  it('renders inside and outside auto-spacing corners in path previews', () => {
    const project = createDefaultProject('Path Overlay')
    project.view = { currentPage: 1, zoom: 2, pan: { x: 10, y: 20 }, byPage: { 1: { zoom: 2, pan: { x: 10, y: 20 } } } }

    const measurePathPreview: Point[] = [{ x: 10, y: 10 }, { x: 20, y: 20 }]
    const markPathPreview: Point[] = [{ x: 30, y: 30 }, { x: 40, y: 40 }]
    const linearAutoSpacingPathPreview: Point[] = [{ x: 50, y: 50 }, { x: 60, y: 60 }]

    render(() => (
      <svg>
        <PathPreviewsOverlay
          project={project}
          measurePathPreview={measurePathPreview}
          markPathPreview={markPathPreview}
          linearAutoSpacingPathPreview={linearAutoSpacingPathPreview}
          linearAutoSpacingVertices={[
            { x: 100, y: 110 },
            { x: 120, y: 130 },
          ]}
          linearAutoSpacingCorners={['inside', 'outside']}
        />
      </svg>
    ))

    expect(document.querySelector('rect[width="7"][height="7"][stroke="#92400e"]')).not.toBeNull()
    expect(document.querySelector('circle[r="3.6"][fill="#eff6ff"][stroke="#1d4ed8"]')).not.toBeNull()
  })
})
