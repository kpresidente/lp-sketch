import type {
  ArcElement,
  ArrowElement,
  CurveElement,
  DimensionTextElement,
  GeneralNotePlacement,
  LayerId,
  LayerSublayerId,
  LegendPlacement,
  LineElement,
  LpProject,
  MarkElement,
  Selection,
  SymbolElement,
  TextElement,
} from '../../types/project'
import {
  annotationScaleFactor,
  scaledLegendMetrics,
  textLineHeightPxForScale,
  wireStrokeWidthForScale,
} from '../annotationScale'
import { dimensionLabelWidthPx, dimensionTextLabel } from '../dimensionText'
import { generalNotesBoxSize, resolvedGeneralNotesForPage } from '../generalNotes'
import { conductorLayer, symbolLayer, symbolSublayer } from '../layers'
import { buildLegendItemsFromSymbols } from '../legend'
import { buildLegendDisplayEntries } from '../legendDisplay'
import { legendBoxSize } from '../legendUi'
import { textBlockApproxHeightPx, textBlockApproxWidthPx } from '../textLayout'

export type ZOrderDirection = 'front' | 'back'

type ZOrderCollectionEntry = { id: string; page?: number; zIndex?: number }

type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type DrawEntryBase<K extends Selection['kind'], T extends ZOrderCollectionEntry> = {
  kind: K
  id: string
  item: T
  selection: Extract<Selection, { kind: K }>
  layerId: LayerId
  sublayerId: LayerSublayerId | null
  page: number
  defaultSort: number
}

export type ProjectDrawOrderEntry =
  | DrawEntryBase<'arc', ArcElement>
  | DrawEntryBase<'curve', CurveElement>
  | DrawEntryBase<'line', LineElement>
  | DrawEntryBase<'symbol', SymbolElement>
  | DrawEntryBase<'legend', LegendPlacement>
  | DrawEntryBase<'general_note', GeneralNotePlacement>
  | DrawEntryBase<'text', TextElement>
  | DrawEntryBase<'dimension_text', DimensionTextElement>
  | DrawEntryBase<'arrow', ArrowElement>
  | DrawEntryBase<'mark', MarkElement>

const DEFAULT_Z_INDEX_OFFSET = 1_000_000_000
const DEFAULT_RANK_SPACING = 1_000_000

const DEFAULT_KIND_RANK: Record<ProjectDrawOrderEntry['kind'], number> = {
  arc: 0,
  curve: 1,
  line: 2,
  symbol: 3,
  legend: 4,
  general_note: 5,
  text: 6,
  dimension_text: 7,
  arrow: 8,
  mark: 9,
}

const SYMBOL_BOUNDS_RADIUS = 18
const GROUND_ROD_BOUNDS_RADIUS = 38
const MARK_BOUNDS_RADIUS = 8
const ARROW_HEAD_BOUNDS_PADDING = 10

function entryPage(entry: { page?: number }): number {
  return entry.page ?? 1
}

function selectionKey(selection: Selection): string {
  return `${selection.kind}:${selection.id}`
}

function entryScopeKey(entry: ProjectDrawOrderEntry): string {
  return `${entry.page}:${entry.layerId}`
}

function effectiveZIndex(entry: ProjectDrawOrderEntry): number {
  return Number.isFinite(entry.item.zIndex)
    ? entry.item.zIndex ?? 0
    : DEFAULT_Z_INDEX_OFFSET + entry.defaultSort
}

function compareDrawEntries(a: ProjectDrawOrderEntry, b: ProjectDrawOrderEntry): number {
  const zIndexDelta = effectiveZIndex(a) - effectiveZIndex(b)
  if (zIndexDelta !== 0) {
    return zIndexDelta
  }

  return a.defaultSort - b.defaultSort
}

function expandedBounds(bounds: Bounds, padding: number): Bounds {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  }
}

