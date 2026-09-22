import { SectionHelp } from '../components/SectionHelp'
import { SymbolButton } from './toolButtons'

/** Block: penetration components. Landmark: a group named "Penetrations". */
export default function PenetrationTools() {
  return (
    <div class="block" data-block="penetrations" role="group" aria-label="Penetrations">
      <div class="section-label">Penetrations <SectionHelp anchor="help-components-penetrations" /></div>
      <div class="btn-grid-3">
        <SymbolButton symbol="through_roof_to_steel" label="Thru-Roof" title="Through-Roof" />
        <SymbolButton symbol="through_wall_connector" label="Thru-Wall" title="Through-Wall" />
      </div>
    </div>
  )
}
