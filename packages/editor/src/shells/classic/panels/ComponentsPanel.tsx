import Panel from './Panel'
import AirTerminalTools from '../../../blocks/AirTerminalTools'
import ConductorTools from '../../../blocks/ConductorTools'
import ConnectionTools from '../../../blocks/ConnectionTools'
import DownleadTools from '../../../blocks/DownleadTools'
import GroundingTools from '../../../blocks/GroundingTools'
import PenetrationTools from '../../../blocks/PenetrationTools'

/** Classic's Components panel: the component tool groups in their pre-shell order. */
export default function ComponentsPanel() {
  return (
    <Panel label="Components">
      <ConductorTools />
      <AirTerminalTools />
      <ConnectionTools />
      <DownleadTools />
      <PenetrationTools />
      <GroundingTools />
    </Panel>
  )
}
