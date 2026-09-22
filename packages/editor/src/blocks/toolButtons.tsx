import { Show } from 'solid-js'
import type { SymbolType, Tool } from '@lp-sketch/core/types/project'
import {
  formatDisabledTooltip,
  symbolDisabledReasons,
  toolDisabledReasons,
} from '@lp-sketch/core/lib/componentAvailability'
import {
  SYMBOL_BUTTON_ICON,
  SYMBOL_CLASS2_CUSTOM_ICON,
  SYMBOL_CUSTOM_ICON,
  TOOL_CUSTOM_ICON,
  TOOL_ICON,
  tablerIconClass,
} from '../config/iconRegistry'
import { CustomIcon } from '../components/icons/CustomIcon'
import { useAppController } from '../context/AppControllerContext'

interface ToolButtonProps {
  tool: Tool
  label: string
  /** Tooltip base text; defaults to the label. */
  title?: string
  class?: string
  labelClass?: string
}

/** A tool tile: pressed while its tool is active, disabled with the reasons as its tooltip. */
export function ToolButton(props: ToolButtonProps) {
  const controller = useAppController()
  const reasons = () => toolDisabledReasons(props.tool, controller.project, controller.project.settings.activeColor)
  const active = () => controller.tool === props.tool
  const customIcon = () => TOOL_CUSTOM_ICON[props.tool]

  return (
    <button
      class={`btn ${props.class ?? ''} ${active() ? 'active' : ''}`.trim()}
      type="button"
      aria-pressed={active()}
      title={formatDisabledTooltip(props.title ?? props.label, reasons())}
      disabled={reasons().length > 0}
      onClick={() => controller.onSelectTool(props.tool)}
    >
      <Show when={customIcon()} fallback={<i class={tablerIconClass(TOOL_ICON[props.tool])} />}>
        {(name) => <CustomIcon name={name()} />}
      </Show>
      <span class={`btn-text ${props.labelClass ?? ''}`.trim()}>{props.label}</span>
    </button>
  )
}

interface SymbolButtonProps {
  symbol: SymbolType
  /** May contain a newline for stacked labels; the tooltip collapses it. */
  label: string
  title?: string
  class?: string
  labelClass?: string
}

/** A component tile: activates the symbol tool with this symbol. */
export function SymbolButton(props: SymbolButtonProps) {
  const controller = useAppController()
  const reasons = () => symbolDisabledReasons(props.symbol, controller.project.settings.activeColor)
  const active = () => controller.tool === 'symbol' && controller.activeSymbol === props.symbol
  const customIcon = () => (
    controller.project.settings.activeClass === 'class2'
      ? SYMBOL_CLASS2_CUSTOM_ICON[props.symbol] ?? SYMBOL_CUSTOM_ICON[props.symbol]
      : SYMBOL_CUSTOM_ICON[props.symbol]
  )

  return (
    <button
      class={`btn ${props.class ?? ''} ${active() ? 'active' : ''}`.trim()}
      type="button"
      aria-pressed={active()}
      title={formatDisabledTooltip(props.title ?? props.label.replace('\n', ' '), reasons())}
      disabled={reasons().length > 0}
      onClick={() => {
        controller.onSetActiveSymbol(props.symbol)
        controller.onSelectTool('symbol')
      }}
    >
      <Show when={customIcon()} fallback={<i class={tablerIconClass(SYMBOL_BUTTON_ICON[props.symbol])} />}>
        {(name) => <CustomIcon name={name()} />}
      </Show>
      <span class={`btn-text ${props.labelClass ?? ''}`.trim()}>{props.label}</span>
    </button>
  )
}
