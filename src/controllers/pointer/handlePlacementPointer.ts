import {
  angleDegrees,
  circularArcGeometryFromThreePoints,
  distance,
  quadraticControlPointForThrough,
  snapAngleDegrees,
} from '../../lib/geometry'
import { buildAutoConnectorSymbolsForAddedConductors } from '../../lib/autoConnectors'
import { isDownleadSymbolType } from '../../lib/conductorFootage'
import { DIRECTIONAL_SYMBOLS, classForSymbol, colorForSymbol } from '../../model/defaultProject'
import type {
  LpProject,
  Point,
  Selection,
  SymbolType,
  Tool,
} from '../../types/project'

interface HandlePlacementPointerDownContext {
  currentTool: Tool
  event: PointerEvent
  resolvedPoint: Point
  isLinearAutoSpacingSecondary: boolean
  isMeasureMarkSecondary: boolean
  project: () => LpProject
  createElementId: (prefix: string) => string
  commitProjectChange: (mutator: (draft: LpProject) => void) => void
  setStatus: (message: string) => void
  setError: (message: string) => void
  setSelected: (selection: Selection | null) => void
  lineStart: () => Point | null
  setLineStart: (point: Point | null) => void
  lineContinuous: () => boolean
  linePathCommittedDistancePt: () => number
  setLinePathCommittedDistancePt: (distancePt: number) => void
  dimensionStart: () => Point | null
  dimensionEnd: () => Point | null
  setDimensionStart: (point: Point | null) => void
  setDimensionEnd: (point: Point | null) => void
  dimensionShowLinework: () => boolean
  arcStart: () => Point | null
  arcEnd: () => Point | null
  setArcStart: (point: Point | null) => void
  setArcEnd: (point: Point | null) => void
  curveContinuous: () => boolean
  clearTargetDistanceSnapLock: () => void
  setMeasurePoints: (setter: (points: Point[]) => Point[]) => void
  applyLinearAutoSpacingInput: (point: Point, isSecondaryInput: boolean) => void
  applyMeasureMarkInput: (point: Point, isSecondaryInput: boolean) => void
  activeSymbol: () => SymbolType
  symbolDirectionStart: () => Point | null
  setSymbolDirectionStart: (point: Point | null) => void
  isLetteredSymbol: (symbolType: SymbolType) => boolean
  symbolLetterForPlacement: (symbolType: SymbolType) => string | undefined
  rememberAtLetterPlacement: (material: LpProject['settings']['activeColor'], letter: string) => void
  downleadPlacementVerticalFootageFt: () => number
  textDraftInput: () => string
  arrowStart: () => Point | null
  setArrowStart: (point: Point | null) => void
  pendingCalibrationDistancePt: () => number | null
  calibrationPoints: () => Point[]
  setCalibrationPoints: (points: Point[]) => void
  setPendingCalibrationDistancePt: (distancePt: number | null) => void
}

