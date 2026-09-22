import { For } from 'solid-js'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'
import { CLASS_LABEL, CLASS_SHORT_LABEL, type WireClass } from './labels'

const CLASSES: readonly WireClass[] = ['class1', 'class2']

/** Block: the conductor class. Landmark: a group named "Class". */
export default function ClassPicker() {
  const props = useAppController()

  return (
    <div class="block" data-block="class" role="group" aria-label="Class">
      <div class="section-label">Class <SectionHelp anchor="help-material-class" /></div>
      <div class="class-selector">
        <For each={CLASSES}>
          {(wireClass) => (
            <button
              class={`btn ${props.project.settings.activeClass === wireClass ? 'active' : ''}`}
              type="button"
              aria-pressed={props.project.settings.activeClass === wireClass}
              title={CLASS_LABEL[wireClass]}
              onClick={() => props.onSetActiveClass(wireClass)}
            >
              <span class="btn-text">{CLASS_LABEL[wireClass]}</span>
              <span class="btn-text-short" aria-hidden="true">{CLASS_SHORT_LABEL[wireClass]}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
