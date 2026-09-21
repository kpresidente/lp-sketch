import { PROJECT_ACTION_ICON, tablerIconClass } from '../config/iconRegistry'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

/** Block: bug and feature reports. Landmark: a group named "Report". */
export default function ReportActions() {
  const props = useAppController()

  return (
    <div class="block" data-block="report" role="group" aria-label="Report">
      <div class="section-label">Report <SectionHelp anchor="help-project-report" /></div>
      <div class="btn-grid-3">
        <button class="btn" type="button" title="Report a bug" onClick={() => props.onOpenReportDialog('bug')}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.reportBug)} /> Bug
        </button>
        <button class="btn" type="button" title="Request a feature" onClick={() => props.onOpenReportDialog('feature')}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.reportFeature)} /> Feature
        </button>
      </div>
    </div>
  )
}
