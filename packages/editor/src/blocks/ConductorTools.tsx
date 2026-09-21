import { SectionHelp } from '../components/SectionHelp'
import { ToolButton } from './toolButtons'

/** Block: conductor drawing tools. Landmark: a group named "Conductors". */
export default function ConductorTools() {
  return (
    <div class="block" data-block="conductors" role="group" aria-label="Conductors">
      <div class="section-label">Conductors <SectionHelp anchor="help-components-conductors" /></div>
      <div class="btn-grid-3">
        <ToolButton tool="line" label="Linear" title="Linear Conductor" />
        <ToolButton tool="arc" label="Arc" title="Arc Conductor" />
        <ToolButton tool="curve" label="Curve" title="Curve Conductor" />
      </div>
    </div>
  )
}
