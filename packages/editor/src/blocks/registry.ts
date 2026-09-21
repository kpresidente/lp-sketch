/**
 * Required blocks. Every registered shell must mount each of these or waive it
 * with a reason in `shells/registry.ts`; `shells/shells.coverage.test.tsx`
 * enforces that. The role and accessible name are the block's contract with
 * shells, tests, and the manual, so changing either is a breaking change.
 */
export type BlockId =
  | 'project'
  | 'tools'
  | 'components'
  | 'material'
  | 'scale'
  | 'layers'
  | 'status'
  | 'properties'
  | 'quick-access'
  | 'theme'

export interface BlockRegistration {
  id: BlockId
  /** ARIA role the mounted block exposes. */
  role: string
  /** Accessible name of that role, when the role alone would be ambiguous. */
  name?: string
  /** Where the block is implemented today, relative to `packages/editor/src`. */
  source: string
}

export const REQUIRED_BLOCKS: readonly BlockRegistration[] = [
  { id: 'project', role: 'region', name: 'Project', source: 'components/sidebar/ProjectPanel.tsx' },
  { id: 'tools', role: 'region', name: 'Tools', source: 'components/sidebar/ToolsPanel.tsx' },
  { id: 'components', role: 'region', name: 'Components', source: 'components/sidebar/ComponentsPanel.tsx' },
  { id: 'material', role: 'region', name: 'Material', source: 'components/sidebar/StylePanel.tsx' },
  { id: 'scale', role: 'region', name: 'Scale', source: 'components/sidebar/ScalePanel.tsx' },
  { id: 'layers', role: 'region', name: 'Layers', source: 'components/sidebar/LayersPanel.tsx' },
  { id: 'status', role: 'status', source: 'components/sidebar/StatusMessages.tsx' },
  { id: 'properties', role: 'toolbar', name: 'Properties', source: 'components/PropertiesBar.tsx' },
  { id: 'quick-access', role: 'toolbar', name: 'Quick access', source: 'components/QuickAccessBar.tsx' },
  { id: 'theme', role: 'radiogroup', name: 'Theme', source: 'components/ThemePicker.tsx' },
]
