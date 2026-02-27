import { Show } from 'solid-js'
import { ANNOTATION_LAYER_OPTIONS } from '../../config/appConstants'
import type { AnnotationEditState } from '../../types/appRuntime'
import type { LayerId } from '../../types/project'

interface AnnotationEditDialogProps {
  editor: AnnotationEditState
  onSetInput: (value: string) => void
  onSetLayer: (layer: LayerId) => void
  onApply: () => void
  onCancel: () => void
}

function dialogTitle(mode: AnnotationEditState['mode']): string {
  if (mode === 'text') {
    return 'Text'
  }

  if (mode === 'dimension_text') {
    return 'Dimension Text'
  }

  return 'Arrow'
}

export default function AnnotationEditDialog(props: AnnotationEditDialogProps) {
  const isTextMode = () => props.editor.mode === 'text'
  const isDimensionTextMode = () => props.editor.mode === 'dimension_text'

  return (
    <div
      class="floating-input-dialog"
      role="dialog"
      aria-modal="false"
      aria-label={`${dialogTitle(props.editor.mode)} editor`}
      style={{
        left: `${props.editor.screen.x}px`,
        top: `${props.editor.screen.y}px`,
      }}
    >
      <div class="floating-input-title">{dialogTitle(props.editor.mode)}</div>
      <Show when={isTextMode()}>
        <>
          <textarea
            class="input-field floating-input-field annotation-textarea"
            value={props.editor.input}
            onInput={(event) => props.onSetInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                props.onCancel()
                return
              }

              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                props.onApply()
              }
            }}
            autofocus
          />
          <div class="hint-line">Ctrl/Cmd + Enter to apply. Escape to cancel.</div>
          <div class="hint-line">Enter inserts a new line.</div>
        </>
      </Show>
      <Show when={isDimensionTextMode()}>
        <>
          <input
            class="input-field floating-input-field"
            type="text"
            value={props.editor.input}
            onInput={(event) => props.onSetInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                props.onApply()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                props.onCancel()
              }
            }}
            autofocus
          />
          <div class="hint-line">Enter to apply. Escape to cancel.</div>
          <div class="hint-line">Blank text uses measured value.</div>
        </>
      </Show>
      <div class="section-label">Layer</div>
      <div class="class-selector" role="radiogroup" aria-label="Annotation layer">
        {ANNOTATION_LAYER_OPTIONS.map((layerOption) => (
          <button
            class={`btn ${props.editor.layer === layerOption.id ? 'active' : ''}`}
            type="button"
            role="radio"
            aria-checked={props.editor.layer === layerOption.id}
            onClick={() => props.onSetLayer(layerOption.id)}
          >
            {layerOption.label}
          </button>
        ))}
      </div>
      <div class="btn-row">
        <button class="btn btn-sm" type="button" onClick={props.onApply}>
          Apply
        </button>
        <button class="btn btn-sm" type="button" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
