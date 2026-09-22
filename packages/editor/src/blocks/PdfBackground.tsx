import { Show } from 'solid-js'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

/** Block: PDF background transparency. Landmark: a group named "PDF background". */
export default function PdfBackground() {
  const props = useAppController()
  const transparencyPercent = () => `${Math.round(props.pdfTransparency * 100)}%`

  return (
    <div class="block" data-block="pdf-background" role="group" aria-label="PDF background">
      <div class="section-label">PDF Background <SectionHelp anchor="help-project-pdf-background" /></div>
      <div class="transparency-row">
        <span class="transparency-label">Transparency</span>
        <input
          class="transparency-slider"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={props.pdfTransparency}
          aria-label="PDF background transparency"
          title={props.hasPdf ? 'Adjust PDF background transparency' : 'Import a PDF to enable transparency control'}
          disabled={!props.hasPdf}
          onInput={(event) => props.onPreviewPdfTransparency(Number.parseFloat(event.currentTarget.value))}
          onChange={(event) => props.onCommitPdfTransparency(Number.parseFloat(event.currentTarget.value))}
        />
        <span class="transparency-value">{transparencyPercent()}</span>
      </div>
      <Show when={!props.hasPdf}>
        <div class="hint-line">Import a PDF to enable transparency control.</div>
      </Show>
    </div>
  )
}
