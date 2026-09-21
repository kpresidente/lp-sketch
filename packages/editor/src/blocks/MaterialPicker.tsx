import { For } from 'solid-js'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'
import { MATERIAL_ABBR, MATERIAL_LABEL } from './labels'

/** Block: the conductor material. Landmark: a radiogroup named "Material". */
export default function MaterialPicker() {
  const props = useAppController()

  return (
    <div class="block" data-block="material">
      <div class="section-label">Material <SectionHelp anchor="help-material-material" /></div>
      <div class="material-list" role="radiogroup" aria-label="Material">
        <For each={props.colorOptions}>
          {(color) => (
            <button
              class={`material-item ${props.project.settings.activeColor === color ? 'active' : ''}`}
              type="button"
              role="radio"
              aria-label={MATERIAL_LABEL[color]}
              title={MATERIAL_LABEL[color]}
              aria-checked={props.project.settings.activeColor === color}
              onClick={() => props.onSetActiveColor(color)}
            >
              <span class="mat-swatch" style={{ 'background-color': props.colorHex[color] }} />
              <span class="mat-name">{MATERIAL_LABEL[color]}</span>
              <span class="mat-abbr">{MATERIAL_ABBR[color]}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
