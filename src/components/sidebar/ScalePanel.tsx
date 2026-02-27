import { For } from 'solid-js'
import Panel from './Panel'
import { MISC_ICON, tablerIconClass } from '../../config/iconRegistry'
import { useAppController } from '../../context/AppControllerContext'
import { SectionHelp } from './SectionHelp'
import type { DesignScale } from '../../types/project'

const DESIGN_SCALE_OPTIONS = ['small', 'medium', 'large'] as const

const DESIGN_SCALE_LABEL: Record<
  DesignScale,
  string
> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

export default function ScalePanel() {
  const props = useAppController()
  const handleEnterBlur = (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    event.currentTarget.blur()
    props.onRefocusCanvasFromInputCommit()
  }

  return (
    <Panel label="Scale">
      <div class="section-label">Drawing Scale <SectionHelp anchor="help-scale-drawing-scale" /></div>
      <div class="scale-row scale-row-apply">
        <div class="scale-input-wrap">
          <input
            class="input-field"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            placeholder="X"
            value={props.manualScaleInchesInput}
            onInput={(event) => props.onSetManualScaleInchesInput(event.currentTarget.value)}
            onKeyDown={handleEnterBlur}
            aria-label="Scale inches"
          />
          <span class="scale-input-unit">in</span>
        </div>
        <span class="hint-line" style={{ "align-self": "center", "white-space": "nowrap" }}>
          =
        </span>
        <div class="scale-input-wrap">
          <input
            class="input-field"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            placeholder="Y"
            value={props.manualScaleFeetInput}
            onInput={(event) => props.onSetManualScaleFeetInput(event.currentTarget.value)}
            onKeyDown={handleEnterBlur}
            aria-label="Scale feet"
          />
          <span class="scale-input-unit">ft</span>
        </div>
        <button
          class={`btn btn-icon scale-apply-btn ${props.manualScaleDirty ? 'dirty' : ''}`}
          type="button"
          aria-label="Apply Scale"
          title="Apply Drawing Scale"
          onClick={props.onApplyManualScale}
        >
          <i class={tablerIconClass('check')} />
        </button>
      </div>
      <div class="scale-row scale-row-meta">
        <div class="scale-badge scale-badge-inline" title={props.currentScaleInfo}>
          <i class={tablerIconClass(MISC_ICON.scaleBadge)} />
          {props.currentScaleInfo}
        </div>
        <button
          class={`btn btn-sm scale-calibrate-btn ${props.tool === 'calibrate' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'calibrate'}
          title="Calibrate Drawing Scale"
          onClick={() => props.onSelectTool('calibrate')}
        >
          <i class={tablerIconClass('focus-2')} />
          <span class="scale-calibrate-label">Calibrate</span>
        </button>
      </div>

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
    </Panel>
  )
}
