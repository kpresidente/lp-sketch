import { For } from 'solid-js'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'
import { DESIGN_SCALE_LABEL, DESIGN_SCALE_OPTIONS } from './labels'

/** Block: the annotation size. Landmark: a radiogroup named "Annotation size". */
export default function AnnotationSizePicker() {
  const props = useAppController()

  return (
    <div class="block" data-block="annotation-size">
      <div class="section-label">Annotation Size <SectionHelp anchor="help-scale-annotation-size" /></div>
      <div class="class-selector" role="radiogroup" aria-label="Annotation size">
        <For each={DESIGN_SCALE_OPTIONS}>
          {(designScale) => (
            <button
              class={`btn ${props.project.settings.designScale === designScale ? 'active' : ''}`}
              type="button"
              role="radio"
              aria-checked={props.project.settings.designScale === designScale}
              title={DESIGN_SCALE_LABEL[designScale]}
              onClick={() => props.onSetDesignScale(designScale)}
            >
              {DESIGN_SCALE_LABEL[designScale]}
            </button>
          )}
        </For>
      </div>
    </div>
  )
}
