import { buildLegendItemsFromSymbols } from '../lib/legend'
import type { LpProject } from '../types/project'

export function syncLegendItems(project: LpProject) {
  project.legend.items = buildLegendItemsFromSymbols(project)
}
