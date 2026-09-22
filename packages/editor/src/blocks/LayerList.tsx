import { For, Show } from 'solid-js'
import type { LayerId } from '@lp-sketch/core/types/project'
import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

const LAYER_OPTIONS: Array<{ id: LayerId; label: string }> = [
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'downleads', label: 'Downleads' },
  { id: 'grounding', label: 'Grounding' },
  { id: 'annotation', label: 'Annotation' },
]

/** Block: layer and sublayer visibility. Landmark: a group named "Layers". */
export default function LayerList() {
  const props = useAppController()

  return (
    <div class="block" data-block="layers" role="group" aria-label="Layers">
      <div class="section-label">Layers <SectionHelp anchor="help-layers" /></div>
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
                    props.onSetLayerSublayerVisible('connections', !props.project.layers.sublayers.connections)}
                />
              </div>
            </Show>
          </>
        )}
      </For>
    </div>
  )
}
