import ComponentsPanel from './sidebar/ComponentsPanel'
import LayersPanel from './sidebar/LayersPanel'
import ProjectPanel from './sidebar/ProjectPanel'
import ScalePanel from './sidebar/ScalePanel'
import StatusMessages from './sidebar/StatusMessages'
import StylePanel from './sidebar/StylePanel'
import ToolsPanel from './sidebar/ToolsPanel'
import { MISC_ICON, tablerIconClass } from '../config/iconRegistry'

export default function AppSidebar() {
  return (
    <aside class="sidebar" aria-label="Primary controls">

      <div class="sidebar-header">
        <div class="logo-mark"><i class={tablerIconClass(MISC_ICON.appLogo)} /></div>
        <div class="logo-info">
          <div class="app-name">LP Sketch</div>
          <div class="app-desc">Lightning Protection Design</div>
        </div>
      </div>

      <div class="sidebar-scroll">
        <ProjectPanel />
        <ToolsPanel />
        <ComponentsPanel />
        <StylePanel />
        <ScalePanel />
        <LayersPanel />
      </div>

      <StatusMessages />

    </aside>
  )
}
