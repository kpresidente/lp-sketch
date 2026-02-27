import { For } from 'solid-js'
import { isDownleadSymbolType } from '../lib/conductorFootage'
import { useAppController } from '../context/AppControllerContext'
import { DIRECTIONAL_SYMBOLS } from '../model/defaultProject'

const LETTER_OPTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
type PropertiesController = ReturnType<typeof useAppController>

const CLICK_FINISH_CANCEL_HINT = 'Click to place. Escape to cancel.'
const ENTER_FINISH_CANCEL_HINT = 'Press Enter to finish, Escape to cancel.'

function withFinishCancelHint(
  base: string,
  pending: boolean,
  mode: 'click' | 'enter',
): string {
  if (!pending) {
    return base
  }
  const suffix = mode === 'enter' ? ENTER_FINISH_CANCEL_HINT : CLICK_FINISH_CANCEL_HINT
  return `${base}. ${suffix}`
}

function arcHint(props: PropertiesController): string {
  if (!props.arcStart) {
    return 'Click endpoint 1'
  }
  if (!props.arcEnd) {
    return withFinishCancelHint('Click endpoint 2', true, 'click')
  }
  return withFinishCancelHint('Move cursor to set arc bulge', true, 'click')
}

function curveHint(props: PropertiesController): string {
  if (!props.arcStart) {
    return 'Click point 1'
  }
  if (!props.arcEnd) {
    return withFinishCancelHint('Click point 2 on the curve', true, 'click')
  }
  return withFinishCancelHint('Click point 3 on the curve', true, 'click')
}

function dimensionHint(props: PropertiesController): string {
  if (!props.dimensionStart) {
    return 'Click start point'
  }
  if (!props.dimensionEnd) {
    return withFinishCancelHint('Click end point', true, 'click')
  }
  return withFinishCancelHint(
    props.dimensionShowLinework
      ? 'Click to place dimension text and linework direction'
      : 'Click to place dimension text',
    true,
    'click',
  )
}

function arrowHint(props: PropertiesController): string {
  if (!props.arrowStart) {
    return 'Click tail point'
  }
  return withFinishCancelHint('Click head point', true, 'click')
}

function lineHint(props: PropertiesController): string {
  if (!props.lineStart) {
    return 'Click endpoint 1'
  }
  if (props.lineContinuous) {
    return withFinishCancelHint('Click endpoint 2', true, 'enter')
  }
  return 'Click endpoint 2. Escape to cancel.'
}

function linearAutoSpacingHint(props: PropertiesController): string {
  if (props.linearAutoSpacingVerticesCount === 0) {
    return 'Click point 1 to start trace'
  }
  return withFinishCancelHint('Click to add vertices', true, 'enter')
}

function arcAutoSpacingHint(props: PropertiesController): string {
  if (!props.arcAutoSpacingTargetSet) {
    return 'Click an arc conductor to select target'
  }
  return withFinishCancelHint('Target selected', true, 'enter')
}

function measureHint(props: PropertiesController): string {
  return props.measureTargetDistanceInput.trim().length > 0
    ? 'Click points to measure path against target'
    : 'Click points to measure path'
}

function measureMarkHint(props: PropertiesController): string {
  return props.project.construction.marks.length > 0
    ? 'Click to continue mark path, right-click for corner'
    : 'Click start point, then continue path'
}

function calibrateHint(props: PropertiesController): string {
  if (props.calibrationPendingDistancePt !== null) {
    return 'Enter real distance in feet, then apply or cancel'
  }
  if (props.calibrationPointsCount === 0) {
    return 'Click point 1'
  }
  return 'Click point 2'
}

function symbolHint(props: PropertiesController): string {
  if (!DIRECTIONAL_SYMBOLS.has(props.activeSymbol)) {
    return 'Click to place component'
  }
  return props.symbolDirectionStart ? 'Click to set direction' : 'Click to place'
}

