import { buildLegendDisplayEntries, legendEditorBaseLabel, legendEditorItemName } from '../../lib/legendDisplay'
import type { LegendLabelEditState } from '../../types/appRuntime'
import type { LpProject } from '../../types/project'

interface LegendLabelDialogProps {
  editor: LegendLabelEditState
  project: LpProject
  setDialogRef: (element: HTMLDivElement | undefined) => void
  onTitlePointerDown: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onTitlePointerMove: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onTitlePointerUp: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
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
            {(() => {
              const placement = props.project.legend.placements.find(
                (entry) => entry.id === props.editor.placementId,
              )
              if (!placement) {
                return null
              }

              const entries = buildLegendDisplayEntries(props.project, placement)
              return entries.map((entry) => {
                const inputValue =
                  props.editor.inputByKey[entry.key] ?? legendEditorBaseLabel(props.project, entry)

                return (
                  <tr>
                    <td>{legendEditorItemName(entry)}</td>
                    <td class="legend-label-count-cell">{entry.countLabel}</td>
                    <td>
                      <input
                        class="input-field legend-label-input"
                        type="text"
                        value={inputValue}
                        onInput={(event) => props.onSetInput(entry.key, event.currentTarget.value)}
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
              })
            })()}
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
