import Panel from './Panel'
import type { SymbolType, Tool } from '../../types/project'
import {
  SYMBOL_BUTTON_ICON,
  SYMBOL_CLASS2_CUSTOM_ICON,
  TOOL_CUSTOM_ICON,
  TOOL_ICON,
  tablerIconClass,
} from '../../config/iconRegistry'
import {
  isSymbolDisabledForMaterial,
  isToolDisabledForMaterial,
} from '../../lib/componentAvailability'
import { CustomIcon } from '../icons/CustomIcon'
import { useAppController } from '../../context/AppControllerContext'

export default function ComponentsPanel() {
  const props = useAppController()
  const isToolActive = (toolId: Tool) => props.tool === toolId
  const isSymbolActive = (symbolType: SymbolType) =>
    props.tool === 'symbol' && props.activeSymbol === symbolType

  const toolBtn = (id: Tool, label: string, buttonClass = '', labelClass = '', title = label) => (
    <button
      class={`btn ${buttonClass} ${isToolActive(id) ? 'active' : ''}`.trim()}
      type="button"
      aria-pressed={isToolActive(id)}
      title={title}
      disabled={isToolDisabledForMaterial(id, props.project.settings.activeColor)}
      onClick={() => props.onSelectTool(id)}
    >
      {TOOL_CUSTOM_ICON[id]
        ? <CustomIcon name={TOOL_CUSTOM_ICON[id]} />
        : <i class={tablerIconClass(TOOL_ICON[id])} />}
      <span class={`btn-text ${labelClass}`.trim()}>{label}</span>
    </button>
  )

  const symbolBtn = (
    symbolType: SymbolType,
    label: string,
    buttonClass = '',
    labelClass = '',
    title = label,
  ) => (
    <button
      class={`btn ${buttonClass} ${isSymbolActive(symbolType) ? 'active' : ''}`.trim()}
      type="button"
      aria-pressed={isSymbolActive(symbolType)}
      title={title}
      disabled={isSymbolDisabledForMaterial(symbolType, props.project.settings.activeColor)}
      onClick={() => {
        props.onSetActiveSymbol(symbolType)
        props.onSelectTool('symbol')
      }}
    >
      {props.project.settings.activeClass === 'class2' && SYMBOL_CLASS2_CUSTOM_ICON[symbolType]
        ? <CustomIcon name={SYMBOL_CLASS2_CUSTOM_ICON[symbolType]} />
        : <i class={tablerIconClass(SYMBOL_BUTTON_ICON[symbolType])} />}
      <span class={`btn-text ${labelClass}`.trim()}>{label}</span>
    </button>
  )

  return (
    <Panel label="Components">
      <div class="section-label">Conductors</div>
      <div class="btn-grid-3">
        {toolBtn('line', 'Linear', '', '', 'Linear Conductor')}
        {toolBtn('arc', 'Arc', '', '', 'Arc Conductor')}
        {toolBtn('curve', 'Curve', '', '', 'Curve Conductor')}
      </div>

      <div class="section-label">Air Terminals</div>
      <div class="btn-grid-3">
        {symbolBtn('air_terminal', 'AT', '', '', 'Air Terminal')}
        {symbolBtn('bonded_air_terminal', 'Bonded AT', '', '', 'Bonded Air Terminal')}
        {toolBtn('linear_auto_spacing', 'Linear AT', '', '', 'Linear Auto-Spacing')}
        {toolBtn('arc_auto_spacing', 'Arc AT', '', '', 'Arc Auto-Spacing')}
      </div>

      <div class="section-label">Connections</div>
      <div class="btn-grid-3">
        {symbolBtn('bond', 'Bond')}
        {symbolBtn('cable_to_cable_connection', 'Mechanical')}
        {symbolBtn('cadweld_connection', 'Cadweld')}
      </div>

      <div class="section-label">Downleads</div>
      <div class="btn-grid-3" style={{ "margin-bottom": "5px" }}>
        {symbolBtn('conduit_downlead_ground', 'Conduit to Ground', 'btn-multiline')}
        {symbolBtn('conduit_downlead_roof', 'Conduit to Roof', 'btn-multiline')}
      </div>
      <div class="btn-grid-3">
        {symbolBtn('surface_downlead_ground', 'Surface to Ground', 'btn-multiline')}
        {symbolBtn('surface_downlead_roof', 'Surface to Roof', 'btn-multiline')}
      </div>

      <div class="section-label">Penetrations</div>
      <div class="btn-grid-3">
        {symbolBtn('through_roof_to_steel', 'Thru-Roof', '', '', 'Through-Roof')}
        {symbolBtn('through_wall_connector', 'Thru-Wall', '', '', 'Through-Wall')}
      </div>

      <div class="section-label">Grounding</div>
      <div class="btn-grid-3">
        {symbolBtn('ground_rod', 'Ground Rod')}
        {symbolBtn('steel_bond', 'Steel Bond')}
      </div>

      <div class="section-label">Miscellaneous</div>
      <div class="btn-grid-3">
        {symbolBtn('continued', 'Continued')}
        {symbolBtn('connect_existing', 'Connect Existing')}
      </div>
    </Panel>
  )
}
