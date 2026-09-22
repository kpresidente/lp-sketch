import { createEffect, createUniqueId, For, on, Show, type JSX } from 'solid-js'
import { createDefaultProject } from '@lp-sketch/core/model/defaultProject'
import type { SymbolType, Tool } from '@lp-sketch/core/types/project'
import AirTerminalTools from '../../blocks/AirTerminalTools'
import AnnotationSizePicker from '../../blocks/AnnotationSizePicker'
import AnnotationTools from '../../blocks/AnnotationTools'
import ClassPicker from '../../blocks/ClassPicker'
import ConductorTools from '../../blocks/ConductorTools'
import ConnectionTools from '../../blocks/ConnectionTools'
import DownleadTools from '../../blocks/DownleadTools'
import DrawingScale from '../../blocks/DrawingScale'
import ExportActions from '../../blocks/ExportActions'
import FileActions from '../../blocks/FileActions'
import GroundingTools from '../../blocks/GroundingTools'
import HistoryControls from '../../blocks/HistoryControls'
import LayerList from '../../blocks/LayerList'
import MaterialPicker from '../../blocks/MaterialPicker'
import ModeSwitch from '../../blocks/ModeSwitch'
import PageNavigation from '../../blocks/PageNavigation'
import PdfBackground from '../../blocks/PdfBackground'
import PenetrationTools from '../../blocks/PenetrationTools'
import ProjectName from '../../blocks/ProjectName'
import Readouts from '../../blocks/Readouts'
import ReportActions from '../../blocks/ReportActions'
import ShellPicker from '../../blocks/ShellPicker'
import SnappingControls from '../../blocks/SnappingControls'
import StatusMessages from '../../blocks/StatusMessages'
import ThemePicker from '../../blocks/ThemePicker'
import PropertiesBar from '../../components/PropertiesBar'
import QuickAccessBar from '../../components/QuickAccessBar'
import { MISC_ICON, SYMBOL_BUTTON_ICON, TOOL_ICON, tablerIconClass } from '../../config/iconRegistry'
import { useAppController } from '../../context/AppControllerContext'
import DismissBackdrop from '../shared/DismissBackdrop'
import type { ShellProps } from '../types'
import { useHoverLayout, type HoverPopover } from './useHoverLayout'
import './hover.css'

const DEFAULT_PROJECT_NAME = createDefaultProject().projectMeta.name

interface DockGroup {
  id: Exclude<HoverPopover, 'setup'>
  label: string
  icon: string
  /** Which tools light the group while active. Placement knowledge only: the blocks own the tools. */
  tools: readonly Tool[]
  symbols: readonly SymbolType[]
}

const DOCK_GROUPS: readonly DockGroup[] = [
  { id: 'conductors', label: 'Conductors', icon: TOOL_ICON.line, tools: ['line', 'arc', 'curve'], symbols: [] },
  {
    id: 'air-terminals',
    label: 'Air Terminals',
    icon: SYMBOL_BUTTON_ICON.air_terminal,
    tools: ['linear_auto_spacing', 'arc_auto_spacing'],
    symbols: ['air_terminal', 'bonded_air_terminal'],
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: SYMBOL_BUTTON_ICON.bond,
    tools: [],
    symbols: [
      'bond',
      'cable_to_cable_connection',
      'cadweld_connection',
      'steel_bond',
      'mechanical_crossrun_connection',
      'cadweld_crossrun_connection',
    ],
  },
  {
    id: 'downleads',
    label: 'Downleads',
    icon: SYMBOL_BUTTON_ICON.conduit_downlead_ground,
    tools: [],
    symbols: [
      'conduit_downlead_ground',
      'conduit_downlead_roof',
      'surface_downlead_ground',
      'surface_downlead_roof',
      'through_roof_to_steel',
      'through_wall_connector',
      'ground_rod',
    ],
  },
  {
    id: 'annotate',
    label: 'Annotate',
    icon: TOOL_ICON.text,
    tools: ['text', 'dimension_text', 'arrow', 'legend', 'general_notes', 'measure', 'measure_mark'],
    symbols: ['break'],
  },
]

/** What each popover holds. Every block stays mounted (hidden) so coverage and reveal helpers see it. */
const POPOVER_BLOCKS: Record<HoverPopover, () => JSX.Element> = {
  setup: () => (
    <>
      <ProjectName />
      <FileActions />
      <ExportActions />
      <ReportActions />
      <PageNavigation />
      <PdfBackground />
      <DrawingScale />
      <AnnotationSizePicker />
      <ThemePicker />
      <ShellPicker />
    </>
  ),
  conductors: () => <ConductorTools />,
  'air-terminals': () => <AirTerminalTools />,
  connections: () => <ConnectionTools />,
  downleads: () => (
    <>
      <DownleadTools />
      <PenetrationTools />
      <GroundingTools />
    </>
  ),
  annotate: () => (
    <>
      <AnnotationTools />
      <LayerList />
    </>
  ),
}

