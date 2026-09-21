import { Show } from 'solid-js'
import { PROJECT_ACTION_ICON, tablerIconClass } from '../config/iconRegistry'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

/** Block: import, save, and load. Landmark: a group named "File". */
export default function FileActions() {
  const props = useAppController()
  let importPdfInput: HTMLInputElement | undefined
  let loadProjectInput: HTMLInputElement | undefined

  return (
    <div class="block" data-block="file" role="group" aria-label="File">
      <div class="section-label">File <SectionHelp anchor="help-project-file" /></div>
      <Show when={props.hasPdf}>
        <div class="file-status">
          <span class="dot" />
          {props.project.pdf.name} loaded
        </div>
      </Show>
      <div class="btn-grid-3">
        <button
          class="btn"
          type="button"
          title="Import PDF"
          onClick={() => {
            if (props.supportsNativeFileDialogs) {
              props.onImportPdfPicker()
              return
            }
            importPdfInput?.click()
          }}
        >
          <i class={tablerIconClass(PROJECT_ACTION_ICON.importPdf)} /> Import PDF
        </button>
        <Show when={!props.supportsNativeFileDialogs}>
          <input ref={importPdfInput} type="file" accept="application/pdf" onChange={props.onImportPdf} hidden />
        </Show>
        <button class="btn" type="button" title="Save Project" onClick={props.onSaveProject}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.saveProject)} /> Save
        </button>
        <button
          class="btn"
          type="button"
          title="Load Project"
          onClick={() => {
            if (props.supportsNativeFileDialogs) {
              props.onLoadProjectPicker()
              return
            }
            loadProjectInput?.click()
          }}
        >
          <i class={tablerIconClass(PROJECT_ACTION_ICON.loadProject)} /> Load
        </button>
        <Show when={!props.supportsNativeFileDialogs}>
          <input
            ref={loadProjectInput}
            type="file"
            accept=".lps,application/json,.json"
            onChange={props.onLoadProject}
            hidden
          />
        </Show>
      </div>
    </div>
  )
}
