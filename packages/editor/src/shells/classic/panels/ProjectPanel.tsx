import Panel from './Panel'
import ExportActions from '../../../blocks/ExportActions'
import FileActions from '../../../blocks/FileActions'
import PageNavigation from '../../../blocks/PageNavigation'
import PdfBackground from '../../../blocks/PdfBackground'
import ProjectName from '../../../blocks/ProjectName'
import ReportActions from '../../../blocks/ReportActions'
import ShellPicker from '../../../blocks/ShellPicker'
import ThemePicker from '../../../blocks/ThemePicker'

/** Classic's Project panel: the project, file, and device-preference blocks in their pre-shell order. */
export default function ProjectPanel() {
  return (
    <Panel label="Project">
      <ProjectName />
      <FileActions />
      <ExportActions />
      <ReportActions />
      <PageNavigation />
      <PdfBackground />
      <ThemePicker />
      <ShellPicker />
    </Panel>
  )
}
