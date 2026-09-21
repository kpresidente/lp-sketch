/**
 * Required blocks. Every registered shell must mount each of these or waive it
 * with a reason in `shells/registry.ts`; `shells/shells.coverage.test.tsx`
 * enforces that. The role and accessible name are the block's contract with
 * shells, tests, and the manual, so changing either is a breaking change.
 *
 * Blocks own their captions and help anchors and make no layout assumptions;
 * a shell places them, and may restyle them under its own root class.
 */
export type BlockId =
  | 'mode'
  | 'history'
  | 'snapping'
  | 'annotation'
  | 'conductors'
  | 'air-terminals'
  | 'connections'
  | 'downleads'
  | 'penetrations'
  | 'grounding'
  | 'class'
  | 'material'
  | 'annotation-size'
  | 'stroke-summary'
  | 'layers'
  | 'project-name'
  | 'file'
  | 'export'
  | 'report'
  | 'pages'
  | 'pdf-background'
  | 'drawing-scale'
  | 'readouts'
  | 'status'
  | 'properties'
  | 'quick-access'
  | 'theme'
  | 'shell'

export interface BlockRegistration {
  id: BlockId
  /** ARIA role the mounted block exposes. */
  role: string
  /** Accessible name of that role, when the role alone would be ambiguous. */
  name?: string
  /** Where the block is implemented, relative to `packages/editor/src`. */
  source: string
}

export const REQUIRED_BLOCKS: readonly BlockRegistration[] = [
  { id: 'mode', role: 'group', name: 'Mode', source: 'blocks/ModeSwitch.tsx' },
  { id: 'history', role: 'group', name: 'History', source: 'blocks/HistoryControls.tsx' },
  { id: 'snapping', role: 'group', name: 'Snapping', source: 'blocks/SnappingControls.tsx' },
  { id: 'annotation', role: 'group', name: 'Annotation', source: 'blocks/AnnotationTools.tsx' },
  { id: 'conductors', role: 'group', name: 'Conductors', source: 'blocks/ConductorTools.tsx' },
  { id: 'air-terminals', role: 'group', name: 'Air Terminals', source: 'blocks/AirTerminalTools.tsx' },
  { id: 'connections', role: 'group', name: 'Connections', source: 'blocks/ConnectionTools.tsx' },
  { id: 'downleads', role: 'group', name: 'Downleads', source: 'blocks/DownleadTools.tsx' },
  { id: 'penetrations', role: 'group', name: 'Penetrations', source: 'blocks/PenetrationTools.tsx' },
  { id: 'grounding', role: 'group', name: 'Grounding', source: 'blocks/GroundingTools.tsx' },
  { id: 'class', role: 'group', name: 'Class', source: 'blocks/ClassPicker.tsx' },
  { id: 'material', role: 'radiogroup', name: 'Material', source: 'blocks/MaterialPicker.tsx' },
  { id: 'annotation-size', role: 'radiogroup', name: 'Annotation size', source: 'blocks/AnnotationSizePicker.tsx' },
  { id: 'stroke-summary', role: 'group', name: 'Stroke', source: 'blocks/StrokeSummary.tsx' },
  { id: 'layers', role: 'group', name: 'Layers', source: 'blocks/LayerList.tsx' },
  { id: 'project-name', role: 'group', name: 'Project name', source: 'blocks/ProjectName.tsx' },
  { id: 'file', role: 'group', name: 'File', source: 'blocks/FileActions.tsx' },
  { id: 'export', role: 'group', name: 'Export', source: 'blocks/ExportActions.tsx' },
  { id: 'report', role: 'group', name: 'Report', source: 'blocks/ReportActions.tsx' },
  { id: 'pages', role: 'group', name: 'Pages', source: 'blocks/PageNavigation.tsx' },
  { id: 'pdf-background', role: 'group', name: 'PDF background', source: 'blocks/PdfBackground.tsx' },
  { id: 'drawing-scale', role: 'group', name: 'Drawing scale', source: 'blocks/DrawingScale.tsx' },
  { id: 'readouts', role: 'group', name: 'Readouts', source: 'blocks/Readouts.tsx' },
  { id: 'status', role: 'status', source: 'blocks/StatusMessages.tsx' },
  { id: 'properties', role: 'toolbar', name: 'Properties', source: 'components/PropertiesBar.tsx' },
  { id: 'quick-access', role: 'toolbar', name: 'Quick access', source: 'components/QuickAccessBar.tsx' },
  { id: 'theme', role: 'radiogroup', name: 'Theme', source: 'blocks/ThemePicker.tsx' },
  { id: 'shell', role: 'radiogroup', name: 'Layout', source: 'blocks/ShellPicker.tsx' },
]
