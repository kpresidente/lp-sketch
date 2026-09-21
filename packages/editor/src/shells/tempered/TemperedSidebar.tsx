import { createEffect, createUniqueId, For, on, Show } from 'solid-js'
import { createDefaultProject } from '@lp-sketch/core/model/defaultProject'
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
import ReportActions from '../../blocks/ReportActions'
import ShellPicker from '../../blocks/ShellPicker'
import SnappingControls from '../../blocks/SnappingControls'
import StatusMessages from '../../blocks/StatusMessages'
import StrokeSummary from '../../blocks/StrokeSummary'
import ThemePicker from '../../blocks/ThemePicker'
import { MISC_ICON, TEMPERED_TAB_ICON, tablerIconClass } from '../../config/iconRegistry'
import { workspaceCanvasSpikeEnabled } from '../../config/workspaceRenderer'
import { useAppController } from '../../context/AppControllerContext'
import DismissBackdrop from '../shared/DismissBackdrop'
import { TEMPERED_TABS, type TemperedLayout, type TemperedTab } from './useTemperedLayout'

const DEFAULT_PROJECT_NAME = createDefaultProject().projectMeta.name
const TAGLINE = 'Lightning Protection Design'

/** Tempered's sidebar chrome: header, sticky stroke widget, tabs, collapsed rail, flyout, and footer. */
export default function TemperedSidebar(props: { layout: TemperedLayout }) {
  const controller = useAppController()
  const workspaceFlagEnabled = workspaceCanvasSpikeEnabled()
  const baseId = createUniqueId()
  const contentId = `tempered-content-${baseId}`
  const tabId = (tab: TemperedTab) => `tempered-tab-${baseId}-${tab}`
  const panelId = (tab: TemperedTab) => `tempered-panel-${baseId}-${tab}`
  const railButtons = new Map<TemperedTab, HTMLButtonElement>()
  const tabButtons = new Map<TemperedTab, HTMLButtonElement>()
  let content: HTMLDivElement | undefined
  /** The project name, or the tagline while the project still carries the default name. */
  const headerSubtitle = () => {
    const name = controller.project.projectMeta.name.trim()
    return name && name !== DEFAULT_PROJECT_NAME ? name : TAGLINE
  }
  const flyoutLabel = () => TEMPERED_TABS.find((tab) => tab.id === props.layout.flyoutTab())?.label
  const isActiveTab = (tab: TemperedTab) => props.layout.activeTab() === tab

  createEffect(on(props.layout.flyoutTab, (tab, previous) => {
    if (tab) content?.focus({ preventScroll: true })
    else if (previous) railButtons.get(previous)?.focus({ preventScroll: true })
  }))

  function onTabKeyDown(event: KeyboardEvent, index: number) {
    const targets: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: TEMPERED_TABS.length - 1,
    }
    const target = targets[event.key]
    if (target === undefined) return
    event.preventDefault()
    const next = TEMPERED_TABS[(target + TEMPERED_TABS.length) % TEMPERED_TABS.length]
    props.layout.selectTab(next.id)
    tabButtons.get(next.id)?.focus()
  }

  return (
    <>
      <Show when={props.layout.flyoutTab()}>
        <DismissBackdrop onDismiss={props.layout.closeFlyout} />
      </Show>
      <aside
        class="tempered-side"
        classList={{ 'is-collapsed': props.layout.collapsed(), 'has-flyout': props.layout.flyoutTab() !== null }}
        aria-label="Primary controls"
      >
        <div class="tempered-head">
          <span class="tempered-mark" hidden={props.layout.collapsed()} aria-hidden="true">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="17" height="17">
              <path d="M14 3.5L5.5 13H10.5L8.5 21.5L18.5 11H13.5Z" fill="currentColor" />
            </svg>
          </span>
          <div class="tempered-head-text" hidden={props.layout.collapsed()}>
            <div class="tempered-head-title">
              LP Sketch
              {workspaceFlagEnabled && <span class="feature-flag-badge">on</span>}
            </div>
            <div class="tempered-head-project" title={headerSubtitle()}>{headerSubtitle()}</div>
          </div>
          <button
            class="tempered-icon-button tempered-collapse"
            type="button"
            aria-label={props.layout.collapsed() ? 'Expand sidebar' : 'Collapse sidebar'}
            title={props.layout.collapsed() ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!props.layout.collapsed()}
            aria-controls={contentId}
            onClick={() => props.layout.toggleCollapsed()}
          >
            <i class={tablerIconClass(props.layout.collapsed() ? MISC_ICON.sidebarExpand : MISC_ICON.sidebarCollapse)} aria-hidden="true" />
          </button>
        </div>

        <nav class="tempered-rail" aria-label="Sidebar sections" hidden={!props.layout.collapsed()}>
          <For each={TEMPERED_TABS}>{(tab) => (
            <button
              ref={(button) => railButtons.set(tab.id, button)}
              class="tempered-icon-button tempered-rail-button"
              classList={{ active: props.layout.flyoutTab() === tab.id }}
              type="button"
              aria-label={`${tab.label} section`}
              title={tab.label}
              aria-expanded={props.layout.flyoutTab() === tab.id}
              aria-controls={contentId}
              onClick={() => props.layout.toggleSection(tab.id)}
            >
              <i class={tablerIconClass(TEMPERED_TAB_ICON[tab.id])} aria-hidden="true" />
            </button>
          )}</For>
        </nav>

        <div
          ref={content}
          id={contentId}
          class="tempered-content"
          classList={{ 'tempered-flyout': props.layout.collapsed() }}
          hidden={props.layout.collapsed() && props.layout.flyoutTab() === null}
          role={props.layout.collapsed() ? 'region' : undefined}
          aria-label={props.layout.collapsed() && flyoutLabel() ? `${flyoutLabel()} flyout` : undefined}
          tabIndex={-1}
        >
          <Show when={props.layout.collapsed()}>
            <div class="tempered-flyout-header">
              <span class="tempered-flyout-title">{flyoutLabel()}</span>
              <button
                class="tempered-icon-button"
                type="button"
                aria-label={`Close ${flyoutLabel()} panel`}
                title={`Close ${flyoutLabel()} panel`}
                onClick={() => props.layout.closeFlyout()}
              >
                <i class={tablerIconClass('x')} aria-hidden="true" />
              </button>
            </div>
          </Show>

          <div class="tempered-stroke">
            <StrokeSummary />
            <MaterialPicker />
            <div class="tempered-stroke-segs">
              <ClassPicker />
              <AnnotationSizePicker />
            </div>
          </div>

          <div class="tempered-tabs" role="tablist" aria-label="Sidebar tabs" hidden={props.layout.collapsed()}>
            <For each={TEMPERED_TABS}>{(tab, index) => (
              <button
                ref={(button) => tabButtons.set(tab.id, button)}
                id={tabId(tab.id)}
                class="tempered-tab"
                classList={{ on: isActiveTab(tab.id) }}
                type="button"
                role="tab"
                aria-selected={isActiveTab(tab.id)}
                aria-controls={panelId(tab.id)}
                tabIndex={isActiveTab(tab.id) ? 0 : -1}
                onClick={() => props.layout.selectTab(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, index())}
              >
                {tab.label}
              </button>
            )}</For>
          </div>

          <div class="tempered-scroll">
            <div id={panelId('draw')} class="tempered-tabpanel" role="tabpanel" aria-labelledby={tabId('draw')} hidden={!isActiveTab('draw')}>
              <ModeSwitch />
              <ConductorTools />
              <AirTerminalTools />
              <ConnectionTools />
              <DownleadTools />
              <PenetrationTools />
              <GroundingTools />
              <SnappingControls />
              <HistoryControls />
            </div>
            <div id={panelId('annotate')} class="tempered-tabpanel" role="tabpanel" aria-labelledby={tabId('annotate')} hidden={!isActiveTab('annotate')}>
              <AnnotationTools />
              <LayerList />
            </div>
            <div id={panelId('setup')} class="tempered-tabpanel" role="tabpanel" aria-labelledby={tabId('setup')} hidden={!isActiveTab('setup')}>
              <ProjectName />
              <FileActions />
              <ExportActions />
              <ReportActions />
              <PageNavigation />
              <PdfBackground />
              <DrawingScale />
              <ThemePicker />
              <ShellPicker />
            </div>
          </div>
        </div>

        <div class="tempered-foot">
          <StatusMessages />
        </div>
      </aside>
    </>
  )
}
