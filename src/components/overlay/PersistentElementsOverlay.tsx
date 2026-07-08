import { For } from 'solid-js'
import { projectDrawOrderEntries, type ProjectDrawOrderEntry } from '../../lib/selection/zOrder'
import { ArcsOverlay } from './ArcsOverlay'
import ArrowsOverlay from './ArrowsOverlay'
import CurvesOverlay from './CurvesOverlay'
import DimensionTextsOverlay from './DimensionTextsOverlay'
import GeneralNotesOverlay from './GeneralNotesOverlay'
import LegendsOverlay from './LegendsOverlay'
import LinesOverlay from './LinesOverlay'
import MarksOverlay from './MarksOverlay'
import SymbolsOverlay from './SymbolsOverlay'
import TextsOverlay from './TextsOverlay'
import type { OverlayLayerProps } from './types'

type PersistentElementsOverlayProps = Omit<
  OverlayLayerProps,
  | 'measurePathPreview'
  | 'markPathPreview'
  | 'linearAutoSpacingPathPreview'
  | 'linearAutoSpacingVertices'
  | 'linearAutoSpacingCorners'
  | 'arcChordPreview'
  | 'arcCurvePreview'
  | 'linePreview'
  | 'dimensionTextPreview'
  | 'directionPreview'
  | 'arrowPreview'
  | 'calibrationLinePreview'
  | 'snapPointPreview'
  | 'selectionHandlePreview'
  | 'selectionDebugLabel'
>

export default function PersistentElementsOverlay(props: PersistentElementsOverlayProps) {
  const projectForEntry = (entry: ProjectDrawOrderEntry): OverlayLayerProps['project'] => {
    const emptyElements = {
      ...props.project.elements,
      lines: [],
      arcs: [],
      curves: [],
      symbols: [],
      texts: [],
      arrows: [],
      dimensionTexts: [],
    }

    switch (entry.kind) {
      case 'arc':
        return { ...props.project, elements: { ...emptyElements, arcs: [entry.item] } }
      case 'curve':
        return { ...props.project, elements: { ...emptyElements, curves: [entry.item] } }
      case 'line':
        return { ...props.project, elements: { ...emptyElements, lines: [entry.item] } }
      case 'symbol':
        return { ...props.project, elements: { ...emptyElements, symbols: [entry.item] } }
      case 'legend':
        return {
          ...props.project,
          elements: emptyElements,
          legend: { ...props.project.legend, placements: [entry.item] },
          generalNotes: { ...props.project.generalNotes, placements: [] },
          construction: { ...props.project.construction, marks: [] },
        }
      case 'general_note':
        return {
          ...props.project,
          elements: emptyElements,
          legend: { ...props.project.legend, placements: [] },
          generalNotes: { ...props.project.generalNotes, placements: [entry.item] },
          construction: { ...props.project.construction, marks: [] },
        }
      case 'text':
        return { ...props.project, elements: { ...emptyElements, texts: [entry.item] } }
      case 'dimension_text':
        return { ...props.project, elements: { ...emptyElements, dimensionTexts: [entry.item] } }
      case 'arrow':
        return { ...props.project, elements: { ...emptyElements, arrows: [entry.item] } }
      case 'mark':
        return {
          ...props.project,
          elements: emptyElements,
          legend: { ...props.project.legend, placements: [] },
          generalNotes: { ...props.project.generalNotes, placements: [] },
          construction: { ...props.project.construction, marks: [entry.item] },
        }
      default:
        return { ...props.project, elements: emptyElements }
    }
  }

  const orderedEntries = () => projectDrawOrderEntries(props.project, { includeMarks: true })

  return (
    <For each={orderedEntries()}>
      {(entry) => {
        const entryProject = () => projectForEntry(entry)

        switch (entry.kind) {
          case 'arc':
            return <ArcsOverlay {...props} project={entryProject()} />
          case 'curve':
            return <CurvesOverlay {...props} project={entryProject()} />
          case 'line':
            return <LinesOverlay {...props} project={entryProject()} />
          case 'symbol':
            return <SymbolsOverlay {...props} project={entryProject()} />
          case 'legend':
            return <LegendsOverlay {...props} project={entryProject()} />
          case 'general_note':
            return <GeneralNotesOverlay {...props} project={entryProject()} />
          case 'text':
            return <TextsOverlay {...props} project={entryProject()} />
          case 'dimension_text':
            return <DimensionTextsOverlay {...props} project={entryProject()} />
          case 'arrow':
            return <ArrowsOverlay {...props} project={entryProject()} />
          case 'mark':
            return <MarksOverlay {...props} project={entryProject()} />
          default:
            return null
        }
      }}
    </For>
  )
}
