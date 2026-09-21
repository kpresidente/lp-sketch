import { createSignal, onCleanup, Show, type JSX } from 'solid-js'
import { MISC_ICON, tablerIconClass } from '../config/iconRegistry'
import { useAppController } from '../context/AppControllerContext'

type StagePointerHandler = (event: PointerEvent & { currentTarget: HTMLDivElement }) => void

export interface StageSize {
  width: number
  height: number
}

/**
 * Stage-only props. The workspace knows nothing about any panel, bar, or rail;
 * shells arrange those around it. Everything it renders from app state (view
 * transform, PDF page, transparency, cursor, import placeholder) comes from
 * `useAppController()`.
 */
export interface WorkspaceProps {
  /** Receives the `drawing-stage` element for focus management and pointer math. */
  setStageRef: (element: HTMLDivElement) => void
  /** Reports the stage content box on mount and whenever it changes. */
  onStageResize: (size: StageSize) => void
  setPdfCanvasRef: (element: HTMLCanvasElement) => void
  onPointerDown: StagePointerHandler
  onPointerMove: StagePointerHandler
  onPointerUp: StagePointerHandler
  onPointerCancel: StagePointerHandler
  onLostPointerCapture: StagePointerHandler
  onWheel: (event: WheelEvent & { currentTarget: HTMLDivElement }) => void
  onDoubleClick: (event: MouseEvent & { currentTarget: HTMLDivElement }) => void
  /** The overlay renderer. `OverlayLayer` today; the Canvas 2D spike swaps in here. */
  children: JSX.Element
}

export default function Workspace(props: WorkspaceProps) {
  const controller = useAppController()
  let importPdfInput: HTMLInputElement | undefined
  let resizeObserver: ResizeObserver | undefined
  const [skeletonDropActive, setSkeletonDropActive] = createSignal(false)

  function bindStage(element: HTMLDivElement) {
    props.setStageRef(element)
    resizeObserver?.disconnect()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry) {
          props.onStageResize({ width: entry.contentRect.width, height: entry.contentRect.height })
        }
      })
      resizeObserver.observe(element)
    }
    props.onStageResize({ width: element.clientWidth, height: element.clientHeight })
  }

  onCleanup(() => {
    resizeObserver?.disconnect()
  })

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

    controller.onImportPdfDrop(file)
  }

  function openImportPdf() {
    if (controller.supportsNativeFileDialogs) {
      controller.onImportPdfPicker()
      return
    }
    importPdfInput?.click()
  }

  return (
    <div
      ref={bindStage}
      class="drawing-stage"
      role="region"
      aria-label="Drawing canvas"
      tabIndex={-1}
      style={{ cursor: controller.stageCursor }}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerCancel}
      onLostPointerCapture={props.onLostPointerCapture}
      onWheel={props.onWheel}
      onDblClick={props.onDoubleClick}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Show when={!controller.project.pdf.dataBase64}>
        <div class="canvas-watermark">
          <button
            type="button"
            class={`wm-drop-zone ${skeletonDropActive() ? 'active' : ''}`}
            aria-label="Import PDF by dropping a file or opening file picker"
            onClick={(event) => {
              event.stopPropagation()
              openImportPdf()
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
              openImportPdf()
            }}
          >
            Import PDF
          </button>
          <Show when={!controller.supportsNativeFileDialogs}>
            <input
              ref={importPdfInput}
              type="file"
              accept="application/pdf"
              onChange={controller.onImportPdf}
              tabIndex={-1}
              aria-hidden="true"
              hidden
            />
          </Show>
        </div>
      </Show>

      <div
        class="camera-layer"
        style={{
          transform: `translate(${controller.project.view.pan.x}px, ${controller.project.view.pan.y}px) scale(${controller.project.view.zoom})`,
          width: `${controller.project.pdf.widthPt}px`,
          height: `${controller.project.pdf.heightPt}px`,
        }}
      >
        <Show when={controller.project.pdf.dataBase64}>
          <>
            <canvas
              ref={props.setPdfCanvasRef}
              class="pdf-layer"
              style={{
                transform: 'none',
                width: `${controller.project.pdf.widthPt}px`,
                height: `${controller.project.pdf.heightPt}px`,
              }}
            />
            <div
              class="pdf-transparency-wash"
              style={{ opacity: `${Math.max(0, Math.min(1, controller.pdfTransparency))}` }}
            />
          </>
        </Show>

        {props.children}
      </div>
    </div>
  )
}
