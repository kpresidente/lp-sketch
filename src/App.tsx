import {
  createEffect,
  createMemo,
  createSignal,
  on,
  Show,
} from 'solid-js'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './App.css'
import AppSidebar from './components/AppSidebar'
import CanvasStage from './components/CanvasStage'
import OverlayLayer from './components/OverlayLayer'
import PropertiesToolOptions from './components/PropertiesToolOptions'
import { createSidebarController } from './components/sidebar/createSidebarController'
import AnnotationEditDialog from './components/dialogs/AnnotationEditDialog'
import GeneralNotesDialog from './components/dialogs/GeneralNotesDialog'
import LegendLabelDialog from './components/dialogs/LegendLabelDialog'
import ReportDialog from './components/dialogs/ReportDialog'
import { AppControllerProvider } from './context/AppControllerContext'
import { createHelpState, HelpProvider } from './context/HelpContext'
import HelpDrawer from './components/help/HelpDrawer'
import { useGeneralNotesDialog } from './hooks/useGeneralNotesDialog'
import { useLegendLabelDialog } from './hooks/useLegendLabelDialog'
import { usePdfCanvasRenderer } from './hooks/usePdfCanvasRenderer'
import { useProjectFileActions } from './hooks/useProjectFileActions'
import { useProjectAutosave } from './hooks/useProjectAutosave'
import { useDialogResizeSync } from './hooks/useDialogResizeSync'
import { useGlobalAppShortcuts } from './hooks/useGlobalAppShortcuts'
import {
  resolveInputPoint as resolveInputPointEngine,
  snapReferencePointForTool as snapReferencePointForToolEngine,
} from './lib/snapping/resolveInputPoint'
import { resolveSnapPoint as resolveSnapPointEngine } from './lib/snapping/resolveSnapPoint'
import {
  curveThroughPoint as curveThroughPointEngine,
  directionalSymbolHandlePoint as directionalSymbolHandlePointEngine,
  hitTestSelectedHandle as hitTestSelectedHandleEngine,
  moveSelectionHandleByDelta as moveSelectionHandleByDeltaEngine,
  selectionHandlePointForProject as selectionHandlePointForProjectEngine,
} from './lib/selection/selectionHandles'
import { hitTest as hitTestEngine } from './lib/selection/hitTest'
import { moveSelectionsByDelta as moveSelectionsByDeltaEngine } from './lib/selection/moveSelection'
import {
  canMoveSelectionsByZStep,
  moveSelectionsByZStep,
} from './lib/selection/zOrder'
import { handlePlacementPointerDown } from './controllers/pointer/handlePlacementPointer'
import {
  handleContextSelectionPointerDown,
  handlePointerHover,
  handleSelectPointerDown,
} from './controllers/pointer/handleSelectPointer'
import {
  beginTouchSpacingPendingOnPointerDown,
  handleTouchSpacingPendingMove,
  handleTouchSpacingPendingPointerCancel,
  handleTouchSpacingPendingPointerUp,
} from './controllers/pointer/handleMeasurePointer'
import {
  handleTouchPointerDownForGesture,
  handleTouchPointerEndForGesture,
  handleTouchPointerMoveForGesture,
} from './controllers/pointer/handleGesturePointer'
import {
  annotationScaleFactor,
  approximateTextWidthForScale,
  scaledLegendMetrics,
  textFontSizePxForScale,
  textLineHeightPxForScale,
} from './lib/annotationScale'
import {
  circularArcPathFromThreePoints,
  clamp,
  distance,
  distanceToCircularArc,
  docToScreen,
  eventToScreenPoint,
  quadraticControlPointForThrough,
  screenToDoc,
} from './lib/geometry'
import {
  DEFAULT_AT_LETTER,
  LETTERED_SYMBOL_TYPES,
  defaultAtLetterByMaterial,
  legendSuffixKeyForVariant,
  normalizeSymbolLetter,
} from './lib/legend'
import {
  buildLegendDisplayEntries,
  type LegendDisplayEntry,
} from './lib/legendDisplay'
import { legendBoxSize, legendLineText } from './lib/legendUi'
import {
  GENERAL_NOTES_TITLE,
  MAX_GENERAL_NOTES_COUNT,
  resolvedGeneralNotesForPage,
} from './lib/generalNotes'
import {
  filterProjectByVisibleLayers,
  filterProjectByCurrentPage,
  conductorLayer,
  symbolLayer,
  symbolSublayer,
} from './lib/layers'
import { filterProjectByViewport, viewportDocRect } from './lib/viewportCulling'
import {
  isToolSelectionAllowed,
  symbolDisabledReasons,
  toolDisabledReasons,
} from './lib/componentAvailability'
import {
  isDownleadSymbolType,
  normalizeVerticalFootageFt,
  symbolVerticalFootageFt,
} from './lib/conductorFootage'
import { buildAutoConnectorSymbolsForAddedConductors } from './lib/autoConnectors'
import {
  dimensionTextLabel,
  normalizeDimensionOverrideText,
} from './lib/dimensionText'
import {
  computeArcAutoSpacingPoints,
  computeLinearAutoSpacingPoints,
  polylineLength,
  type CornerKind,
} from './lib/spacing'
import {
  hasSelection,
  selectionsKeySet,
} from './lib/selection'
import { cloneProject } from './lib/projectState'
import { clampPageNumber, normalizePageCount } from './lib/pageState'
import { realUnitsPerPointFromCalibrationSpan } from './lib/scale'
import {
  buildReportPayload,
  createDefaultReportDraft,
  normalizeReportDraft,
  submitReport,
  validateReportDraft,
  type ReportType,
} from './lib/reporting'
import {
  clampPdfBrightness,
  formatDistance,
  formatScaleFeet,
  normalizeNonNegativeIntegerInput,
  normalizePointerEvent,
  normalizeVerticalFootageInput,
  scaleFeetPerInch,
} from './lib/appUiHelpers'
import { applyRedo, applyUndo, pushHistorySnapshot } from './model/history'
import {
  COLOR_HEX,
  DIRECTIONAL_SYMBOLS,
  SYMBOL_LABELS,
  classForSymbol,
  colorForSymbol,
  createDefaultProject,
  createElementId,
} from './model/defaultProject'
import { syncLegendItems } from './model/projectSync'
import type {
  DimensionTextPreview,
  SelectionHandlePreview,
} from './components/overlay/types'
import type {
  AutoConnectorType,
  DataScope,
  DesignScale,
  LegendItem,
  LegendPlacement,
  LayerId,
  LayerSublayerId,
  LpProject,
  DimensionTextElement,
  MaterialColor,
  Point,
  Selection,
  SymbolType,
  Tool,
} from './types/project'
import type {
  AnnotationEditState,
  DragState,
  ResolveSnapPointOptions,
  ResolvedInputPoint,
  SelectionHandleTarget,
  SnapPointPreview,
  SnapResolution,
  TargetDistanceSnapLock,
  TouchGestureState,
  TouchSpacingPending,
} from './types/appRuntime'

GlobalWorkerOptions.workerSrc = pdfWorker

const MAX_HISTORY = 100
const TARGET_DISTANCE_SNAP_HOLD_MS = 1000
const TARGET_DISTANCE_SNAP_TOLERANCE_PX = 10
const TARGET_DISTANCE_SNAP_RELEASE_PX = 20

const TOOL_OPTIONS: Array<{ id: Tool; label: string }> = [
  { id: 'select', label: 'Select' },
  { id: 'multi_select', label: 'Multi-Select' },
  { id: 'line', label: 'Linear Conductor' },
  { id: 'arc', label: 'Arc Conductor' },
  { id: 'curve', label: 'Curve Conductor' },
  { id: 'linear_auto_spacing', label: 'Linear AT' },
  { id: 'arc_auto_spacing', label: 'Arc AT' },
  { id: 'symbol', label: 'Component' },
  { id: 'legend', label: 'Legend' },
  { id: 'general_notes', label: 'General Notes' },
  { id: 'text', label: 'Text' },
  { id: 'dimension_text', label: 'Dimension Text' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'measure', label: 'Measure' },
  { id: 'measure_mark', label: 'Mark' },
  { id: 'calibrate', label: 'Calibrate' },
  { id: 'pan', label: 'Pan' },
]

const SYMBOL_OPTIONS: SymbolType[] = [
  'air_terminal',
  'bonded_air_terminal',
  'bond',
  'cadweld_connection',
  'cadweld_crossrun_connection',
  'continued',
  'connect_existing',
  'mechanical_crossrun_connection',
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
  'through_roof_to_steel',
  'through_wall_connector',
  'ground_rod',
  'steel_bond',
  'cable_to_cable_connection',
]

const COLOR_OPTIONS: MaterialColor[] = ['green', 'blue', 'purple', 'red']
const LEGEND_TITLE = 'Legend'
const TOUCH_LONG_PRESS_MS = 360
const TOUCH_LONG_PRESS_MOVE_TOLERANCE_PX = 10
const SELECTION_HANDLE_HIT_TOLERANCE_PX = 12
const LINEAR_HIT_TIE_TOLERANCE_PX = 0.5
const ARC_AUTO_SPACING_HIT_TOLERANCE_PX = 12
const DIRECTION_HANDLE_LENGTH_PX = 34
const LEGEND_LABEL_DIALOG_FALLBACK_WIDTH_PX = 640
const LEGEND_LABEL_DIALOG_FALLBACK_HEIGHT_PX = 420
const GENERAL_NOTES_DIALOG_FALLBACK_WIDTH_PX = 720
const GENERAL_NOTES_DIALOG_FALLBACK_HEIGHT_PX = 420

interface ManualScaleInputSnapshot {
  inches: string
  feet: string
  signature: string
}

function formatScaleInputNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return ''
  }

  const rounded = Math.round(value * 10_000) / 10_000
  if (Number.isInteger(rounded)) {
    return String(rounded)
  }

  return String(rounded)
    .replace(/(\.\d*?[1-9])0+$/u, '$1')
    .replace(/\.0+$/u, '')
}

function normalizeScaleInputValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed)) {
    return trimmed
  }

  return formatScaleInputNumber(parsed)
}

function scaleInputSignature(scale: Pick<LpProject['scale'], 'isSet' | 'realUnitsPerPoint' | 'displayUnits'>): string {
  return [
    scale.isSet ? '1' : '0',
    scale.displayUnits ?? 'unset',
    scale.realUnitsPerPoint === null ? 'unset' : formatScaleInputNumber(scale.realUnitsPerPoint),
  ].join('|')
}

function deriveScaleInputValues(
  scale: Pick<LpProject['scale'], 'isSet' | 'realUnitsPerPoint' | 'displayUnits'>,
): { inches: string; feet: string } {
  if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
    return { inches: '', feet: '' }
  }

  return {
    inches: '1',
    feet: formatScaleInputNumber(scaleFeetPerInch(scale.realUnitsPerPoint, scale.displayUnits)),
  }
}

