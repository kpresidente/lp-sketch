import { createSignal, Show, type JSX } from 'solid-js'
import { MISC_ICON, tablerIconClass } from '../config/iconRegistry'
import { useAppController } from '../context/AppControllerContext'
import PropertiesBar from './PropertiesBar'
import QuickAccessBar from './QuickAccessBar'

type StagePointerHandler = (event: PointerEvent & { currentTarget: HTMLDivElement }) => void

/**
 * Stage-only props. Everything else the stage and its chrome need comes from
 * `useAppController()`.
 */
interface CanvasStageProps {
  inert?: boolean
  setStageRef: (element: HTMLDivElement) => void
  setPdfCanvasRef: (element: HTMLCanvasElement) => void
  onPointerDown: StagePointerHandler
  onPointerMove: StagePointerHandler
  onPointerUp: StagePointerHandler
  onPointerCancel: StagePointerHandler
  onLostPointerCapture: StagePointerHandler
  onWheel: (event: WheelEvent & { currentTarget: HTMLDivElement }) => void
  onDoubleClick: (event: MouseEvent & { currentTarget: HTMLDivElement }) => void
  children: JSX.Element
}

export default function CanvasStage(props: CanvasStageProps) {
  const controller = useAppController()
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
    <main class="workspace" inert={props.inert}>
      <PropertiesBar />

      <div class="workspace-stage-shell">
        <div
          ref={props.setStageRef}
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

        <QuickAccessBar />
      </div>
    </main>
  )
}
