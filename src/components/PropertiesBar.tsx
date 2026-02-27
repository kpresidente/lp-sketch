import { Show, type JSX } from 'solid-js'
import type { LpProject, Selection, SymbolType, Tool } from '../types/project'
import { SYMBOL_LABELS } from '../model/defaultProject'
import { TOOL_CUSTOM_ICON, TOOL_ICON, tablerIconClass } from '../config/iconRegistry'
import { CustomIcon } from './icons/CustomIcon'
import { useHelp } from '../context/HelpContext'

const TOOL_DISPLAY: Record<Tool, { icon: string; label: string }> = {
  select: { icon: TOOL_ICON.select, label: 'Select' },
  multi_select: { icon: TOOL_ICON.multi_select, label: 'Multi' },
  pan: { icon: TOOL_ICON.pan, label: 'Pan' },
  line: { icon: TOOL_ICON.line, label: 'Linear' },
  arc: { icon: TOOL_ICON.arc, label: 'Arc' },
  curve: { icon: TOOL_ICON.curve, label: 'Curve' },
  symbol: { icon: TOOL_ICON.symbol, label: 'Component' },
  text: { icon: TOOL_ICON.text, label: 'Text' },
  dimension_text: { icon: TOOL_ICON.dimension_text, label: 'Dim Text' },
  arrow: { icon: TOOL_ICON.arrow, label: 'Arrow' },
  legend: { icon: TOOL_ICON.legend, label: 'Legend' },
  general_notes: { icon: TOOL_ICON.general_notes, label: 'General Notes' },
  measure: { icon: TOOL_ICON.measure, label: 'Measure' },
  measure_mark: { icon: TOOL_ICON.measure_mark, label: 'Mark' },
  calibrate: { icon: TOOL_ICON.calibrate, label: 'Calibrate' },
  linear_auto_spacing: { icon: TOOL_ICON.linear_auto_spacing, label: 'Linear AT' },
  arc_auto_spacing: { icon: TOOL_ICON.arc_auto_spacing, label: 'Arc AT' },
}

/** Maps tools to their Section 8.2 help anchor. Tools without an entry have no help link. */
const TOOL_HELP_ANCHOR: Partial<Record<Tool, string>> = {
  line: 'help-properties-linear',
  arc: 'help-properties-arc',
  curve: 'help-properties-curve',
  symbol: 'help-properties-air-terminal',
  text: 'help-properties-text',
  dimension_text: 'help-properties-dimension-text',
  arrow: 'help-properties-arrow',
  legend: 'help-properties-legend-placing',
  general_notes: 'help-properties-notes-placing',
  measure: 'help-properties-measure',
  measure_mark: 'help-properties-mark',
  calibrate: 'help-properties-calibrate',
  linear_auto_spacing: 'help-properties-linear-at',
  arc_auto_spacing: 'help-properties-arc-at',
}

const SELECTION_KIND_LABEL: Record<Selection['kind'], string> = {
  line: 'Line',
  arc: 'Arc',
  curve: 'Curve',
  symbol: 'Component',
  legend: 'Legend',
  general_note: 'General Notes',
  text: 'Text',
  dimension_text: 'Dim Text',
  arrow: 'Arrow',
  mark: 'Mark',
}

interface PropertiesBarProps {
  project: LpProject
  tool: Tool
  activeSymbol: SymbolType
  selectedKind: Selection['kind'] | null
  historyPastCount: number
  historyFutureCount: number
  onSelectTool: (tool: Tool) => void
  onUndo: () => void
  onRedo: () => void
  selectionDebugEnabled: boolean
  onSetSelectionDebugEnabled: (enabled: boolean) => void
  calibrationPreview: string | null
  lineSegmentDistanceLabel: string | null
  linePathTotalDistanceLabel: string | null
  measureDistanceLabel: string | null
  markSpanDistanceLabel: string | null
  linearAutoSpacingPathDistanceLabel: string | null
  toolOptionsSlot?: JSX.Element
}

