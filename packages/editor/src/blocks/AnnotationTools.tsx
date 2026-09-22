import { SectionHelp } from '../components/SectionHelp'
import { SymbolButton, ToolButton } from './toolButtons'

/** Block: the annotation tools. Landmark: a group named "Annotation". */
export default function AnnotationTools() {
  return (
    <div class="block" data-block="annotation" role="group" aria-label="Annotation">
      <div class="section-label">Annotation <SectionHelp anchor="help-tools-annotation" /></div>
      <div class="btn-grid-3">
        <ToolButton tool="text" label="Text" />
        <ToolButton tool="dimension_text" label="Dim Text" title="Dimension Text" />
        <ToolButton tool="arrow" label="Arrow" />
        <ToolButton tool="legend" label="Legend" />
        <ToolButton tool="general_notes" label="Notes" title="General Notes" />
        <ToolButton tool="measure" label="Measure" />
        <ToolButton tool="measure_mark" label="Mark" />
        <SymbolButton symbol="break" label="Break" />
      </div>
    </div>
  )
}
