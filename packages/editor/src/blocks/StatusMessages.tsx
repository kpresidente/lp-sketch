import { Show } from 'solid-js'
import { useAppController } from '../context/AppControllerContext'

/**
 * Block: the status and error messages, plus a standing autosave warning.
 * Landmark: a status live region (an alert while an error shows).
 */
export default function StatusMessages() {
  const props = useAppController()
  return (
    <div class="status-bar" data-block="status">
      <Show when={props.statusMessage}>
        <div class="status-msg success" role="status" aria-live="polite" aria-atomic="true">
          <span class="status-dot" />
          {props.statusMessage}
        </div>
      </Show>
      <Show when={props.errorMessage}>
        <div class="status-msg error" role="alert" aria-live="assertive" aria-atomic="true">
          <span class="status-dot" />
          {props.errorMessage}
        </div>
      </Show>
      <Show when={!props.statusMessage && !props.errorMessage && !props.autosaveWarning}>
        <div class="status-msg success" role="status" aria-live="polite" aria-atomic="true">
          <span class="status-dot" />
          Ready
        </div>
      </Show>
      {/* A condition, not an event: it stays through later messages until a
          draft saves again. An alert announced it when it began, so this
          reminder is not a live region. */}
      <Show when={props.autosaveWarning}>
        <div class="status-msg error">
          <span class="status-dot" />
          {props.autosaveWarning}
        </div>
      </Show>
    </div>
  )
}
