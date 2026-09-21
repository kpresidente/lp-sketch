import { createEffect, createUniqueId, For, on, Show } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import ComponentsPanel from '../../components/sidebar/ComponentsPanel'
import { workspaceCanvasSpikeEnabled } from '../../config/workspaceRenderer'
import LayersPanel from '../../components/sidebar/LayersPanel'
import ProjectPanel from '../../components/sidebar/ProjectPanel'
import ScalePanel from '../../components/sidebar/ScalePanel'
import StatusMessages from '../../components/sidebar/StatusMessages'
import StylePanel from '../../components/sidebar/StylePanel'
import ToolsPanel from '../../components/sidebar/ToolsPanel'
import { PanelPresentationContext } from '../../components/sidebar/Panel'
import { MISC_ICON, SIDEBAR_SECTION_ICON, tablerIconClass } from '../../config/iconRegistry'
import type { SidebarLayout, SidebarSection } from './useSidebarLayout'

const SECTIONS = [
  { id: 'project', label: 'Project', component: ProjectPanel },
  { id: 'tools', label: 'Tools', component: ToolsPanel },
  { id: 'components', label: 'Components', component: ComponentsPanel },
  { id: 'material', label: 'Material', component: StylePanel },
  { id: 'scale', label: 'Scale', component: ScalePanel },
  { id: 'layers', label: 'Layers', component: LayersPanel },
] as const

/** Classic's sidebar chrome: header, collapsed rail, flyouts, and the panel blocks it composes. */
export default function ClassicSidebar(props: { layout: SidebarLayout }) {
  const workspaceFlagEnabled = workspaceCanvasSpikeEnabled()
  const contentId = `sidebar-content-${createUniqueId()}`
  const sectionButtons = new Map<SidebarSection, HTMLButtonElement>()
  let content: HTMLDivElement | undefined
  const activeLabel = () => SECTIONS.find((section) => section.id === props.layout.activeSection())?.label

  createEffect(on(props.layout.activeSection, (section, previous) => {
    if (section) content?.focus({ preventScroll: true })
    else if (previous && props.layout.collapsed()) sectionButtons.get(previous)?.focus({ preventScroll: true })
  }))

  function consumePointer(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <>
    <Show when={props.layout.activeSection()}>
      <div
        class="sidebar-dismiss-backdrop"
        aria-hidden="true"
        onPointerDown={(event) => {
          consumePointer(event)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={consumePointer}
        onPointerUp={consumePointer}
        onPointerCancel={consumePointer}
        onWheel={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          // Keep the backdrop through pointerup and its compatibility click.
          // Removing it on pointerdown can send the rest of a tap to the canvas.
          event.preventDefault()
          event.stopPropagation()
          props.layout.closeFlyout()
        }}
      />
    </Show>
    <aside
      class="sidebar"
      classList={{ 'is-collapsed': props.layout.collapsed(), 'has-flyout': props.layout.activeSection() !== null }}
      aria-label="Primary controls"
    >

      <div class="sidebar-header">
        <div class="logo-mark" hidden={props.layout.collapsed()}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
            <path d="M14 3.5L5.5 13H10.5L8.5 21.5L18.5 11H13.5Z" fill="white"/>
            <line x1="6.5" y1="22.8" x2="10.5" y2="22.8" stroke="white" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>
          </svg>
        </div>
        <div class="logo-info" hidden={props.layout.collapsed()}>
          <div class="app-name-row">
            <div class="app-name">LP Sketch</div>
            {workspaceFlagEnabled && <span class="feature-flag-badge">on</span>}
          </div>
          <div class="app-desc">Lightning Protection Design</div>
        </div>
        <button
          class="sidebar-icon-button sidebar-layout-toggle"
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

      <nav class="sidebar-section-rail" aria-label="Sidebar sections" hidden={!props.layout.collapsed()}>
        <For each={SECTIONS}>{(section) => (
          <button
            ref={(button) => sectionButtons.set(section.id, button)}
            class="sidebar-icon-button sidebar-section-button"
            classList={{ active: props.layout.activeSection() === section.id }}
            type="button"
            aria-label={`${section.label} section`}
            title={section.label}
            aria-expanded={props.layout.activeSection() === section.id}
            aria-controls={contentId}
            onClick={() => props.layout.toggleSection(section.id)}
          >
            <i class={tablerIconClass(SIDEBAR_SECTION_ICON[section.id])} aria-hidden="true" />
          </button>
        )}</For>
      </nav>

      <div
        ref={content}
        id={contentId}
        class="sidebar-content"
        classList={{ 'sidebar-scroll': !props.layout.collapsed(), 'sidebar-flyout': props.layout.collapsed() }}
        hidden={props.layout.collapsed() && !props.layout.activeSection()}
        role={props.layout.collapsed() ? 'region' : undefined}
        aria-label={props.layout.collapsed() && activeLabel() ? `${activeLabel()} flyout` : undefined}
        tabIndex={-1}
      >
        <PanelPresentationContext.Provider value={{ isFlyout: props.layout.collapsed, closeFlyout: props.layout.closeFlyout }}>
          <For each={SECTIONS}>{(section) => (
            <div hidden={props.layout.collapsed() && props.layout.activeSection() !== section.id}>
              <Dynamic component={section.component} />
            </div>
          )}</For>
        </PanelPresentationContext.Provider>
      </div>

      <StatusMessages />

    </aside>
    </>
  )
}
