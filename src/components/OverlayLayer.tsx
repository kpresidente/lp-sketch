import OverlayDefs from './overlay/OverlayDefs'
import PathPreviewsOverlay from './overlay/PathPreviewsOverlay'
import PersistentElementsOverlay from './overlay/PersistentElementsOverlay'
import ToolPreviewsOverlay from './overlay/ToolPreviewsOverlay'
import type { OverlayLayerProps } from './overlay/types'

export default function OverlayLayer(props: OverlayLayerProps) {
  return (
    <svg
      class="overlay-layer"
      aria-label="drawing-overlay"
      width={Math.max(1, props.project.pdf.widthPt)}
      height={Math.max(1, props.project.pdf.heightPt)}
    >
      <PersistentElementsOverlay {...props} />
      <PathPreviewsOverlay {...props} />
      <ToolPreviewsOverlay {...props} viewZoom={props.project.view.zoom} />
      <OverlayDefs />
    </svg>
  )
}
