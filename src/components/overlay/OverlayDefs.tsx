export default function OverlayDefs() {
  return (
    <defs>
      <marker id="preview-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L8,4 L0,8 z" fill="#1f2937" />
      </marker>
      <marker id="arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
      </marker>
    </defs>
  )
}
