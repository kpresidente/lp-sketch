import { buildAutoConnectorSymbols, stripAutoConnectorSymbols } from '../lib/autoConnectors'
import { buildLegendItemsFromSymbols } from '../lib/legend'
import type { LpProject } from '../types/project'

export function syncLegendItems(project: LpProject) {
  project.legend.items = buildLegendItemsFromSymbols(project)
}

export function syncAutoConnectors(project: LpProject) {
  const existingAutoConnectors = project.elements.symbols.filter((symbol) =>
    symbol.autoConnector &&
    (symbol.symbolType === 'cable_to_cable_connection' || symbol.symbolType === 'cadweld_connection'),
  )
  project.elements.symbols = stripAutoConnectorSymbols(project.elements.symbols)
  if (!project.settings.autoConnectorsEnabled) {
    return
  }

  const generatedAutoSymbols = buildAutoConnectorSymbols(project, project.settings.autoConnectorType)
  const existingById = new Map(existingAutoConnectors.map((symbol) => [symbol.id, symbol]))
  const nextAutoSymbols = generatedAutoSymbols.map((generated) => {
    const existing = existingById.get(generated.id)
    if (!existing) {
      return generated
    }

    // Preserve existing connector mode for stable points; only new points use current mode.
    return {
      ...existing,
      id: generated.id,
      position: generated.position,
      color: generated.color,
      class: generated.class,
      autoConnector: true,
    }
  })

  project.elements.symbols.push(...nextAutoSymbols)
}
