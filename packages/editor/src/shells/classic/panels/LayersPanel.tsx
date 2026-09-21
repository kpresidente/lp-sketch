import Panel from './Panel'
import LayerList from '../../../blocks/LayerList'

/** Classic's Layers panel: the layer list block. */
export default function LayersPanel() {
  return (
    <Panel label="Layers">
      <LayerList />
    </Panel>
  )
}
