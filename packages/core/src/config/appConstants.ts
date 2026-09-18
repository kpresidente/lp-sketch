import type { LayerId } from '../types/project'
import type { SnapMarkerKind } from '../types/appRuntime'

export const ANNOTATION_LAYER_OPTIONS: Array<{ id: LayerId; label: string }> = [
  { id: 'annotation', label: 'Annotation' },
  { id: 'rooftop', label: 'Rooftop' },
  { id: 'downleads', label: 'Downleads' },
  { id: 'grounding', label: 'Grounding' },
]

export const SNAP_KIND_PRIORITY: Record<SnapMarkerKind, number> = {
  nearest: 0,
  endpoint: 1,
  basepoint: 1,
  mark: 1,
  intersection: 1,
  perpendicular: 1,
}
