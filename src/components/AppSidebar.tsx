import ComponentsPanel from './sidebar/ComponentsPanel'
import LayersPanel from './sidebar/LayersPanel'
import ProjectPanel from './sidebar/ProjectPanel'
import ScalePanel from './sidebar/ScalePanel'
import StatusMessages from './sidebar/StatusMessages'
import StylePanel from './sidebar/StylePanel'
import ToolsPanel from './sidebar/ToolsPanel'
export default function AppSidebar() {
  return (
    <aside class="sidebar" aria-label="Primary controls">

      <div class="sidebar-header">
        <div class="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
            <path d="M14 3.5L5.5 13H10.5L8.5 21.5L18.5 11H13.5Z" fill="white"/>
            <line x1="6.5" y1="22.8" x2="10.5" y2="22.8" stroke="white" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>
          </svg>
        </div>
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
