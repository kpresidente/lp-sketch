import { createSignal, createUniqueId, type JSX } from 'solid-js'
import { MISC_ICON, tablerIconClass } from '../../config/iconRegistry'

interface PanelProps {
  label: string
  children: JSX.Element
  defaultCollapsed?: boolean
}

export default function Panel(props: PanelProps) {
  const [collapsed, setCollapsed] = createSignal(props.defaultCollapsed ?? false)
  const panelLabelId = `panel-label-${createUniqueId()}`
  const panelBodyId = `panel-body-${createUniqueId()}`

  return (
    <div class={`panel ${collapsed() ? 'collapsed' : ''}`}>
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
      <div
        id={panelBodyId}
        class="panel-body"
        role="region"
        aria-labelledby={panelLabelId}
        hidden={collapsed()}
      >
        {props.children}
      </div>
    </div>
  )
}
