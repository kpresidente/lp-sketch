import { Show } from 'solid-js'
import Panel from './Panel'
import { PROJECT_ACTION_ICON, tablerIconClass } from '../../config/iconRegistry'
import { useAppController } from '../../context/AppControllerContext'
import { SectionHelp } from './SectionHelp'

export default function ProjectPanel() {
  const props = useAppController()
  let importPdfInput: HTMLInputElement | undefined
  let loadProjectInput: HTMLInputElement | undefined
  const brightnessPercent = () => `${Math.round(props.pdfBrightness * 100)}%`
  const handleEnterBlur = (event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    event.currentTarget.blur()
    props.onRefocusCanvasFromInputCommit()
  }

  return (
    <Panel label="Project">
      <div class="section-label">Name <SectionHelp anchor="help-project-name" /></div>
      <input
        class="input-field"
        value={props.project.projectMeta.name}
        placeholder="Project name..."
        onInput={(event) => props.onSetProjectName(event.currentTarget.value)}
        onKeyDown={handleEnterBlur}
      />

      <Show when={props.hasPdf}>
        <div class="file-status" style={{ "margin-bottom": "4px" }}>
          <span class="dot" />
          {props.project.pdf.name} loaded
        </div>
      </Show>

      <div class="section-label">File <SectionHelp anchor="help-project-file" /></div>
      <div class="btn-grid-3" style={{ "margin-bottom": "10px" }}>
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
          <input
            ref={importPdfInput}
            type="file"
            accept="application/pdf"
            onChange={props.onImportPdf}
            hidden
          />
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
            accept="application/json,.json"
            onChange={props.onLoadProject}
            hidden
          />
        </Show>
      </div>

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

      <div class="section-label" style={{ "margin-top": "10px" }}>Report <SectionHelp anchor="help-project-report" /></div>
      <div class="btn-grid-3">
        <button
          class="btn"
          type="button"
          title="Report a bug"
          onClick={() => props.onOpenReportDialog('bug')}
        >
          <i class={tablerIconClass(PROJECT_ACTION_ICON.reportBug)} /> Bug
        </button>
        <button
          class="btn"
          type="button"
          title="Request a feature"
          onClick={() => props.onOpenReportDialog('feature')}
        >
          <i class={tablerIconClass(PROJECT_ACTION_ICON.reportFeature)} /> Feature
        </button>
      </div>

      <div class="section-label" style={{ "margin-top": "10px" }}>Pages <SectionHelp anchor="help-project-pages" /></div>
      <div class="page-nav-row">
        <button
          class="btn page-nav-button"
          type="button"
          title="Previous page"
          onClick={props.onGoToPreviousPage}
          disabled={!props.hasPdf || !props.canGoToPreviousPage}
        >
          Back
        </button>
        <button
          class="btn page-nav-button"
          type="button"
          title="Next page"
          onClick={props.onGoToNextPage}
          disabled={!props.hasPdf || !props.canGoToNextPage}
        >
          Forward
        </button>
        <span class="page-nav-value">
          {props.currentPage} of {props.pageCount}
        </span>
      </div>

      <div class="section-label" style={{ "margin-top": "10px" }}>PDF Background <SectionHelp anchor="help-project-pdf-background" /></div>
      <div class="brightness-row">
        <span class="brightness-label">Brightness</span>
        <input
          class="brightness-slider"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={props.pdfBrightness}
          aria-label="PDF background brightness"
          title={props.hasPdf ? 'Adjust PDF background brightness' : 'Import a PDF to enable brightness control'}
          disabled={!props.hasPdf}
          onInput={(event) => props.onPreviewPdfBrightness(Number.parseFloat(event.currentTarget.value))}
          onChange={(event) => props.onCommitPdfBrightness(Number.parseFloat(event.currentTarget.value))}
        />
        <span class="brightness-value">{brightnessPercent()}</span>
      </div>
      {!props.hasPdf && (
        <div class="hint-line" style={{ "margin-bottom": "2px" }}>
          Import a PDF to enable brightness control.
        </div>
      )}
    </Panel>
  )
}
