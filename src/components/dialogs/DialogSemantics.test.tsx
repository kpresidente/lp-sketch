// @vitest-environment jsdom

import { render, screen } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import AnnotationEditDialog from './AnnotationEditDialog'
import GeneralNotesDialog from './GeneralNotesDialog'
import LegendLabelDialog from './LegendLabelDialog'
import type { GeneralNotesEditState, LegendLabelEditState } from '../../types/appRuntime'
import { createDefaultProject } from '../../model/defaultProject'

describe('dialog accessibility semantics', () => {
  it('renders annotation edit dialog as a labeled dialog', () => {
    render(() => (
      <AnnotationEditDialog
        editor={{
          mode: 'text',
          input: 'Sample',
          layer: 'annotation',
          id: 'text-1',
          screen: { x: 120, y: 180 },
        }}
        onSetInput={() => undefined}
        onSetLayer={() => undefined}
        onApply={() => undefined}
        onCancel={() => undefined}
      />
    ))

    expect(screen.getByRole('dialog', { name: 'Text editor' })).toBeTruthy()
  })

  it('renders legend label editor as a labeled dialog with table caption', () => {
    const project = createDefaultProject()
    project.legend.placements.push({
      id: 'legend-1',
      position: { x: 50, y: 60 },
      editedLabels: {},
    })
    project.elements.symbols.push({
      id: 'symbol-1',
      symbolType: 'air_terminal',
      position: { x: 80, y: 90 },
      letter: 'A',
      color: 'green',
      class: 'class1',
    })

    const editor: LegendLabelEditState = {
      placementId: 'legend-1',
      inputByKey: {},
      screen: { x: 100, y: 120 },
    }

    render(() => (
      <LegendLabelDialog
        editor={editor}
        project={project}
        setDialogRef={() => undefined}
        onTitlePointerDown={() => undefined}
        onTitlePointerMove={() => undefined}
        onTitlePointerUp={() => undefined}
        onSetInput={() => undefined}
        onApply={() => undefined}
        onCancel={() => undefined}
      />
    ))

    expect(screen.getByRole('dialog', { name: 'Legend labels editor' })).toBeTruthy()
    expect(screen.getByText('Legend labels and counts')).toBeTruthy()
  })

  it('renders general notes editor as a labeled dialog with table caption', () => {
    const editor: GeneralNotesEditState = {
      placementId: 'notes-1',
      notes: ['Install per plan'],
      screen: { x: 80, y: 110 },
    }

    render(() => (
      <GeneralNotesDialog
        editor={editor}
        title="General Notes"
        maxNotes={15}
        setDialogRef={() => undefined}
        onTitlePointerDown={() => undefined}
        onTitlePointerMove={() => undefined}
        onTitlePointerUp={() => undefined}
        onSetInput={() => undefined}
        onMoveRow={() => undefined}
        onRemoveRow={() => undefined}
        onAddRow={() => undefined}
        onApply={() => undefined}
        onCancel={() => undefined}
      />
    ))

    expect(screen.getByRole('dialog', { name: 'General Notes editor' })).toBeTruthy()
    expect(screen.getByText('General notes list')).toBeTruthy()
  })
})