export default function PropertiesBar(props: PropertiesBarProps) {
  const help = useHelp()
  const toolInfo = () => TOOL_DISPLAY[props.tool] ?? { icon: TOOL_ICON.select, label: props.tool }
  const activeCustomToolIcon = () => TOOL_CUSTOM_ICON[props.tool]
  const toolHelpAnchor = () => TOOL_HELP_ANCHOR[props.tool]
  const selectionLabel = () => (props.selectedKind ? SELECTION_KIND_LABEL[props.selectedKind] : null)
  const showDebugControls = import.meta.env.DEV

  const renderActiveToolIcon = () => {
    const customIcon = activeCustomToolIcon()
    if (customIcon) {
      return <CustomIcon name={customIcon} />
    }
    return <i class={tablerIconClass(toolInfo().icon)} />
  }

  return (
    <div class="workspace-toolbar properties-bar" data-properties-bar="active">
      <div class="properties-row">
        <div class="properties-side properties-left">
          <div class="tb-label toolbar-active-tool">
            {renderActiveToolIcon()}
            {toolInfo().label}
          </div>
          <Show when={toolHelpAnchor()}>
            {(anchor) => (
              <button
                class="section-help-btn"
                type="button"
                title="Tool help"
                onClick={(e) => {
                  e.stopPropagation()
                  help.openHelp(anchor())
                }}
              >
                <i class={tablerIconClass('info-square-rounded')} />
              </button>
            )}
          </Show>

          <Show when={props.tool === 'symbol'}>
            <div class="tb-sep" />
            <span class="tb-status">{SYMBOL_LABELS[props.activeSymbol]}</span>
          </Show>

          <Show when={selectionLabel()}>
            {(label) => (
              <>
                <div class="tb-sep" />
                <span class="tb-status">
                  Selected: <span class="tb-status-val">{label()}</span>
                </span>
              </>
            )}
          </Show>

          <div class="tb-sep" />
          <Show when={props.toolOptionsSlot} fallback={<span class="tb-hint">No tool-specific properties.</span>}>
            {props.toolOptionsSlot}
          </Show>
        </div>

        <div class="properties-side properties-right">
          <Show when={props.calibrationPreview}>
            <span class="tb-status">
              Measure: <span class="tb-status-val">{props.calibrationPreview}</span>
            </span>
          </Show>
          <Show when={props.lineSegmentDistanceLabel}>
            <span class="tb-status">
              Line: <span class="tb-status-val">{props.lineSegmentDistanceLabel}</span>
            </span>
          </Show>
          <Show when={props.linePathTotalDistanceLabel}>
            <span class="tb-status">
              Line Total: <span class="tb-status-val">{props.linePathTotalDistanceLabel}</span>
            </span>
          </Show>
          <Show when={props.measureDistanceLabel}>
            <span class="tb-status">
              Path: <span class="tb-status-val">{props.measureDistanceLabel}</span>
            </span>
          </Show>
          <Show when={props.markSpanDistanceLabel}>
            <span class="tb-status">
              Mark Span: <span class="tb-status-val">{props.markSpanDistanceLabel}</span>
            </span>
          </Show>
          <Show when={props.linearAutoSpacingPathDistanceLabel}>
            <span class="tb-status">
              Auto Path: <span class="tb-status-val">{props.linearAutoSpacingPathDistanceLabel}</span>
            </span>
          </Show>

          <div class="tb-sep" />
          <span class="tb-status">
            Zoom: <span class="tb-status-val">{(props.project.view.zoom * 100).toFixed(0)}%</span>
          </span>

          <Show when={showDebugControls}>
            <div class="tb-sep" />
            <label class="tb-check-wrap">
              <input
                type="checkbox"
                aria-label="Debug"
                checked={props.selectionDebugEnabled}
                onChange={(event) => props.onSetSelectionDebugEnabled(event.currentTarget.checked)}
              />
              <span class="tb-check-label">Debug</span>
            </label>
          </Show>
        </div>
      </div>
    </div>
  )
}
