import type { ReportDraft, ReportType } from '../../lib/reporting'
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REPRO_MAX_LENGTH,
  REPORT_TITLE_MAX_LENGTH,
} from '../../lib/reporting'

interface ReportDialogProps {
  draft: ReportDraft
  submitting: boolean
  errorMessage: string
  onSetType: (value: ReportType) => void
  onSetTitle: (value: string) => void
  onSetDetails: (value: string) => void
  onSetReproSteps: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export default function ReportDialog(props: ReportDialogProps) {
  return (
    <div
      class="dialog-backdrop"
      role="presentation"
      onClick={() => {
        if (!props.submitting) {
          props.onCancel()
        }
      }}
    >
      <div
        class="floating-input-dialog report-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Report issue"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !props.submitting) {
            event.preventDefault()
            props.onCancel()
          }
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !props.submitting) {
            event.preventDefault()
            props.onSubmit()
          }
        }}
      >
        <div class="floating-input-title">Report Issue / Feature</div>

        <div class="tb-field">
          <span class="tb-field-label">Type</span>
          <div class="tb-toggle-group report-type-group" role="radiogroup" aria-label="Report type">
            <button
              type="button"
              role="radio"
              class={`tb-toggle-btn ${props.draft.type === 'bug' ? 'active' : ''}`}
              aria-checked={props.draft.type === 'bug'}
              disabled={props.submitting}
              onClick={() => props.onSetType('bug')}
            >
              Bug
            </button>
            <button
              type="button"
              role="radio"
              class={`tb-toggle-btn ${props.draft.type === 'feature' ? 'active' : ''}`}
              aria-checked={props.draft.type === 'feature'}
              disabled={props.submitting}
              onClick={() => props.onSetType('feature')}
            >
              Feature
            </button>
          </div>
        </div>

        <div class="tb-field">
          <span class="tb-field-label">Title</span>
          <input
            class="input-field floating-input-field"
            type="text"
            maxlength={REPORT_TITLE_MAX_LENGTH}
            value={props.draft.title}
            placeholder="Short summary"
            aria-label="Report title"
            disabled={props.submitting}
            onInput={(event) => props.onSetTitle(event.currentTarget.value)}
            autofocus
          />
        </div>

        <div class="tb-field">
          <span class="tb-field-label">Details</span>
          <textarea
            class="input-field report-textarea"
            maxlength={REPORT_DETAILS_MAX_LENGTH}
            value={props.draft.details}
            placeholder="Describe what happened, or what you want to add."
            aria-label="Report details"
            disabled={props.submitting}
            onInput={(event) => props.onSetDetails(event.currentTarget.value)}
          />
        </div>

        <div class="tb-field">
          <span class="tb-field-label">Repro Steps (optional)</span>
          <textarea
            class="input-field report-textarea"
            maxlength={REPORT_REPRO_MAX_LENGTH}
            value={props.draft.reproSteps}
            placeholder="Step-by-step reproduction details"
            aria-label="Report reproduction steps"
            disabled={props.submitting}
            onInput={(event) => props.onSetReproSteps(event.currentTarget.value)}
          />
        </div>

        <div class="hint-line">Ctrl/Cmd + Enter to submit</div>

        {props.errorMessage && <span class="tb-error">{props.errorMessage}</span>}

        <div class="btn-row">
          <button class="btn btn-sm btn-primary" type="button" disabled={props.submitting} onClick={props.onSubmit}>
            {props.submitting ? 'Submitting...' : 'Submit'}
          </button>
          <button class="btn btn-sm" type="button" disabled={props.submitting} onClick={props.onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
