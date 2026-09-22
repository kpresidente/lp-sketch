import { SectionHelp } from '../components/SectionHelp'
import { SymbolButton } from './toolButtons'

/** Block: downlead components. Landmark: a group named "Downleads". */
export default function DownleadTools() {
  return (
    <div class="block" data-block="downleads" role="group" aria-label="Downleads">
      <div class="section-label">Downleads <SectionHelp anchor="help-components-downleads" /></div>
      <div class="btn-grid-3" style={{ 'margin-bottom': '5px' }}>
        <SymbolButton symbol="conduit_downlead_ground" label="Conduit to Ground" class="btn-multiline" />
        <SymbolButton symbol="conduit_downlead_roof" label="Conduit to Roof" class="btn-multiline" />
      </div>
      <div class="btn-grid-3">
        <SymbolButton symbol="surface_downlead_ground" label="Surface to Ground" class="btn-multiline" />
        <SymbolButton symbol="surface_downlead_roof" label="Surface to Roof" class="btn-multiline" />
      </div>
    </div>
  )
}
