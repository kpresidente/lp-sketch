import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

/** Block: point snap, angle snap, and auto-connectors. Landmark: a group named "Snapping". */
export default function SnappingControls() {
  const props = useAppController()
  const settings = () => props.project.settings

  return (
    <div class="block" data-block="snapping" role="group" aria-label="Snapping">
      <div class="toggle-row">
        <span class="toggle-label">Snap to Points</span>
        <SectionHelp anchor="help-tools-snap-to-points" />
        <button
          type="button"
          role="switch"
          aria-label="Snap to points"
          title="Snap to Points"
          aria-checked={settings().snapEnabled}
          class={`toggle-switch ${settings().snapEnabled ? 'on' : ''}`}
          onClick={() => props.onSetSnapEnabled(!settings().snapEnabled)}
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
          aria-checked={settings().angleSnapEnabled}
          class={`toggle-switch ${settings().angleSnapEnabled ? 'on' : ''}`}
          onClick={() => props.onSetAngleSnapEnabled(!settings().angleSnapEnabled)}
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
          aria-checked={settings().autoConnectorsEnabled}
          class={`toggle-switch ${settings().autoConnectorsEnabled ? 'on' : ''}`}
          onClick={() => props.onSetAutoConnectorsEnabled(!settings().autoConnectorsEnabled)}
        />
      </div>
      <div class="btn-row">
        <button
          class={`btn btn-sm ${settings().autoConnectorType === 'mechanical' ? 'active' : ''}`}
          type="button"
          aria-label="Auto-connector type mechanical"
          title="Auto-Connector Type: Mechanical"
          disabled={!settings().autoConnectorsEnabled}
          onClick={() => props.onSetAutoConnectorType('mechanical')}
        >
          Mechanical
        </button>
        <button
          class={`btn btn-sm ${settings().autoConnectorType === 'cadweld' ? 'active' : ''}`}
          type="button"
          aria-label="Auto-connector type cadweld"
          title="Auto-Connector Type: Cadweld"
          disabled={!settings().autoConnectorsEnabled}
          onClick={() => props.onSetAutoConnectorType('cadweld')}
        >
          Cadweld
        </button>
      </div>
    </div>
  )
}
