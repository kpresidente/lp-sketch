import { useAppController } from '../context/AppControllerContext'
import { CLASS_LABEL, DESIGN_SCALE_LABEL, MATERIAL_LABEL } from './labels'

/**
 * Block: a read-only summary of the active stroke, showing the material,
 * class, and annotation size the next conductor or component will use.
 * Landmark: a group named "Stroke".
 */
export default function StrokeSummary() {
  const props = useAppController()
  const color = () => props.colorHex[props.project.settings.activeColor]
  const strokeWidth = () => (props.project.settings.activeClass === 'class2' ? 3.4 : 2.4)
  const title = () => `${MATERIAL_LABEL[props.project.settings.activeColor]} · ${CLASS_LABEL[props.project.settings.activeClass]}`
  // The controller's readout says "Scale: ..."; the widget has room for the value alone.
  const scale = () => {
    const value = props.currentScaleInfo.replace(/^Scale:\s*/, '')
    return value === 'unset' ? 'scale unset' : value
  }
  const meta = () => `${DESIGN_SCALE_LABEL[props.project.settings.designScale]} · ${scale()}`

  return (
    <div class="block stroke-summary" data-block="stroke-summary" role="group" aria-label="Stroke">
      <svg class="stroke-summary-preview" viewBox="0 0 92 30" aria-hidden="true">
        <line x1="3" y1="15" x2="89" y2="15" stroke={color()} stroke-width={strokeWidth()} stroke-linecap="round" />
        <circle cx="16" cy="15" r="2.8" fill={color()} />
        <circle cx="46" cy="15" r="7.5" class="stroke-summary-fill" stroke={color()} stroke-width="1.7" />
        <text x="46" y="18.3" text-anchor="middle" class="stroke-summary-letter">{props.activeSymbolLetter}</text>
        <path d="M76 9.5l5.5 5.5-5.5 5.5-5.5-5.5z" class="stroke-summary-fill" stroke={color()} stroke-width="1.5" />
      </svg>
      <div class="stroke-summary-text">
        <div class="stroke-summary-title">{title()}</div>
        <div class="stroke-summary-meta">{meta()}</div>
      </div>
    </div>
  )
}
