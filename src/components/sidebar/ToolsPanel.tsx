import Panel from './Panel'
import { COMMAND_ICON, TOOL_CUSTOM_ICON, TOOL_ICON, tablerIconClass } from '../../config/iconRegistry'
import { CustomIcon } from '../icons/CustomIcon'
import { useAppController } from '../../context/AppControllerContext'

export default function ToolsPanel() {
  const props = useAppController()
  const renderToolIcon = (toolId: 'select' | 'multi_select' | 'pan') => {
    const custom = TOOL_CUSTOM_ICON[toolId]
    if (custom) {
      return <CustomIcon name={custom} />
    }
    return <i class={tablerIconClass(TOOL_ICON[toolId])} />
  }

  return (
    <Panel label="Tools">
      <div class="section-label">Mode</div>
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
      </div>

      <div class="toggle-row">
        <span class="toggle-label">Snap to Points</span>
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

      <div class="section-label">Annotation</div>
      <div class="btn-grid-3">
        <button
          class={`btn ${props.tool === 'text' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'text'}
          title="Text"
          onClick={() => props.onSelectTool('text')}
        >
          <i class={tablerIconClass(TOOL_ICON.text)} /> Text
        </button>
        <button
          class={`btn ${props.tool === 'dimension_text' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'dimension_text'}
          title="Dimension Text"
          onClick={() => props.onSelectTool('dimension_text')}
        >
          <i class={tablerIconClass(TOOL_ICON.dimension_text)} /> Dim Text
        </button>
        <button
          class={`btn ${props.tool === 'arrow' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'arrow'}
          title="Arrow"
          onClick={() => props.onSelectTool('arrow')}
        >
          <i class={tablerIconClass(TOOL_ICON.arrow)} /> Arrow
        </button>
        <button
          class={`btn ${props.tool === 'legend' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'legend'}
          title="Legend"
          onClick={() => props.onSelectTool('legend')}
        >
          <i class={tablerIconClass(TOOL_ICON.legend)} /> Legend
        </button>
        <button
          class={`btn ${props.tool === 'general_notes' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'general_notes'}
          title="General Notes"
          onClick={() => props.onSelectTool('general_notes')}
        >
          <i class={tablerIconClass(TOOL_ICON.general_notes)} /> Notes
        </button>
        <button
          class={`btn ${props.tool === 'measure' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'measure'}
          title="Measure"
          onClick={() => props.onSelectTool('measure')}
        >
          <i class={tablerIconClass(TOOL_ICON.measure)} /> Measure
        </button>
        <button
          class={`btn ${props.tool === 'measure_mark' ? 'active' : ''}`}
          type="button"
          aria-pressed={props.tool === 'measure_mark'}
          title="Mark"
          onClick={() => props.onSelectTool('measure_mark')}
        >
          <i class={tablerIconClass(TOOL_ICON.measure_mark)} /> Mark
        </button>
      </div>
    </Panel>
  )
}
