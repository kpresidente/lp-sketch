import { For } from 'solid-js'
import Panel from './Panel'
import type { LayerId } from '../../types/project'
import { useAppController } from '../../context/AppControllerContext'

const LAYER_OPTIONS: Array<{ id: LayerId; label: string }> = [
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'downleads', label: 'Downleads' },
  { id: 'grounding', label: 'Grounding' },
  { id: 'annotation', label: 'Annotation' },
]

export default function LayersPanel() {
  const props = useAppController()
  return (
    <Panel label="Layers">
      <For each={LAYER_OPTIONS}>
        {(layer) => (
          <div class="toggle-row">
            <span class="toggle-label">{layer.label}</span>
            <button
              type="button"
              role="switch"
              aria-label={`${layer.label} layer`}
              title={`${props.project.layers[layer.id] ? 'Hide' : 'Show'} ${layer.label} layer`}
              aria-checked={props.project.layers[layer.id]}
              class={`toggle-switch ${props.project.layers[layer.id] ? 'on' : ''}`}
              onClick={() => props.onSetLayerVisible(layer.id, !props.project.layers[layer.id])}
            />
          </div>
        )}
      </For>
    </Panel>
  )
}
