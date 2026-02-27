import { For, Show } from 'solid-js'
import Panel from './Panel'
import type { LayerId } from '../../types/project'
import { useAppController } from '../../context/AppControllerContext'
import { SectionHelp } from './SectionHelp'

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
      <div style={{ display: 'flex', "justify-content": 'flex-end', "margin-bottom": '2px' }}>
        <SectionHelp anchor="help-layers" />
      </div>
      <For each={LAYER_OPTIONS}>
        {(layer) => (
          <>
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
            <Show when={layer.id === 'rooftop'}>
              <div class="toggle-row toggle-row-sublayer">
                <span class="toggle-label">Connections</span>
                <button
                  type="button"
                  role="switch"
                  aria-label="Connections sublayer"
                  title={
                    !props.project.layers.rooftop
                      ? 'Enable Rooftop layer to toggle Connections'
                      : `${props.project.layers.sublayers.connections ? 'Hide' : 'Show'} Connections`
                  }
                  aria-checked={props.project.layers.rooftop && props.project.layers.sublayers.connections}
                  class={`toggle-switch ${
                    props.project.layers.rooftop && props.project.layers.sublayers.connections ? 'on' : ''
                  }`}
                  disabled={!props.project.layers.rooftop}
                  onClick={() =>
                    props.onSetLayerSublayerVisible(
                      'connections',
                      !props.project.layers.sublayers.connections,
                    )
                  }
                />
              </div>
            </Show>
          </>
        )}
      </For>
    </Panel>
  )
}
