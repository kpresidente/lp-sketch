import { MISC_ICON, tablerIconClass } from '../config/iconRegistry'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'
import { blurOnEnter } from './inputCommit'

/** Block: manual drawing scale, the current scale readout, and calibration. Landmark: a group named "Drawing scale". */
export default function DrawingScale() {
  const props = useAppController()
  const handleEnterBlur = blurOnEnter(props)

  return (
    <div class="block" data-block="drawing-scale" role="group" aria-label="Drawing scale">
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
        <span class="hint-line" style={{ 'align-self': 'center', 'white-space': 'nowrap' }}>
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
    </div>
  )
}
