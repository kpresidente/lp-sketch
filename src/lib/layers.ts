import type { LayerId, LpProject, MaterialColor, SymbolType } from '../types/project'

const DOWNLEAD_SYMBOLS = new Set<SymbolType>([
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
])

const GROUNDING_SYMBOLS = new Set<SymbolType>([
  'ground_rod',
  'steel_bond',
])

export function symbolLayer(symbolType: SymbolType): LayerId {
  if (DOWNLEAD_SYMBOLS.has(symbolType)) {
    return 'downleads'
  }

  if (GROUNDING_SYMBOLS.has(symbolType)) {
    return 'grounding'
  }

  return 'rooftop'
}

export function conductorLayer(color: MaterialColor): LayerId {
  return color === 'red' ? 'grounding' : 'rooftop'
}

export function isLayerVisible(project: Pick<LpProject, 'layers'>, layer: LayerId): boolean {
  return project.layers[layer]
}

export function isSymbolVisible(project: Pick<LpProject, 'layers'>, symbolType: SymbolType): boolean {
  return isLayerVisible(project, symbolLayer(symbolType))
}

export function filterProjectByVisibleLayers(project: LpProject): LpProject {
  const rooftopVisible = project.layers.rooftop
  const downleadsVisible = project.layers.downleads
  const groundingVisible = project.layers.grounding
  const annotationVisible = project.layers.annotation

  if (rooftopVisible && downleadsVisible && groundingVisible && annotationVisible) {
    return project
  }

  const allowLayer = (layer: LayerId) => project.layers[layer]

  const symbolVisible = (symbolType: SymbolType): boolean => {
    const layer = symbolLayer(symbolType)
    if (layer === 'downleads') {
      return downleadsVisible
    }
    if (layer === 'grounding') {
      return groundingVisible
    }
    return rooftopVisible
  }

  return {
    ...project,
    elements: {
      ...project.elements,
      lines: project.elements.lines.filter((entry) => allowLayer(conductorLayer(entry.color))),
      arcs: project.elements.arcs.filter((entry) => allowLayer(conductorLayer(entry.color))),
      curves: project.elements.curves.filter((entry) => allowLayer(conductorLayer(entry.color))),
      symbols: project.elements.symbols.filter((entry) => symbolVisible(entry.symbolType)),
      texts: project.elements.texts.filter((entry) => allowLayer(entry.layer)),
      arrows: project.elements.arrows.filter((entry) => allowLayer(entry.layer)),
      dimensionTexts: project.elements.dimensionTexts.filter((entry) => allowLayer(entry.layer)),
    },
    construction: {
      ...project.construction,
      marks: annotationVisible ? project.construction.marks : [],
    },
    legend: {
      ...project.legend,
      placements: annotationVisible ? project.legend.placements : [],
    },
    generalNotes: {
      ...project.generalNotes,
      placements: annotationVisible ? project.generalNotes.placements : [],
    },
  }
}
