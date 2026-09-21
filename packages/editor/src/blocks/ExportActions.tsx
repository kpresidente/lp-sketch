import { PROJECT_ACTION_ICON, tablerIconClass } from '../config/iconRegistry'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

/** Block: flattened exports. Landmark: a group named "Export". */
export default function ExportActions() {
  const props = useAppController()

  return (
    <div class="block" data-block="export" role="group" aria-label="Export">
      <div class="section-label">Export <SectionHelp anchor="help-project-export" /></div>
      <div class="btn-grid-3">
        <button class="btn" type="button" title="Export PNG" onClick={() => props.onExportImage('png')}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.exportPng)} /> PNG
        </button>
        <button class="btn" type="button" title="Export JPG" onClick={() => props.onExportImage('jpg')}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.exportJpg)} /> JPG
        </button>
        <button class="btn" type="button" title="Export PDF" onClick={props.onExportPdf}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.exportPdf)} /> PDF
        </button>
      </div>
    </div>
  )
}
