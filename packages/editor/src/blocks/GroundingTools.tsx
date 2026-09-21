import { SectionHelp } from '../components/SectionHelp'
import { SymbolButton } from './toolButtons'

/** Block: grounding components. Landmark: a group named "Grounding". */
export default function GroundingTools() {
  return (
    <div class="block" data-block="grounding" role="group" aria-label="Grounding">
      <div class="section-label">Grounding <SectionHelp anchor="help-components-grounding" /></div>
      <div class="btn-grid-3">
        <SymbolButton symbol="ground_rod" label="Ground Rod" />
      </div>
    </div>
  )
}
