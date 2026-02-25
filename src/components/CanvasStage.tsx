import { createSignal, Show, type JSX } from 'solid-js'
import type {
  AutoConnectorType,
  DesignScale,
  LayerId,
  LpProject,
  MaterialColor,
  Selection,
  SymbolType,
  Tool,
} from '../types/project'
import { MISC_ICON, tablerIconClass } from '../config/iconRegistry'
import PropertiesBar from './PropertiesBar'
import QuickAccessBar from './QuickAccessBar'

interface CanvasStageProps {
  project: LpProject
  hasPdf: boolean
  tool: Tool
  activeSymbol: SymbolType
  colorOptions: readonly MaterialColor[]
  scaleIsSet: boolean
  scaleRealUnitsPerPoint: number | null
  selectedKind: Selection['kind'] | null
  historyPastCount: number
  historyFutureCount: number
  snapEnabled: boolean
  angleSnapEnabled: boolean
  autoConnectorsEnabled: boolean
  autoConnectorType: AutoConnectorType
  activeClass: 'class1' | 'class2'
  activeColor: MaterialColor
  layers: Readonly<Record<LayerId, boolean>>
  onSelectTool: (tool: Tool) => void
  onUndo: () => void
  onRedo: () => void
  stageCursor: string
  selectionDebugEnabled: boolean
  onSetSelectionDebugEnabled: (enabled: boolean) => void
  calibrationPreview: string | null
  lineSegmentDistanceLabel: string | null
  linePathTotalDistanceLabel: string | null
  measureDistanceLabel: string | null
  markSpanDistanceLabel: string | null
  linearAutoSpacingPathDistanceLabel: string | null
  pdfBrightness: number
  manualScaleInchesInput: string
  manualScaleFeetInput: string
  currentScaleInfo: string
  designScale: DesignScale
  toolOptionsSlot?: JSX.Element
  onSetActiveSymbol: (symbol: SymbolType) => void
  onImportPdf: (event: Event) => void
  onImportPdfDrop: (file: File) => void
  onLoadProject: (event: Event) => void
  onSaveProject: () => void
  onExportImage: (format: 'png' | 'jpg') => void
  onExportPdf: () => void
  onSetSnapEnabled: (enabled: boolean) => void
  onSetAngleSnapEnabled: (enabled: boolean) => void
  onSetAutoConnectorsEnabled: (enabled: boolean) => void
  onSetAutoConnectorType: (value: AutoConnectorType) => void
  onSetActiveClass: (value: 'class1' | 'class2') => void
  onSetActiveColor: (value: MaterialColor) => void
  onSetLayerVisible: (layer: LayerId, value: boolean) => void
  onSetManualScaleInchesInput: (value: string) => void
  onSetManualScaleFeetInput: (value: string) => void
  onApplyManualScale: () => void
  onSetDesignScale: (value: DesignScale) => void
  onPreviewPdfBrightness: (value: number) => void
  onCommitPdfBrightness: (value: number) => void
  setStageRef: (element: HTMLDivElement) => void
  setPdfCanvasRef: (element: HTMLCanvasElement) => void
  onPointerDown: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onPointerMove: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onPointerUp: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onPointerCancel: (event: PointerEvent & { currentTarget: HTMLDivElement }) => void
  onWheel: (event: WheelEvent & { currentTarget: HTMLDivElement }) => void
  onDoubleClick: (event: MouseEvent & { currentTarget: HTMLDivElement }) => void
  children: JSX.Element
}

