import { SectionHelp } from '../components/SectionHelp'
import { SymbolButton, ToolButton } from './toolButtons'

/** Block: air terminal placement and auto-spacing tools. Landmark: a group named "Air Terminals". */
export default function AirTerminalTools() {
  return (
    <div class="block" data-block="air-terminals" role="group" aria-label="Air Terminals">
      <div class="section-label">Air Terminals <SectionHelp anchor="help-components-air-terminals" /></div>
      <div class="btn-grid-3">
        <SymbolButton symbol="air_terminal" label="AT" title="Air Terminal" />
        <SymbolButton symbol="bonded_air_terminal" label="Bonded AT" title="Bonded Air Terminal" />
        <ToolButton tool="linear_auto_spacing" label="Linear AT" title="Linear Auto-Spacing" />
        <ToolButton tool="arc_auto_spacing" label="Arc AT" title="Arc Auto-Spacing" />
      </div>
    </div>
  )
}
