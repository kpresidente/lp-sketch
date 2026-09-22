import PropertiesBar from '../../components/PropertiesBar'
import QuickAccessBar from '../../components/QuickAccessBar'
import type { ShellProps } from '../types'
import ClassicSidebar from './ClassicSidebar'
import { useSidebarLayout } from './useSidebarLayout'
import './classic.css'

/**
 * The pre-refresh layout: a collapsible sidebar of panels on the left, the
 * properties bar above the stage, and the quick-access rail floating over it.
 * A collapsed-sidebar flyout is this shell's only modal chrome, so the whole
 * workspace column goes inert while one is open.
 */
export default function ClassicShell(props: ShellProps) {
  const layout = useSidebarLayout()
  const chromeModalOpen = () => layout.activeSection() !== null

  props.onChromeReady({
    chromeModalOpen,
    closeChromeModal: layout.closeFlyout,
  })

  return (
    <div class="app-shell" classList={{ 'sidebar-collapsed': layout.collapsed() }}>
      <ClassicSidebar layout={layout} />

      <main class="workspace" inert={chromeModalOpen()}>
        <PropertiesBar />

        <div class="workspace-stage-shell">
          {props.slots.workspace()}
          <QuickAccessBar />
        </div>
      </main>

      {props.slots.dialogs()}
      {props.slots.helpDrawer()}
    </div>
  )
}
