import { For } from 'solid-js'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'
import { CLASS_LABEL, type WireClass } from './labels'

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
              {CLASS_LABEL[wireClass]}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
