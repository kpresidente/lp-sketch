import { For } from 'solid-js'
import { useTheme } from '../context/ThemeContext'
import { THEMES, type ThemePreference } from '../themes/registry'
import { SectionHelp } from '../components/SectionHelp'

interface ThemeOption {
  id: ThemePreference
  label: string
  title: string
}

const OPTIONS: readonly ThemeOption[] = [
  { id: 'system', label: 'System', title: 'Follow the device appearance' },
  ...THEMES.map((theme): ThemeOption => ({ id: theme.id, label: theme.label, title: `${theme.label} theme` })),
]

/**
 * Block: the theme device preference. Landmark: a radiogroup named "Theme".
 * Owns its section label and help anchor so any shell can place it as is.
 */
export default function ThemePicker() {
  const theme = useTheme()
  const isActive = (option: ThemeOption) => theme.preference() === option.id

  return (
    <div class="block" data-block="theme">
      <div class="section-label">
        Theme <SectionHelp anchor="help-theme" />
      </div>
      <div class="btn-grid-3" role="radiogroup" aria-label="Theme">
        <For each={OPTIONS}>
          {(option) => (
            <button
              class={`btn ${isActive(option) ? 'active' : ''}`}
              type="button"
              role="radio"
              aria-checked={isActive(option)}
              title={option.title}
              onClick={() => theme.setPreference(option.id)}
            >
              {option.label}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
