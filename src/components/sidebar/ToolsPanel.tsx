import Panel from './Panel'
import {
  COMMAND_ICON,
  SYMBOL_BUTTON_ICON,
  SYMBOL_CUSTOM_ICON,
  TOOL_CUSTOM_ICON,
  TOOL_ICON,
  tablerIconClass,
} from '../../config/iconRegistry'
import { CustomIcon } from '../icons/CustomIcon'
import { useAppController } from '../../context/AppControllerContext'
import { SectionHelp } from './SectionHelp'
import {
  formatDisabledTooltip,
  symbolDisabledReasons,
  toolDisabledReasons,
} from '../../lib/componentAvailability'

export default function ToolsPanel() {
  const props = useAppController()
  const renderToolIcon = (toolId: 'select' | 'multi_select' | 'pan') => {
    const custom = TOOL_CUSTOM_ICON[toolId]
    if (custom) {
      return <CustomIcon name={custom} />
    }
    return <i class={tablerIconClass(TOOL_ICON[toolId])} />
  }
  const annotationToolTitle = (toolId: 'text' | 'dimension_text' | 'arrow' | 'legend' | 'general_notes' | 'measure' | 'measure_mark', baseTitle: string) => (
    formatDisabledTooltip(baseTitle, toolDisabledReasons(toolId, props.project, props.project.settings.activeColor))
  )
  const annotationToolDisabled = (toolId: 'text' | 'dimension_text' | 'arrow' | 'legend' | 'general_notes' | 'measure' | 'measure_mark') => (
    toolDisabledReasons(toolId, props.project, props.project.settings.activeColor).length > 0
  )
  const continuedSymbolTitle = () => (
    formatDisabledTooltip(
      'Continued',
      symbolDisabledReasons('continued', props.project.settings.activeColor),
    )
  )
  const continuedSymbolDisabled = () => (
    symbolDisabledReasons('continued', props.project.settings.activeColor).length > 0
  )

  return (
    <Panel label="Tools">
      <div class="section-label">Mode <SectionHelp anchor="help-tools-mode" /></div>
      <div class="btn-row" style={{ "margin-bottom": "10px" }}>
        <button
          class={`btn ${props.tool === 'select' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'select'}
          title="Select"
          onClick={() => props.onSelectTool('select')}
        >
          {renderToolIcon('select')} Select
        </button>
        <button
          class={`btn ${props.tool === 'multi_select' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'multi_select'}
          title="Multi-Select"
          onClick={() => props.onSelectTool('multi_select')}
        >
          {renderToolIcon('multi_select')} Multi
        </button>
        <button
          class={`btn ${props.tool === 'pan' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'pan'}
          title="Pan"
          onClick={() => props.onSelectTool('pan')}
        >
          {renderToolIcon('pan')} Pan
        </button>
      </div>

      <div class="history-bar">
        <button
          class="btn btn-icon"
          type="button"
          aria-label="Undo"
          title="Undo"
          onClick={props.onUndo}
          disabled={props.historyPastCount === 0}
        >
          <i class={tablerIconClass(COMMAND_ICON.undo)} />
        </button>
        <button
          class="btn btn-icon"
          type="button"
          aria-label="Redo"
          title="Redo"
          onClick={props.onRedo}
          disabled={props.historyFutureCount === 0}
        >
          <i class={tablerIconClass(COMMAND_ICON.redo)} />
        </button>
        <span class="history-counter">
          Past: {props.historyPastCount} | Future: {props.historyFutureCount}
        </span>
        <SectionHelp anchor="help-tools-undo-redo" />
      </div>

      <div class="toggle-row">
        <span class="toggle-label">Snap to Points</span>
        <SectionHelp anchor="help-tools-snap-to-points" />
        <button
          type="button"
          role="switch"
          aria-label="Snap to points"
          title="Snap to Points"
          aria-checked={props.project.settings.snapEnabled}
          class={`toggle-switch ${props.project.settings.snapEnabled ? 'on' : ''}`}
          onClick={() => props.onSetSnapEnabled(!props.project.settings.snapEnabled)}
        />
      </div>
      <div class="toggle-row">
        <span class="toggle-label">Angle Snap (15°)</span>
        <SectionHelp anchor="help-tools-angle-snap" />
        <button
          type="button"
          role="switch"
          aria-label="Angle snap"
          title="Angle Snap (15°)"
          aria-checked={props.project.settings.angleSnapEnabled}
          class={`toggle-switch ${props.project.settings.angleSnapEnabled ? 'on' : ''}`}
          onClick={() => props.onSetAngleSnapEnabled(!props.project.settings.angleSnapEnabled)}
        />
      </div>
      <div class="toggle-row">
        <span class="toggle-label">Auto-Connectors</span>
        <SectionHelp anchor="help-tools-auto-connectors" />
        <button
          type="button"
          role="switch"
          aria-label="Auto-connectors"
          title="Auto-Connectors"
          aria-checked={props.project.settings.autoConnectorsEnabled}
          class={`toggle-switch ${props.project.settings.autoConnectorsEnabled ? 'on' : ''}`}
          onClick={() =>
            props.onSetAutoConnectorsEnabled(!props.project.settings.autoConnectorsEnabled)}
        />
      </div>
      <div class="btn-row" style={{ "margin-bottom": "8px" }}>
        <button
          class={`btn btn-sm ${props.project.settings.autoConnectorType === 'mechanical' ? 'active' : ''}`}
          type="button"
          aria-label="Auto-connector type mechanical"
          title="Auto-Connector Type: Mechanical"
          disabled={!props.project.settings.autoConnectorsEnabled}
          onClick={() => props.onSetAutoConnectorType('mechanical')}
        >
          Mechanical
        </button>
        <button
          class={`btn btn-sm ${props.project.settings.autoConnectorType === 'cadweld' ? 'active' : ''}`}
          type="button"
          aria-label="Auto-connector type cadweld"
          title="Auto-Connector Type: Cadweld"
          disabled={!props.project.settings.autoConnectorsEnabled}
          onClick={() => props.onSetAutoConnectorType('cadweld')}
        >
          Cadweld
        </button>
      </div>

      <div class="section-label">Annotation <SectionHelp anchor="help-tools-annotation" /></div>
      <div class="btn-grid-3">
        <button
          class={`btn ${props.tool === 'text' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'text'}
          title={annotationToolTitle('text', 'Text')}
          disabled={annotationToolDisabled('text')}
          onClick={() => props.onSelectTool('text')}
        >
          <i class={tablerIconClass(TOOL_ICON.text)} /> Text
        </button>
        <button
          class={`btn ${props.tool === 'dimension_text' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'dimension_text'}
          title={annotationToolTitle('dimension_text', 'Dimension Text')}
          disabled={annotationToolDisabled('dimension_text')}
          onClick={() => props.onSelectTool('dimension_text')}
        >
          <i class={tablerIconClass(TOOL_ICON.dimension_text)} /> Dim Text
        </button>
        <button
          class={`btn ${props.tool === 'arrow' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'arrow'}
          title={annotationToolTitle('arrow', 'Arrow')}
          disabled={annotationToolDisabled('arrow')}
          onClick={() => props.onSelectTool('arrow')}
        >
          <i class={tablerIconClass(TOOL_ICON.arrow)} /> Arrow
        </button>
        <button
          class={`btn ${props.tool === 'legend' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'legend'}
          title={annotationToolTitle('legend', 'Legend')}
          disabled={annotationToolDisabled('legend')}
          onClick={() => props.onSelectTool('legend')}
        >
          <i class={tablerIconClass(TOOL_ICON.legend)} /> Legend
        </button>
        <button
          class={`btn ${props.tool === 'general_notes' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'general_notes'}
          title={annotationToolTitle('general_notes', 'General Notes')}
          disabled={annotationToolDisabled('general_notes')}
          onClick={() => props.onSelectTool('general_notes')}
        >
          <i class={tablerIconClass(TOOL_ICON.general_notes)} /> Notes
        </button>
        <button
          class={`btn ${props.tool === 'measure' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'measure'}
          title={annotationToolTitle('measure', 'Measure')}
          disabled={annotationToolDisabled('measure')}
          onClick={() => props.onSelectTool('measure')}
        >
          <i class={tablerIconClass(TOOL_ICON.measure)} /> Measure
        </button>
        <button
          class={`btn ${props.tool === 'measure_mark' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'measure_mark'}
          title={annotationToolTitle('measure_mark', 'Mark')}
          disabled={annotationToolDisabled('measure_mark')}
          onClick={() => props.onSelectTool('measure_mark')}
        >
          <i class={tablerIconClass(TOOL_ICON.measure_mark)} /> Mark
        </button>
        <button
          class={`btn ${props.tool === 'symbol' && props.activeSymbol === 'continued' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'symbol' && props.activeSymbol === 'continued'}
          title={continuedSymbolTitle()}
          disabled={continuedSymbolDisabled()}
          onClick={() => {
            props.onSetActiveSymbol('continued')
            props.onSelectTool('symbol')
          }}
        >
          {SYMBOL_CUSTOM_ICON.continued
            ? <CustomIcon name={SYMBOL_CUSTOM_ICON.continued} />
            : <i class={tablerIconClass(SYMBOL_BUTTON_ICON.continued)} />}
          Continued
        </button>
      </div>
    </Panel>
  )
}
