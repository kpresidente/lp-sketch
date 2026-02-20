import { For } from 'solid-js'
import Panel from './Panel'
import { MISC_ICON, TOOL_ICON, tablerIconClass } from '../../config/iconRegistry'
import { useAppController } from '../../context/AppControllerContext'
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
  return (
    <Panel label="Scale">
      <div class="section-label">Drawing Scale</div>
      <div class="scale-row">
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
            aria-label="Scale feet"
          />
          <span class="scale-input-unit">ft</span>
        </div>
      </div>
      <div class="btn-row" style={{ "margin-bottom": "8px" }}>
        <button class="btn btn-sm" type="button" title="Apply Drawing Scale" onClick={props.onApplyManualScale}>
          Apply Scale
        </button>
        <button
          class={`btn btn-sm ${props.tool === 'calibrate' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'calibrate'}
          title="Calibrate Drawing Scale"
          onClick={() => props.onSelectTool('calibrate')}
        >
          <i class={tablerIconClass(TOOL_ICON.calibrate)} /> Calibrate
        </button>
      </div>
      <div class="scale-badge">
        <i class={tablerIconClass(MISC_ICON.scaleBadge)} />
        {props.currentScaleInfo}
      </div>

      <div class="section-label">Annotation Size</div>
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
