import Panel from './Panel'
import AnnotationSizePicker from '../../../blocks/AnnotationSizePicker'
import DrawingScale from '../../../blocks/DrawingScale'

/** Classic's Scale panel: the drawing scale and annotation size blocks. */
export default function ScalePanel() {
  return (
    <Panel label="Scale">
      <DrawingScale />
      <AnnotationSizePicker />
    </Panel>
  )
}
