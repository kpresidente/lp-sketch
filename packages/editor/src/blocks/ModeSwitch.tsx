import { For, Show } from 'solid-js'
import { TOOL_CUSTOM_ICON, TOOL_ICON, tablerIconClass } from '../config/iconRegistry'
import { CustomIcon } from '../components/icons/CustomIcon'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

const MODES = [
  { tool: 'select', label: 'Select', title: 'Select' },
  { tool: 'multi_select', label: 'Multi', title: 'Multi-Select' },
  { tool: 'pan', label: 'Pan', title: 'Pan' },
] as const

/** Block: the pointer mode. Landmark: a group named "Mode". */
export default function ModeSwitch() {
  const props = useAppController()

  return (
    <div class="block" data-block="mode" role="group" aria-label="Mode">
      <div class="section-label">Mode <SectionHelp anchor="help-tools-mode" /></div>
      <div class="btn-row">
        <For each={MODES}>
          {(mode) => (
            <button
              class={`btn ${props.tool === mode.tool ? 'active' : ''}`}
              type="button"
              aria-pressed={props.tool === mode.tool}
              title={mode.title}
              onClick={() => props.onSelectTool(mode.tool)}
            >
              <Show when={TOOL_CUSTOM_ICON[mode.tool]} fallback={<i class={tablerIconClass(TOOL_ICON[mode.tool])} />}>
                {(name) => <CustomIcon name={name()} />}
              </Show>
              {' '}
              {mode.label}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
