import { For } from 'solid-js'
import Panel from './Panel'
import { useAppController } from '../../context/AppControllerContext'
import { SectionHelp } from './SectionHelp'
import type { MaterialColor } from '../../types/project'

const COLOR_MATERIAL_LABEL: Record<
  MaterialColor,
  string
> = {
  green: 'Copper',
  blue: 'Aluminum',
  red: 'Grounding',
  purple: 'Bimetallic',
  cyan: 'Tinned',
}

const COLOR_MATERIAL_ABBR: Record<
  MaterialColor,
  string
> = {
  green: 'Cu',
  blue: 'Al',
  red: 'Gnd',
  purple: 'Bi',
  cyan: 'Sn',
}

export default function StylePanel() {
  const props = useAppController()
  return (
    <Panel label="Material">
      <div class="section-label">Class <SectionHelp anchor="help-material-class" /></div>
      <div class="class-selector">
        <button
          class={`btn ${props.project.settings.activeClass === 'class1' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.project.settings.activeClass === 'class1'}
          title="Class I"
          onClick={() => props.onSetActiveClass('class1')}
        >
          Class I
        </button>
        <button
          class={`btn ${props.project.settings.activeClass === 'class2' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.project.settings.activeClass === 'class2'}
          title="Class II"
          onClick={() => props.onSetActiveClass('class2')}
        >
          Class II
        </button>
      </div>

      <div class="section-label">Material <SectionHelp anchor="help-material-material" /></div>
      <div class="material-list" role="radiogroup" aria-label="Material">
        <For each={props.colorOptions}>
          {(color) => (
            <button
              class={`material-item ${props.project.settings.activeColor === color ? 'active' : ''}`}
              type="button"
              role="radio"
              aria-label={COLOR_MATERIAL_LABEL[color]}
              title={COLOR_MATERIAL_LABEL[color]}
              aria-checked={props.project.settings.activeColor === color}
              onClick={() => props.onSetActiveColor(color)}
            >
              <span
                class="mat-swatch"
                style={{ "background-color": props.colorHex[color] }}
              />
              <span class="mat-name">{COLOR_MATERIAL_LABEL[color]}</span>
              <span class="mat-abbr">{COLOR_MATERIAL_ABBR[color]}</span>
            </button>
          )}
        </For>
      </div>
    </Panel>
  )
}
