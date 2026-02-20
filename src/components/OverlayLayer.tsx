import { ArcsOverlay } from './overlay/ArcsOverlay'
import ArrowsOverlay from './overlay/ArrowsOverlay'
import CurvesOverlay from './overlay/CurvesOverlay'
import DimensionTextsOverlay from './overlay/DimensionTextsOverlay'
import GeneralNotesOverlay from './overlay/GeneralNotesOverlay'
import LegendsOverlay from './overlay/LegendsOverlay'
import LinesOverlay from './overlay/LinesOverlay'
import MarksOverlay from './overlay/MarksOverlay'
import OverlayDefs from './overlay/OverlayDefs'
import PathPreviewsOverlay from './overlay/PathPreviewsOverlay'
import SymbolsOverlay from './overlay/SymbolsOverlay'
import TextsOverlay from './overlay/TextsOverlay'
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
      <ArcsOverlay {...props} />
      <CurvesOverlay {...props} />
      <LinesOverlay {...props} />
      <SymbolsOverlay {...props} />
      <LegendsOverlay {...props} />
      <GeneralNotesOverlay {...props} />
      <TextsOverlay {...props} />
      <DimensionTextsOverlay {...props} />
      <ArrowsOverlay {...props} />
      <MarksOverlay {...props} />
      <PathPreviewsOverlay {...props} />
      <ToolPreviewsOverlay {...props} viewZoom={props.project.view.zoom} />
      <OverlayDefs />
    </svg>
  )
}