export default function CanvasStage(props: CanvasStageProps) {
  let importPdfInput: HTMLInputElement | undefined
  const [skeletonDropActive, setSkeletonDropActive] = createSignal(false)

  function preventDefault(event: DragEvent) {
    event.preventDefault()
  }

  function handleSkeletonDrop(event: DragEvent) {
    event.preventDefault()
    setSkeletonDropActive(false)

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) {
      return
    }

    const file = files[0]
    if (!file) {
      return
    }

    props.onImportPdfDrop(file)
  }

  return (
    <main class="workspace">
      <PropertiesBar
        project={props.project}
        tool={props.tool}
        activeSymbol={props.activeSymbol}
        selectedKind={props.selectedKind}
        historyPastCount={props.historyPastCount}
        historyFutureCount={props.historyFutureCount}
        onSelectTool={props.onSelectTool}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
        selectionDebugEnabled={props.selectionDebugEnabled}
        onSetSelectionDebugEnabled={props.onSetSelectionDebugEnabled}
        calibrationPreview={props.calibrationPreview}
        lineSegmentDistanceLabel={props.lineSegmentDistanceLabel}
        linePathTotalDistanceLabel={props.linePathTotalDistanceLabel}
        measureDistanceLabel={props.measureDistanceLabel}
        markSpanDistanceLabel={props.markSpanDistanceLabel}
        linearAutoSpacingPathDistanceLabel={props.linearAutoSpacingPathDistanceLabel}
        toolOptionsSlot={props.toolOptionsSlot}
      />

      <div class="workspace-stage-shell">
        <div
          ref={props.setStageRef}
          class="drawing-stage"
          role="region"
          aria-label="Drawing canvas"
          style={{ cursor: props.stageCursor }}
          onPointerDown={props.onPointerDown}
          onPointerMove={props.onPointerMove}
          onPointerUp={props.onPointerUp}
          onPointerCancel={props.onPointerCancel}
          onWheel={props.onWheel}
          onDblClick={props.onDoubleClick}
          onContextMenu={(event) => event.preventDefault()}
        >
          <Show when={!props.project.pdf.dataBase64}>
            <div class="canvas-watermark">
              <button
                type="button"
                class={`wm-drop-zone ${skeletonDropActive() ? 'active' : ''}`}
                aria-label="Import PDF by dropping a file or opening file picker"
                onClick={(event) => {
                  event.stopPropagation()
                  importPdfInput?.click()
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onDragOver={(event) => {
                  preventDefault(event)
                  setSkeletonDropActive(true)
                }}
                onDragEnter={(event) => {
                  preventDefault(event)
                  setSkeletonDropActive(true)
                }}
                onDragLeave={() => setSkeletonDropActive(false)}
                onDrop={handleSkeletonDrop}
              >
                <i class={tablerIconClass(MISC_ICON.pdfPlaceholder)} />
              </button>
              <div class="wm-title">Import a PDF to get started</div>
              <div class="wm-sub">Drop a PDF here, or import from your device.</div>
              <button
                type="button"
                class="btn wm-import-btn"
                aria-label="Import PDF"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  importPdfInput?.click()
                }}
              >
                Import PDF
              </button>
              <input
                ref={importPdfInput}
                type="file"
                accept="application/pdf"
                onChange={props.onImportPdf}
                tabIndex={-1}
                aria-hidden="true"
                hidden
              />
            </div>
          </Show>

          <div
            class="camera-layer"
            style={{
              transform: `translate(${props.project.view.pan.x}px, ${props.project.view.pan.y}px) scale(${props.project.view.zoom})`,
              width: `${props.project.pdf.widthPt}px`,
              height: `${props.project.pdf.heightPt}px`,
            }}
          >
            <Show when={props.project.pdf.dataBase64}>
              <>
                <canvas
                  ref={props.setPdfCanvasRef}
                  class="pdf-layer"
                  style={{
                    transform: 'none',
                    width: `${props.project.pdf.widthPt}px`,
                    height: `${props.project.pdf.heightPt}px`,
                  }}
                />
                <div
                  class="pdf-brightness-wash"
                  style={{ opacity: `${Math.max(0, Math.min(1, 1 - props.pdfBrightness))}` }}
                />
              </>
            </Show>

            {props.children}
          </div>
        </div>

        <QuickAccessBar
          hasPdf={props.hasPdf}
          tool={props.tool}
          activeSymbol={props.activeSymbol}
          colorOptions={props.colorOptions}
          scaleIsSet={props.scaleIsSet}
          scaleRealUnitsPerPoint={props.scaleRealUnitsPerPoint}
          historyPastCount={props.historyPastCount}
          historyFutureCount={props.historyFutureCount}
          designScale={props.designScale}
          snapEnabled={props.snapEnabled}
          angleSnapEnabled={props.angleSnapEnabled}
          autoConnectorsEnabled={props.autoConnectorsEnabled}
          autoConnectorType={props.autoConnectorType}
          activeClass={props.activeClass}
          activeColor={props.activeColor}
          layers={props.layers}
          manualScaleInchesInput={props.manualScaleInchesInput}
          manualScaleFeetInput={props.manualScaleFeetInput}
          currentScaleInfo={props.currentScaleInfo}
          pdfBrightness={props.pdfBrightness}
          onSelectTool={props.onSelectTool}
          onSetActiveSymbol={props.onSetActiveSymbol}
          onImportPdf={props.onImportPdf}
          onLoadProject={props.onLoadProject}
          onSaveProject={props.onSaveProject}
          onExportImage={props.onExportImage}
          onExportPdf={props.onExportPdf}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          onSetSnapEnabled={props.onSetSnapEnabled}
          onSetAngleSnapEnabled={props.onSetAngleSnapEnabled}
          onSetAutoConnectorsEnabled={props.onSetAutoConnectorsEnabled}
          onSetAutoConnectorType={props.onSetAutoConnectorType}
          onSetActiveClass={props.onSetActiveClass}
          onSetActiveColor={props.onSetActiveColor}
          onSetLayerVisible={props.onSetLayerVisible}
          onSetManualScaleInchesInput={props.onSetManualScaleInchesInput}
          onSetManualScaleFeetInput={props.onSetManualScaleFeetInput}
          onApplyManualScale={props.onApplyManualScale}
          onSetDesignScale={props.onSetDesignScale}
          onPreviewPdfBrightness={props.onPreviewPdfBrightness}
          onCommitPdfBrightness={props.onCommitPdfBrightness}
        />
      </div>
    </main>
  )
}
