import { COMMAND_ICON, tablerIconClass } from '../config/iconRegistry'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

/** Block: undo and redo with the history counter. Landmark: a group named "History". */
export default function HistoryControls() {
  const props = useAppController()

  return (
    <div class="block history-bar" data-block="history" role="group" aria-label="History">
      <button
        class="btn btn-icon"
        type="button"
        aria-label="Undo"
        title="Undo"
        onClick={props.onUndo}
        disabled={props.historyPastCount === 0}
      >
        <i class={tablerIconClass(COMMAND_ICON.undo)} />
      </button>
      <button
        class="btn btn-icon"
        type="button"
        aria-label="Redo"
        title="Redo"
        onClick={props.onRedo}
        disabled={props.historyFutureCount === 0}
      >
        <i class={tablerIconClass(COMMAND_ICON.redo)} />
      </button>
      <span class="history-counter">
        Past: {props.historyPastCount} | Future: {props.historyFutureCount}
      </span>
      <SectionHelp anchor="help-tools-undo-redo" />
    </div>
  )
}