export function handlePlacementPointerDown(
  context: HandlePlacementPointerDownContext,
): boolean {
  const {
    currentTool,
    event,
    resolvedPoint,
  } = context

  if (currentTool === 'linear_auto_spacing') {
    if (context.isLinearAutoSpacingSecondary) {
      event.preventDefault()
    }
    context.applyLinearAutoSpacingInput(resolvedPoint, context.isLinearAutoSpacingSecondary)
    return true
  }

  if (currentTool === 'measure_mark') {
    if (context.isMeasureMarkSecondary) {
      event.preventDefault()
    }
    context.applyMeasureMarkInput(resolvedPoint, context.isMeasureMarkSecondary)
    return true
  }

  if (currentTool === 'line') {
    const start = context.lineStart()

    if (!start) {
      context.setLinePathCommittedDistancePt(0)
      context.setLineStart(resolvedPoint)
      context.setStatus('Line start point set.')
      return true
    }

    if (distance(start, resolvedPoint) < 0.01) {
      return true
    }

    const segmentDistancePt = distance(start, resolvedPoint)
    const lineId = context.createElementId('line')
    context.commitProjectChange((draft) => {
      draft.elements.lines.push({
        id: lineId,
        start,
        end: resolvedPoint,
        page: draft.view.currentPage,
        color: draft.settings.activeColor,
        class: draft.settings.activeClass,
      })

      const autoConnectors = buildAutoConnectorSymbolsForAddedConductors(
        draft,
        [{ kind: 'line', id: lineId }],
      )
      if (autoConnectors.length > 0) {
        draft.elements.symbols.push(...autoConnectors)
      }
    })

    context.setStatus('Line segment added.')

    if (context.lineContinuous()) {
      context.setLinePathCommittedDistancePt(
        context.linePathCommittedDistancePt() + segmentDistancePt,
      )
      context.setLineStart(resolvedPoint)
    } else {
      context.setLinePathCommittedDistancePt(0)
      context.setLineStart(null)
    }

    return true
  }

  if (currentTool === 'dimension_text') {
    const scale = context.project().scale
    if (!scale.isSet || !scale.realUnitsPerPoint) {
      context.setError('Set scale before placing dimension text.')
      return true
    }

    const start = context.dimensionStart()
    const end = context.dimensionEnd()

    if (!start) {
      context.setDimensionStart(resolvedPoint)
      context.setDimensionEnd(null)
      context.setStatus('Dimension start point set.')
      return true
    }

    if (!end) {
      if (distance(start, resolvedPoint) < 0.01) {
        context.setError('Dimension end must be different from the start point.')
        return true
      }

      context.setDimensionEnd(resolvedPoint)
      context.setStatus('Dimension span set. Click to place the dimension text.')
      return true
    }

    if (distance(end, resolvedPoint) < 0.01) {
      context.setError('Choose a placement point for the dimension text.')
      return true
    }

    const id = context.createElementId('dimension-text')
    context.commitProjectChange((draft) => {
      draft.elements.dimensionTexts.push({
        id,
        start,
        end,
        position: resolvedPoint,
        page: draft.view.currentPage,
        showLinework: context.dimensionShowLinework(),
        layer: 'annotation',
      })
    })

    context.setDimensionStart(null)
    context.setDimensionEnd(null)
    context.setSelected({ kind: 'dimension_text', id })
    context.setStatus('Dimension text placed.')
    return true
  }

  if (currentTool === 'arc') {
    const start = context.arcStart()
    const end = context.arcEnd()

    if (!start) {
      context.setArcStart(resolvedPoint)
      context.setArcEnd(null)
      context.setStatus('Arc endpoint 1 set.')
      return true
    }

    if (!end) {
      if (distance(start, resolvedPoint) < 0.01) {
        context.setError('Arc endpoint 2 must be different from endpoint 1.')
        return true
      }

      context.setArcEnd(resolvedPoint)
      context.setStatus('Arc endpoint 2 set. Move cursor and click to finish the arc.')
      return true
    }

    if (
      distance(end, resolvedPoint) < 0.01 ||
      distance(start, resolvedPoint) < 0.01
    ) {
      context.setError('Arc pull point must be different from both endpoints.')
      return true
    }

    if (!circularArcGeometryFromThreePoints(start, resolvedPoint, end)) {
      context.setError('Arc pull point cannot be collinear with endpoints.')
      return true
    }

    const arcId = context.createElementId('arc')
    context.commitProjectChange((draft) => {
      draft.elements.arcs.push({
        id: arcId,
        start,
        end,
        through: resolvedPoint,
        page: draft.view.currentPage,
        color: draft.settings.activeColor,
        class: draft.settings.activeClass,
      })

      const autoConnectors = buildAutoConnectorSymbolsForAddedConductors(
        draft,
        [{ kind: 'arc', id: arcId }],
      )
      if (autoConnectors.length > 0) {
        draft.elements.symbols.push(...autoConnectors)
      }
    })

    context.setArcStart(null)
    context.setArcEnd(null)
    context.setStatus('Arc added.')
    return true
  }

  if (currentTool === 'curve') {
    const start = context.arcStart()
    const throughPoint = context.arcEnd()

    if (!start) {
      context.setArcStart(resolvedPoint)
      context.setArcEnd(null)
      context.setStatus('Curve point 1 set.')
      return true
    }

    if (!throughPoint) {
      if (distance(start, resolvedPoint) < 0.01) {
        context.setError('Curve point 2 must be different from point 1.')
        return true
      }

      context.setArcEnd(resolvedPoint)
      context.setStatus('Curve point 2 set. Click point 3 to finish the curve.')
      return true
    }

    if (
      distance(throughPoint, resolvedPoint) < 0.01 ||
      distance(start, resolvedPoint) < 0.01
    ) {
      context.setError('Curve point 3 must be different from points 1 and 2.')
      return true
    }

    const control = quadraticControlPointForThrough(start, throughPoint, resolvedPoint)

    const curveId = context.createElementId('curve')
    context.commitProjectChange((draft) => {
      draft.elements.curves.push({
        id: curveId,
        start,
        end: resolvedPoint,
        through: control,
        page: draft.view.currentPage,
        color: draft.settings.activeColor,
        class: draft.settings.activeClass,
      })

      const autoConnectors = buildAutoConnectorSymbolsForAddedConductors(
        draft,
        [{ kind: 'curve', id: curveId }],
      )
      if (autoConnectors.length > 0) {
        draft.elements.symbols.push(...autoConnectors)
      }
    })

    if (context.curveContinuous()) {
      context.setArcStart(resolvedPoint)
    } else {
      context.setArcStart(null)
    }
    context.setArcEnd(null)
    context.setStatus('Curve added.')
    return true
  }

  if (currentTool === 'measure') {
    context.clearTargetDistanceSnapLock()
    context.setMeasurePoints((points) => [...points, resolvedPoint])
    context.setStatus('Measurement point added.')
    return true
  }

  if (currentTool === 'symbol') {
    const symbolType = context.activeSymbol()
    const directionStart = context.symbolDirectionStart()
    const letter = context.symbolLetterForPlacement(symbolType)
    if (context.isLetteredSymbol(symbolType) && !letter) {
      context.setError('Select an air terminal letter before placement.')
      return true
    }

    if (DIRECTIONAL_SYMBOLS.has(symbolType)) {
      if (!directionStart) {
        context.setSymbolDirectionStart(resolvedPoint)
        context.setStatus('Set direction with the next click.')
        return true
      }

      let direction = angleDegrees(directionStart, resolvedPoint)
      if (context.project().settings.angleSnapEnabled && !event.ctrlKey) {
        direction = snapAngleDegrees(direction, context.project().settings.angleIncrementDeg)
      }

      context.commitProjectChange((draft) => {
        const verticalFootageFt = isDownleadSymbolType(symbolType)
          ? context.downleadPlacementVerticalFootageFt()
          : undefined
        draft.elements.symbols.push({
          id: context.createElementId('symbol'),
          symbolType,
          position: directionStart,
          page: draft.view.currentPage,
          directionDeg: direction,
          verticalFootageFt,
          letter,
          color: colorForSymbol(symbolType, draft.settings.activeColor),
          class: classForSymbol(symbolType, draft.settings.activeClass),
        })
      })
      if (letter) {
        context.rememberAtLetterPlacement(context.project().settings.activeColor, letter)
      }

      context.setSymbolDirectionStart(null)
      context.setStatus('Directional symbol placed.')
      return true
    }

    context.commitProjectChange((draft) => {
      const verticalFootageFt = isDownleadSymbolType(symbolType)
        ? context.downleadPlacementVerticalFootageFt()
        : undefined
      draft.elements.symbols.push({
        id: context.createElementId('symbol'),
        symbolType,
        position: resolvedPoint,
        page: draft.view.currentPage,
        verticalFootageFt,
        letter,
        color: colorForSymbol(symbolType, draft.settings.activeColor),
        class: classForSymbol(symbolType, draft.settings.activeClass),
      })
    })
    if (letter) {
      context.rememberAtLetterPlacement(context.project().settings.activeColor, letter)
    }

    context.setStatus('Component placed.')
    return true
  }

  if (currentTool === 'legend') {
    const placementId = context.createElementId('legend')
    context.commitProjectChange((draft) => {
      draft.legend.placements.push({
        id: placementId,
        position: resolvedPoint,
        page: draft.view.currentPage,
        editedLabels: {},
      })
    })

    context.setSelected({ kind: 'legend', id: placementId })
    context.setStatus('Legend placed.')
    return true
  }

  if (currentTool === 'general_notes') {
    const placementId = context.createElementId('general-notes')
    context.commitProjectChange((draft) => {
      draft.generalNotes.placements.push({
        id: placementId,
        position: resolvedPoint,
        page: draft.view.currentPage,
      })
    })

    context.setSelected({ kind: 'general_note', id: placementId })
    context.setStatus('General notes placed.')
    return true
  }

  if (currentTool === 'text') {
    const nextText = context.textDraftInput().trim()
    if (nextText.length === 0) {
      context.setError('Enter text in the Text tool before placing.')
      return true
    }

    context.commitProjectChange((draft) => {
      draft.elements.texts.push({
        id: context.createElementId('text'),
        position: resolvedPoint,
        text: nextText,
        page: draft.view.currentPage,
        color: draft.settings.activeColor,
        layer: 'annotation',
      })
    })

    context.setStatus('Text note placed.')
    return true
  }

  if (currentTool === 'arrow') {
    const start = context.arrowStart()

    if (!start) {
      context.setArrowStart(resolvedPoint)
      context.setStatus('Arrow tail set. Click head point.')
      return true
    }

    if (distance(start, resolvedPoint) < 0.01) {
      context.setError('Arrow head must be different from tail.')
      return true
    }

    context.commitProjectChange((draft) => {
      draft.elements.arrows.push({
        id: context.createElementId('arrow'),
        tail: start,
        head: resolvedPoint,
        page: draft.view.currentPage,
        color: draft.settings.activeColor,
        layer: 'annotation',
      })
    })

    context.setArrowStart(null)
    context.setStatus('Arrow placed.')
    return true
  }

  if (currentTool === 'calibrate') {
    if (context.pendingCalibrationDistancePt() !== null) {
      context.setStatus('Apply or cancel current calibration before starting a new one.')
      return true
    }

    const points = context.calibrationPoints()

    if (points.length === 0) {
      context.setPendingCalibrationDistancePt(null)
      context.setCalibrationPoints([resolvedPoint])
      context.setStatus('Calibration start point set.')
      return true
    }

    const start = points[0]
    const end = resolvedPoint
    const pointDistance = distance(start, end)

    if (pointDistance <= 0.01) {
      context.setError('Calibration points must be different.')
      return true
    }

    context.setCalibrationPoints([])
    context.setPendingCalibrationDistancePt(pointDistance)
    context.setStatus('Calibration span set. Enter real distance and apply.')
    return true
  }

  return false
}