function App() {
  const [project, setProject] = createSignal<LpProject>(createDefaultProject())
  const [history, setHistory] = createSignal<{ past: LpProject[]; future: LpProject[] }>({
    past: [],
    future: [],
  })

  const helpState = createHelpState()

  const [tool, setTool] = createSignal<Tool>('select')
  const [activeSymbol, setActiveSymbol] = createSignal<SymbolType>('air_terminal')
  const [selected, setSelected] = createSignal<Selection | null>(null)
  const [multiSelection, setMultiSelection] = createSignal<Selection[]>([])
  const [hoveredSelection, setHoveredSelection] = createSignal<Selection | null>(null)

  const [dragState, setDragState] = createSignal<DragState | null>(null)
  const [cursorDoc, setCursorDoc] = createSignal<Point | null>(null)
  const [snapPointPreview, setSnapPointPreview] = createSignal<SnapPointPreview | null>(null)
  const [lineStart, setLineStart] = createSignal<Point | null>(null)
  const [linePathCommittedDistancePt, setLinePathCommittedDistancePt] = createSignal(0)
  const [arcStart, setArcStart] = createSignal<Point | null>(null)
  const [arcEnd, setArcEnd] = createSignal<Point | null>(null)
  const [lineContinuous, setLineContinuous] = createSignal(false)
  const [curveContinuous, setCurveContinuous] = createSignal(false)
  const [linearAutoSpacingVertices, setLinearAutoSpacingVertices] = createSignal<Point[]>([])
  const [linearAutoSpacingCorners, setLinearAutoSpacingCorners] = createSignal<CornerKind[]>([])
  const [linearAutoSpacingMaxInput, setLinearAutoSpacingMaxInput] = createSignal('20')
  const [arcAutoSpacingMaxInput, setArcAutoSpacingMaxInput] = createSignal('20')
  const [arcAutoSpacingTargetId, setArcAutoSpacingTargetId] = createSignal<string | null>(null)
  const [dimensionStart, setDimensionStart] = createSignal<Point | null>(null)
  const [dimensionEnd, setDimensionEnd] = createSignal<Point | null>(null)
  const [dimensionShowLinework, setDimensionShowLinework] = createSignal(true)
  const [measurePoints, setMeasurePoints] = createSignal<Point[]>([])
  const [markAnchor, setMarkAnchor] = createSignal<Point | null>(null)
  const [markCorners, setMarkCorners] = createSignal<Point[]>([])
  const [touchCornerMode, setTouchCornerMode] = createSignal<CornerKind>('outside')
  const [touchSpacingPending, setTouchSpacingPending] = createSignal<TouchSpacingPending | null>(null)
  const [touchGesture, setTouchGesture] = createSignal<TouchGestureState | null>(null)
  const [symbolDirectionStart, setSymbolDirectionStart] = createSignal<Point | null>(null)
  const [activeSymbolLetter, setActiveSymbolLetter] = createSignal(DEFAULT_AT_LETTER)
  const [lastAtLetterByMaterial, setLastAtLetterByMaterial] = createSignal<Record<MaterialColor, string>>(
    defaultAtLetterByMaterial(),
  )
  const [arrowStart, setArrowStart] = createSignal<Point | null>(null)
  const [calibrationPoints, setCalibrationPoints] = createSignal<Point[]>([])
  const [pendingCalibrationDistancePt, setPendingCalibrationDistancePt] = createSignal<number | null>(null)
  const [calibrationDistanceInput, setCalibrationDistanceInput] = createSignal('20')
  const [calibrationInputError, setCalibrationInputError] = createSignal('')
  const [textDraftInput, setTextDraftInput] = createSignal('NOTE')

  const [manualScaleInchesInput, setManualScaleInchesInput] = createSignal('')
  const [manualScaleFeetInput, setManualScaleFeetInput] = createSignal('')
  const [manualScaleInputsByPage, setManualScaleInputsByPage] =
    createSignal<Record<number, ManualScaleInputSnapshot>>({})
  const [measureTargetDistanceInput, setMeasureTargetDistanceInput] = createSignal('')
  const [pdfBrightnessPreview, setPdfBrightnessPreview] = createSignal(1)
  const [downleadVerticalFootagePlacementInput, setDownleadVerticalFootagePlacementInput] = createSignal('0')
  const [downleadVerticalFootageSelectedInput, setDownleadVerticalFootageSelectedInput] = createSignal('')
  const [annotationEdit, setAnnotationEdit] = createSignal<AnnotationEditState | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = createSignal(false)
  const [reportDraft, setReportDraft] = createSignal(createDefaultReportDraft())
  const [reportSubmitting, setReportSubmitting] = createSignal(false)
  const [reportDialogError, setReportDialogError] = createSignal('')
  const [quickAccessEditingContextActive, setQuickAccessEditingContextActive] = createSignal(false)

  const [statusMessage, setStatusMessage] = createSignal('')
  const [errorMessage, setErrorMessage] = createSignal('')
  const [selectionDebugEnabled, setSelectionDebugEnabled] = createSignal(false)

  const [stageDimensions, setStageDimensions] = createSignal({ width: 0, height: 0 })
  let stageRef: HTMLDivElement | undefined
  let stageResizeObserver: ResizeObserver | undefined
  let pdfCanvasRef: HTMLCanvasElement | undefined
  let touchSpacingTimer: number | null = null
  let targetDistanceSnapLock: TargetDistanceSnapLock | null = null
  const activeTouchPoints = new Map<number, Point>()

  const pdfSignature = createMemo(() => {
    const pdf = project().pdf
    return `${pdf.sha256}:${pdf.pageCount}:${pdf.widthPt}:${pdf.heightPt}:${pdf.dataBase64?.length ?? 0}`
  })

  const hasPdf = createMemo(() => Boolean(project().pdf.dataBase64))
  const visibleProject = createMemo(() => {
    const current = project()
    const page = current.view.currentPage
    const pageScoped = filterProjectByCurrentPage(current, page)
    const layerAndPageScoped = filterProjectByVisibleLayers(pageScoped)
    return {
      ...layerAndPageScoped,
      generalNotes: {
        ...layerAndPageScoped.generalNotes,
        notes: resolvedGeneralNotesForPage(current, page),
      },
    }
  })
  const viewportVisibleProject = createMemo(() => {
    const vp = visibleProject()
    const dims = stageDimensions()
    if (dims.width === 0 || dims.height === 0) {
      return vp
    }
    const viewport = viewportDocRect(vp.view, dims.width, dims.height)
    return filterProjectByViewport(vp, viewport, annotationScaleFactor(project().settings.designScale))
  })
  const effectivePdfBrightness = createMemo(() => clampPdfBrightness(pdfBrightnessPreview()))
  const activeColor = createMemo(() => project().settings.activeColor)

  function preferredAtLetterForMaterial(material: MaterialColor): string {
    const remembered = normalizeSymbolLetter(lastAtLetterByMaterial()[material] ?? '')
    return remembered || DEFAULT_AT_LETTER
  }

  function rememberAtLetterPlacement(material: MaterialColor, letter: string | undefined) {
    const normalized = normalizeSymbolLetter(letter ?? '')
    if (!normalized) {
      return
    }

    setLastAtLetterByMaterial((current) => {
      if (current[material] === normalized) {
        return current
      }

      return {
        ...current,
        [material]: normalized,
      }
    })
  }

  createEffect(
    on(
      () => project().settings.pdfBrightness,
      (value) => {
        setPdfBrightnessPreview(clampPdfBrightness(value))
      },
      { defer: false },
    ),
  )

  createEffect(
    on(
      activeColor,
      (material) => {
        const preferred = preferredAtLetterForMaterial(material)
        if (activeSymbolLetter() !== preferred) {
          setActiveSymbolLetter(preferred)
        }
      },
      { defer: false },
    ),
  )

  const {
    legendLabelEdit,
    editLegendPlacementById,
    setLegendLabelEditorInput,
    applyLegendLabelEditor,
    handleLegendLabelDialogPointerDown,
    handleLegendLabelDialogPointerMove,
    handleLegendLabelDialogPointerUp,
    bindLegendLabelDialogRef,
    closeLegendLabelDialog,
    clearLegendLabelDialogState,
    handleLegendLabelViewportResize,
  } = useLegendLabelDialog({
    project,
    setSelected,
    commitProjectChange,
    setStatus,
    setError,
    editDialogScreenFromDocPoint,
    fallbackWidthPx: LEGEND_LABEL_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: LEGEND_LABEL_DIALOG_FALLBACK_HEIGHT_PX,
  })

  const {
    generalNotesEdit,
    editGeneralNotesPlacementById,
    setGeneralNotesEditorInput,
    addGeneralNotesEditorRow,
    removeGeneralNotesEditorRow,
    moveGeneralNotesEditorRow,
    applyGeneralNotesEditor,
    handleGeneralNotesDialogPointerDown,
    handleGeneralNotesDialogPointerMove,
    handleGeneralNotesDialogPointerUp,
    bindGeneralNotesDialogRef,
    closeGeneralNotesDialog,
    clearGeneralNotesDialogState,
    handleGeneralNotesViewportResize,
  } = useGeneralNotesDialog({
    project,
    setSelected,
    commitProjectChange,
    setStatus,
    setError,
    editDialogScreenFromDocPoint,
    fallbackWidthPx: GENERAL_NOTES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: GENERAL_NOTES_DIALOG_FALLBACK_HEIGHT_PX,
    maxNotes: MAX_GENERAL_NOTES_COUNT,
  })

  const { bindPdfCanvasRef } = usePdfCanvasRenderer({
    pdfState: () => project().pdf,
    pdfSignature,
    currentPage: () => project().view.currentPage,
    setError,
  })

  const {
    supportsNativeFileDialogs,
    handleImportPdf,
    handleImportPdfPicker,
    handleImportPdfDrop,
    handleLoadProject,
    handleLoadProjectPicker,
    handleSaveProject,
    handleExportImage,
    handleExportPdf,
  } = useProjectFileActions({
    project,
    visibleProject,
    replaceProject,
    clearTransientToolState,
    setSelected,
    setMultiSelection,
    setStatus,
    setError,
    getPdfCanvas: () => pdfCanvasRef,
  })

  useProjectAutosave({
    project,
    replaceProject,
    setStatus,
    setError,
  })

  const isDialogEditingContextActive = createMemo(() => (
    annotationEdit() !== null ||
    legendLabelEdit() !== null ||
    generalNotesEdit() !== null ||
    reportDialogOpen()
  ))

  const isEditingContextActive = createMemo(
    () => isDialogEditingContextActive() || quickAccessEditingContextActive(),
  )

  const currentScaleInfo = createMemo(() => {
    const scale = project().scale

    if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
      return 'Scale: unset'
    }

    return `Scale: 1" = ${formatScaleFeet(scaleFeetPerInch(scale.realUnitsPerPoint, scale.displayUnits))}'`
  })

  const currentScaleSignature = createMemo(() => scaleInputSignature(project().scale))
  const appliedManualScaleInputs = createMemo(() => {
    const page = project().view.currentPage
    const signature = currentScaleSignature()
    const stored = manualScaleInputsByPage()[page]
    if (stored && stored.signature === signature) {
      return { inches: stored.inches, feet: stored.feet }
    }

    return deriveScaleInputValues(project().scale)
  })
  const manualScaleDirty = createMemo(() => {
    const applied = appliedManualScaleInputs()
    return (
      normalizeScaleInputValue(manualScaleInchesInput()) !== applied.inches ||
      normalizeScaleInputValue(manualScaleFeetInput()) !== applied.feet
    )
  })

  createEffect(
    on(
      () =>
        [
          project().view.currentPage,
          project().scale.isSet,
          project().scale.realUnitsPerPoint,
          project().scale.displayUnits,
        ] as const,
      () => {
        const page = project().view.currentPage
        const signature = currentScaleSignature()
        const stored = manualScaleInputsByPage()[page]
        const nextValues =
          stored && stored.signature === signature
            ? { inches: stored.inches, feet: stored.feet }
            : deriveScaleInputValues(project().scale)

        if (manualScaleInchesInput() !== nextValues.inches) {
          setManualScaleInchesInput(nextValues.inches)
        }
        if (manualScaleFeetInput() !== nextValues.feet) {
          setManualScaleFeetInput(nextValues.feet)
        }

        if (stored && stored.signature !== signature) {
          setManualScaleInputsByPage((prev) => {
            if (!prev[page]) {
              return prev
            }
            const next = { ...prev }
            delete next[page]
            return next
          })
        }
      },
      { defer: false },
    ),
  )

  const calibrationPreview = createMemo(() => {
    const points = calibrationPoints()
    const cursor = cursorDoc()

    if (points.length !== 1 || !cursor) {
      return null
    }

    const pointDistance = distance(points[0], cursor)
    const scale = project().scale

    if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
      return `${pointDistance.toFixed(2)} pt`
    }

    return formatDistance(pointDistance * scale.realUnitsPerPoint, scale.displayUnits)
  })

  const lineSegmentDistancePt = createMemo(() => {
    if (tool() !== 'line') {
      return 0
    }

    const start = lineStart()
    const current = cursorDoc()
    if (!start || !current) {
      return 0
    }

    return distance(start, current)
  })

  const lineSegmentDistanceLabel = createMemo(() => {
    if (tool() !== 'line' || !lineStart()) {
      return null
    }

    const scale = project().scale
    if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
      return 'unscaled'
    }

    return formatDistance(lineSegmentDistancePt() * scale.realUnitsPerPoint, scale.displayUnits)
  })

  const linePathTotalDistanceLabel = createMemo(() => {
    if (tool() !== 'line' || !lineContinuous() || !lineStart()) {
      return null
    }

    const start = lineStart()
    const current = cursorDoc()
    const activeSegment = start && current ? distance(start, current) : 0
    const totalDistancePt = linePathCommittedDistancePt() + activeSegment

    const scale = project().scale
    if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
      return 'unscaled'
    }

    return formatDistance(totalDistancePt * scale.realUnitsPerPoint, scale.displayUnits)
  })

  const measureDistancePt = createMemo(() => {
    const points = measurePoints()
    const current = cursorDoc()
    const activePoints = [...points]

    if (tool() === 'measure' && current && points.length > 0) {
      activePoints.push(current)
    }

    if (activePoints.length < 2) {
      return 0
    }

    return polylineLength(activePoints)
  })

  const measureDistanceLabel = createMemo(() => {
    const points = measurePoints()
    if (points.length === 0) {
      return null
    }

    const distancePt = measureDistancePt()
    const scale = project().scale

    if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
      return `${distancePt.toFixed(2)} pt`
    }

    return formatDistance(distancePt * scale.realUnitsPerPoint, scale.displayUnits)
  })

  const markSpanDistancePt = createMemo(() => {
    const anchor = markAnchor()
    if (!anchor) {
      return 0
    }

    const points = [anchor, ...markCorners()]
    const current = cursorDoc()

    if (tool() === 'measure_mark' && current) {
      points.push(current)
    }

    return polylineLength(points)
  })

  const markSpanDistanceLabel = createMemo(() => {
    const anchor = markAnchor()
    if (!anchor) {
      return null
    }

    const spanDistancePt = markSpanDistancePt()
    const scale = project().scale

    if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
      return `${spanDistancePt.toFixed(2)} pt`
    }

    return formatDistance(spanDistancePt * scale.realUnitsPerPoint, scale.displayUnits)
  })

  const measureTargetDistanceFt = createMemo(() => {
    const parsed = Number.parseFloat(measureTargetDistanceInput().trim())
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null
    }

    return parsed
  })

  const linearAutoSpacingPathDistancePt = createMemo(() => {
    const points = linearAutoSpacingVertices()
    if (points.length === 0) {
      return 0
    }

    const pathPoints = [...points]
    const current = cursorDoc()
    if (tool() === 'linear_auto_spacing' && current && points.length > 0) {
      pathPoints.push(current)
    }

    return polylineLength(pathPoints)
  })

  const linearAutoSpacingPathDistanceLabel = createMemo(() => {
    const points = linearAutoSpacingVertices()
    if (points.length === 0) {
      return null
    }

    const scale = project().scale
    const distancePt = linearAutoSpacingPathDistancePt()

    if (!scale.isSet || !scale.realUnitsPerPoint || !scale.displayUnits) {
      return `${distancePt.toFixed(2)} pt`
    }

    return formatDistance(distancePt * scale.realUnitsPerPoint, scale.displayUnits)
  })

  const layerFilteredProject = createMemo(() => filterProjectByVisibleLayers(project()))
  const legendEntriesForPlacement = (
    _items: LegendItem[],
    placement: LegendPlacement,
  ): LegendDisplayEntry[] => {
    return buildLegendDisplayEntries(layerFilteredProject(), placement)
  }

  const legendCustomSuffixInput = createMemo(() => {
    const symbolType = activeSymbol()
    if (!LETTERED_SYMBOL_TYPES.has(symbolType)) {
      return ''
    }

    const letter = normalizeSymbolLetter(activeSymbolLetter())
    const key = legendSuffixKeyForVariant(symbolType, letter)
    return project().legend.customSuffixes[key] ?? ''
  })

  function setStatus(message: string) {
    setStatusMessage(message)
    setErrorMessage('')
  }

  function setError(message: string) {
    setErrorMessage(message)
    setStatusMessage('')
  }

  function refocusCanvasFromInputCommit() {
    if (!stageRef) {
      return
    }

    requestAnimationFrame(() => {
      stageRef?.focus({ preventScroll: true })
    })
  }

  function isCanvasKeyboardContext(): boolean {
    if (!stageRef || typeof document === 'undefined') {
      return false
    }

    return document.activeElement === stageRef
  }

  function tryCommitPendingContinuousLineSegment(): boolean {
    const start = lineStart()
    const end = cursorDoc()
    if (!start || !end || distance(start, end) < 0.01) {
      return false
    }

    const lineId = createElementId('line')
    commitProjectChange((draft) => {
      draft.elements.lines.push({
        id: lineId,
        start,
        end,
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

    return true
  }

  function handleEnterToolFinishShortcut(): boolean {
    if (tool() === 'line' && lineContinuous()) {
      const committed = tryCommitPendingContinuousLineSegment()
      handleSelectTool('select')
      setStatus(committed ? 'Line segment added. Line drawing finished.' : 'Line drawing finished.')
      return true
    }

    if (tool() === 'linear_auto_spacing' && linearAutoSpacingVertices().length >= 2) {
      finishLinearAutoSpacing(false)
      return true
    }

    if (tool() === 'arc_auto_spacing' && arcAutoSpacingTargetId() !== null) {
      applyArcAutoSpacing()
      return true
    }

    return false
  }

  function requireNoOpenEditor(action: string): boolean {
    if (!isDialogEditingContextActive()) {
      return true
    }

    setStatus(`Finish or cancel the open editor before ${action}.`)
    return false
  }

  function handleOpenReportDialog(type: ReportType = 'bug') {
    setReportDraft({ ...createDefaultReportDraft(), type })
    setReportDialogError('')
    setReportSubmitting(false)
    setReportDialogOpen(true)
  }

  function handleSetReportType(type: ReportType) {
    setReportDraft((prev) =>
      type === 'feature'
        ? { ...prev, type, reproSteps: '' }
        : { ...prev, type },
    )
  }

  function handleSetReportTitle(value: string) {
    setReportDraft((prev) => ({ ...prev, title: value }))
  }

  function handleSetReportDetails(value: string) {
    setReportDraft((prev) => ({ ...prev, details: value }))
  }

  function handleSetReportReproSteps(value: string) {
    setReportDraft((prev) => ({ ...prev, reproSteps: value }))
  }

  function handleCloseReportDialog() {
    if (reportSubmitting()) {
      return
    }
    setReportDialogOpen(false)
    setReportDialogError('')
  }

  async function handleSubmitReport() {
    const normalized = normalizeReportDraft(reportDraft())
    const errors = validateReportDraft(normalized)
    if (errors.length > 0) {
      setReportDialogError(errors[0])
      return
    }

    setReportDialogError('')
    setReportDraft(normalized)
    setReportSubmitting(true)
    const payload = buildReportPayload(normalized, project())
    const result = await submitReport(payload)
    setReportSubmitting(false)

    if (!result.ok) {
      setReportDialogError(result.message ?? 'Unable to submit report.')
      return
    }

    setReportDialogOpen(false)
    setReportDialogError('')
    if (result.reportId) {
      setStatus(`Report submitted (${result.reportId}).`)
    } else {
      setStatus('Report submitted.')
    }
  }

  function nowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now()
    }

    return Date.now()
  }

  function clearTargetDistanceSnapLock() {
    targetDistanceSnapLock = null
  }

  function clearTouchSpacingTimer() {
    if (touchSpacingTimer !== null) {
      window.clearTimeout(touchSpacingTimer)
      touchSpacingTimer = null
    }
  }

  function clearTouchSpacingPending() {
    clearTouchSpacingTimer()
    setTouchSpacingPending(null)
  }

  function beginTouchGestureFromActivePointers() {
    if (activeTouchPoints.size < 2) {
      return false
    }

    const entries = [...activeTouchPoints.entries()]
    const [firstId, firstPoint] = entries[0]
    const [secondId, secondPoint] = entries[1]
    const center = {
      x: (firstPoint.x + secondPoint.x) / 2,
      y: (firstPoint.y + secondPoint.y) / 2,
    }

    const currentView = project().view
    clearTouchSpacingPending()
    setDragState(null)
    setTouchGesture({
      pointerIds: [firstId, secondId],
      startDistance: Math.max(1, distance(firstPoint, secondPoint)),
      startDocAtCenter: screenToDoc(center, currentView),
      startZoom: currentView.zoom,
    })

    return true
  }

  function clearTouchGesture() {
    setTouchGesture(null)
  }

  function setLegendCustomSuffixInput(value: string) {
    const symbolType = activeSymbol()
    if (!LETTERED_SYMBOL_TYPES.has(symbolType)) {
      return
    }

    const letter = normalizeSymbolLetter(activeSymbolLetter())
    const key = legendSuffixKeyForVariant(symbolType, letter)
    const normalized = value.trim().slice(0, 24)
    const current = project().legend.customSuffixes[key] ?? ''
    if (current === normalized) {
      return
    }

    commitProjectChange((draft) => {
      if (normalized.length === 0) {
        delete draft.legend.customSuffixes[key]
      } else {
        draft.legend.customSuffixes[key] = normalized
      }
    })

    setStatus(normalized.length === 0 ? 'Legend suffix cleared.' : 'Legend suffix updated.')
  }

  function clearTransientToolState() {
    clearTargetDistanceSnapLock()
    activeTouchPoints.clear()
    clearTouchSpacingPending()
    clearTouchGesture()
    setLineStart(null)
    setLinePathCommittedDistancePt(0)
    setArcStart(null)
    setArcEnd(null)
    setLinearAutoSpacingVertices([])
    setLinearAutoSpacingCorners([])
    setArcAutoSpacingTargetId(null)
    setDimensionStart(null)
    setDimensionEnd(null)
    setMeasurePoints([])
    setMarkAnchor(null)
    setMarkCorners([])
    setSymbolDirectionStart(null)
    setArrowStart(null)
    setCalibrationPoints([])
    setPendingCalibrationDistancePt(null)
    setCalibrationInputError('')
    setCursorDoc(null)
    setSnapPointPreview(null)
    setHoveredSelection(null)
    setAnnotationEdit(null)
    clearLegendLabelDialogState()
    clearGeneralNotesDialogState()
  }

  function pushHistorySnapshotEntry(snapshot: LpProject) {
    setHistory((prev) => {
      return pushHistorySnapshot(prev, snapshot, MAX_HISTORY)
    })
  }

  function commitProjectChange(mutator: (draft: LpProject) => void) {
    const before = cloneProject(project())
    const after = cloneProject(before)
    mutator(after)
    syncLegendItems(after)
    after.projectMeta.updatedAt = new Date().toISOString()

    pushHistorySnapshotEntry(before)
    setProject(after)
  }

  function replaceProject(nextProject: LpProject, resetHistory = true) {
    const synced = cloneProject(nextProject)
    syncLegendItems(synced)
    setProject(synced)

    if (resetHistory) {
      setHistory({ past: [], future: [] })
    }
  }

  function updateView(mutator: (view: { zoom: number; pan: Point }) => { zoom: number; pan: Point }) {
    setProject((prev) => ({
      ...prev,
      view: (() => {
        const currentPage = prev.view.currentPage
        const currentSnapshot = prev.view.byPage[currentPage] ?? {
          zoom: prev.view.zoom,
          pan: prev.view.pan,
        }
        const nextSnapshot = mutator(currentSnapshot)
        return {
          ...prev.view,
          zoom: nextSnapshot.zoom,
          pan: nextSnapshot.pan,
          byPage: {
            ...prev.view.byPage,
            [currentPage]: nextSnapshot,
          },
        }
      })(),
    }))
  }

  function handleSetCurrentPage(requestedPage: number) {
    if (!requireNoOpenEditor('changing pages')) {
      return
    }

    const totalPages = normalizePageCount(project().pdf.pageCount)
    const nextPage = clampPageNumber(requestedPage, totalPages)
    if (nextPage === project().view.currentPage) {
      return
    }

    clearTransientToolState()
    setSelected(null)
    setMultiSelection([])

    setProject((prev) => {
      const pageCount = normalizePageCount(prev.pdf.pageCount)
      const safePage = clampPageNumber(nextPage, pageCount)
      const currentPage = clampPageNumber(prev.view.currentPage, pageCount)
      const pageInfo =
        prev.pdf.pages.find((entry) => entry.page === safePage) ??
        prev.pdf.pages[safePage - 1] ?? {
          page: safePage,
          widthPt: prev.pdf.widthPt,
          heightPt: prev.pdf.heightPt,
        }
      const currentViewSnapshot = {
        zoom: prev.view.zoom,
        pan: prev.view.pan,
      }
      const currentScaleSnapshot = {
        isSet: prev.scale.isSet,
        method: prev.scale.method,
        realUnitsPerPoint: prev.scale.realUnitsPerPoint,
        displayUnits: prev.scale.displayUnits,
      }
      const nextViewSnapshot = prev.view.byPage[safePage] ?? {
        zoom: 1,
        pan: { x: 24, y: 24 },
      }
      const nextScaleSnapshot = prev.scale.byPage[safePage] ?? {
        isSet: false,
        method: null,
        realUnitsPerPoint: null,
        displayUnits: null,
      }
      const nextBrightness = clampPdfBrightness(
        prev.settings.pdfBrightnessByPage[safePage] ?? prev.settings.pdfBrightness,
      )

      return {
        ...prev,
        pdf: {
          ...prev.pdf,
          page: safePage,
          widthPt: pageInfo.widthPt,
          heightPt: pageInfo.heightPt,
        },
        view: {
          ...prev.view,
          currentPage: safePage,
          zoom: nextViewSnapshot.zoom,
          pan: nextViewSnapshot.pan,
          byPage: {
            ...prev.view.byPage,
            [currentPage]: currentViewSnapshot,
            [safePage]: nextViewSnapshot,
          },
        },
        scale: {
          ...nextScaleSnapshot,
          byPage: {
            ...prev.scale.byPage,
            [currentPage]: currentScaleSnapshot,
            [safePage]: nextScaleSnapshot,
          },
        },
        settings: {
          ...prev.settings,
          pdfBrightness: nextBrightness,
          pdfBrightnessByPage: {
            ...prev.settings.pdfBrightnessByPage,
            [currentPage]: clampPdfBrightness(prev.settings.pdfBrightness),
            [safePage]: nextBrightness,
          },
        },
      }
    })

    setStatus(`Page ${nextPage} of ${totalPages}`)
  }

  function handleGoToPreviousPage() {
    handleSetCurrentPage(project().view.currentPage - 1)
  }

  function handleGoToNextPage() {
    handleSetCurrentPage(project().view.currentPage + 1)
  }

  function docPointFromClient(clientX: number, clientY: number): Point | null {
    if (!stageRef) {
      return null
    }

    const screenPoint = eventToScreenPoint(
      { clientX, clientY } as MouseEvent,
      stageRef.getBoundingClientRect(),
    )
    return screenToDoc(screenPoint, project().view)
  }

  function docPointFromPointer(event: PointerEvent | WheelEvent): Point | null {
    return docPointFromClient(event.clientX, event.clientY)
  }

  function docPointFromMouseEvent(event: MouseEvent): Point | null {
    return docPointFromClient(event.clientX, event.clientY)
  }

  function screenPointFromPointer(event: PointerEvent | WheelEvent): Point | null {
    if (!stageRef) {
      return null
    }

    return eventToScreenPoint(event, stageRef.getBoundingClientRect())
  }

  function snapReferenceState() {
    return {
      lineStart: lineStart(),
      dimensionStart: dimensionStart(),
      dimensionEnd: dimensionEnd(),
      measurePoints: measurePoints(),
      markAnchor: markAnchor(),
      markCorners: markCorners(),
      linearAutoSpacingVertices: linearAutoSpacingVertices(),
      arrowStart: arrowStart(),
    }
  }

  function snapReferencePointForTool(
    activeTool: Tool,
    options: { selectDragState?: DragState | null } = {},
  ): Point | null {
    return snapReferencePointForToolEngine(
      activeTool,
      snapReferenceState(),
      options,
    )
  }

  function resolveSnapPoint(
    rawPoint: Point,
    options: ResolveSnapPointOptions = {},
  ): SnapResolution {
    return resolveSnapPointEngine(
      rawPoint,
      visibleProject(),
      options,
    )
  }

  function resolveInputPoint(
    rawPoint: Point,
    event: PointerEvent,
    snapResolution: SnapResolution | null = null,
    options: {
      selectDragState?: DragState | null
      snapReferencePoint?: Point | null
    } = {},
  ): ResolvedInputPoint {
    const result = resolveInputPointEngine({
      rawPoint,
      event,
      activeTool: tool(),
      settings: project().settings,
      view: project().view,
      scale: project().scale,
      snapReferenceState: snapReferenceState(),
      symbolDirectionStart: symbolDirectionStart(),
      snapResolution,
      options,
      targetDistanceSnapLock,
      measureTargetDistanceFt: measureTargetDistanceFt(),
      targetDistanceSnapTolerancePx: TARGET_DISTANCE_SNAP_TOLERANCE_PX,
      targetDistanceSnapReleasePx: TARGET_DISTANCE_SNAP_RELEASE_PX,
      targetDistanceSnapHoldMs: TARGET_DISTANCE_SNAP_HOLD_MS,
      nowMs,
      resolveSnapPoint: (nextRawPoint, resolveOptions) =>
        resolveSnapPoint(nextRawPoint, resolveOptions),
    })

    targetDistanceSnapLock = result.targetDistanceSnapLock
    return {
      point: result.point,
      preview: result.preview,
    }
  }

  function curveThroughPoint(curve: LpProject['elements']['curves'][number]): Point {
    return curveThroughPointEngine(curve)
  }

  function directionalSymbolHandlePoint(
    symbol: LpProject['elements']['symbols'][number],
    viewZoom: number,
  ): Point {
    return directionalSymbolHandlePointEngine(
      symbol,
      viewZoom,
      DIRECTION_HANDLE_LENGTH_PX,
    )
  }

  function selectionHandlePointForProject(
    p: LpProject,
    handle: SelectionHandleTarget,
  ): Point | null {
    return selectionHandlePointForProjectEngine(
      p,
      handle,
      DIRECTION_HANDLE_LENGTH_PX,
    )
  }

  function hitTestSelectedHandle(point: Point): { selection: Selection; handle: SelectionHandleTarget } | null {
    return hitTestSelectedHandleEngine(point, selected(), visibleProject(), {
      selectionHandleHitTolerancePx: SELECTION_HANDLE_HIT_TOLERANCE_PX,
      directionHandleLengthPx: DIRECTION_HANDLE_LENGTH_PX,
    })
  }

  function moveSelectionHandleByDelta(
    draft: LpProject,
    sourceProject: LpProject,
    handle: SelectionHandleTarget,
    delta: Point,
  ) {
    moveSelectionHandleByDeltaEngine(
      draft,
      sourceProject,
      handle,
      delta,
      DIRECTION_HANDLE_LENGTH_PX,
    )
  }

  function hitTest(point: Point): Selection | null {
    return hitTestEngine(point, visibleProject(), {
      linearHitTieTolerancePx: LINEAR_HIT_TIE_TOLERANCE_PX,
      legendTitle: LEGEND_TITLE,
      legendEntriesForPlacement,
    })
  }

  function moveSelectionsByDelta(draft: LpProject, selections: readonly Selection[], delta: Point) {
    moveSelectionsByDeltaEngine(draft, selections, delta)
  }

  function deleteSelections(targets: readonly Selection[]) {
    if (targets.length === 0) {
      return
    }

    const keys = selectionsKeySet(targets)
    commitProjectChange((draft) => {
      draft.elements.lines = draft.elements.lines.filter((line) => !keys.has(`line:${line.id}`))
      draft.elements.arcs = draft.elements.arcs.filter((arc) => !keys.has(`arc:${arc.id}`))
      draft.elements.curves = draft.elements.curves.filter((curve) => !keys.has(`curve:${curve.id}`))
      draft.elements.symbols = draft.elements.symbols.filter((symbol) => !keys.has(`symbol:${symbol.id}`))
      draft.legend.placements = draft.legend.placements.filter(
        (placement) => !keys.has(`legend:${placement.id}`),
      )
      draft.generalNotes.placements = draft.generalNotes.placements.filter(
        (placement) => !keys.has(`general_note:${placement.id}`),
      )
      draft.elements.texts = draft.elements.texts.filter((textElement) => !keys.has(`text:${textElement.id}`))
      draft.elements.dimensionTexts = draft.elements.dimensionTexts.filter(
        (dimensionText) => !keys.has(`dimension_text:${dimensionText.id}`),
      )
      draft.elements.arrows = draft.elements.arrows.filter((arrow) => !keys.has(`arrow:${arrow.id}`))
      draft.construction.marks = draft.construction.marks.filter((mark) => !keys.has(`mark:${mark.id}`))
    })
  }

  function deleteSelection() {
    const currentSelection = selected()

    if (!hasSelection(currentSelection)) {
      return
    }

    deleteSelections([currentSelection])
    setSelected(null)
  }

  function deleteMultiSelection() {
    const targets = multiSelection()
    if (targets.length === 0) {
      return
    }

    deleteSelections(targets)
    setMultiSelection([])
  }

  function editDialogScreenFromDocPoint(point: Point): Point {
    const p = visibleProject()
    const stageRect = stageRef?.getBoundingClientRect()
    const pointScreen = docToScreen(point, p.view)
    const baseX = (stageRect?.left ?? 0) + pointScreen.x
    const baseY = (stageRect?.top ?? 0) + pointScreen.y

    return {
      x: clamp(baseX + 16, 12, Math.max(12, window.innerWidth - 280)),
      y: clamp(baseY + 14, 12, Math.max(12, window.innerHeight - 220)),
    }
  }

  function openAnnotationEditorBySelection(
    selection: Extract<Selection, { kind: 'text' | 'arrow' | 'dimension_text' }>,
  ) {
    const p = project()

    if (selection.kind === 'text') {
      const existing = p.elements.texts.find((entry) => entry.id === selection.id)
      if (!existing) {
        return
      }

      setAnnotationEdit({
        mode: 'text',
        id: existing.id,
        input: existing.text,
        layer: existing.layer,
        screen: editDialogScreenFromDocPoint(existing.position),
      })
      setSelected({ kind: 'text', id: existing.id })
      return
    }

    if (selection.kind === 'dimension_text') {
      const existing = p.elements.dimensionTexts.find((entry) => entry.id === selection.id)
      if (!existing) {
        return
      }

      setAnnotationEdit({
        mode: 'dimension_text',
        id: existing.id,
        input: existing.overrideText ?? '',
        layer: existing.layer,
        screen: editDialogScreenFromDocPoint(existing.position),
      })
      setSelected({ kind: 'dimension_text', id: existing.id })
      return
    }

    const existing = p.elements.arrows.find((entry) => entry.id === selection.id)
    if (!existing) {
      return
    }

    const center = {
      x: (existing.tail.x + existing.head.x) / 2,
      y: (existing.tail.y + existing.head.y) / 2,
    }

    setAnnotationEdit({
      mode: 'arrow',
      id: existing.id,
      input: '',
      layer: existing.layer,
      screen: editDialogScreenFromDocPoint(center),
    })
    setSelected({ kind: 'arrow', id: existing.id })
  }

  function applyAnnotationEditor() {
    const editor = annotationEdit()
    if (!editor) {
      return
    }

    if (editor.mode === 'text') {
      const normalized = editor.input.trim()
      if (normalized.length === 0) {
        setError('Text cannot be empty.')
        return
      }

      commitProjectChange((draft) => {
        const target = draft.elements.texts.find((entry) => entry.id === editor.id)
        if (!target) {
          return
        }

        target.text = normalized
        target.layer = editor.layer
      })

      setSelected({ kind: 'text', id: editor.id })
      setAnnotationEdit(null)
      setStatus('Text updated.')
      return
    }

    if (editor.mode === 'dimension_text') {
      const normalized = normalizeDimensionOverrideText(editor.input)
      commitProjectChange((draft) => {
        const target = draft.elements.dimensionTexts.find((entry) => entry.id === editor.id)
        if (!target) {
          return
        }

        target.overrideText = normalized
        target.layer = editor.layer
      })

      setSelected({ kind: 'dimension_text', id: editor.id })
      setAnnotationEdit(null)
      setStatus(normalized ? 'Dimension text override updated.' : 'Dimension text override cleared.')
      return
    }

    commitProjectChange((draft) => {
      const target = draft.elements.arrows.find((entry) => entry.id === editor.id)
      if (!target) {
        return
      }
      target.layer = editor.layer
    })

    setSelected({ kind: 'arrow', id: editor.id })
    setAnnotationEdit(null)
    setStatus('Arrow layer updated.')
  }

  function handleUndo() {
    if (!requireNoOpenEditor('undoing changes')) {
      return
    }

    const result = applyUndo(history(), cloneProject(project()), MAX_HISTORY)
    if (!result) {
      return
    }

    const synced = cloneProject(result.project)
    syncLegendItems(synced)
    setProject(synced)
    setHistory(result.history)

    clearTransientToolState()
    setSelected(null)
    setMultiSelection([])
  }

  function handleRedo() {
    if (!requireNoOpenEditor('redoing changes')) {
      return
    }

    const result = applyRedo(history(), cloneProject(project()), MAX_HISTORY)
    if (!result) {
      return
    }

    const synced = cloneProject(result.project)
    syncLegendItems(synced)
    setProject(synced)
    setHistory(result.history)

    clearTransientToolState()
    setSelected(null)
    setMultiSelection([])
  }

  function handleClearAllMarks() {
    const currentPage = project().view.currentPage
    const hasMarksOnPage = project().construction.marks.some((mark) => (mark.page ?? 1) === currentPage)
    if (!hasMarksOnPage) {
      return
    }

    commitProjectChange((draft) => {
      draft.construction.marks = draft.construction.marks.filter((mark) => (mark.page ?? 1) !== currentPage)
    })

    setStatus('Cleared marks on this page.')
  }

  function resetLinearAutoSpacingTrace() {
    setLinearAutoSpacingVertices([])
    setLinearAutoSpacingCorners([])
  }

  function pointKeyForExactMatch(point: Point): string {
    return `${point.x}|${point.y}`
  }

  function resolveLinearAutoSpacingMaxIntervalPt(realUnitsPerPoint: number): number | null {
    const maxIntervalReal = Number.parseFloat(linearAutoSpacingMaxInput())
    if (!Number.isFinite(maxIntervalReal) || maxIntervalReal <= 0) {
      setError('Linear auto-spacing max interval must be a positive number.')
      return null
    }

    return maxIntervalReal / realUnitsPerPoint
  }

  function computeAutoSpacedAirTerminalsToPlace(points: Point[]): Point[] {
    if (points.length === 0) {
      return []
    }

    const currentPage = project().view.currentPage
    const occupied = new Set(
      project()
        .elements.symbols
        .filter((symbol) => (symbol.page ?? 1) === currentPage)
        .filter((symbol) => LETTERED_SYMBOL_TYPES.has(symbol.symbolType))
        .map((symbol) => pointKeyForExactMatch(symbol.position)),
    )

    const output: Point[] = []
    for (const point of points) {
      const key = pointKeyForExactMatch(point)
      if (occupied.has(key)) {
        continue
      }

      occupied.add(key)
      output.push(point)
    }

    return output
  }

  function placeAutoSpacedAirTerminals(points: Point[]): number {
    const pointsToPlace = computeAutoSpacedAirTerminalsToPlace(points)
    if (pointsToPlace.length === 0) {
      return 0
    }

    const letter = symbolLetterForPlacement('air_terminal')
    if (!letter) {
      setError('Select an air terminal letter before placing auto-spacing terminals.')
      return 0
    }

    commitProjectChange((draft) => {
      const currentPage = draft.view.currentPage
      for (const point of pointsToPlace) {
        draft.elements.symbols.push({
          id: createElementId('symbol'),
          symbolType: 'air_terminal',
          position: point,
          page: currentPage,
          letter,
          color: colorForSymbol('air_terminal', draft.settings.activeColor),
          class: classForSymbol('air_terminal', draft.settings.activeClass),
        })
      }
    })
    rememberAtLetterPlacement(project().settings.activeColor, letter)

    return pointsToPlace.length
  }

  function finishLinearAutoSpacing(closed: boolean) {
    const scale = project().scale
    if (!scale.isSet || !scale.realUnitsPerPoint) {
      setError('Set scale before using linear auto-spacing.')
      return
    }

    const maxIntervalPt = resolveLinearAutoSpacingMaxIntervalPt(scale.realUnitsPerPoint)
    if (maxIntervalPt === null) {
      return
    }

    const vertices = linearAutoSpacingVertices()
    const corners = linearAutoSpacingCorners()

    if (vertices.length < 2) {
      setError('Trace at least two points before finishing linear auto-spacing.')
      return
    }

    if (closed && vertices.length < 3) {
      setError('Closed linear auto-spacing paths require at least three vertices.')
      return
    }

    const points = computeLinearAutoSpacingPoints(vertices, corners, closed, maxIntervalPt, 0)

    if (points.length === 0) {
      setError('Linear auto-spacing could not place any terminals from the current trace.')
      return
    }

    const placedCount = placeAutoSpacedAirTerminals(points)

    resetLinearAutoSpacingTrace()
    setStatus(
      `Linear auto-spacing complete: placed ${placedCount} air terminal${placedCount === 1 ? '' : 's'}.`,
    )
  }

  function applyLinearAutoSpacingInput(resolvedPoint: Point, isSecondaryInput: boolean) {
    const scale = project().scale
    if (!scale.isSet || !scale.realUnitsPerPoint) {
      setError('Set scale before tracing linear auto-spacing paths.')
      return
    }

    const vertices = linearAutoSpacingVertices()

    if (vertices.length === 0) {
      if (isSecondaryInput) {
        setError('First linear auto-spacing point must be an outside corner (left click).')
        return
      }

      setLinearAutoSpacingVertices([resolvedPoint])
      setLinearAutoSpacingCorners(['outside'])
      setStatus('Linear auto-spacing start point set.')
      return
    }

    const lastPoint = vertices[vertices.length - 1]
    if (distance(lastPoint, resolvedPoint) < 0.01) {
      return
    }

    const closeTolerance = 10 / project().view.zoom
    if (
      !isSecondaryInput &&
      vertices.length >= 3 &&
      distance(resolvedPoint, vertices[0]) <= closeTolerance
    ) {
      finishLinearAutoSpacing(true)
      return
    }

    if (!isSecondaryInput) {
      const maxIntervalPt = resolveLinearAutoSpacingMaxIntervalPt(scale.realUnitsPerPoint)
      if (maxIntervalPt === null) {
        return
      }

      const corners = linearAutoSpacingCorners()
      let lastOutsideIndex = corners.length - 1
      while (lastOutsideIndex > 0 && corners[lastOutsideIndex] !== 'outside') {
        lastOutsideIndex -= 1
      }

      const spanVertices = [...vertices.slice(lastOutsideIndex), resolvedPoint]
      const spanCorners: CornerKind[] = [...corners.slice(lastOutsideIndex), 'outside']
      const spanPoints = computeLinearAutoSpacingPoints(
        spanVertices,
        spanCorners,
        false,
        maxIntervalPt,
        0,
      )
      placeAutoSpacedAirTerminals(spanPoints)
    }

    setLinearAutoSpacingVertices((current) => [...current, resolvedPoint])
    setLinearAutoSpacingCorners((current) => [
      ...current,
      isSecondaryInput ? 'inside' : 'outside',
    ])
    setStatus(
      isSecondaryInput
        ? 'Inside corner added to linear auto-spacing trace.'
        : 'Outside corner added to linear auto-spacing trace.',
    )
  }

  function hitTestArcForAutoSpacing(point: Point): LpProject['elements']['arcs'][number] | null {
    const p = visibleProject()
    const toleranceDoc = ARC_AUTO_SPACING_HIT_TOLERANCE_PX / Math.max(0.01, p.view.zoom)
    let bestArc: LpProject['elements']['arcs'][number] | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (let i = p.elements.arcs.length - 1; i >= 0; i -= 1) {
      const arc = p.elements.arcs[i]
      const d = distanceToCircularArc(point, arc.start, arc.through, arc.end, 96)
      if (d <= toleranceDoc && d < bestDistance) {
        bestDistance = d
        bestArc = arc
      }
    }

    return bestArc
  }

  function applyArcAutoSpacing() {
    const scale = project().scale
    if (!scale.isSet || !scale.realUnitsPerPoint) {
      setError('Set scale before using arc auto-spacing.')
      return
    }

    const targetId = arcAutoSpacingTargetId()
    if (!targetId) {
      setError('Select an arc before applying arc auto-spacing.')
      return
    }

    const maxIntervalReal = Number.parseFloat(arcAutoSpacingMaxInput())
    if (!Number.isFinite(maxIntervalReal) || maxIntervalReal <= 0) {
      setError('Arc auto-spacing max interval must be a positive number.')
      return
    }

    const arc = project().elements.arcs.find((entry) => entry.id === targetId)
    if (!arc) {
      setArcAutoSpacingTargetId(null)
      setError('Selected arc no longer exists. Select another arc.')
      return
    }

    const maxIntervalPt = maxIntervalReal / scale.realUnitsPerPoint
    const points = computeArcAutoSpacingPoints(arc.start, arc.through, arc.end, maxIntervalPt)

    if (points.length === 0) {
      setError('Arc auto-spacing could not place any terminals on this arc.')
      return
    }

    const letter = symbolLetterForPlacement('air_terminal')
    if (!letter) {
      setError('Select an air terminal letter before placing auto-spacing terminals.')
      return
    }

    commitProjectChange((draft) => {
      const currentPage = draft.view.currentPage
      for (const point of points) {
        draft.elements.symbols.push({
          id: createElementId('symbol'),
          symbolType: 'air_terminal',
          position: point,
          page: currentPage,
          letter,
          color: colorForSymbol('air_terminal', draft.settings.activeColor),
          class: classForSymbol('air_terminal', draft.settings.activeClass),
        })
      }
    })
    rememberAtLetterPlacement(project().settings.activeColor, letter)

    setStatus(
      `Arc auto-spacing complete: placed ${points.length} air terminal${points.length === 1 ? '' : 's'}.`,
    )
  }

  function clearArcAutoSpacingTarget(showStatus = true) {
    if (!arcAutoSpacingTargetId()) {
      return
    }

    setArcAutoSpacingTargetId(null)
    if (showStatus) {
      setStatus('Arc auto-spacing target cleared.')
    }
  }

  function applyMeasureMarkInput(resolvedPoint: Point, isSecondaryInput: boolean) {
    clearTargetDistanceSnapLock()
    const anchor = markAnchor()

    if (!anchor) {
      if (isSecondaryInput) {
        setError('Set a starting anchor before adding inside corners.')
        return
      }

      setMarkAnchor(resolvedPoint)
      setMarkCorners([])
      setStatus('Measure & Mark anchor set.')
      return
    }

    const corners = markCorners()
    const previousPoint = corners.length > 0 ? corners[corners.length - 1] : anchor

    if (distance(previousPoint, resolvedPoint) < 0.01) {
      return
    }

    if (isSecondaryInput) {
      setMarkCorners((existing) => [...existing, resolvedPoint])
      setStatus('Inside corner added (no mark placed).')
      return
    }

    const spanPoints = [anchor, ...corners, resolvedPoint]
    const spanDistancePt = polylineLength(spanPoints)

    if (spanDistancePt < 0.01) {
      setError('Mark placement requires a non-zero span.')
      return
    }

    commitProjectChange((draft) => {
      draft.construction.marks.push({
        id: createElementId('mark'),
        position: resolvedPoint,
        page: draft.view.currentPage,
      })
    })

    setMarkAnchor(resolvedPoint)
    setMarkCorners([])
    setStatus('Mark placed. New span starts from this mark.')
  }

  function symbolLetterForPlacement(symbolType: SymbolType): string | undefined {
    if (!LETTERED_SYMBOL_TYPES.has(symbolType)) {
      return undefined
    }

    const normalized = normalizeSymbolLetter(activeSymbolLetter())
    if (normalized.length > 0) {
      return normalized
    }

    const fallback = preferredAtLetterForMaterial(project().settings.activeColor)
    setActiveSymbolLetter(fallback)
    return fallback
  }

  function applyManualScale() {
    const inches = Number.parseFloat(manualScaleInchesInput())
    const feet = Number.parseFloat(manualScaleFeetInput())

    if (!Number.isFinite(inches) || inches <= 0 || !Number.isFinite(feet) || feet <= 0) {
      setError('Manual scale must be entered as positive values: X inches = Y feet.')
      return
    }

    const realUnitsPerPoint = feet / (inches * 72)

    const normalizedInchesInput = normalizeScaleInputValue(manualScaleInchesInput())
    const normalizedFeetInput = normalizeScaleInputValue(manualScaleFeetInput())
    const nextScale = {
      isSet: true,
      method: 'manual' as const,
      realUnitsPerPoint,
      displayUnits: 'ft-in' as const,
    }
    const currentPage = project().view.currentPage
    setManualScaleInputsByPage((prev) => ({
      ...prev,
      [currentPage]: {
        inches: normalizedInchesInput,
        feet: normalizedFeetInput,
        signature: scaleInputSignature(nextScale),
      },
    }))

    commitProjectChange((draft) => {
      const page = draft.view.currentPage
      draft.scale = {
        ...nextScale,
        byPage: {
          ...draft.scale.byPage,
          [page]: nextScale,
        },
      }
    })

    setStatus('Manual scale applied.')
  }

  function handleToolPointerDown(
    incomingEvent: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    if (isDialogEditingContextActive()) {
      return
    }

    const event = normalizePointerEvent(incomingEvent)
    if (event.pointerType !== 'touch' && document.activeElement !== event.currentTarget) {
      event.currentTarget.focus({ preventScroll: true })
    }

    const currentTool = tool()
    const isMeasureMarkSecondary =
      currentTool === 'measure_mark' &&
      (event.button === 2 || (event.button === 0 && event.altKey))
    const isLinearAutoSpacingSecondary =
      currentTool === 'linear_auto_spacing' &&
      (event.button === 2 || (event.button === 0 && event.altKey))

    if (handleTouchPointerDownForGesture({
      event,
      activeTouchPoints,
      screenPointFromPointer,
      touchGesture,
      beginTouchGestureFromActivePointers,
    })) {
      return
    }

    if (event.button === 1 || (currentTool === 'pan' && event.button === 0)) {
      const screenPoint = screenPointFromPointer(event)
      if (!screenPoint) {
        return
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragState({
        kind: 'pan',
        pointerId: event.pointerId,
        startScreen: screenPoint,
        startPan: { ...project().view.pan },
      })
      return
    }

    if (handleContextSelectionPointerDown({
      event,
      currentTool,
      isMeasureMarkSecondary,
      isLinearAutoSpacingSecondary,
      docPointFromPointer: (pointerEvent) => docPointFromPointer(pointerEvent),
      hitTest,
      setSnapPointPreview,
      setHoveredSelection,
      handleSelectTool,
      setMultiSelection: (selections) => setMultiSelection(selections),
      setSelected,
    })) {
      return
    }

    if (event.button !== 0 && !isMeasureMarkSecondary && !isLinearAutoSpacingSecondary) {
      return
    }

    const rawPoint = docPointFromPointer(event)
    if (!rawPoint) {
      return
    }

    if (handleSelectPointerDown({
      event,
      currentTool,
      rawPoint,
      project,
      hitTest,
      hitTestSelectedHandle,
      selectionHandlePointForProject,
      multiSelection,
      setSnapPointPreview,
      setHoveredSelection,
      setSelected,
      setDragState,
      setMultiSelection: (selections) => setMultiSelection(selections),
      hitTestArcForAutoSpacing,
      setArcAutoSpacingTargetId,
      setError,
      setStatus,
    })) {
      return
    }

    const snapReference = snapReferencePointForTool(currentTool)
    const snapResolution = resolveSnapPoint(rawPoint, {
      referencePoint: snapReference,
    })
    const resolvedInput = resolveInputPoint(rawPoint, event, snapResolution, {
      snapReferencePoint: snapReference,
    })
    const resolvedPoint = resolvedInput.point
    setSnapPointPreview(resolvedInput.preview)
    setHoveredSelection(null)

    if (beginTouchSpacingPendingOnPointerDown({
      event,
      currentTool,
      resolvedPoint,
      touchLongPressMs: TOUCH_LONG_PRESS_MS,
      screenPointFromPointer,
      clearTouchSpacingPending,
      touchSpacingPending,
      setTouchSpacingPending,
      setTouchSpacingTimer: (timerId) => {
        touchSpacingTimer = timerId
      },
      cursorDoc,
      applyLinearAutoSpacingInput,
      applyMeasureMarkInput,
    })) {
      return
    }

    handlePlacementPointerDown({
      currentTool,
      event,
      resolvedPoint,
      isLinearAutoSpacingSecondary,
      isMeasureMarkSecondary,
      project,
      createElementId,
      commitProjectChange,
      setStatus,
      setError,
      setSelected,
      lineStart,
      setLineStart,
      lineContinuous,
      linePathCommittedDistancePt,
      setLinePathCommittedDistancePt,
      dimensionStart,
      dimensionEnd,
      setDimensionStart,
      setDimensionEnd,
      dimensionShowLinework,
      arcStart,
      arcEnd,
      setArcStart,
      setArcEnd,
      curveContinuous,
      clearTargetDistanceSnapLock,
      setMeasurePoints,
      applyLinearAutoSpacingInput,
      applyMeasureMarkInput,
      activeSymbol,
      symbolDirectionStart,
      setSymbolDirectionStart,
      isLetteredSymbol: (symbolType) => LETTERED_SYMBOL_TYPES.has(symbolType),
      symbolLetterForPlacement,
      rememberAtLetterPlacement: (material, letter) => {
        rememberAtLetterPlacement(material, letter)
      },
      downleadPlacementVerticalFootageFt,
      textDraftInput,
      arrowStart,
      setArrowStart,
      pendingCalibrationDistancePt,
      calibrationPoints,
      setCalibrationPoints: (points) => {
        setCalibrationPoints(points)
      },
      setPendingCalibrationDistancePt: (distancePt) => {
        setCalibrationInputError('')
        setPendingCalibrationDistancePt(distancePt)
      },
    })
  }

  function handleToolPointerMove(
    incomingEvent: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    const event = normalizePointerEvent(incomingEvent)

    if (handleTouchPointerMoveForGesture({
      event,
      activeTouchPoints,
      screenPointFromPointer,
      touchGesture,
      clearTouchGesture,
      beginTouchGestureFromActivePointers,
      updateView,
      setSnapPointPreview,
      setHoveredSelection,
    })) {
      return
    }

    const currentTool = tool()
    const activeDrag = dragState()

    const rawDoc = docPointFromPointer(event)
    let resolvedDoc = rawDoc
    if (rawDoc) {
      if (!handlePointerHover({
        event,
        currentTool,
        rawDoc,
        activeDrag,
        selected,
        multiSelection,
        setCursorDoc,
        setSnapPointPreview,
        setHoveredSelection,
        hitTest,
        hitTestArcForAutoSpacing,
      })) {
        const selectDragState = currentTool === 'select' ? activeDrag : null
        const snapReference = snapReferencePointForTool(currentTool, {
          selectDragState,
        })
        const snapResolution = resolveSnapPoint(rawDoc, {
          excludeSelection:
            activeDrag && (activeDrag.kind === 'move' || activeDrag.kind === 'edit-handle')
              ? activeDrag.kind === 'move'
                ? (activeDrag.selections[0] ?? null)
                : activeDrag.selection
              : null,
          referencePoint: snapReference,
        })
        const resolvedInput = resolveInputPoint(rawDoc, event, snapResolution, {
          selectDragState,
          snapReferencePoint: snapReference,
        })
        resolvedDoc = resolvedInput.point
        setCursorDoc(resolvedDoc)
        setSnapPointPreview(resolvedInput.preview)
        setHoveredSelection(null)
      }
    } else {
      resolvedDoc = null
      setCursorDoc(null)
      setSnapPointPreview(null)
      setHoveredSelection(null)
    }

    if (handleTouchSpacingPendingMove({
      event,
      touchLongPressMoveTolerancePx: TOUCH_LONG_PRESS_MOVE_TOLERANCE_PX,
      touchSpacingPending,
      screenPointFromPointer,
      clearTouchSpacingTimer,
    })) {
      return
    }

    const drag = dragState()
    if (!drag) {
      return
    }

    if (drag.pointerId !== event.pointerId) {
      return
    }

    if (drag.kind === 'pan') {
      const currentScreen = screenPointFromPointer(event)

      if (!currentScreen) {
        return
      }

      const deltaX = currentScreen.x - drag.startScreen.x
      const deltaY = currentScreen.y - drag.startScreen.y

      updateView((view) => ({
        ...view,
        pan: {
          x: drag.startPan.x + deltaX,
          y: drag.startPan.y + deltaY,
        },
      }))
      return
    }

    const currentDoc = resolvedDoc
    if (!currentDoc) {
      return
    }

    const delta = {
      x: currentDoc.x - drag.startDoc.x,
      y: currentDoc.y - drag.startDoc.y,
    }

    const nextProject = cloneProject(drag.sourceProject)
    if (drag.kind === 'move') {
      moveSelectionsByDelta(nextProject, drag.selections, delta)
    } else {
      moveSelectionHandleByDelta(nextProject, drag.sourceProject, drag.handle, delta)
    }
    syncLegendItems(nextProject)
    setProject(nextProject)
  }

  function handleToolPointerUp(
    incomingEvent: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    const event = normalizePointerEvent(incomingEvent)
    if (event.pointerType === 'touch') {
      activeTouchPoints.delete(event.pointerId)
    }

    if (handleTouchSpacingPendingPointerUp({
      event,
      touchSpacingPending,
      clearTouchSpacingTimer,
      setTouchSpacingPending,
      docPointFromPointer: (pointerEvent) => docPointFromPointer(pointerEvent),
      resolveInputPoint: (rawPoint, pointerEvent) =>
        resolveInputPoint(rawPoint, pointerEvent as PointerEvent),
      touchCornerMode,
      applyLinearAutoSpacingInput,
      applyMeasureMarkInput,
    })) {
      return
    }

    if (handleTouchPointerEndForGesture({
      event,
      activeTouchPoints,
      touchGesture,
      clearTouchGesture,
      beginTouchGestureFromActivePointers,
    })) {
      return
    }

    const drag = dragState()

    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (drag.kind === 'move' || drag.kind === 'edit-handle') {
      const before = JSON.stringify(drag.sourceProject)
      const after = JSON.stringify(project())

      if (before !== after) {
        pushHistorySnapshotEntry(cloneProject(drag.sourceProject))
        setProject((current) => ({
          ...current,
          projectMeta: {
            ...current.projectMeta,
            updatedAt: new Date().toISOString(),
          },
        }))
      }
    }

    setDragState(null)
  }

  function handleToolPointerCancel(
    incomingEvent: PointerEvent & { currentTarget: HTMLDivElement },
  ) {
    const event = normalizePointerEvent(incomingEvent)
    if (event.pointerType === 'touch') {
      activeTouchPoints.delete(event.pointerId)
    }

    if (handleTouchSpacingPendingPointerCancel({
      event,
      touchSpacingPending,
      clearTouchSpacingPending,
    })) {
      return
    }

    if (handleTouchPointerEndForGesture({
      event,
      activeTouchPoints,
      touchGesture,
      clearTouchGesture,
      beginTouchGestureFromActivePointers,
    })) {
      return
    }

    const drag = dragState()
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setDragState(null)
  }

  function handleWheel(event: WheelEvent & { currentTarget: HTMLDivElement }) {
    if (!stageRef) {
      return
    }

    event.preventDefault()

    const currentView = project().view
    const screenPoint = eventToScreenPoint(event, stageRef.getBoundingClientRect())
    const docPoint = docPointFromPointer(event)
    if (!docPoint) {
      return
    }

    const scaleFactor = Math.exp(-event.deltaY * 0.0015)
    const nextZoom = clamp(currentView.zoom * scaleFactor, 0.25, 8)

    updateView(() => ({
      zoom: nextZoom,
      pan: {
        x: screenPoint.x - docPoint.x * nextZoom,
        y: screenPoint.y - docPoint.y * nextZoom,
      },
    }))
  }

  function handleDoubleClick(
    event: MouseEvent & { currentTarget: HTMLDivElement },
  ) {
    if (isDialogEditingContextActive()) {
      return
    }

    if (tool() === 'select') {
      const point = docPointFromMouseEvent(event)
      if (point) {
        const hit = hitTest(point)
        if (hit?.kind === 'text') {
          openAnnotationEditorBySelection(hit)
          return
        }

        if (hit?.kind === 'dimension_text') {
          openAnnotationEditorBySelection(hit)
          return
        }

        if (hit?.kind === 'arrow') {
          openAnnotationEditorBySelection(hit)
          return
        }

        if (hit?.kind === 'legend') {
          editLegendPlacementById(hit.id)
          return
        }

        if (hit?.kind === 'general_note') {
          editGeneralNotesPlacementById(hit.id)
          return
        }
      }
    }

    if (tool() === 'line') {
      setLineStart(null)
      return
    }

    if (tool() === 'arc' || tool() === 'curve') {
      setArcStart(null)
      setArcEnd(null)
      return
    }

    if (tool() === 'linear_auto_spacing') {
      if (linearAutoSpacingVertices().length >= 2) {
        finishLinearAutoSpacing(false)
      } else {
        resetLinearAutoSpacingTrace()
      }
      return
    }

    if (tool() === 'measure') {
      clearTargetDistanceSnapLock()
      setMeasurePoints([])
      return
    }

    if (tool() === 'dimension_text') {
      setDimensionStart(null)
      setDimensionEnd(null)
      return
    }

    if (tool() === 'arrow') {
      setArrowStart(null)
      return
    }

    if (tool() === 'measure_mark') {
      clearTargetDistanceSnapLock()
      setMarkAnchor(null)
      setMarkCorners([])
    }
  }

  function handleSetProjectName(value: string) {
    setProject((prev) => ({
      ...prev,
      projectMeta: {
        ...prev.projectMeta,
        name: value,
      },
    }))
  }

  const { syncDialogResize } = useDialogResizeSync({
    onLegendLabelResize: handleLegendLabelViewportResize,
    onGeneralNotesResize: handleGeneralNotesViewportResize,
  })

  useGlobalAppShortcuts({
    tool,
    isEditingContextActive,
    isCanvasKeyboardContext,
    handleEnterToolFinish: handleEnterToolFinishShortcut,
    handleUndo,
    handleRedo,
    deleteSelection,
    deleteMultiSelection,
    clearTransientToolState: () => {
      if (
        tool() === 'calibrate' &&
        (calibrationPoints().length > 0 || pendingCalibrationDistancePt() !== null)
      ) {
        cancelPendingCalibration()
        return
      }
      clearTransientToolState()
    },
    toggleHelp: helpState.toggleHelp,
    onResize: syncDialogResize,
    onCleanupExtra: () => {
      activeTouchPoints.clear()
      clearTouchSpacingPending()
      clearTouchGesture()
    },
  })

  const linePreview = createMemo(() => {
    const start = lineStart()
    const current = cursorDoc()

    if (!start || !current) {
      return null
    }

    return {
      start,
      end: current,
    }
  })

  const dimensionTextPreview = createMemo<DimensionTextPreview | null>(() => {
    const start = dimensionStart()
    const end = dimensionEnd()
    const current = cursorDoc()

    if (!start || !current) {
      return null
    }

    if (!end) {
      return {
        phase: 'span',
        start,
        end: current,
        showLinework: dimensionShowLinework(),
      }
    }

    return {
      phase: 'placement',
      start,
      end,
      position: current,
      label: dimensionTextLabel(
        {
          start,
          end,
          overrideText: undefined,
        },
        project().scale,
      ),
      showLinework: dimensionShowLinework(),
    }
  })

  const arcChordPreview = createMemo(() => {
    const start = arcStart()
    const end = arcEnd()
    const current = cursorDoc()

    if (!start || end || !current) {
      return null
    }

    return {
      start,
      end: current,
    }
  })

  const arcCurvePreview = createMemo(() => {
    const activeTool = tool()
    const start = arcStart()
    const secondPoint = arcEnd()
    const cursor = cursorDoc()

    if (!start || !secondPoint || !cursor) {
      return null
    }

    if (activeTool === 'arc') {
      const path =
        circularArcPathFromThreePoints(start, cursor, secondPoint) ??
        `M ${start.x} ${start.y} L ${secondPoint.x} ${secondPoint.y}`

      return {
        start,
        through: cursor,
        end: secondPoint,
        path,
      }
    }

    if (activeTool === 'curve') {
      const control = quadraticControlPointForThrough(start, secondPoint, cursor)
      return {
        start,
        through: secondPoint,
        end: cursor,
        path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${cursor.x} ${cursor.y}`,
      }
    }

    return null
  })

  const directionPreview = createMemo(() => {
    const start = symbolDirectionStart()
    const current = cursorDoc()

    if (!start || !current) {
      return null
    }

    return {
      start,
      end: current,
    }
  })

  const arrowPreview = createMemo(() => {
    const start = arrowStart()
    const current = cursorDoc()

    if (!start || !current) {
      return null
    }

    return {
      start,
      end: current,
    }
  })

  const calibrationLinePreview = createMemo(() => {
    const points = calibrationPoints()
    const current = cursorDoc()

    if (points.length === 0) {
      return null
    }

    if (points.length === 1 && current) {
      return {
        start: points[0],
        end: current,
      }
    }

    return null
  })

  const measurePathPreview = createMemo(() => {
    const points = measurePoints()
    if (points.length === 0) {
      return [] as Point[]
    }

    const pathPoints = points.slice()
    const current = cursorDoc()

    if (tool() === 'measure' && current && points.length > 0) {
      pathPoints.push(current)
    }

    return pathPoints
  })

  const markPathPreview = createMemo(() => {
    const anchor = markAnchor()
    if (!anchor) {
      return [] as Point[]
    }

    const pathPoints = [anchor, ...markCorners()]
    const current = cursorDoc()

    if (tool() === 'measure_mark' && current) {
      pathPoints.push(current)
    }

    return pathPoints
  })

  const linearAutoSpacingPathPreview = createMemo(() => {
    const vertices = linearAutoSpacingVertices()
    if (vertices.length === 0) {
      return [] as Point[]
    }

    const pathPoints = vertices.slice()
    const current = cursorDoc()

    if (tool() === 'linear_auto_spacing' && current) {
      pathPoints.push(current)
    }

    return pathPoints
  })

  function selectedTargetsForZOrder(): Selection[] {
    const currentTool = tool()
    if (currentTool === 'select') {
      const current = selected()
      if (current) {
        return [current]
      }
      return multiSelection()
    }

    if (currentTool === 'multi_select') {
      return multiSelection()
    }

    return []
  }

  function canMoveSelectedToZEdge(direction: 'front' | 'back'): boolean {
    return canMoveSelectionsByZStep(project(), selectedTargetsForZOrder(), direction)
  }

  const canBringSelectedToFront = createMemo(() => canMoveSelectedToZEdge('front'))
  const canSendSelectedToBack = createMemo(() => canMoveSelectedToZEdge('back'))

  const selectedLegendPlacement = createMemo(() => {
    const current = selected()
    if (current?.kind !== 'legend') {
      return null
    }

    return project().legend.placements.find((entry) => entry.id === current.id) ?? null
  })

  const selectedGeneralNotesPlacement = createMemo(() => {
    const current = selected()
    if (current?.kind !== 'general_note') {
      return null
    }

    return project().generalNotes.placements.find((entry) => entry.id === current.id) ?? null
  })

  const selectedSymbolType = createMemo<SymbolType | null>(() => {
    const current = selected()
    if (current?.kind !== 'symbol') {
      return null
    }

    return project().elements.symbols.find((entry) => entry.id === current.id)?.symbolType ?? null
  })

  const selectedDownleadSymbol = createMemo(() => {
    const current = selected()
    if (current?.kind !== 'symbol') {
      return null
    }

    const symbol = project().elements.symbols.find((entry) => entry.id === current.id) ?? null
    if (!symbol || !isDownleadSymbolType(symbol.symbolType)) {
      return null
    }

    return symbol
  })

  createEffect(() => {
    const symbol = selectedDownleadSymbol()
    if (!symbol) {
      setDownleadVerticalFootageSelectedInput('')
      return
    }

    setDownleadVerticalFootageSelectedInput(String(symbolVerticalFootageFt(symbol)))
  })

  const overlaySelected = createMemo<Selection | null>(() => {
    if (tool() === 'arc_auto_spacing') {
      const targetId = arcAutoSpacingTargetId()
      return targetId ? { kind: 'arc', id: targetId } : null
    }

    if (tool() === 'multi_select') {
      return null
    }

    return selected()
  })

  const overlayMultiSelectedKeys = createMemo<ReadonlySet<string>>(() => {
    if (tool() !== 'multi_select') {
      return new Set()
    }

    return selectionsKeySet(multiSelection())
  })

  const selectionHandlePreview = createMemo<SelectionHandlePreview | null>(() => {
    if (tool() !== 'select') {
      return null
    }

    const current = selected()
    if (!current) {
      return null
    }

    const p = visibleProject()

    if (current.kind === 'line') {
      const line = p.elements.lines.find((entry) => entry.id === current.id)
      if (!line) {
        return null
      }

      return {
        kind: 'line',
        start: line.start,
        end: line.end,
      }
    }

    if (current.kind === 'arrow') {
      const arrow = p.elements.arrows.find((entry) => entry.id === current.id)
      if (!arrow) {
        return null
      }

      return {
        kind: 'arrow',
        tail: arrow.tail,
        head: arrow.head,
      }
    }

    if (current.kind === 'curve') {
      const curve = p.elements.curves.find((entry) => entry.id === current.id)
      if (!curve) {
        return null
      }

      return {
        kind: 'curve',
        start: curve.start,
        through: curveThroughPoint(curve),
        end: curve.end,
      }
    }

    if (current.kind === 'arc') {
      const arc = p.elements.arcs.find((entry) => entry.id === current.id)
      if (!arc) {
        return null
      }

      return {
        kind: 'arc',
        start: arc.start,
        through: arc.through,
        end: arc.end,
      }
    }

    if (current.kind === 'symbol') {
      const symbol = p.elements.symbols.find((entry) => entry.id === current.id)
      if (!symbol || !DIRECTIONAL_SYMBOLS.has(symbol.symbolType)) {
        return null
      }

      return {
        kind: 'symbol-direction',
        center: symbol.position,
        handle: directionalSymbolHandlePoint(
          symbol,
          p.view.zoom,
        ),
      }
    }

    return null
  })

  const selectionDebugLabel = createMemo(() => {
    if (!selectionDebugEnabled()) {
      return null
    }

    const selectedEntry = selected()
    const multiSelectedEntries = multiSelection()
    const hoveredEntry = hoveredSelection()
    const drag = dragState()

    const selectedLabel = selectedEntry
      ? `${selectedEntry.kind}:${selectedEntry.id}`
      : 'none'
    const multiSelectedLabel =
      multiSelectedEntries.length > 0
        ? multiSelectedEntries.map((entry) => `${entry.kind}:${entry.id}`).join(',')
        : 'none'
    const hoveredLabel = hoveredEntry
      ? `${hoveredEntry.kind}:${hoveredEntry.id}`
      : 'none'
    const dragLabel =
      !drag
        ? 'none'
        : drag.kind === 'pan'
          ? 'pan'
          : drag.kind === 'move'
            ? drag.selections.length === 1
              ? `move:${drag.selections[0].kind}:${drag.selections[0].id}`
              : `move:${drag.selections.length}`
            : `edit:${drag.handle.kind}:${drag.handle.id}`

    return `selected={${selectedLabel}} multi={${multiSelectedLabel}} hovered={${hoveredLabel}} drag={${dragLabel}}`
  })

  const stageCursor = createMemo(() => {
    const drag = dragState()
    if (drag?.kind === 'pan') {
      return 'grabbing'
    }

    if (tool() === 'pan') {
      return 'grab'
    }

    if (tool() === 'select' || tool() === 'multi_select') {
      return 'pointer'
    }

    return 'auto'
  })

  function handleSelectTool(nextTool: Tool) {
    if (!requireNoOpenEditor('changing tools')) {
      return
    }

    const activeMaterial = project().settings.activeColor
    const toolReasons = toolDisabledReasons(nextTool, project(), activeMaterial)
    if (toolReasons.length > 0) {
      setStatus(toolReasons[0])
      return
    }

    if (nextTool === 'symbol') {
      const symbolReasons = symbolDisabledReasons(activeSymbol(), activeMaterial)
      if (symbolReasons.length > 0) {
        setStatus(symbolReasons[0])
        return
      }
    }

    if (!isToolSelectionAllowed(nextTool, activeSymbol(), project(), activeMaterial)) {
      setStatus('This tool is currently disabled.')
      return
    }

    setTool(nextTool)
    clearTransientToolState()
    helpState.closeIfUnpinned()
    if (nextTool === 'multi_select') {
      setSelected(null)
    } else {
      setMultiSelection([])
    }
  }

  function handleResetArc() {
    setArcStart(null)
    setArcEnd(null)
    setStatus(tool() === 'curve' ? 'Curve operation reset.' : 'Arc operation reset.')
  }

  function handleResetLinearAutoSpacingTrace() {
    resetLinearAutoSpacingTrace()
    setStatus('Linear auto-spacing trace reset.')
  }

  function handleClearMeasurement() {
    clearTargetDistanceSnapLock()
    setMeasurePoints([])
    setStatus('Measurement path cleared.')
  }

  function handleResetMeasureMarkSpan() {
    clearTargetDistanceSnapLock()
    setMarkAnchor(null)
    setMarkCorners([])
    setStatus('Measure & Mark span reset.')
  }

  function handleSetLinearAutoSpacingMaxInput(value: string) {
    setLinearAutoSpacingMaxInput(normalizeNonNegativeIntegerInput(value))
  }

  function handleSetArcAutoSpacingMaxInput(value: string) {
    setArcAutoSpacingMaxInput(normalizeNonNegativeIntegerInput(value))
  }

  function handleSetMeasureTargetDistanceInput(value: string) {
    clearTargetDistanceSnapLock()
    setMeasureTargetDistanceInput(normalizeNonNegativeIntegerInput(value))
  }

  function handleSetCalibrationDistanceInput(value: string) {
    setCalibrationInputError('')
    setCalibrationDistanceInput(value)
  }

  function applyCalibrationFromPendingSpan() {
    const spanDistancePt = pendingCalibrationDistancePt()
    if (!spanDistancePt || spanDistancePt <= 0) {
      setCalibrationInputError('Set a calibration span before applying scale.')
      setError('Set a calibration span before applying scale.')
      return
    }

    const realDistance = Number.parseFloat(calibrationDistanceInput().trim())
    if (!Number.isFinite(realDistance) || realDistance <= 0) {
      setCalibrationInputError('Calibration distance must be a positive number.')
      setError('Calibration distance must be a positive number.')
      return
    }

    commitProjectChange((draft) => {
      const currentPage = draft.view.currentPage
      const nextScale = {
        isSet: true,
        method: 'calibrated' as const,
        realUnitsPerPoint: realUnitsPerPointFromCalibrationSpan(spanDistancePt, realDistance),
        displayUnits: 'ft-in' as const,
      }
      draft.scale = {
        ...nextScale,
        byPage: {
          ...draft.scale.byPage,
          [currentPage]: nextScale,
        },
      }
    })

    setCalibrationPoints([])
    setPendingCalibrationDistancePt(null)
    setCalibrationInputError('')
    setStatus('Scale calibrated from two points.')
  }

  function cancelPendingCalibration() {
    setCalibrationPoints([])
    setPendingCalibrationDistancePt(null)
    setCalibrationInputError('')
    setStatus('Calibration canceled.')
  }

  function handleSetDownleadVerticalFootagePlacementInput(value: string) {
    setDownleadVerticalFootagePlacementInput(normalizeVerticalFootageInput(value))
  }

  function handleSetDownleadVerticalFootageSelectedInput(value: string) {
    setDownleadVerticalFootageSelectedInput(normalizeVerticalFootageInput(value))
  }

  function downleadPlacementVerticalFootageFt(): number {
    const raw = downleadVerticalFootagePlacementInput().trim()
    const parsed = raw.length === 0 ? 0 : Number.parseInt(raw, 10)
    return normalizeVerticalFootageFt(Number.isFinite(parsed) ? parsed : 0)
  }

  function handleCommitDownleadVerticalFootageSelectedInput() {
    if (tool() !== 'select') {
      return
    }

    const selection = selected()
    if (selection?.kind !== 'symbol') {
      return
    }

    const symbol = project().elements.symbols.find((entry) => entry.id === selection.id)
    if (!symbol || !isDownleadSymbolType(symbol.symbolType)) {
      return
    }

    const raw = downleadVerticalFootageSelectedInput().trim()
    const parsed = raw.length === 0 ? 0 : Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Vertical distance must be a zero or positive whole number.')
      return
    }

    const nextValue = normalizeVerticalFootageFt(parsed)
    const currentValue = symbolVerticalFootageFt(symbol)
    if (nextValue === currentValue) {
      setDownleadVerticalFootageSelectedInput(String(currentValue))
      return
    }

    commitProjectChange((draft) => {
      const target = draft.elements.symbols.find((entry) => entry.id === selection.id)
      if (!target || !isDownleadSymbolType(target.symbolType)) {
        return
      }

      target.verticalFootageFt = nextValue
    })

    setDownleadVerticalFootageSelectedInput(String(nextValue))
    setStatus('Vertical distance updated.')
  }

  function handleSetActiveSymbol(nextSymbol: SymbolType) {
    const reasons = symbolDisabledReasons(nextSymbol, project().settings.activeColor)
    if (reasons.length > 0) {
      setStatus(reasons[0])
      return
    }

    setActiveSymbol(nextSymbol)
    setSymbolDirectionStart(null)
  }

  function handleSetActiveSymbolLetter(letter: string) {
    const normalized = normalizeSymbolLetter(letter)
    if (!normalized) {
      setActiveSymbolLetter(preferredAtLetterForMaterial(project().settings.activeColor))
      return
    }

    setActiveSymbolLetter(normalized)
  }

  function handleResetArrow() {
    setArrowStart(null)
    setStatus('Arrow operation reset.')
  }

  function handleResetDimensionText() {
    setDimensionStart(null)
    setDimensionEnd(null)
    setStatus('Dimension text operation reset.')
  }

  function handleSetDimensionShowLinework(enabled: boolean) {
    setDimensionShowLinework(enabled)
  }

  function moveSelectedToZEdge(direction: 'front' | 'back') {
    const targets = selectedTargetsForZOrder()
    if (!canMoveSelectionsByZStep(project(), targets, direction)) {
      return
    }

    commitProjectChange((draft) => {
      moveSelectionsByZStep(draft, targets, direction)
    })

    setStatus(direction === 'front' ? 'Selection brought forward.' : 'Selection sent back.')
  }

  function handleSetActiveClass(nextClass: 'class1' | 'class2') {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        activeClass: nextClass,
      },
    }))
  }

  function handleSetActiveColor(color: MaterialColor) {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        activeColor: color,
      },
    }))

    const currentTool = tool()
    if (!isToolSelectionAllowed(currentTool, activeSymbol(), project(), color)) {
      const reasons =
        currentTool === 'symbol'
          ? symbolDisabledReasons(activeSymbol(), color)
          : toolDisabledReasons(currentTool, project(), color)
      handleSelectTool('select')
      if (reasons.length > 0) {
        setStatus(`${reasons[0]} Switched to Select.`)
      } else {
        setStatus('Current tool is unavailable. Switched to Select.')
      }
    }
  }

  function handleSetDesignScale(designScale: DesignScale) {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        designScale,
      },
    }))
  }

  function handleSetLegendDataScope(scope: DataScope) {
    if (project().settings.legendDataScope === scope) {
      return
    }

    commitProjectChange((draft) => {
      draft.settings.legendDataScope = scope
    })

    const current = selected()
    if (current?.kind === 'legend') {
      editLegendPlacementById(current.id)
    }
    setStatus(scope === 'page' ? 'Legend data scope set to page.' : 'Legend data scope set to global.')
  }

  function handleSetNotesDataScope(scope: DataScope) {
    if (project().settings.notesDataScope === scope) {
      return
    }

    commitProjectChange((draft) => {
      draft.settings.notesDataScope = scope
    })

    const current = selected()
    if (current?.kind === 'general_note') {
      editGeneralNotesPlacementById(current.id)
    }
    setStatus(scope === 'page' ? 'General notes scope set to page.' : 'General notes scope set to global.')
  }

  function handlePreviewPdfBrightness(value: number) {
    setPdfBrightnessPreview(clampPdfBrightness(value))
  }

  function handleCommitPdfBrightness(value: number) {
    const clamped = clampPdfBrightness(value)
    setPdfBrightnessPreview(clamped)

    if (Math.abs(project().settings.pdfBrightness - clamped) < 0.0001) {
      return
    }

    commitProjectChange((draft) => {
      const currentPage = draft.view.currentPage
      draft.settings.pdfBrightness = clamped
      draft.settings.pdfBrightnessByPage = {
        ...draft.settings.pdfBrightnessByPage,
        [currentPage]: clamped,
      }
    })
  }

  function handleSetSnapEnabled(enabled: boolean) {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        snapEnabled: enabled,
      },
    }))
    if (!enabled) {
      setSnapPointPreview(null)
    }
  }

  function handleSetAutoConnectorsEnabled(enabled: boolean) {
    commitProjectChange((draft) => {
      draft.settings.autoConnectorsEnabled = enabled
    })
    setStatus(enabled ? 'Auto-connectors enabled.' : 'Auto-connectors disabled.')
  }

  function handleSetAutoConnectorType(type: AutoConnectorType) {
    if (project().settings.autoConnectorType === type) {
      return
    }

    commitProjectChange((draft) => {
      draft.settings.autoConnectorType = type
    })
    setStatus(`Auto-connector type: ${type === 'cadweld' ? 'Cadweld' : 'Mechanical'}.`)
  }

  function handleSetAngleSnapEnabled(enabled: boolean) {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        angleSnapEnabled: enabled,
      },
    }))
  }

  function layerScopeForSelection(
    projectState: LpProject,
    selection: Selection | null,
  ): { layerId: LayerId; sublayerId: LayerSublayerId | null } | null {
    if (!selection) {
      return null
    }

    if (selection.kind === 'line') {
      const line = projectState.elements.lines.find((entry) => entry.id === selection.id)
      return line
        ? { layerId: conductorLayer(line.color), sublayerId: null }
        : null
    }

    if (selection.kind === 'arc') {
      const arc = projectState.elements.arcs.find((entry) => entry.id === selection.id)
      return arc
        ? { layerId: conductorLayer(arc.color), sublayerId: null }
        : null
    }

    if (selection.kind === 'curve') {
      const curve = projectState.elements.curves.find((entry) => entry.id === selection.id)
      return curve
        ? { layerId: conductorLayer(curve.color), sublayerId: null }
        : null
    }

    if (selection.kind === 'symbol') {
      const symbol = projectState.elements.symbols.find((entry) => entry.id === selection.id)
      return symbol
        ? { layerId: symbolLayer(symbol.symbolType), sublayerId: symbolSublayer(symbol.symbolType) }
        : null
    }

    if (selection.kind === 'text') {
      const textElement = projectState.elements.texts.find((entry) => entry.id === selection.id)
      return textElement ? { layerId: textElement.layer, sublayerId: null } : null
    }

    if (selection.kind === 'dimension_text') {
      const dimensionText = projectState.elements.dimensionTexts.find((entry) => entry.id === selection.id)
      return dimensionText ? { layerId: dimensionText.layer, sublayerId: null } : null
    }

    if (selection.kind === 'arrow') {
      const arrow = projectState.elements.arrows.find((entry) => entry.id === selection.id)
      return arrow ? { layerId: arrow.layer, sublayerId: null } : null
    }

    return { layerId: 'annotation', sublayerId: null }
  }

  function handleSetLayerVisible(layerId: LayerId, visible: boolean) {
    if (!requireNoOpenEditor('changing layer visibility')) {
      return
    }

    const currentProject = project()
    setProject((prev) => ({
      ...prev,
      layers: {
        ...prev.layers,
        [layerId]: visible,
        sublayers:
          layerId === 'rooftop' && !visible
            ? {
              ...prev.layers.sublayers,
              connections: false,
            }
            : prev.layers.sublayers,
      },
    }))

    if (visible) {
      return
    }

    if (layerScopeForSelection(currentProject, selected())?.layerId === layerId) {
      setSelected(null)
    }

    const filteredMultiSelection = multiSelection().filter(
      (entry) => layerScopeForSelection(currentProject, entry)?.layerId !== layerId,
    )
    if (filteredMultiSelection.length !== multiSelection().length) {
      setMultiSelection(filteredMultiSelection)
    }

    if (layerScopeForSelection(currentProject, hoveredSelection())?.layerId === layerId) {
      setHoveredSelection(null)
    }

    const activeAnnotationEditor = annotationEdit()
    if (activeAnnotationEditor && activeAnnotationEditor.layer === layerId) {
      setAnnotationEdit(null)
    }

    if (layerId === 'annotation' && generalNotesEdit()) {
      closeGeneralNotesDialog()
    }

    if (layerId === 'rooftop') {
      setArcAutoSpacingTargetId(null)
    }

    setSnapPointPreview(null)
  }

  function handleSetLayerSublayerVisible(sublayerId: LayerSublayerId, visible: boolean) {
    const currentProject = project()
    if (sublayerId === 'connections' && !currentProject.layers.rooftop) {
      return
    }

    setProject((prev) => ({
      ...prev,
      layers: {
        ...prev.layers,
        sublayers: {
          ...prev.layers.sublayers,
          [sublayerId]: visible,
        },
      },
    }))

    if (visible) {
      return
    }

    if (layerScopeForSelection(currentProject, selected())?.sublayerId === sublayerId) {
      setSelected(null)
    }

    const filteredMultiSelection = multiSelection().filter(
      (entry) => layerScopeForSelection(currentProject, entry)?.sublayerId !== sublayerId,
    )
    if (filteredMultiSelection.length !== multiSelection().length) {
      setMultiSelection(filteredMultiSelection)
    }

    if (layerScopeForSelection(currentProject, hoveredSelection())?.sublayerId === sublayerId) {
      setHoveredSelection(null)
    }

    setSnapPointPreview(null)
  }

  const annotationScale = createMemo(() =>
    annotationScaleFactor(project().settings.designScale),
  )
  const textFontSizePx = createMemo(() =>
    textFontSizePxForScale(annotationScale()),
  )
  const textLineHeightPx = createMemo(() =>
    textLineHeightPxForScale(annotationScale()),
  )
  const legendUi = createMemo(() => ({
    title: LEGEND_TITLE,
    ...scaledLegendMetrics(annotationScale()),
  }))
  const approximateTextWidthWithScale = (text: string) =>
    approximateTextWidthForScale(text, annotationScale())
  const dimensionTextLabelWithScale = (entry: DimensionTextElement) =>
    dimensionTextLabel(entry, project().scale)
  const legendBoxSizeWithScale = (entries: LegendDisplayEntry[]) =>
    legendBoxSize(entries, annotationScale(), legendUi())
  const handleImportPdfUi = (event: Event) => {
    void handleImportPdf(event)
  }
  const handleLoadProjectUi = (event: Event) => {
    void handleLoadProject(event)
  }
  const handleExportImageUi = (format: 'png' | 'jpg') => {
    void handleExportImage(format)
  }
  const handleExportPdfUi = () => {
    void handleExportPdf()
  }
  const handleClearLegendCustomSuffix = () => {
    setLegendCustomSuffixInput('')
  }
  const handleEditSelectedLegend = () => {
    const placement = selectedLegendPlacement()
    if (!placement) {
      return
    }
    editLegendPlacementById(placement.id)
  }
  const handleEditSelectedGeneralNotes = () => {
    const placement = selectedGeneralNotesPlacement()
    if (!placement) {
      return
    }
    editGeneralNotesPlacementById(placement.id)
  }
  const handleBringSelectedToFront = () => {
    moveSelectedToZEdge('front')
  }
  const handleSendSelectedToBack = () => {
    moveSelectedToZEdge('back')
  }
  const sidebarController = createSidebarController({
    get project() {
      return project()
    },
    get hasPdf() {
      return hasPdf()
    },
    get supportsNativeFileDialogs() {
      return supportsNativeFileDialogs
    },
    get tool() {
      return tool()
    },
    get selectedKind() {
      return selected()?.kind ?? null
    },
    get multiSelectionCount() {
      return multiSelection().length
    },
    toolOptions: TOOL_OPTIONS,
    get lineStart() {
      return lineStart()
    },
    get lineContinuous() {
      return lineContinuous()
    },
    get curveContinuous() {
      return curveContinuous()
    },
    get arcStart() {
      return arcStart()
    },
    get arcEnd() {
      return arcEnd()
    },
    get dimensionStart() {
      return dimensionStart()
    },
    get dimensionEnd() {
      return dimensionEnd()
    },
    get dimensionShowLinework() {
      return dimensionShowLinework()
    },
    get linearAutoSpacingMaxInput() {
      return linearAutoSpacingMaxInput()
    },
    get linearAutoSpacingVerticesCount() {
      return linearAutoSpacingVertices().length
    },
    get arcAutoSpacingMaxInput() {
      return arcAutoSpacingMaxInput()
    },
    get arcAutoSpacingTargetSet() {
      return arcAutoSpacingTargetId() !== null
    },
    get touchCornerMode() {
      return touchCornerMode()
    },
    get activeSymbol() {
      return activeSymbol()
    },
    get selectedSymbolType() {
      return selectedSymbolType()
    },
    get downleadVerticalFootagePlacementInput() {
      return downleadVerticalFootagePlacementInput()
    },
    get downleadVerticalFootageSelectedInput() {
      return downleadVerticalFootageSelectedInput()
    },
    get activeSymbolLetter() {
      return activeSymbolLetter()
    },
    get legendCustomSuffixInput() {
      return legendCustomSuffixInput()
    },
    symbolOptions: SYMBOL_OPTIONS,
    symbolLabels: SYMBOL_LABELS,
    get textDraftInput() {
      return textDraftInput()
    },
    get arrowStart() {
      return arrowStart()
    },
    get symbolDirectionStart() {
      return symbolDirectionStart()
    },
    get selectedLegendPlacement() {
      return selectedLegendPlacement()
    },
    get selectedGeneralNotesPlacement() {
      return selectedGeneralNotesPlacement()
    },
    colorOptions: COLOR_OPTIONS,
    colorHex: COLOR_HEX,
    get pdfBrightness() {
      return effectivePdfBrightness()
    },
    get currentPage() {
      return project().view.currentPage
    },
    get pageCount() {
      return normalizePageCount(project().pdf.pageCount)
    },
    get canGoToPreviousPage() {
      return project().view.currentPage > 1
    },
    get canGoToNextPage() {
      return project().view.currentPage < normalizePageCount(project().pdf.pageCount)
    },
    get manualScaleInchesInput() {
      return manualScaleInchesInput()
    },
    get manualScaleFeetInput() {
      return manualScaleFeetInput()
    },
    get manualScaleDirty() {
      return manualScaleDirty()
    },
    get measureTargetDistanceInput() {
      return measureTargetDistanceInput()
    },
    get calibrationPointsCount() {
      return calibrationPoints().length
    },
    get calibrationPendingDistancePt() {
      return pendingCalibrationDistancePt()
    },
    get calibrationDistanceInput() {
      return calibrationDistanceInput()
    },
    get calibrationInputError() {
      return calibrationInputError()
    },
    get currentScaleInfo() {
      return currentScaleInfo()
    },
    get historyPastCount() {
      return history().past.length
    },
    get historyFutureCount() {
      return history().future.length
    },
    get canBringSelectedToFront() {
      return canBringSelectedToFront()
    },
    get canSendSelectedToBack() {
      return canSendSelectedToBack()
    },
    get statusMessage() {
      return statusMessage()
    },
    get errorMessage() {
      return errorMessage()
    },
    onRefocusCanvasFromInputCommit: refocusCanvasFromInputCommit,
    onSetProjectName: handleSetProjectName,
    onImportPdf: handleImportPdfUi,
    onImportPdfPicker: () => {
      void handleImportPdfPicker()
    },
    onSaveProject: handleSaveProject,
    onLoadProject: handleLoadProjectUi,
    onLoadProjectPicker: () => {
      void handleLoadProjectPicker()
    },
    onExportImage: handleExportImageUi,
    onExportPdf: handleExportPdfUi,
    onOpenReportDialog: handleOpenReportDialog,
    onSelectTool: handleSelectTool,
    onSetLineContinuous: setLineContinuous,
    onSetCurveContinuous: setCurveContinuous,
    onResetArc: handleResetArc,
    onSetLinearAutoSpacingMaxInput: handleSetLinearAutoSpacingMaxInput,
    onFinishLinearAutoSpacing: finishLinearAutoSpacing,
    onResetLinearAutoSpacingTrace: handleResetLinearAutoSpacingTrace,
    onSetArcAutoSpacingMaxInput: handleSetArcAutoSpacingMaxInput,
    onApplyArcAutoSpacing: applyArcAutoSpacing,
    onClearArcAutoSpacingTarget: clearArcAutoSpacingTarget,
    onSetTouchCornerMode: setTouchCornerMode,
    onClearMeasurement: handleClearMeasurement,
    onResetMeasureMarkSpan: handleResetMeasureMarkSpan,
    onClearAllMarks: handleClearAllMarks,
    onSetActiveSymbol: handleSetActiveSymbol,
    onSetDownleadVerticalFootagePlacementInput: handleSetDownleadVerticalFootagePlacementInput,
    onSetDownleadVerticalFootageSelectedInput: handleSetDownleadVerticalFootageSelectedInput,
    onCommitDownleadVerticalFootageSelectedInput: handleCommitDownleadVerticalFootageSelectedInput,
    onSetTextDraftInput: setTextDraftInput,
    onSetActiveSymbolLetter: handleSetActiveSymbolLetter,
    onSetLegendCustomSuffixInput: setLegendCustomSuffixInput,
    onClearLegendCustomSuffix: handleClearLegendCustomSuffix,
    onResetArrow: handleResetArrow,
    onResetDimensionText: handleResetDimensionText,
    onSetDimensionShowLinework: handleSetDimensionShowLinework,
    onEditSelectedLegend: handleEditSelectedLegend,
    onEditSelectedGeneralNotes: handleEditSelectedGeneralNotes,
    onSetActiveClass: handleSetActiveClass,
    onSetActiveColor: handleSetActiveColor,
    onSetDesignScale: handleSetDesignScale,
    onPreviewPdfBrightness: handlePreviewPdfBrightness,
    onCommitPdfBrightness: handleCommitPdfBrightness,
    onGoToPreviousPage: handleGoToPreviousPage,
    onGoToNextPage: handleGoToNextPage,
    onSetSnapEnabled: handleSetSnapEnabled,
    onSetAutoConnectorsEnabled: handleSetAutoConnectorsEnabled,
    onSetAutoConnectorType: handleSetAutoConnectorType,
    onSetAngleSnapEnabled: handleSetAngleSnapEnabled,
    onSetLayerVisible: handleSetLayerVisible,
    onSetLayerSublayerVisible: handleSetLayerSublayerVisible,
    onSetManualScaleInchesInput: setManualScaleInchesInput,
    onSetManualScaleFeetInput: setManualScaleFeetInput,
    onSetMeasureTargetDistanceInput: handleSetMeasureTargetDistanceInput,
    onSetCalibrationDistanceInput: handleSetCalibrationDistanceInput,
    onApplyCalibration: applyCalibrationFromPendingSpan,
    onCancelCalibration: cancelPendingCalibration,
    onApplyManualScale: applyManualScale,
    onBringSelectedToFront: handleBringSelectedToFront,
    onSendSelectedToBack: handleSendSelectedToBack,
    onUndo: handleUndo,
    onRedo: handleRedo,
  })

  return (
    <HelpProvider value={helpState}>
    <div class="app-shell">
      <AppControllerProvider value={sidebarController}>
        <AppSidebar />

        <CanvasStage
          project={project()}
          hasPdf={hasPdf()}
          supportsNativeFileDialogs={supportsNativeFileDialogs}
          tool={tool()}
          activeSymbol={activeSymbol()}
          colorOptions={COLOR_OPTIONS}
          scaleIsSet={project().scale.isSet}
          scaleRealUnitsPerPoint={project().scale.realUnitsPerPoint}
          selectedKind={selected()?.kind ?? null}
          historyPastCount={history().past.length}
          historyFutureCount={history().future.length}
          snapEnabled={project().settings.snapEnabled}
          angleSnapEnabled={project().settings.angleSnapEnabled}
          autoConnectorsEnabled={project().settings.autoConnectorsEnabled}
          autoConnectorType={project().settings.autoConnectorType}
          activeClass={project().settings.activeClass}
          activeColor={project().settings.activeColor}
          layers={project().layers}
          onSelectTool={handleSelectTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
          stageCursor={stageCursor()}
          selectionDebugEnabled={selectionDebugEnabled()}
          onSetSelectionDebugEnabled={setSelectionDebugEnabled}
          calibrationPreview={calibrationPreview()}
          lineSegmentDistanceLabel={lineSegmentDistanceLabel()}
          linePathTotalDistanceLabel={linePathTotalDistanceLabel()}
          measureDistanceLabel={measureDistanceLabel()}
          markSpanDistanceLabel={markSpanDistanceLabel()}
          linearAutoSpacingPathDistanceLabel={linearAutoSpacingPathDistanceLabel()}
          pdfBrightness={effectivePdfBrightness()}
          manualScaleInchesInput={manualScaleInchesInput()}
          manualScaleFeetInput={manualScaleFeetInput()}
          currentScaleInfo={currentScaleInfo()}
          manualScaleDirty={manualScaleDirty()}
          designScale={project().settings.designScale}
          toolOptionsSlot={(
            <PropertiesToolOptions />
          )}
          onSetActiveSymbol={handleSetActiveSymbol}
          onImportPdf={(event) => void handleImportPdf(event)}
          onImportPdfPicker={() => void handleImportPdfPicker()}
          onImportPdfDrop={handleImportPdfDrop}
          onLoadProject={(event) => void handleLoadProject(event)}
          onLoadProjectPicker={() => void handleLoadProjectPicker()}
          onSaveProject={handleSaveProject}
          onExportImage={handleExportImageUi}
          onExportPdf={handleExportPdfUi}
          onSetSnapEnabled={handleSetSnapEnabled}
          onSetAngleSnapEnabled={handleSetAngleSnapEnabled}
          onSetAutoConnectorsEnabled={handleSetAutoConnectorsEnabled}
          onSetAutoConnectorType={handleSetAutoConnectorType}
          onSetActiveClass={handleSetActiveClass}
          onSetActiveColor={handleSetActiveColor}
          onSetLayerVisible={handleSetLayerVisible}
          onSetManualScaleInchesInput={setManualScaleInchesInput}
          onSetManualScaleFeetInput={setManualScaleFeetInput}
          onApplyManualScale={applyManualScale}
          onSetDesignScale={handleSetDesignScale}
          onPreviewPdfBrightness={handlePreviewPdfBrightness}
          onCommitPdfBrightness={handleCommitPdfBrightness}
          onQuickAccessEditingContextChange={setQuickAccessEditingContextActive}
          onRefocusCanvasFromInputCommit={refocusCanvasFromInputCommit}
          setStageRef={(element) => {
            stageRef = element
            stageResizeObserver?.disconnect()
            if (typeof ResizeObserver !== 'undefined') {
              stageResizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0]
                if (entry) {
                  setStageDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
                }
              })
              stageResizeObserver.observe(element)
            }
            setStageDimensions({ width: element.clientWidth, height: element.clientHeight })
          }}
          setPdfCanvasRef={(element) => {
            pdfCanvasRef = element
            bindPdfCanvasRef(element)
          }}
          onPointerDown={handleToolPointerDown}
          onPointerMove={handleToolPointerMove}
          onPointerUp={handleToolPointerUp}
          onPointerCancel={handleToolPointerCancel}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          <OverlayLayer
            project={viewportVisibleProject()}
            annotationScale={annotationScale()}
            selected={overlaySelected()}
            multiSelectedKeys={overlayMultiSelectedKeys()}
            hovered={hoveredSelection()}
            legendUi={legendUi()}
            textFontSizePx={textFontSizePx()}
            textLineHeightPx={textLineHeightPx()}
            approximateTextWidth={approximateTextWidthWithScale}
            legendEntriesForPlacement={legendEntriesForPlacement}
            legendBoxSize={legendBoxSizeWithScale}
            legendLineText={legendLineText}
            measurePathPreview={measurePathPreview()}
            markPathPreview={markPathPreview()}
            linearAutoSpacingPathPreview={linearAutoSpacingPathPreview()}
            linearAutoSpacingVertices={linearAutoSpacingVertices()}
            linearAutoSpacingCorners={linearAutoSpacingCorners()}
            arcChordPreview={arcChordPreview()}
            arcCurvePreview={arcCurvePreview()}
            linePreview={linePreview()}
            dimensionTextPreview={dimensionTextPreview()}
            directionPreview={directionPreview()}
            arrowPreview={arrowPreview()}
            calibrationLinePreview={calibrationLinePreview()}
            dimensionTextLabel={dimensionTextLabelWithScale}
            snapPointPreview={snapPointPreview()}
            selectionHandlePreview={selectionHandlePreview()}
            selectionDebugLabel={selectionDebugLabel()}
          />
        </CanvasStage>

        <Show when={annotationEdit()}>
          {(editor) => (
            <AnnotationEditDialog
              editor={editor()}
              onSetInput={(value) =>
                setAnnotationEdit((prev) =>
                  prev
                    ? {
                      ...prev,
                      input: value,
                    }
                    : prev,
                )
              }
              onSetLayer={(layer) =>
                setAnnotationEdit((prev) =>
                  prev
                    ? {
                      ...prev,
                      layer,
                    }
                    : prev,
                )
              }
              onApply={applyAnnotationEditor}
              onCancel={() => setAnnotationEdit(null)}
            />
          )}
        </Show>

        <Show when={legendLabelEdit()}>
          {(editor) => (
            <LegendLabelDialog
              editor={editor()}
              scope={project().settings.legendDataScope}
              setDialogRef={(element) => bindLegendLabelDialogRef(element, editor().screen)}
              onTitlePointerDown={handleLegendLabelDialogPointerDown}
              onTitlePointerMove={handleLegendLabelDialogPointerMove}
              onTitlePointerUp={handleLegendLabelDialogPointerUp}
              onSetScope={handleSetLegendDataScope}
              onSetInput={setLegendLabelEditorInput}
              onApply={applyLegendLabelEditor}
              onCancel={closeLegendLabelDialog}
            />
          )}
        </Show>

        <Show when={generalNotesEdit()}>
          {(editor) => (
            <GeneralNotesDialog
              editor={editor()}
              title={GENERAL_NOTES_TITLE}
              maxNotes={MAX_GENERAL_NOTES_COUNT}
              scope={project().settings.notesDataScope}
              setDialogRef={(element) => bindGeneralNotesDialogRef(element, editor().screen)}
              onTitlePointerDown={handleGeneralNotesDialogPointerDown}
              onTitlePointerMove={handleGeneralNotesDialogPointerMove}
              onTitlePointerUp={handleGeneralNotesDialogPointerUp}
              onSetScope={handleSetNotesDataScope}
              onSetInput={setGeneralNotesEditorInput}
              onMoveRow={moveGeneralNotesEditorRow}
              onRemoveRow={removeGeneralNotesEditorRow}
              onAddRow={addGeneralNotesEditorRow}
              onApply={applyGeneralNotesEditor}
              onCancel={closeGeneralNotesDialog}
            />
          )}
        </Show>

        <Show when={reportDialogOpen()}>
          <ReportDialog
            draft={reportDraft()}
            submitting={reportSubmitting()}
            errorMessage={reportDialogError()}
            onSetType={handleSetReportType}
            onSetTitle={handleSetReportTitle}
            onSetDetails={handleSetReportDetails}
            onSetReproSteps={handleSetReportReproSteps}
            onSubmit={() => {
              void handleSubmitReport()
            }}
            onCancel={handleCloseReportDialog}
          />
        </Show>
      </AppControllerProvider>

      <HelpDrawer />
    </div>
    </HelpProvider>
  )
}

export default App