function boundsFromPoints(
  points: readonly { x: number; y: number }[],
  padding = 0,
): Bounds {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  return expandedBounds({ minX, minY, maxX, maxY }, padding)
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

function entryBounds(
  projectState: LpProject,
  entry: ProjectDrawOrderEntry,
  designScale: number,
): Bounds {
  switch (entry.kind) {
    case 'arc':
      return boundsFromPoints(
        [entry.item.start, entry.item.through, entry.item.end],
        wireStrokeWidthForScale(entry.item.class, designScale) / 2,
      )
    case 'curve':
      return boundsFromPoints(
        [entry.item.start, entry.item.through, entry.item.end],
        wireStrokeWidthForScale(entry.item.class, designScale) / 2,
      )
    case 'line':
      return boundsFromPoints(
        [entry.item.start, entry.item.end],
        wireStrokeWidthForScale(entry.item.class, designScale) / 2,
      )
    case 'arrow':
      return boundsFromPoints([entry.item.tail, entry.item.head], ARROW_HEAD_BOUNDS_PADDING * designScale)
    case 'symbol': {
      const radius = (entry.item.symbolType === 'ground_rod' ? GROUND_ROD_BOUNDS_RADIUS : SYMBOL_BOUNDS_RADIUS) * designScale
      return expandedBounds(
        {
          minX: entry.item.position.x,
          minY: entry.item.position.y,
          maxX: entry.item.position.x,
          maxY: entry.item.position.y,
        },
        radius,
      )
    }
    case 'legend': {
      const metrics = scaledLegendMetrics(designScale)
      const entries = buildLegendDisplayEntries(
        projectState,
        entry.item,
        buildLegendItemsFromSymbols(projectState),
      )
      const size = legendBoxSize(entries, designScale, {
        title: 'Legend',
        ...metrics,
      })
      return {
        minX: entry.item.position.x,
        minY: entry.item.position.y,
        maxX: entry.item.position.x + size.width,
        maxY: entry.item.position.y + size.height,
      }
    }
    case 'general_note': {
      const notes = resolvedGeneralNotesForPage(projectState, entry.page)
      const size = generalNotesBoxSize(notes, designScale)
      return {
        minX: entry.item.position.x,
        minY: entry.item.position.y,
        maxX: entry.item.position.x + size.width,
        maxY: entry.item.position.y + size.height,
      }
    }
    case 'text':
      return {
        minX: entry.item.position.x,
        minY: entry.item.position.y,
        maxX: entry.item.position.x + textBlockApproxWidthPx(entry.item.text, designScale),
        maxY: entry.item.position.y + textBlockApproxHeightPx(entry.item.text, designScale),
      }
    case 'dimension_text': {
      const label = dimensionTextLabel(entry.item, projectState.scale)
      const labelWidth = dimensionLabelWidthPx(label, designScale, 14 * designScale)
      const labelHeight = textLineHeightPxForScale(designScale)
      const labelBounds = {
        minX: entry.item.position.x - labelWidth / 2,
        minY: entry.item.position.y - labelHeight / 2,
        maxX: entry.item.position.x + labelWidth / 2,
        maxY: entry.item.position.y + labelHeight / 2,
      }

      if (!entry.item.showLinework) {
        return labelBounds
      }

      const lineworkBounds = boundsFromPoints([entry.item.start, entry.item.end, entry.item.position])
      return {
        minX: Math.min(labelBounds.minX, lineworkBounds.minX),
        minY: Math.min(labelBounds.minY, lineworkBounds.minY),
        maxX: Math.max(labelBounds.maxX, lineworkBounds.maxX),
        maxY: Math.max(labelBounds.maxY, lineworkBounds.maxY),
      }
    }
    case 'mark':
      return expandedBounds(
        {
          minX: entry.item.position.x,
          minY: entry.item.position.y,
          maxX: entry.item.position.x,
          maxY: entry.item.position.y,
        },
        MARK_BOUNDS_RADIUS * designScale,
      )
  }
}

function makeEntry<K extends ProjectDrawOrderEntry['kind'], T extends ZOrderCollectionEntry>(
  kind: K,
  item: T,
  collectionIndex: number,
  layerId: LayerId,
  sublayerId: LayerSublayerId | null,
): DrawEntryBase<K, T> {
  return {
    kind,
    id: item.id,
    item,
    selection: { kind, id: item.id } as Extract<Selection, { kind: K }>,
    layerId,
    sublayerId,
    page: entryPage(item),
    defaultSort: DEFAULT_KIND_RANK[kind] * DEFAULT_RANK_SPACING + collectionIndex,
  }
}

export function projectDrawOrderEntries(
  projectState: LpProject,
  options: { includeMarks?: boolean } = {},
): ProjectDrawOrderEntry[] {
  const entries: ProjectDrawOrderEntry[] = []

  projectState.elements.arcs.forEach((arc, index) => {
    entries.push(makeEntry('arc', arc, index, conductorLayer(arc.color), null))
  })
  projectState.elements.curves.forEach((curve, index) => {
    entries.push(makeEntry('curve', curve, index, conductorLayer(curve.color), null))
  })
  projectState.elements.lines.forEach((line, index) => {
    entries.push(makeEntry('line', line, index, conductorLayer(line.color), null))
  })
  projectState.elements.symbols.forEach((symbol, index) => {
    entries.push(makeEntry('symbol', symbol, index, symbolLayer(symbol.symbolType), symbolSublayer(symbol.symbolType)))
  })
  projectState.legend.placements.forEach((placement, index) => {
    entries.push(makeEntry('legend', placement, index, 'annotation', null))
  })
  projectState.generalNotes.placements.forEach((placement, index) => {
    entries.push(makeEntry('general_note', placement, index, 'annotation', null))
  })
  projectState.elements.texts.forEach((text, index) => {
    entries.push(makeEntry('text', text, index, text.layer, null))
  })
  projectState.elements.dimensionTexts.forEach((dimensionText, index) => {
    entries.push(makeEntry('dimension_text', dimensionText, index, dimensionText.layer, null))
  })
  projectState.elements.arrows.forEach((arrow, index) => {
    entries.push(makeEntry('arrow', arrow, index, arrow.layer, null))
  })
  if (options.includeMarks) {
    projectState.construction.marks.forEach((mark, index) => {
      entries.push(makeEntry('mark', mark, index, 'annotation', null))
    })
  }

  return entries.sort(compareDrawEntries)
}

function hasMovableSelectionInOrderedEntries(
  entries: ProjectDrawOrderEntry[],
  selectedKeys: ReadonlySet<string>,
  direction: ZOrderDirection,
): boolean {
  if (entries.length < 2 || selectedKeys.size === 0) {
    return false
  }

  if (direction === 'front') {
    for (let index = 0; index < entries.length - 1; index += 1) {
      const current = entries[index]
      const next = entries[index + 1]
      if (current && next && selectedKeys.has(selectionKey(current.selection)) && !selectedKeys.has(selectionKey(next.selection))) {
        return true
      }
    }
    return false
  }

  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1]
    const current = entries[index]
    if (current && previous && selectedKeys.has(selectionKey(current.selection)) && !selectedKeys.has(selectionKey(previous.selection))) {
      return true
    }
  }
  return false
}

