import Panel from './Panel'
import AnnotationTools from '../../../blocks/AnnotationTools'
import HistoryControls from '../../../blocks/HistoryControls'
import ModeSwitch from '../../../blocks/ModeSwitch'
import SnappingControls from '../../../blocks/SnappingControls'

/** Classic's Tools panel: mode, history, snapping, and annotation blocks in their pre-shell order. */
export default function ToolsPanel() {
  return (
    <Panel label="Tools">
      <ModeSwitch />
      <HistoryControls />
      <SnappingControls />
      <AnnotationTools />
    </Panel>
  )
}
