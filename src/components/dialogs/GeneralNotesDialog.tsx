import { For } from 'solid-js'
import type { GeneralNotesEditState } from '../../types/appRuntime'

interface GeneralNotesDialogProps {
  editor: GeneralNotesEditState
  title: string
  maxNotes: number
  setDialogRef: (element: HTMLDivElement | undefined) => void
  onTitlePointerDown: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onTitlePointerMove: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onTitlePointerUp: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onSetInput: (index: number, value: string) => void
  onMoveRow: (index: number, direction: 'up' | 'down') => void
  onRemoveRow: (index: number) => void
  onAddRow: () => void
  onApply: () => void
  onCancel: () => void
}

export default function GeneralNotesDialog(props: GeneralNotesDialogProps) {
  return (
    <div
      ref={props.setDialogRef}
      class="floating-input-dialog general-notes-dialog"
      role="dialog"
      aria-modal="false"
      aria-label={`${props.title} editor`}
      style={{
        left: `${props.editor.screen.x}px`,
        top: `${props.editor.screen.y}px`,
      }}
    >
      <div
        class="floating-input-title legend-label-titlebar"
        onPointerDown={props.onTitlePointerDown}
        onPointerMove={props.onTitlePointerMove}
        onPointerUp={props.onTitlePointerUp}
        onPointerCancel={props.onTitlePointerUp}
      >
        {props.title}
      </div>
      <div class="general-notes-table-wrap">
        <table class="legend-label-table">
          <caption class="sr-only">General notes list</caption>
          <thead>
            <tr>
              <th>#</th>
              <th>Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.editor.notes}>
              {(note, indexAccessor) => {
                const index = indexAccessor()
                const noteId = `general-note-row-${index}`
                return (
                  <tr>
                    <td class="legend-label-count-cell">{index + 1}</td>
                    <td>
                      <input
                        id={noteId}
                        class="input-field legend-label-input"
                        type="text"
                        maxLength={120}
                        value={note}
                        onInput={(event) => props.onSetInput(index, event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault()
                            props.onApply()
                          } else if (event.key === 'Escape') {
                            event.preventDefault()
                            props.onCancel()
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div class="btn-row general-notes-row-actions">
                        <button
                          class="btn btn-sm"
                          type="button"
                          aria-label={`Move note ${index + 1} up`}
                          onClick={() => props.onMoveRow(index, 'up')}
                          disabled={index === 0}
                        >
                          Up
                        </button>
                        <button
                          class="btn btn-sm"
                          type="button"
                          aria-label={`Move note ${index + 1} down`}
                          onClick={() => props.onMoveRow(index, 'down')}
                          disabled={index === props.editor.notes.length - 1}
                        >
                          Down
                        </button>
                        <button
                          class="btn btn-sm"
                          type="button"
                          aria-label={`Remove note ${index + 1}`}
                          onClick={() => props.onRemoveRow(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }}
            </For>
          </tbody>
        </table>
      </div>
      <div class="btn-row">
        <button
          class="btn btn-sm"
          type="button"
          onClick={props.onAddRow}
          disabled={props.editor.notes.length >= props.maxNotes}
        >
          Add Note
        </button>
        <button class="btn btn-sm" type="button" onClick={props.onApply}>
          Apply
        </button>
        <button class="btn btn-sm" type="button" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
      <div class="hint-line">
        Up to {props.maxNotes} notes. Empty rows are ignored.
      </div>
    </div>
  )
}
