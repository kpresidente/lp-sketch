// @vitest-environment jsdom

import { fireEvent, render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { describe, expect, it } from 'vitest'
import type { GeneralNotesEditState, LegendLabelEditState } from '../../types/appRuntime'
import GeneralNotesDialog from './GeneralNotesDialog'
import LegendLabelDialog from './LegendLabelDialog'

function LegendHarness() {
  const [editor, setEditor] = createSignal<LegendLabelEditState>({
    rows: [
      {
        key: 'air_terminal|green|class1|A',
        itemName: 'Air Terminal A',
        countLabel: '1',
        baseLabel: 'Class I Copper Air Terminal',
      },
    ],
    placementId: 'legend-1',
    inputByKey: {
      'air_terminal|green|class1|A': 'Class I Copper Air Terminal',
    },
    screen: { x: 120, y: 120 },
  })

  return (
    <LegendLabelDialog
      editor={editor()}
      scope="global"
      setDialogRef={() => undefined}
      onTitlePointerDown={() => undefined}
      onTitlePointerMove={() => undefined}
      onTitlePointerUp={() => undefined}
      onSetScope={() => undefined}
      onSetInput={(key, value) =>
        setEditor((prev) => ({
          ...prev,
          inputByKey: {
            ...prev.inputByKey,
            [key]: value,
          },
        }))
      }
      onApply={() => undefined}
      onCancel={() => undefined}
    />
  )
}

function GeneralNotesHarness() {
  const [editor, setEditor] = createSignal<GeneralNotesEditState>({
    placementId: 'notes-1',
    notes: ['Install per plan'],
    screen: { x: 80, y: 110 },
  })

  return (
    <GeneralNotesDialog
      editor={editor()}
      title="General Notes"
      maxNotes={15}
      scope="global"
      setDialogRef={() => undefined}
      onTitlePointerDown={() => undefined}
      onTitlePointerMove={() => undefined}
      onTitlePointerUp={() => undefined}
      onSetScope={() => undefined}
      onSetInput={(index, value) =>
        setEditor((prev) => {
          const nextNotes = prev.notes.slice()
          nextNotes[index] = value
          return {
            ...prev,
            notes: nextNotes,
          }
        })
      }
      onMoveRow={() => undefined}
      onRemoveRow={() => undefined}
      onAddRow={() => undefined}
      onApply={() => undefined}
      onCancel={() => undefined}
    />
  )
}

describe('dialog input focus retention', () => {
  it('keeps focus in legend label editor while typing', async () => {
    render(() => <LegendHarness />)

    const input = screen.getByDisplayValue('Class I Copper Air Terminal') as HTMLInputElement
    input.focus()
    expect(document.activeElement).toBe(input)

    await fireEvent.input(input, { target: { value: 'Class I Copper Air Terminal X' } })
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('Class I Copper Air Terminal X')
  })

  it('keeps focus in general notes editor while typing', async () => {
    render(() => <GeneralNotesHarness />)

    const input = screen.getByDisplayValue('Install per plan') as HTMLInputElement
    input.focus()
    expect(document.activeElement).toBe(input)

    await fireEvent.input(input, { target: { value: 'Install per plan updated' } })
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('Install per plan updated')
  })
})

