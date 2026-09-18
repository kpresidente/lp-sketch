import { createContext, createSignal, createUniqueId, Show, useContext, type JSX } from 'solid-js'
import { MISC_ICON, tablerIconClass } from '../../config/iconRegistry'

interface PanelProps {
  label: string
  children: JSX.Element
  defaultCollapsed?: boolean
}

export const PanelPresentationContext = createContext<{
  isFlyout: () => boolean
  closeFlyout: () => void
}>()

export default function Panel(props: PanelProps) {
  const presentation = useContext(PanelPresentationContext)
  const [collapsed, setCollapsed] = createSignal(props.defaultCollapsed ?? false)
  const isFlyout = () => presentation?.isFlyout() ?? false
  const bodyCollapsed = () => !isFlyout() && collapsed()
  const panelLabelId = `panel-label-${createUniqueId()}`
  const panelBodyId = `panel-body-${createUniqueId()}`

  return (
    <div class={`panel ${bodyCollapsed() ? 'collapsed' : ''}`}>
      <Show when={isFlyout()} fallback={(
        <button
          class="panel-header"
          type="button"
          aria-controls={panelBodyId}
          aria-expanded={!collapsed()}
          title={`${collapsed() ? 'Expand' : 'Collapse'} ${props.label} panel`}
          onClick={() => setCollapsed(!collapsed())}
        >
          <span id={panelLabelId} class="panel-label">{props.label}</span>
          <i class={`${tablerIconClass(MISC_ICON.panelChevron)} panel-chevron`} />
        </button>
      )}>
        <div class="panel-header sidebar-flyout-header">
          <span id={panelLabelId} class="panel-label">{props.label}</span>
          <button
            class="sidebar-icon-button"
            type="button"
            aria-label={`Close ${props.label} panel`}
            title={`Close ${props.label} panel`}
            onClick={() => presentation?.closeFlyout()}
          >
            <i class={tablerIconClass('x')} aria-hidden="true" />
          </button>
        </div>
      </Show>
      <div
        id={panelBodyId}
        class="panel-body"
        role="region"
        aria-labelledby={panelLabelId}
        hidden={bodyCollapsed()}
      >
        {props.children}
      </div>
    </div>
  )
}
