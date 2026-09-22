import type { DesignScale, MaterialColor, Selection } from '@lp-sketch/core/types/project'

/** User-facing names shared by the blocks that show the same state. */

export const MATERIAL_LABEL: Record<MaterialColor, string> = {
  green: 'Copper',
  blue: 'Aluminum',
  red: 'Grounding',
  purple: 'Bimetallic',
  cyan: 'Tinned',
}

export const MATERIAL_ABBR: Record<MaterialColor, string> = {
  green: 'Cu',
  blue: 'Al',
  red: 'Gnd',
  purple: 'Bi',
  cyan: 'Sn',
}

export type WireClass = 'class1' | 'class2'

export const CLASS_LABEL: Record<WireClass, string> = {
  class1: 'Class I',
  class2: 'Class II',
}

/** Short form a narrow shell may show in place of the full label. */
export const CLASS_SHORT_LABEL: Record<WireClass, string> = {
  class1: 'I',
  class2: 'II',
}

export const DESIGN_SCALE_OPTIONS: readonly DesignScale[] = ['small', 'medium', 'large']

export const DESIGN_SCALE_LABEL: Record<DesignScale, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

export const SELECTION_KIND_LABEL: Record<Selection['kind'], string> = {
  line: 'Line',
  arc: 'Arc',
  curve: 'Curve',
  symbol: 'Component',
  legend: 'Legend',
  general_note: 'General Notes',
  text: 'Text',
  dimension_text: 'Dim Text',
  arrow: 'Arrow',
  mark: 'Mark',
}