function moveSelectionEntriesByStep(
  entries: ProjectDrawOrderEntry[],
  selectedKeys: ReadonlySet<string>,
  direction: ZOrderDirection,
): ProjectDrawOrderEntry[] | null {
  if (!hasMovableSelectionInOrderedEntries(entries, selectedKeys, direction)) {
    return null
  }

  const original = entries.slice()
  const next = original.slice()

  if (direction === 'front') {
    for (let index = 0; index < original.length - 1; index += 1) {
      const current = original[index]
      const following = original[index + 1]
      if (!current || !following) {
        continue
      }
      if (!selectedKeys.has(selectionKey(current.selection)) || selectedKeys.has(selectionKey(following.selection))) {
        continue
      }

      next[index] = following
      next[index + 1] = current
    }
  } else {
    for (let index = 1; index < original.length; index += 1) {
      const previous = original[index - 1]
      const current = original[index]
      if (!previous || !current) {
        continue
      }
      if (!selectedKeys.has(selectionKey(current.selection)) || selectedKeys.has(selectionKey(previous.selection))) {
        continue
      }

      next[index - 1] = current
      next[index] = previous
    }
  }

  return next
}

function overlappingMovementEntries(
  projectState: LpProject,
  entries: ProjectDrawOrderEntry[],
  selectedKeys: ReadonlySet<string>,
  designScale: number,
): ProjectDrawOrderEntry[] {
  const selectedBounds = entries
    .filter((entry) => selectedKeys.has(selectionKey(entry.selection)))
    .map((entry) => entryBounds(projectState, entry, designScale))

  if (selectedBounds.length === 0) {
    return []
  }

  return entries.filter((entry) => {
    if (selectedKeys.has(selectionKey(entry.selection))) {
      return true
    }

    const bounds = entryBounds(projectState, entry, designScale)
    return selectedBounds.some((selected) => boundsIntersect(bounds, selected))
  })
}

