import { For } from 'solid-js'
import { SectionHelp } from '../components/SectionHelp'
import { SHELLS } from '../shells/registry'
import { useShell } from '../shells/ShellContext'

/**
 * Block: the shell (layout) device preference. Landmark: a radiogroup named "Layout".
 * Switching re-mounts the chrome in place; the project and tool state live in App and survive.
 */
export default function ShellPicker() {
  const shell = useShell()
  const isActive = (id: string) => shell.shell().id === id

  return (
    <div class="block" data-block="shell">
      <div class="section-label">Layout <SectionHelp anchor="help-layout" /></div>
      <div class="btn-grid-3" role="radiogroup" aria-label="Layout">
        <For each={SHELLS}>
          {(option) => (
            <button
              class={`btn ${isActive(option.id) ? 'active' : ''}`}
              type="button"
              role="radio"
              aria-checked={isActive(option.id)}
              title={`${option.label} layout`}
              onClick={() => shell.setShell(option.id)}
            >
              {option.label}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
