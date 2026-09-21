import { SectionHelp } from '../components/SectionHelp'
import { SymbolButton } from './toolButtons'

/** Block: connection components. Landmark: a group named "Connections". */
export default function ConnectionTools() {
  return (
    <div class="block" data-block="connections" role="group" aria-label="Connections">
      <div class="section-label">Connections <SectionHelp anchor="help-components-connections" /></div>
      <div class="btn-grid-3" style={{ 'margin-bottom': '5px' }}>
        <SymbolButton symbol="bond" label="Bond" />
        <SymbolButton symbol="cable_to_cable_connection" label="Mechanical" />
        <SymbolButton symbol="cadweld_connection" label="Cadweld" />
      </div>
      <div class="btn-grid-3">
        <SymbolButton symbol="steel_bond" label="Steel Bond" class="btn-connections-secondary" />
        <SymbolButton
          symbol="mechanical_crossrun_connection"
          label={'Mechanical\nCrossrun'}
          title="Mechanical Crossrun"
          class="btn-multiline btn-connections-secondary"
          labelClass="btn-text-stack"
        />
        <SymbolButton
          symbol="cadweld_crossrun_connection"
          label={'Cadweld\nCrossrun'}
          title="Cadweld Crossrun"
          class="btn-multiline btn-connections-secondary"
          labelClass="btn-text-stack"
        />
      </div>
    </div>
  )
}