export default function PropertiesToolOptions() {
  const props = useAppController()
  const handleEnterBlur = (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    event.currentTarget.blur()
    props.onRefocusCanvasFromInputCommit()
  }

  const markToolActive = () => props.tool === 'measure_mark'
  const markSelectedInSelectMode = () => props.tool === 'select' && props.selectedKind === 'mark'
  const legendSelected = () => !!props.selectedLegendPlacement
  const generalNotesSelected = () => !!props.selectedGeneralNotesPlacement
  const downleadPlacementOptionsVisible = () =>
    props.tool === 'symbol' && isDownleadSymbolType(props.activeSymbol)
  const downleadSelectionOptionsVisible = () =>
    props.tool === 'select' &&
    props.selectedKind === 'symbol' &&
    props.selectedSymbolType !== null &&
    isDownleadSymbolType(props.selectedSymbolType)
  const letteredComponentOptionsVisible = () =>
    props.tool === 'symbol' &&
    (props.activeSymbol === 'air_terminal' || props.activeSymbol === 'bonded_air_terminal')
  const zOrderControls = () => (
    <>
      <button
        class="tb-btn"
        type="button"
        onClick={props.onSendSelectedToBack}
        disabled={!props.canSendSelectedToBack}
      >
        Send Back
      </button>
      <button
        class="tb-btn"
        type="button"
        onClick={props.onBringSelectedToFront}
        disabled={!props.canBringSelectedToFront}
      >
        Bring Forward
      </button>
    </>
  )

  const renderInlineOptions = () => {
    if (props.tool === 'line') {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-switch-wrap">
            <span class="tb-check-label">Continuous</span>
            <button
              type="button"
              role="switch"
              aria-label="Continuous line mode"
              aria-checked={props.lineContinuous}
              class={`tb-switch ${props.lineContinuous ? 'on' : ''}`}
              onClick={() => props.onSetLineContinuous(!props.lineContinuous)}
            />
          </div>
          <div class="tb-sep" />
          <span class="tb-hint">{lineHint(props)}</span>
        </div>
      )
    }

    if (props.tool === 'arc') {
      return (
        <div class="properties-tool-options-inline">
          <button class="tb-btn" type="button" onClick={props.onResetArc}>
            Reset Arc
          </button>
          <div class="tb-sep" />
          <span class="tb-hint">{arcHint(props)}</span>
        </div>
      )
    }

    if (props.tool === 'curve') {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-switch-wrap">
            <span class="tb-check-label">Continuous</span>
            <button
              type="button"
              role="switch"
              aria-label="Continuous curve mode"
              aria-checked={props.curveContinuous}
              class={`tb-switch ${props.curveContinuous ? 'on' : ''}`}
              onClick={() => props.onSetCurveContinuous(!props.curveContinuous)}
            />
          </div>
          <div class="tb-sep" />
          <button class="tb-btn" type="button" onClick={props.onResetArc}>
            Reset Curve
          </button>
          <div class="tb-sep" />
          <span class="tb-hint">{curveHint(props)}</span>
        </div>
      )
    }

    if (props.tool === 'linear_auto_spacing') {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-field">
            <span class="tb-field-label">Max Interval</span>
            <input
              class="tb-input tb-input-narrow"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              value={props.linearAutoSpacingMaxInput}
              aria-label="Linear auto-spacing max interval"
              onInput={(event) => props.onSetLinearAutoSpacingMaxInput(event.currentTarget.value)}
              onKeyDown={handleEnterBlur}
            />
            <span class="tb-unit">ft</span>
          </div>
          <div class="tb-sep" />
          <div class="tb-field">
            <span class="tb-field-label">Letter</span>
            <select
              class="tb-select"
              aria-label="Air terminal letter"
              value={props.activeSymbolLetter}
              onChange={(event) => props.onSetActiveSymbolLetter(event.currentTarget.value)}
            >
              <For each={LETTER_OPTIONS}>
                {(letter) => (
                  <option value={letter}>{letter}</option>
                )}
              </For>
            </select>
          </div>
          <div class="tb-sep" />
          <div class="tb-field">
            <span class="tb-field-label">Corner</span>
            <div class="tb-toggle-group" role="radiogroup" aria-label="Linear auto-spacing corner mode">
              <button
                class={`tb-toggle-btn ${props.touchCornerMode === 'outside' ? 'active' : ''}`}
                type="button"
                role="radio"
                aria-checked={props.touchCornerMode === 'outside'}
                onClick={() => props.onSetTouchCornerMode('outside')}
              >
                Outside
              </button>
              <button
                class={`tb-toggle-btn ${props.touchCornerMode === 'inside' ? 'active' : ''}`}
                type="button"
                role="radio"
                aria-checked={props.touchCornerMode === 'inside'}
                onClick={() => props.onSetTouchCornerMode('inside')}
              >
                Inside
              </button>
            </div>
          </div>
          <div class="tb-sep" />
          <button
            class="tb-btn tb-btn-primary"
            type="button"
            onClick={() => props.onFinishLinearAutoSpacing(false)}
            disabled={props.linearAutoSpacingVerticesCount < 2}
          >
            Finish Open
          </button>
          <button
            class="tb-btn tb-btn-primary"
            type="button"
            onClick={() => props.onFinishLinearAutoSpacing(true)}
            disabled={props.linearAutoSpacingVerticesCount < 3}
          >
            Close + Finish
          </button>
          <button class="tb-btn" type="button" onClick={props.onResetLinearAutoSpacingTrace}>
            Reset Trace
          </button>
          <div class="tb-sep" />
          <span class="tb-status">
            Vertices: <span class="tb-status-val">{props.linearAutoSpacingVerticesCount}</span>
          </span>
          <div class="tb-sep" />
          <span class="tb-hint">{linearAutoSpacingHint(props)}</span>
          {!props.project.scale.isSet && (
            <>
              <div class="tb-sep" />
              <span class="tb-error">Set scale before using linear auto-spacing.</span>
            </>
          )}
        </div>
      )
    }

    if (props.tool === 'arc_auto_spacing') {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-field">
            <span class="tb-field-label">Max Interval</span>
            <input
              class="tb-input tb-input-narrow"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              value={props.arcAutoSpacingMaxInput}
              aria-label="Arc auto-spacing max interval"
              onInput={(event) => props.onSetArcAutoSpacingMaxInput(event.currentTarget.value)}
              onKeyDown={handleEnterBlur}
            />
            <span class="tb-unit">ft</span>
          </div>
          <div class="tb-sep" />
          <div class="tb-field">
            <span class="tb-field-label">Letter</span>
            <select
              class="tb-select"
              aria-label="Air terminal letter"
              value={props.activeSymbolLetter}
              onChange={(event) => props.onSetActiveSymbolLetter(event.currentTarget.value)}
            >
              <For each={LETTER_OPTIONS}>
                {(letter) => (
                  <option value={letter}>{letter}</option>
                )}
              </For>
            </select>
          </div>
          <div class="tb-sep" />
          <button
            class="tb-btn tb-btn-primary"
            type="button"
            onClick={props.onApplyArcAutoSpacing}
            disabled={!props.arcAutoSpacingTargetSet}
          >
            Apply Spacing
          </button>
          <button
            class="tb-btn"
            type="button"
            onClick={props.onClearArcAutoSpacingTarget}
            disabled={!props.arcAutoSpacingTargetSet}
          >
            Clear Target
          </button>
          <div class="tb-sep" />
          <span class="tb-status">
            Target: <span class="tb-status-val">{props.arcAutoSpacingTargetSet ? 'selected' : 'none'}</span>
          </span>
          <div class="tb-sep" />
          <span class="tb-hint">{arcAutoSpacingHint(props)}</span>
          {!props.project.scale.isSet && (
            <>
              <div class="tb-sep" />
              <span class="tb-error">Set scale before using arc auto-spacing.</span>
            </>
          )}
        </div>
      )
    }

    if (props.tool === 'measure') {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-field">
            <span class="tb-field-label">Target</span>
            <input
              class="tb-input tb-input-narrow"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              placeholder="—"
              value={props.measureTargetDistanceInput}
              aria-label="Target distance feet"
              onInput={(event) => props.onSetMeasureTargetDistanceInput(event.currentTarget.value)}
              onKeyDown={handleEnterBlur}
            />
            <span class="tb-unit">ft</span>
          </div>
          <div class="tb-sep" />
          <button class="tb-btn" type="button" onClick={props.onClearMeasurement}>
            Clear
          </button>
          <div class="tb-sep" />
          <span class="tb-hint">{measureHint(props)}</span>
        </div>
      )
    }

    if (markToolActive()) {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-field">
            <span class="tb-field-label">Target</span>
            <input
              class="tb-input tb-input-narrow"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              placeholder="—"
              value={props.measureTargetDistanceInput}
              aria-label="Target distance feet"
              onInput={(event) => props.onSetMeasureTargetDistanceInput(event.currentTarget.value)}
              onKeyDown={handleEnterBlur}
            />
            <span class="tb-unit">ft</span>
          </div>
          <div class="tb-sep" />
          <div class="tb-field">
            <span class="tb-field-label">Corner</span>
            <div class="tb-toggle-group" role="radiogroup" aria-label="Measure mark corner mode">
              <button
                class={`tb-toggle-btn ${props.touchCornerMode === 'outside' ? 'active' : ''}`}
                type="button"
                role="radio"
                aria-checked={props.touchCornerMode === 'outside'}
                onClick={() => props.onSetTouchCornerMode('outside')}
              >
                Outside
              </button>
              <button
                class={`tb-toggle-btn ${props.touchCornerMode === 'inside' ? 'active' : ''}`}
                type="button"
                role="radio"
                aria-checked={props.touchCornerMode === 'inside'}
                onClick={() => props.onSetTouchCornerMode('inside')}
              >
                Inside
              </button>
            </div>
          </div>
          <div class="tb-sep" />
          <button class="tb-btn" type="button" onClick={props.onResetMeasureMarkSpan}>
            Reset Span
          </button>
          <button
            class="tb-btn tb-btn-danger"
            type="button"
            onClick={props.onClearAllMarks}
            disabled={props.project.construction.marks.length === 0}
          >
            Clear All
          </button>
          <div class="tb-sep" />
          <span class="tb-status">
            Marks: <span class="tb-status-val">{props.project.construction.marks.length}</span>
          </span>
          <div class="tb-sep" />
          <span class="tb-hint">{measureMarkHint(props)}</span>
        </div>
      )
    }

    if (markSelectedInSelectMode()) {
      return (
        <div class="properties-tool-options-inline">
          <button
            class="tb-btn tb-btn-danger"
            type="button"
            onClick={props.onClearAllMarks}
            disabled={props.project.construction.marks.length === 0}
          >
            Clear All Marks
          </button>
          <div class="tb-sep" />
          {zOrderControls()}
        </div>
      )
    }

    if (props.tool === 'text') {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-field tb-field-multiline">
            <span class="tb-field-label">Text</span>
            <textarea
              class="tb-input tb-input-wide tb-input-multiline"
              aria-label="Text"
              rows={3}
              value={props.textDraftInput}
              onInput={(event) => props.onSetTextDraftInput(event.currentTarget.value)}
            />
          </div>
          <div class="tb-sep" />
          <span class="tb-hint">Click to place. Supports multiline text. Double-click in Select mode to edit.</span>
        </div>
      )
    }

    if (props.tool === 'dimension_text') {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-switch-wrap">
            <span class="tb-check-label">Extension Lines</span>
            <button
              type="button"
              role="switch"
              aria-label="Dimension extension lines"
              aria-checked={props.dimensionShowLinework}
              class={`tb-switch ${props.dimensionShowLinework ? 'on' : ''}`}
              onClick={() => props.onSetDimensionShowLinework(!props.dimensionShowLinework)}
            />
          </div>
          <div class="tb-sep" />
          <button class="tb-btn" type="button" onClick={props.onResetDimensionText}>
            Reset Dimension
          </button>
          <div class="tb-sep" />
          <span class="tb-hint">{dimensionHint(props)}</span>
          {!props.project.scale.isSet && (
            <>
              <div class="tb-sep" />
              <span class="tb-error">Set scale before placing dimension text.</span>
            </>
          )}
        </div>
      )
    }

    if (props.tool === 'arrow') {
      return (
        <div class="properties-tool-options-inline">
          <button class="tb-btn" type="button" onClick={props.onResetArrow}>
            Reset Arrow
          </button>
          <div class="tb-sep" />
          <span class="tb-hint">{arrowHint(props)}</span>
        </div>
      )
    }

    if (legendSelected()) {
      return (
        <div class="properties-tool-options-inline">
          <button class="tb-btn tb-btn-primary" type="button" onClick={props.onEditSelectedLegend}>
            Edit Labels
          </button>
          <div class="tb-sep" />
          {zOrderControls()}
          <div class="tb-sep" />
          <span class="tb-hint">Double-click legend to edit</span>
        </div>
      )
    }

    if (generalNotesSelected()) {
      return (
        <div class="properties-tool-options-inline">
          <button class="tb-btn tb-btn-primary" type="button" onClick={props.onEditSelectedGeneralNotes}>
            Edit Notes
          </button>
          <div class="tb-sep" />
          {zOrderControls()}
          <div class="tb-sep" />
          <span class="tb-hint">Double-click notes to edit</span>
        </div>
      )
    }

    if (downleadSelectionOptionsVisible()) {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-field">
            <span class="tb-field-label">Vertical</span>
            <input
              class="tb-input tb-input-narrow"
              type="number"
              min="0"
              max="999"
              step="1"
              inputmode="numeric"
              aria-label="Selected downlead vertical feet"
              value={props.downleadVerticalFootageSelectedInput}
              onInput={(event) => props.onSetDownleadVerticalFootageSelectedInput(event.currentTarget.value)}
              onBlur={props.onCommitDownleadVerticalFootageSelectedInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  props.onCommitDownleadVerticalFootageSelectedInput()
                }
              }}
            />
            <span class="tb-unit">ft</span>
          </div>
          <div class="tb-sep" />
          <span class="tb-hint">Press Enter or blur to apply.</span>
        </div>
      )
    }

    if (props.tool === 'legend') {
      return (
        <div class="properties-tool-options-inline">
          <span class="tb-hint">Click to place legend stamp</span>
          <div class="tb-sep" />
          <span class="tb-status">
            Items: <span class="tb-status-val">{props.project.legend.items.length}</span>
          </span>
        </div>
      )
    }

    if (props.tool === 'general_notes') {
      return (
        <div class="properties-tool-options-inline">
          <span class="tb-hint">Click to place general notes stamp</span>
          <div class="tb-sep" />
          <span class="tb-status">
            Notes: <span class="tb-status-val">{props.project.generalNotes.notes.length}</span>
          </span>
        </div>
      )
    }

    if (downleadPlacementOptionsVisible()) {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-field">
            <span class="tb-field-label">Vertical</span>
            <input
              class="tb-input tb-input-narrow"
              type="number"
              min="0"
              max="999"
              step="1"
              inputmode="numeric"
              aria-label="Default downlead vertical feet"
              value={props.downleadVerticalFootagePlacementInput}
              onInput={(event) => props.onSetDownleadVerticalFootagePlacementInput(event.currentTarget.value)}
              onKeyDown={handleEnterBlur}
            />
            <span class="tb-unit">ft</span>
          </div>
          <div class="tb-sep" />
          <span class="tb-hint">Used for new downlead placements.</span>
          <div class="tb-sep" />
          <span class="tb-hint">{symbolHint(props)}</span>
        </div>
      )
    }

    if (letteredComponentOptionsVisible()) {
      return (
        <div class="properties-tool-options-inline">
          <div class="tb-field">
            <span class="tb-field-label">Letter</span>
            <select
              class="tb-select"
              value={props.activeSymbolLetter}
              onChange={(event) => props.onSetActiveSymbolLetter(event.currentTarget.value)}
            >
              <For each={LETTER_OPTIONS}>
                {(letter) => (
                  <option value={letter}>{letter}</option>
                )}
              </For>
            </select>
          </div>
          <div class="tb-sep" />
          <div class="tb-field">
            <span class="tb-field-label">Legend Suffix</span>
            <input
              class="tb-input"
              type="text"
              maxLength={24}
              value={props.legendCustomSuffixInput}
              onInput={(event) => props.onSetLegendCustomSuffixInput(event.currentTarget.value)}
              onKeyDown={handleEnterBlur}
              placeholder="Optional"
            />
            <button class="tb-btn" type="button" onClick={props.onClearLegendCustomSuffix}>
              Clear
            </button>
          </div>
          <div class="tb-sep" />
          <span class="tb-hint">{symbolHint(props)}</span>
        </div>
      )
    }

    if (props.tool === 'symbol') {
      return (
        <div class="properties-tool-options-inline">
          <span class="tb-hint">{symbolHint(props)}</span>
        </div>
      )
    }

    if (props.tool === 'calibrate') {
      return (
        <div class="properties-tool-options-inline">
          <span class="tb-hint">{calibrateHint(props)}</span>
          {props.calibrationPendingDistancePt !== null && (
            <>
              <div class="tb-sep" />
              <div class="tb-field">
                <span class="tb-field-label">Distance</span>
                <input
                  class="tb-input tb-input-narrow"
                  type="number"
                  min="0"
                  step="any"
                  inputmode="decimal"
                  aria-label="Calibration distance in feet"
                  value={props.calibrationDistanceInput}
                  onInput={(event) => props.onSetCalibrationDistanceInput(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      props.onApplyCalibration()
                    } else if (event.key === 'Escape') {
                      event.preventDefault()
                      props.onCancelCalibration()
                    }
                  }}
                />
                <span class="tb-unit">ft</span>
              </div>
              <button class="tb-btn tb-btn-primary" type="button" onClick={props.onApplyCalibration}>
                Apply
              </button>
              <button class="tb-btn" type="button" onClick={props.onCancelCalibration}>
                Cancel
              </button>
            </>
          )}
          {props.calibrationInputError && (
            <>
              <div class="tb-sep" />
              <span class="tb-error">{props.calibrationInputError}</span>
            </>
          )}
        </div>
      )
    }

    if (props.tool === 'select' && props.selectedKind) {
      return (
        <div class="properties-tool-options-inline">
          {zOrderControls()}
        </div>
      )
    }

    if (props.tool === 'multi_select' && props.multiSelectionCount > 0) {
      return (
        <div class="properties-tool-options-inline">
          {zOrderControls()}
        </div>
      )
    }

    return (
      <div class="properties-tool-options-inline">
        <span class="tb-hint">No tool-specific properties.</span>
      </div>
    )
  }

  return <>{renderInlineOptions()}</>
}
