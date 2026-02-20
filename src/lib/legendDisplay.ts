import { SYMBOL_LABELS } from '../model/defaultProject'
import type { LegendItem, LegendPlacement, LpProject, SymbolClass, SymbolType, WireClass } from '../types/project'
import { summarizeConductorFootage } from './conductorFootage'
import { LETTERED_SYMBOL_TYPES, MATERIAL_LABEL, legendItemKey, sortLegendItems } from './legend'

export type LegendSymbolKind = 'component' | 'conductor'

export interface LegendDisplayEntry {
  key: string
  symbolKind: LegendSymbolKind
  symbolType: SymbolType | null
  label: string
  countLabel: string
  color: LegendItem['color']
  class: SymbolClass
}

export function legendEditorItemName(entry: LegendDisplayEntry): string {
  if (entry.symbolKind === 'conductor') {
    const classLabel = entry.class === 'class2' ? 'Class II' : 'Class I'
    return `${classLabel} ${MATERIAL_LABEL[entry.color]} Conductor`
  }

  if (!entry.symbolType) {
    return 'Component'
  }

  const parts = entry.key.split('|')
  const letter = parts[3] ?? ''
  if (LETTERED_SYMBOL_TYPES.has(entry.symbolType) && letter) {
    return `${SYMBOL_LABELS[entry.symbolType]} ${letter}`
  }

  return SYMBOL_LABELS[entry.symbolType]
}

export function legendEditorBaseLabel(
  projectState: LpProject,
  entry: LegendDisplayEntry,
): string {
  if (entry.symbolKind === 'component') {
    const legendItem = projectState.legend.items.find((item) => legendItemKey(item) === entry.key)
    if (legendItem) {
      return legendItem.label
    }
  }

  return entry.label
}

function conductorCountLabel(
  project: LpProject,
  horizontalPt: number,
  verticalFt: number,
): string {
  const scale = project.scale
  if (!scale.isSet || !scale.realUnitsPerPoint) {
    if (horizontalPt > 1e-6) {
      return 'unscaled'
    }

    return `${Math.round(verticalFt)} ft`
  }

  const totalFeet = horizontalPt * scale.realUnitsPerPoint + verticalFt
  return `${Math.round(totalFeet)} ft`
}

function buildConductorRows(project: LpProject, placement: LegendPlacement): LegendDisplayEntry[] {
  const classLabel: Record<WireClass, string> = {
    class1: 'Class I',
    class2: 'Class II',
  }
  const summaries = summarizeConductorFootage(project)
  const rows: LegendDisplayEntry[] = []

  for (const summary of summaries) {
    if (!summary.hasHorizontal && !summary.hasVerticalCarrier) {
      continue
    }

    const key = `conductor|${summary.material}|${summary.wireClass}`
    const baseLabel = `${classLabel[summary.wireClass]} ${MATERIAL_LABEL[summary.material]} conductor footage`
    const editedLabel = placement.editedLabels[key]?.trim()
    rows.push({
      key,
      symbolKind: 'conductor',
      symbolType: null,
      label: editedLabel && editedLabel.length > 0 ? editedLabel : baseLabel,
      countLabel: conductorCountLabel(project, summary.horizontalPt, summary.verticalFt),
      color: summary.material,
      class: summary.wireClass,
    })
  }

  return rows
}

function buildSymbolRows(
  project: LpProject,
  items: LegendItem[],
  placement: LegendPlacement,
): LegendDisplayEntry[] {
  const classLabel: Record<SymbolClass, string> = {
    class1: 'Class I',
    class2: 'Class II',
    none: 'No Class',
  }
  const suffixes = project.legend.customSuffixes ?? {}

  const suffixKeyForItem = (item: LegendItem): string =>
    `${item.symbolType}|${item.letter ?? ''}`

  const withSuffix = (item: LegendItem): string => {
    const prefix = `${classLabel[item.class]} ${MATERIAL_LABEL[item.color]} ${item.label}`
    const suffix = suffixes[suffixKeyForItem(item)]?.trim()
    if (!suffix) {
      return prefix
    }
    return `${prefix} ${suffix}`
  }

  return sortLegendItems(items).map((item) => {
    const key = legendItemKey(item)
    const editedLabel = placement.editedLabels[key]?.trim()
    return {
      key,
      symbolKind: 'component',
      symbolType: item.symbolType,
      label: editedLabel && editedLabel.length > 0 ? editedLabel : withSuffix(item),
      countLabel: String(item.count),
      color: item.color,
      class: item.class,
    }
  })
}

export function buildLegendDisplayEntries(
  project: LpProject,
  placement: LegendPlacement,
  items: LegendItem[] = project.legend.items,
): LegendDisplayEntry[] {
  const conductorRows = buildConductorRows(project, placement)
  const symbolRows = buildSymbolRows(project, items, placement)
  return [...conductorRows, ...symbolRows]
}
