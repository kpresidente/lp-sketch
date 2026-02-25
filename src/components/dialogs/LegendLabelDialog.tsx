import { Index } from 'solid-js'
import type { LegendLabelEditState } from '../../types/appRuntime'
import type { DataScope } from '../../types/project'

interface LegendLabelDialogProps {
  editor: LegendLabelEditState
  scope: DataScope
  setDialogRef: (element: HTMLDivElement | undefined) => void
  onTitlePointerDown: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onTitlePointerMove: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onTitlePointerUp: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onSetScope: (scope: DataScope) => void
  onSetInput: (key: string, value: string) => void
  onApply: () => void
  onCancel: () => void
}

export default function LegendLabelDialog(props: LegendLabelDialogProps) {
  return (
    <div
      ref={props.setDialogRef}
      class="floating-input-dialog legend-label-dialog"
      role="dialog"
      aria-modal="false"
      aria-label="Legend labels editor"
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
        Legend Labels
      </div>
      <div class="dialog-scope-row">
        <span class="dialog-scope-label">Data Scope</span>
        <div class="btn-row dialog-scope-buttons">
          <button
            class={`btn btn-sm ${props.scope === 'page' ? 'active' : ''}`}
            type="button"
            aria-pressed={props.scope === 'page'}
            onClick={() => props.onSetScope('page')}
          >
            Page
          </button>
          <button
            class={`btn btn-sm ${props.scope === 'global' ? 'active' : ''}`}
            type="button"
            aria-pressed={props.scope === 'global'}
            onClick={() => props.onSetScope('global')}
          >
            Global
          </button>
        </div>
      </div>
      <div class="legend-label-table-wrap">
        <table class="legend-label-table">
          <caption class="sr-only">Legend labels and counts</caption>
          <thead>
            <tr>
              <th>Item</th>
              <th>Count</th>
              <th>Label</th>
            </tr>
          </thead>
          <tbody>
            <Index each={props.editor.rows}>
              {(rowAccessor) => {
                const row = rowAccessor()
                const inputValue =
                  props.editor.inputByKey[row.key] ?? row.baseLabel

                return (
                  <tr>
                    <td>{row.itemName}</td>
                    <td class="legend-label-count-cell">{row.countLabel}</td>
                    <td>
                      <input
                        class="input-field legend-label-input"
                        type="text"
                        value={inputValue}
                        onInput={(event) => props.onSetInput(row.key, event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            props.onApply()
                          } else if (event.key === 'Escape') {
                            event.preventDefault()
                            props.onCancel()
                          }
                        }}
                      />
                    </td>
                  </tr>
                )
              }}
            </Index>
          </tbody>
        </table>
      </div>
      <div class="btn-row">
        <button class="btn btn-sm" type="button" onClick={props.onApply}>
          Apply
        </button>
        <button class="btn btn-sm" type="button" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
