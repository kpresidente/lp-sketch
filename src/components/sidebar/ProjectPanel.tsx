import { Show } from 'solid-js'
import Panel from './Panel'
import { PROJECT_ACTION_ICON, tablerIconClass } from '../../config/iconRegistry'
import { useAppController } from '../../context/AppControllerContext'

export default function ProjectPanel() {
  const props = useAppController()
  let importPdfInput: HTMLInputElement | undefined
  let loadProjectInput: HTMLInputElement | undefined
  const brightnessPercent = () => `${Math.round(props.pdfBrightness * 100)}%`

  return (
    <Panel label="Project">
      <div class="section-label">Name</div>
      <input
        class="input-field"
        value={props.project.projectMeta.name}
        placeholder="Project name..."
        onInput={(event) => props.onSetProjectName(event.currentTarget.value)}
      />

      <Show when={props.hasPdf}>
        <div class="file-status" style={{ "margin-bottom": "4px" }}>
          <span class="dot" />
          {props.project.pdf.name} loaded
        </div>
      </Show>

      <div class="section-label">File</div>
      <div class="btn-grid-3" style={{ "margin-bottom": "10px" }}>
        <button class="btn" type="button" title="Import PDF" onClick={() => importPdfInput?.click()}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.importPdf)} /> Import PDF
        </button>
        <input
          ref={importPdfInput}
          type="file"
          accept="application/pdf"
          onChange={props.onImportPdf}
          hidden
        />
        <button class="btn" type="button" title="Save Project" onClick={props.onSaveProject}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.saveProject)} /> Save
        </button>
        <button class="btn" type="button" title="Load Project" onClick={() => loadProjectInput?.click()}>
          <i class={tablerIconClass(PROJECT_ACTION_ICON.loadProject)} /> Load
        </button>
        <input
          ref={loadProjectInput}
          type="file"
          accept="application/json,.json"
          onChange={props.onLoadProject}
          hidden
        />
      </div>

      <div class="section-label">Export</div>
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

      <div class="section-label" style={{ "margin-top": "10px" }}>Report</div>
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

      <div class="section-label" style={{ "margin-top": "10px" }}>Pages</div>
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

      <div class="section-label" style={{ "margin-top": "10px" }}>PDF Background</div>
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