function selectedKeysByScope(
  orderedEntries: ProjectDrawOrderEntry[],
  selections: readonly Selection[],
): Map<string, Set<string>> {
  const entriesBySelection = new Map(orderedEntries.map((entry) => [selectionKey(entry.selection), entry]))
  const grouped = new Map<string, Set<string>>()

  for (const selection of selections) {
    const entry = entriesBySelection.get(selectionKey(selection))
    if (!entry) {
      continue
    }

    const scopeKey = entryScopeKey(entry)
    const existing = grouped.get(scopeKey)
    if (existing) {
      existing.add(selectionKey(selection))
      continue
    }

    grouped.set(scopeKey, new Set([selectionKey(selection)]))
  }

  return grouped
}

export function canMoveSelectionsByZStep(
  projectState: LpProject,
  selections: readonly Selection[],
  direction: ZOrderDirection,
): boolean {
  if (selections.length === 0) {
    return false
  }

  const orderedEntries = projectDrawOrderEntries(projectState, { includeMarks: true })
  const grouped = selectedKeysByScope(orderedEntries, selections)
  const designScale = annotationScaleFactor(projectState.settings.designScale)

  for (const [scopeKey, selectedKeys] of grouped) {
    const scopedEntries = orderedEntries.filter((entry) => entryScopeKey(entry) === scopeKey)
    const movementEntries = overlappingMovementEntries(projectState, scopedEntries, selectedKeys, designScale)
    if (hasMovableSelectionInOrderedEntries(movementEntries, selectedKeys, direction)) {
      return true
    }
  }

  return false
}

export function moveSelectionsByZStep(
  draft: LpProject,
  selections: readonly Selection[],
  direction: ZOrderDirection,
): boolean {
  if (selections.length === 0) {
    return false
  }

  let orderedEntries = projectDrawOrderEntries(draft, { includeMarks: true })
  const grouped = selectedKeysByScope(orderedEntries, selections)
  const designScale = annotationScaleFactor(draft.settings.designScale)
  let moved = false

  for (const [scopeKey, selectedKeys] of grouped) {
    const scopedEntries = orderedEntries.filter((entry) => entryScopeKey(entry) === scopeKey)
    const movementEntries = overlappingMovementEntries(draft, scopedEntries, selectedKeys, designScale)
    const movedMovementEntries = moveSelectionEntriesByStep(movementEntries, selectedKeys, direction)
    if (!movedMovementEntries) {
      continue
    }

    const movementKeys = new Set(movementEntries.map((entry) => selectionKey(entry.selection)))
    let replacementIndex = 0
    orderedEntries = orderedEntries.map((entry) => {
      if (entryScopeKey(entry) !== scopeKey) {
        return entry
      }

      if (!movementKeys.has(selectionKey(entry.selection))) {
        return entry
      }

      const replacement = movedMovementEntries[replacementIndex]
      replacementIndex += 1
      return replacement ?? entry
    })
    moved = true
  }

  if (!moved) {
    return false
  }

  orderedEntries.forEach((entry, index) => {
    entry.item.zIndex = index
  })
  return true
}

export function canMoveSelectionToZEdge(
  projectState: LpProject,
  selection: Selection | null,
  direction: ZOrderDirection,
): boolean {
  return selection ? canMoveSelectionsByZStep(projectState, [selection], direction) : false
}

export function moveSelectionToZEdge(
  draft: LpProject,
  selection: Selection,
  direction: ZOrderDirection,
): boolean {
  return moveSelectionsByZStep(draft, [selection], direction)
}
