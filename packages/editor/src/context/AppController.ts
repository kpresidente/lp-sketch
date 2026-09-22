import type {
  AutoConnectorType,
  DesignScale,
  GeneralNotePlacement,
  LayerId,
  LayerSublayerId,
  LegendPlacement,
  LpProject,
  MaterialColor,
  Selection,
  SymbolType,
  Tool,
} from '@lp-sketch/core/types/project'
import type { CornerKind } from '@lp-sketch/core/lib/spacing'
import type { ReportType } from '../lib/reporting'

/**
 * The single object every block and the drawing stage read state and actions from.
 * `App.tsx` builds it once with reactive getters and delivers it through
 * `AppControllerProvider`; chrome never receives App internals as props.
 */
export interface AppController {
  project: LpProject
  hasPdf: boolean
  supportsNativeFileDialogs: boolean
  tool: Tool
  selectedKind: Selection['kind'] | null
  multiSelectionCount: number
  toolOptions: Array<{ id: Tool; label: string }>
  lineStart: { x: number; y: number } | null
  lineContinuous: boolean
  curveContinuous: boolean
  arcStart: { x: number; y: number } | null
  arcEnd: { x: number; y: number } | null
  dimensionStart: { x: number; y: number } | null
  dimensionEnd: { x: number; y: number } | null
  dimensionShowLinework: boolean
  linearAutoSpacingMaxInput: string
  linearAutoSpacingVerticesCount: number
  arcAutoSpacingMaxInput: string
  arcAutoSpacingTargetSet: boolean
  touchCornerMode: CornerKind
  activeSymbol: SymbolType
  selectedSymbolType: SymbolType | null
  downleadVerticalFootagePlacementInput: string
  downleadVerticalFootageSelectedInput: string
  activeSymbolLetter: string
  legendCustomSuffixInput: string
  symbolOptions: SymbolType[]
  symbolLabels: Record<SymbolType, string>
  textDraftInput: string
  textBackgroundMask: boolean
  selectedTextBackgroundMask: boolean | null
  arrowStart: { x: number; y: number } | null
  symbolDirectionStart: { x: number; y: number } | null
  selectedLegendPlacement: LegendPlacement | null
  selectedGeneralNotesPlacement: GeneralNotePlacement | null
  colorOptions: MaterialColor[]
  colorHex: Record<MaterialColor, string>
  pdfTransparency: number
  currentPage: number
  pageCount: number
  canGoToPreviousPage: boolean
  canGoToNextPage: boolean
  manualScaleInchesInput: string
  manualScaleFeetInput: string
  manualScaleDirty: boolean
  measureTargetDistanceInput: string
  calibrationPointsCount: number
  calibrationPendingDistancePt: number | null
  calibrationDistanceInput: string
  calibrationInputError: string
  currentScaleInfo: string
  historyPastCount: number
  historyFutureCount: number
  canBringSelectedToFront: boolean
  canSendSelectedToBack: boolean
  canDeleteSelection: boolean
  statusMessage: string
  errorMessage: string
  stageCursor: string
  calibrationPreview: string | null
  lineSegmentDistanceLabel: string | null
  linePathTotalDistanceLabel: string | null
  measureDistanceLabel: string | null
  markSpanDistanceLabel: string | null
  linearAutoSpacingPathDistanceLabel: string | null
  selectionDebugEnabled: boolean
  onRefocusCanvasFromInputCommit: () => void
  onSetProjectName: (value: string) => void
  onImportPdf: (event: Event) => void
  onImportPdfPicker: () => void
  onImportPdfDrop: (file: File) => void
  onSaveProject: () => void
  onLoadProject: (event: Event) => void
  onLoadProjectPicker: () => void
  onExportImage: (format: 'png' | 'jpg') => void
  onExportPdf: () => void
  onOpenReportDialog: (type: ReportType) => void
  onSelectTool: (tool: Tool) => void
  onSetLineContinuous: (value: boolean) => void
  onSetCurveContinuous: (value: boolean) => void
  onResetArc: () => void
  onSetLinearAutoSpacingMaxInput: (value: string) => void
  onFinishLinearAutoSpacing: (closed: boolean) => void
  onResetLinearAutoSpacingTrace: () => void
  onSetArcAutoSpacingMaxInput: (value: string) => void
  onApplyArcAutoSpacing: () => void
  onClearArcAutoSpacingTarget: () => void
  onSetTouchCornerMode: (mode: CornerKind) => void
  onClearMeasurement: () => void
  onResetMeasureMarkSpan: () => void
  onClearAllMarks: () => void
  onSetActiveSymbol: (symbolType: SymbolType) => void
  onSetDownleadVerticalFootagePlacementInput: (value: string) => void
  onSetDownleadVerticalFootageSelectedInput: (value: string) => void
  onCommitDownleadVerticalFootageSelectedInput: () => void
  onSetTextDraftInput: (value: string) => void
  onSetTextBackgroundMask: (value: boolean) => void
  onSetActiveSymbolLetter: (value: string) => void
  onSetLegendCustomSuffixInput: (value: string) => void
  onClearLegendCustomSuffix: () => void
  onResetArrow: () => void
  onResetDimensionText: () => void
  onSetDimensionShowLinework: (value: boolean) => void
  onEditSelectedLegend: () => void
  onEditSelectedGeneralNotes: () => void
  onSetActiveClass: (value: 'class1' | 'class2') => void
  onSetActiveColor: (value: MaterialColor) => void
  onSetDesignScale: (value: DesignScale) => void
  onPreviewPdfTransparency: (value: number) => void
  onCommitPdfTransparency: (value: number) => void
  onGoToPreviousPage: () => void
  onGoToNextPage: () => void
  onSetSnapEnabled: (value: boolean) => void
  onSetAutoConnectorsEnabled: (value: boolean) => void
  onSetAutoConnectorType: (value: AutoConnectorType) => void
  onSetAngleSnapEnabled: (value: boolean) => void
  onSetLayerVisible: (layer: LayerId, value: boolean) => void
  onSetLayerSublayerVisible: (sublayer: LayerSublayerId, value: boolean) => void
  onSetManualScaleInchesInput: (value: string) => void
  onSetManualScaleFeetInput: (value: string) => void
  onSetMeasureTargetDistanceInput: (value: string) => void
  onSetCalibrationDistanceInput: (value: string) => void
  onApplyCalibration: () => void
  onCancelCalibration: () => void
  onApplyManualScale: () => void
  onBringSelectedToFront: () => void
  onSendSelectedToBack: () => void
  onDeleteSelection: () => void
  onUndo: () => void
  onRedo: () => void
  onSetSelectionDebugEnabled: (enabled: boolean) => void
  onSetQuickAccessEditingContextActive: (active: boolean) => void
}
