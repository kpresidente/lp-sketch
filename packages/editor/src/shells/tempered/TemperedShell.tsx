import Readouts from '../../blocks/Readouts'
import PropertiesBar from '../../components/PropertiesBar'
import QuickAccessBar from '../../components/QuickAccessBar'
import type { ShellProps } from '../types'
import TemperedSidebar from './TemperedSidebar'
import { useTemperedLayout } from './useTemperedLayout'
import './tempered.css'

/**
 * The Tempered direction (`prototypes/ui-refresh/04-tempered.html`): a sidebar
 * with a sticky stroke widget and three tabs, a context bar above the stage,
 * the quick-access rail over it, and a status strip below. Collapsing the
 * sidebar leaves a rail whose section buttons open the same tabs as flyouts;
 * a flyout is this shell's only modal chrome, so the workspace column goes
 * inert while one is open.
 */
export default function TemperedShell(props: ShellProps) {
  const layout = useTemperedLayout()
  const chromeModalOpen = () => layout.flyoutTab() !== null

  props.onChromeReady({
    chromeModalOpen,
    closeChromeModal: layout.closeFlyout,
  })

  return (
    <div class="tempered-shell" classList={{ 'is-collapsed': layout.collapsed() }}>
      <TemperedSidebar layout={layout} />

      <main class="workspace tempered-workspace" inert={chromeModalOpen()}>
        <PropertiesBar />

        <div class="workspace-stage-shell">
          {props.slots.workspace()}
          <QuickAccessBar />
        </div>

        <footer class="tempered-status-strip">
          <Readouts />
        </footer>
      </main>

      {props.slots.dialogs()}
      {props.slots.helpDrawer()}
    </div>
  )
}
