import Panel from './Panel'
import ClassPicker from '../../../blocks/ClassPicker'
import MaterialPicker from '../../../blocks/MaterialPicker'

/** Classic's Material panel: the class and material blocks. */
export default function StylePanel() {
  return (
    <Panel label="Material">
      <ClassPicker />
      <MaterialPicker />
    </Panel>
  )
}