/**
 * The Hover direction (`prototypes/ui-refresh/03-hover.html`): the workspace
 * fills the screen and the chrome floats over it as translucent pills. A dock
 * at the top holds the mode switch and one button per tool group; each button
 * opens a popover with that group's blocks. The project pill opens the setup
 * popover, the material rail sits on the left, the quick-access rail on the
 * right, the tool options and readouts at the bottom, and the snapping
 * switches in the corner. A popover is this shell's only modal chrome: the
 * workspace goes inert and the first outside tap only dismisses.
 */
export default function HoverShell(props: ShellProps) {
  const layout = useHoverLayout()
  const controller = useAppController()
  const baseId = createUniqueId()
  const popoverId = (id: HoverPopover) => `hover-popover-${baseId}-${id}`
  const triggers = new Map<HoverPopover, HTMLButtonElement>()
  const popovers = new Map<HoverPopover, HTMLDivElement>()
  const chromeModalOpen = () => layout.openPopover() !== null
  const isOpen = (id: HoverPopover) => layout.openPopover() === id

  props.onChromeReady({
    chromeModalOpen,
    closeChromeModal: layout.closePopover,
  })

  const projectTitle = () => {
    const name = controller.project.projectMeta.name.trim()
    return name && name !== DEFAULT_PROJECT_NAME ? name : 'LP Sketch'
  }
  const groupIsCurrent = (group: DockGroup) =>
    group.tools.includes(controller.tool) ||
    (controller.tool === 'symbol' && group.symbols.includes(controller.activeSymbol))

  createEffect(on(layout.openPopover, (id, previous) => {
    if (id) popovers.get(id)?.focus({ preventScroll: true })
    else if (previous) triggers.get(previous)?.focus({ preventScroll: true })
  }))

  const popover = (id: HoverPopover, label: string) => (
    <div
      ref={(element) => popovers.set(id, element)}
      id={popoverId(id)}
      class="hover-pill hover-popover"
      classList={{ 'hover-popover-setup': id === 'setup' }}
      role="region"
      aria-label={`${label} popover`}
      hidden={!isOpen(id)}
      tabIndex={-1}
    >
      {POPOVER_BLOCKS[id]()}
    </div>
  )

  return (
    <div class="hover-shell" classList={{ 'has-popover': chromeModalOpen() }}>
      <main class="workspace hover-workspace" inert={chromeModalOpen()}>
        <div class="workspace-stage-shell">
          {props.slots.workspace()}
          <QuickAccessBar />
        </div>
      </main>

      <Show when={chromeModalOpen()}>
        <DismissBackdrop onDismiss={layout.closePopover} />
      </Show>

      <aside class="hover-chrome" aria-label="Primary controls">
        <div class="hover-pill hover-project">
          <span class="hover-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
              <path d="M14 3.5L5.5 13H10.5L8.5 21.5L18.5 11H13.5Z" fill="currentColor" />
            </svg>
          </span>
          <div class="hover-project-text">
            <div class="hover-project-title" title={projectTitle()}>{projectTitle()}</div>
            <StatusMessages />
          </div>
          <button
            ref={(element) => triggers.set('setup', element)}
            class="hover-icon-button"
            classList={{ open: isOpen('setup') }}
            type="button"
            aria-label="Setup"
            title="Project setup"
            aria-expanded={isOpen('setup')}
            aria-controls={popoverId('setup')}
            onClick={() => layout.togglePopover('setup')}
          >
            <i class={tablerIconClass(MISC_ICON.panelChevron)} aria-hidden="true" />
          </button>
        </div>
        {popover('setup', 'Setup')}

        <div class="hover-pill hover-dock">
          <ModeSwitch />
          <span class="hover-divider" aria-hidden="true" />
          <For each={DOCK_GROUPS}>{(group) => (
            <button
              ref={(element) => triggers.set(group.id, element)}
              class="hover-dock-group"
              classList={{ open: isOpen(group.id), current: groupIsCurrent(group) }}
              type="button"
              aria-label={group.label}
              title={group.label}
              aria-expanded={isOpen(group.id)}
              aria-controls={popoverId(group.id)}
              onClick={() => layout.togglePopover(group.id)}
            >
              <i class={tablerIconClass(group.icon)} aria-hidden="true" />
              <span class="hover-dock-label">{group.label}</span>
              <i class={`${tablerIconClass(MISC_ICON.panelChevron)} hover-dock-chevron`} aria-hidden="true" />
            </button>
          )}</For>
        </div>
        <For each={DOCK_GROUPS}>{(group) => popover(group.id, group.label)}</For>

        <div class="hover-pill hover-actions">
          <HistoryControls />
        </div>

        <div class="hover-pill hover-materials">
          <MaterialPicker />
          <span class="hover-divider-h" aria-hidden="true" />
          <ClassPicker />
        </div>

        <div class="hover-pill hover-context">
          <PropertiesBar />
          <Readouts />
        </div>

        <div class="hover-pill hover-snapping">
          <SnappingControls />
        </div>
      </aside>

      {props.slots.dialogs()}
      {props.slots.helpDrawer()}
    </div>
  )
}
