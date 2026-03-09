// @vitest-environment jsdom

import { cleanup, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it } from 'vitest'
import { createDefaultProject } from '../model/defaultProject'
import WorkspaceInteractionOverlay from './WorkspaceInteractionOverlay'
import type { OverlayLayerProps } from './overlay/types'

afterEach(() => {
  cleanup()
})

function createInteractionOverlayProps(): OverlayLayerProps {
  const project = createDefaultProject('Interaction Overlay')

  return {
    project,
    annotationScale: 1,
    selected: null,
    multiSelectedKeys: new Set(),
    hovered: null,
    legendUi: {
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
    },
    textFontSizePx: 12,
    textLineHeightPx: 16,
    approximateTextWidth: () => 40,
    legendEntriesForPlacement: () => [],
    legendBoxSize: () => ({ width: 240, height: 120 }),
    legendLineText: () => '',
    measurePathPreview: [],
    markPathPreview: [],
    linearAutoSpacingPathPreview: [],
    linearAutoSpacingVertices: [],
    linearAutoSpacingCorners: [],
    arcChordPreview: null,
    arcCurvePreview: null,
    linePreview: null,
    dimensionTextPreview: null,
    directionPreview: null,
    arrowPreview: null,
    calibrationLinePreview: null,
    dimensionTextLabel: () => '',
    snapPointPreview: null,
    selectionHandlePreview: null,
    selectionDebugLabel: null,
  }
}

describe('WorkspaceInteractionOverlay', () => {
  it('renders the reduced transient interaction overlay wrapper', () => {
    render(() => <WorkspaceInteractionOverlay {...createInteractionOverlayProps()} />)

    expect(screen.getByLabelText('drawing-interaction-overlay')).toBeTruthy()
    expect(screen.queryByLabelText('drawing-overlay')).toBeNull()
  })

  it('renders transient line selection highlight without restoring committed SVG geometry', () => {
    const props = createInteractionOverlayProps()
    props.project.elements.lines.push({
      id: 'line-1',
      start: { x: 20, y: 30 },
      end: { x: 120, y: 60 },
      color: 'green',
      class: 'class1',
    })
    props.selected = { kind: 'line', id: 'line-1' }

    const { container } = render(() => <WorkspaceInteractionOverlay {...props} />)

    expect(
      container.querySelector(
        'line[data-persisted-highlight-kind="line"][stroke="#111827"][stroke-dasharray="5 3"]',
      ),
    ).not.toBeNull()
    expect(container.querySelector('line[stroke="#2e8b57"]')).toBeNull()
  })
})
