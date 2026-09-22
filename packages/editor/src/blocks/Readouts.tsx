import { Show } from 'solid-js'
import { useAppController } from '../context/AppControllerContext'
import { SELECTION_KIND_LABEL } from './labels'

const AUTO_CONNECTOR_LABEL = { mechanical: 'Mechanical', cadweld: 'Cadweld' } as const

/**
 * Block: read-only readouts of the page, scale, snapping, selection, and
 * history state, for shells with a status strip. Landmark: a group named "Readouts".
 */
export default function Readouts() {
  const props = useAppController()
  const settings = () => props.project.settings
  const selectionLabel = () => {
    if (props.multiSelectionCount > 0) {
      return `${props.multiSelectionCount} selected`
    }
    return props.selectedKind ? `Selected: ${SELECTION_KIND_LABEL[props.selectedKind]}` : null
  }

  return (
    <div class="block readouts" data-block="readouts" role="group" aria-label="Readouts">
      <span class="readout">Page <b>{props.currentPage} / {props.pageCount}</b></span>
      <span class="readout">{props.currentScaleInfo}</span>
      <span class="readout" classList={{ on: settings().snapEnabled }}>
        Snap {settings().snapEnabled ? 'on' : 'off'}
      </span>
      <span class="readout" classList={{ on: settings().angleSnapEnabled }}>
        Angle {settings().angleSnapEnabled ? '15°' : 'off'}
      </span>
      <span class="readout" classList={{ on: settings().autoConnectorsEnabled }}>
        Auto-conn {settings().autoConnectorsEnabled ? AUTO_CONNECTOR_LABEL[settings().autoConnectorType] : 'off'}
      </span>
      <span class="readout-spacer" />
      <Show when={selectionLabel()}>{(label) => <span class="readout on">{label()}</span>}</Show>
      <span class="readout">{props.historyPastCount} undo · {props.historyFutureCount} redo</span>
    </div>
  )
}
