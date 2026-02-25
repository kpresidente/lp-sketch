import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { SYMBOL_LABELS } from '../model/defaultProject'
import type {
  AutoConnectorType,
  DesignScale,
  LayerId,
  MaterialColor,
  SymbolType,
  Tool,
} from '../types/project'
import {
  COMMAND_ICON,
  PROJECT_ACTION_ICON,
  SYMBOL_BUTTON_ICON,
  SYMBOL_CUSTOM_ICON,
  TOOL_CUSTOM_ICON,
  TOOL_ICON,
  type CustomIconName,
  type TablerIconName,
  tablerIconClass,
} from '../config/iconRegistry'
import { CustomIcon } from './icons/CustomIcon'
import {
  formatDisabledTooltip,
  symbolDisabledReasons,
  toolDisabledReasons,
} from '../lib/componentAvailability'

const QUICK_ACCESS_STORAGE_KEY = 'lp-sketch.quick-access.v1'

const TOOL_QUICK_OPTIONS = [
  'line',
  'arc',
  'curve',
  'linear_auto_spacing',
  'arc_auto_spacing',
  'symbol',
  'legend',
  'general_notes',
  'text',
  'dimension_text',
  'arrow',
  'measure',
  'measure_mark',
  'calibrate',
] as const satisfies readonly Tool[]

const SYMBOL_QUICK_OPTIONS: readonly SymbolType[] = [
  'air_terminal',
  'bonded_air_terminal',
  'bond',
  'cable_to_cable_connection',
  'mechanical_crossrun_connection',
  'cadweld_connection',
  'cadweld_crossrun_connection',
  'conduit_downlead_ground',
  'conduit_downlead_roof',
  'surface_downlead_ground',
  'surface_downlead_roof',
  'through_roof_to_steel',
  'through_wall_connector',
  'ground_rod',
  'steel_bond',
  'continued',
  'connect_existing',
]

type QuickSettingId = 'manual_scale' | 'annotation_size' | 'pdf_brightness'
type QuickActionId =
  | 'import_pdf'
  | 'save_project'
  | 'load_project'
  | 'export_png'
  | 'export_jpg'
  | 'export_pdf'
type QuickToggleId =
  | 'snap_enabled'
  | 'angle_snap_enabled'
  | 'auto_connectors_enabled'
  | `layer_${LayerId}`
type QuickChoiceId =
  | 'auto_connector_mechanical'
  | 'auto_connector_cadweld'
  | 'class_class1'
  | 'class_class2'
  | `material_${MaterialColor}`

const MATERIAL_LABEL: Record<MaterialColor, string> = {
  green: 'Copper',
  blue: 'Aluminum',
  red: 'Grounding',
  purple: 'Bimetallic',
  cyan: 'Tinned',
}

const MATERIAL_QUICK_ICON: Record<MaterialColor, TablerIconName> = {
  green: 'circle',
  blue: 'hexagon',
  red: 'circuit-ground',
  purple: 'circle-dot',
  cyan: 'point',
}

const LAYER_LABEL: Record<LayerId, string> = {
  rooftop: 'Rooftop',
  downleads: 'Downleads',
  grounding: 'Grounding',
  annotation: 'Annotation',
}

const LAYER_QUICK_ICON: Record<LayerId, TablerIconName> = {
  rooftop: 'home',
  downleads: 'line',
  grounding: 'circuit-ground',
  annotation: 'writing',
}

interface QuickAddableItem {
  id: string
  label: string
  kind: 'tool' | 'symbol' | 'setting' | 'action' | 'toggle' | 'choice'
  icon: TablerIconName
  customIcon?: CustomIconName
  toolId?: Tool
  symbolType?: SymbolType
  settingId?: QuickSettingId
  actionId?: QuickActionId
  toggleId?: QuickToggleId
  choiceId?: QuickChoiceId
}

type QuickEntry =
  | {
      id: string
      kind: 'item'
      itemId: string
    }
  | {
      id: string
      kind: 'separator'
    }

interface QuickAccessBarProps {
  hasPdf: boolean
  tool: Tool
  activeSymbol: SymbolType
  colorOptions: readonly MaterialColor[]
  scaleIsSet: boolean
  scaleRealUnitsPerPoint: number | null
  historyPastCount: number
  historyFutureCount: number
  designScale: DesignScale
  snapEnabled: boolean
  angleSnapEnabled: boolean
  autoConnectorsEnabled: boolean
  autoConnectorType: AutoConnectorType
  activeClass: 'class1' | 'class2'
  activeColor: MaterialColor
  layers: Readonly<Record<LayerId, boolean>>
  manualScaleInchesInput: string
  manualScaleFeetInput: string
  currentScaleInfo: string
  pdfBrightness: number
  onSelectTool: (tool: Tool) => void
  onSetActiveSymbol: (symbol: SymbolType) => void
  onImportPdf: (event: Event) => void
  onLoadProject: (event: Event) => void
  onSaveProject: () => void
  onExportImage: (format: 'png' | 'jpg') => void
  onExportPdf: () => void
  onUndo: () => void
  onRedo: () => void
  onSetSnapEnabled: (value: boolean) => void
  onSetAngleSnapEnabled: (value: boolean) => void
  onSetAutoConnectorsEnabled: (value: boolean) => void
  onSetAutoConnectorType: (value: AutoConnectorType) => void
  onSetActiveClass: (value: 'class1' | 'class2') => void
  onSetActiveColor: (value: MaterialColor) => void
  onSetLayerVisible: (layer: LayerId, value: boolean) => void
  onSetManualScaleInchesInput: (value: string) => void
  onSetManualScaleFeetInput: (value: string) => void
  onApplyManualScale: () => void
  onSetDesignScale: (value: DesignScale) => void
  onPreviewPdfBrightness: (value: number) => void
  onCommitPdfBrightness: (value: number) => void
}

const TOOL_LABELS: Record<Tool, string> = {
  select: 'Select',
  multi_select: 'Multi',
  pan: 'Pan',
  line: 'Linear',
  arc: 'Arc',
  curve: 'Curve',
  linear_auto_spacing: 'Linear AT',
  arc_auto_spacing: 'Arc AT',
  symbol: 'Component',
  legend: 'Legend',
  general_notes: 'General Notes',
  text: 'Text',
  dimension_text: 'Dim Text',
  arrow: 'Arrow',
  calibrate: 'Calibrate',
  measure: 'Measure',
  measure_mark: 'Mark',
}

function createQuickEntryId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function decodeQuickEntries(
  value: unknown,
  addableItemIds: ReadonlySet<string>,
): QuickEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenItems = new Set<string>()
  const entries: QuickEntry[] = []
  for (const entry of value) {
    if (entry === 'separator') {
      entries.push({
        id: createQuickEntryId('qa-separator'),
        kind: 'separator',
      })
      continue
    }

    if (typeof entry !== 'string' || !addableItemIds.has(entry) || seenItems.has(entry)) {
      continue
    }

    seenItems.add(entry)
    entries.push({
      id: createQuickEntryId('qa-item'),
      kind: 'item',
      itemId: entry,
    })
  }

  return entries
}

function encodeQuickEntries(entries: readonly QuickEntry[]): string[] {
  return entries.map((entry) => (entry.kind === 'separator' ? 'separator' : entry.itemId))
}

export default function QuickAccessBar(props: QuickAccessBarProps) {
  let railRef: HTMLDivElement | undefined
  let importPdfInput: HTMLInputElement | undefined
  let loadProjectInput: HTMLInputElement | undefined
  const [entries, setEntries] = createSignal<QuickEntry[]>([])
  const [customizerOpen, setCustomizerOpen] = createSignal(false)
  const [openFlyoutItemId, setOpenFlyoutItemId] = createSignal<string | null>(null)
  const [selectedAvailableItemId, setSelectedAvailableItemId] = createSignal<string | null>(null)
  const [selectedQuickEntryId, setSelectedQuickEntryId] = createSignal<string | null>(null)

  const addableItems = createMemo<QuickAddableItem[]>(() => {
    const toolItems: QuickAddableItem[] = TOOL_QUICK_OPTIONS.map((toolId) => ({
      id: `tool:${toolId}`,
      label: TOOL_LABELS[toolId],
      kind: 'tool',
      icon: TOOL_ICON[toolId],
      customIcon: TOOL_CUSTOM_ICON[toolId],
      toolId,
    }))

    const symbolItems: QuickAddableItem[] = SYMBOL_QUICK_OPTIONS.map((symbolType) => ({
      id: `symbol:${symbolType}`,
      label: SYMBOL_LABELS[symbolType],
      kind: 'symbol',
      icon: SYMBOL_BUTTON_ICON[symbolType],
      customIcon: SYMBOL_CUSTOM_ICON[symbolType],
      symbolType,
    }))

    const settingItems: QuickAddableItem[] = [
      {
        id: 'setting:manual_scale',
        label: 'Manual Scale',
        kind: 'setting',
        icon: 'ruler-2',
        settingId: 'manual_scale',
      },
      {
        id: 'setting:annotation_size',
        label: 'Annotation Size',
        kind: 'setting',
        icon: 'typography',
        settingId: 'annotation_size',
      },
      {
        id: 'setting:pdf_brightness',
        label: 'PDF Brightness',
        kind: 'setting',
        icon: 'sun',
        settingId: 'pdf_brightness',
      },
    ]

    const projectActionItems: QuickAddableItem[] = [
      {
        id: 'action:import_pdf',
        label: 'Import PDF',
        kind: 'action',
        icon: PROJECT_ACTION_ICON.importPdf,
        actionId: 'import_pdf',
      },
      {
        id: 'action:save_project',
        label: 'Save Project',
        kind: 'action',
        icon: PROJECT_ACTION_ICON.saveProject,
        actionId: 'save_project',
      },
      {
        id: 'action:load_project',
        label: 'Load Project',
        kind: 'action',
        icon: PROJECT_ACTION_ICON.loadProject,
        actionId: 'load_project',
      },
      {
        id: 'action:export_png',
        label: 'Export PNG',
        kind: 'action',
        icon: PROJECT_ACTION_ICON.exportPng,
        actionId: 'export_png',
      },
      {
        id: 'action:export_jpg',
        label: 'Export JPG',
        kind: 'action',
        icon: PROJECT_ACTION_ICON.exportJpg,
        actionId: 'export_jpg',
      },
      {
        id: 'action:export_pdf',
        label: 'Export PDF',
        kind: 'action',
        icon: PROJECT_ACTION_ICON.exportPdf,
        actionId: 'export_pdf',
      },
    ]

    const toggleItems: QuickAddableItem[] = [
      {
        id: 'toggle:snap_enabled',
        label: 'Snap to Points',
        kind: 'toggle',
        icon: 'magnet',
        toggleId: 'snap_enabled',
      },
      {
        id: 'toggle:angle_snap_enabled',
        label: 'Angle Snap (15°)',
        kind: 'toggle',
        icon: 'angle',
        toggleId: 'angle_snap_enabled',
      },
      {
        id: 'toggle:auto_connectors_enabled',
        label: 'Auto-Connectors',
        kind: 'toggle',
        icon: 'circles',
        toggleId: 'auto_connectors_enabled',
      },
      {
        id: 'toggle:layer_rooftop',
        label: `Layer: ${LAYER_LABEL.rooftop}`,
        kind: 'toggle',
        icon: LAYER_QUICK_ICON.rooftop,
        toggleId: 'layer_rooftop',
      },
      {
        id: 'toggle:layer_downleads',
        label: `Layer: ${LAYER_LABEL.downleads}`,
        kind: 'toggle',
        icon: LAYER_QUICK_ICON.downleads,
        toggleId: 'layer_downleads',
      },
      {
        id: 'toggle:layer_grounding',
        label: `Layer: ${LAYER_LABEL.grounding}`,
        kind: 'toggle',
        icon: LAYER_QUICK_ICON.grounding,
        toggleId: 'layer_grounding',
      },
      {
        id: 'toggle:layer_annotation',
        label: `Layer: ${LAYER_LABEL.annotation}`,
        kind: 'toggle',
        icon: LAYER_QUICK_ICON.annotation,
        toggleId: 'layer_annotation',
      },
    ]

    const choiceItems: QuickAddableItem[] = [
      {
        id: 'choice:auto_connector_mechanical',
        label: 'Connector Type: Mechanical',
        kind: 'choice',
        icon: SYMBOL_BUTTON_ICON.cable_to_cable_connection,
        choiceId: 'auto_connector_mechanical',
      },
      {
        id: 'choice:auto_connector_cadweld',
        label: 'Connector Type: Cadweld',
        kind: 'choice',
        icon: SYMBOL_BUTTON_ICON.cadweld_connection,
        customIcon: SYMBOL_CUSTOM_ICON.cadweld_connection,
        choiceId: 'auto_connector_cadweld',
      },
      {
        id: 'choice:class_class1',
        label: 'Class I',
        kind: 'choice',
        icon: 'number-1',
        choiceId: 'class_class1',
      },
      {
        id: 'choice:class_class2',
        label: 'Class II',
        kind: 'choice',
        icon: 'number-2',
        choiceId: 'class_class2',
      },
      ...props.colorOptions.map((color): QuickAddableItem => ({
        id: `choice:material_${color}`,
        label: `Material: ${MATERIAL_LABEL[color]}`,
        kind: 'choice',
        icon: MATERIAL_QUICK_ICON[color],
        choiceId: `material_${color}`,
      })),
    ]

    return [
      ...toolItems,
      ...symbolItems,
      ...settingItems,
      ...projectActionItems,
      ...toggleItems,
      ...choiceItems,
    ]
  })

  const addableItemById = createMemo(() => {
    const map = new Map<string, QuickAddableItem>()
    for (const item of addableItems()) {
      map.set(item.id, item)
    }
    return map
  })

  const currentFlyoutItem = createMemo(() => {
    const itemId = openFlyoutItemId()
    return itemId ? addableItemById().get(itemId) ?? null : null
  })

  const entriesWithItems = createMemo(() =>
    entries().map((entry) => ({
      entry,
      item: entry.kind === 'item' ? addableItemById().get(entry.itemId) ?? null : null,
    })),
  )

  const canAddSelectedAvailable = createMemo(() => {
    const selectedId = selectedAvailableItemId()
    if (!selectedId) {
      return false
    }

    return !entries().some((entry) => entry.kind === 'item' && entry.itemId === selectedId)
  })

  const selectedQuickEntry = createMemo(() =>
    entries().find((entry) => entry.id === selectedQuickEntryId()) ?? null,
  )

  const selectedQuickIndex = createMemo(() =>
    entries().findIndex((entry) => entry.id === selectedQuickEntryId()),
  )

  const canMoveQuickSelectionUp = createMemo(() => selectedQuickIndex() > 0)
  const canMoveQuickSelectionDown = createMemo(() => {
    const index = selectedQuickIndex()
    return index >= 0 && index < entries().length - 1
  })

  function renderIcon(icon: TablerIconName, customIcon?: CustomIconName) {
    if (customIcon) {
      return <CustomIcon name={customIcon} />
    }
    return <i class={tablerIconClass(icon)} />
  }

  function selectAvailableItem(itemId: string) {
    setSelectedAvailableItemId(itemId)
    setSelectedQuickEntryId(null)
  }

  function selectQuickEntry(entryId: string) {
    setSelectedQuickEntryId(entryId)
    setSelectedAvailableItemId(null)
  }

  function addSelectedAvailableItem() {
    const selectedId = selectedAvailableItemId()
    if (!selectedId || !canAddSelectedAvailable()) {
      return
    }

    const nextEntry: QuickEntry = {
      id: createQuickEntryId('qa-item'),
      kind: 'item',
      itemId: selectedId,
    }
    setEntries((prev) => [...prev, nextEntry])
    setSelectedQuickEntryId(nextEntry.id)
    setSelectedAvailableItemId(null)
  }

  function addSeparator() {
    const nextEntry: QuickEntry = {
      id: createQuickEntryId('qa-separator'),
      kind: 'separator',
    }
    setEntries((prev) => [...prev, nextEntry])
    setSelectedQuickEntryId(nextEntry.id)
    setSelectedAvailableItemId(null)
  }

  function removeSelectedQuickEntry() {
    const selectedId = selectedQuickEntryId()
    if (!selectedId) {
      return
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== selectedId))
    setSelectedQuickEntryId(null)
  }

  function moveSelectedQuickEntry(direction: 'up' | 'down') {
    const index = selectedQuickIndex()
    if (index < 0) {
      return
    }

    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= entries().length) {
      return
    }

    setEntries((prev) => {
      const copy = prev.slice()
      const [moved] = copy.splice(index, 1)
      if (!moved) {
        return prev
      }
      copy.splice(nextIndex, 0, moved)
      return copy
    })
  }

  function isToggleEnabled(toggleId: QuickToggleId): boolean {
    switch (toggleId) {
      case 'snap_enabled':
        return props.snapEnabled
      case 'angle_snap_enabled':
        return props.angleSnapEnabled
      case 'auto_connectors_enabled':
        return props.autoConnectorsEnabled
      case 'layer_rooftop':
        return props.layers.rooftop
      case 'layer_downleads':
        return props.layers.downleads
      case 'layer_grounding':
        return props.layers.grounding
      case 'layer_annotation':
        return props.layers.annotation
      default:
        return false
    }
  }

  function toggleValue(toggleId: QuickToggleId) {
    switch (toggleId) {
      case 'snap_enabled':
        props.onSetSnapEnabled(!props.snapEnabled)
        break
      case 'angle_snap_enabled':
        props.onSetAngleSnapEnabled(!props.angleSnapEnabled)
        break
      case 'auto_connectors_enabled':
        props.onSetAutoConnectorsEnabled(!props.autoConnectorsEnabled)
        break
      case 'layer_rooftop':
        props.onSetLayerVisible('rooftop', !props.layers.rooftop)
        break
      case 'layer_downleads':
        props.onSetLayerVisible('downleads', !props.layers.downleads)
        break
      case 'layer_grounding':
        props.onSetLayerVisible('grounding', !props.layers.grounding)
        break
      case 'layer_annotation':
        props.onSetLayerVisible('annotation', !props.layers.annotation)
        break
      default:
        break
    }
  }

  function isChoiceActive(choiceId: QuickChoiceId): boolean {
    switch (choiceId) {
      case 'auto_connector_mechanical':
        return props.autoConnectorType === 'mechanical'
      case 'auto_connector_cadweld':
        return props.autoConnectorType === 'cadweld'
      case 'class_class1':
        return props.activeClass === 'class1'
      case 'class_class2':
        return props.activeClass === 'class2'
      default:
        if (choiceId.startsWith('material_')) {
          const color = choiceId.slice('material_'.length) as MaterialColor
          return props.activeColor === color
        }
        return false
    }
  }

  function applyChoice(choiceId: QuickChoiceId) {
    switch (choiceId) {
      case 'auto_connector_mechanical':
        props.onSetAutoConnectorType('mechanical')
        break
      case 'auto_connector_cadweld':
        props.onSetAutoConnectorType('cadweld')
        break
      case 'class_class1':
        props.onSetActiveClass('class1')
        break
      case 'class_class2':
        props.onSetActiveClass('class2')
        break
      default:
        if (choiceId.startsWith('material_')) {
          const color = choiceId.slice('material_'.length) as MaterialColor
          props.onSetActiveColor(color)
        }
        break
    }
  }

  function runAction(actionId: QuickActionId) {
    switch (actionId) {
      case 'import_pdf':
        importPdfInput?.click()
        break
      case 'save_project':
        props.onSaveProject()
        break
      case 'load_project':
        loadProjectInput?.click()
        break
      case 'export_png':
        props.onExportImage('png')
        break
      case 'export_jpg':
        props.onExportImage('jpg')
        break
      case 'export_pdf':
        props.onExportPdf()
        break
      default:
        break
    }
  }

  const availabilityProject = createMemo(() => ({
    scale: {
      isSet: props.scaleIsSet,
      realUnitsPerPoint: props.scaleRealUnitsPerPoint,
    },
  }))

  function quickItemDisabledReasons(item: QuickAddableItem): string[] {
    if (item.kind === 'tool' && item.toolId) {
      return toolDisabledReasons(item.toolId, availabilityProject(), props.activeColor)
    }
    if (item.kind === 'symbol' && item.symbolType) {
      return symbolDisabledReasons(item.symbolType, props.activeColor)
    }
    return []
  }

  function quickItemTitle(item: QuickAddableItem): string {
    return formatDisabledTooltip(item.label, quickItemDisabledReasons(item))
  }

  function isQuickItemDisabled(item: QuickAddableItem): boolean {
    return quickItemDisabledReasons(item).length > 0
  }

  function activateQuickItem(item: QuickAddableItem) {
    if (isQuickItemDisabled(item)) {
      return
    }

    if (item.kind === 'tool' && item.toolId) {
      props.onSelectTool(item.toolId)
      setOpenFlyoutItemId(null)
      return
    }

    if (item.kind === 'symbol' && item.symbolType) {
      props.onSetActiveSymbol(item.symbolType)
      props.onSelectTool('symbol')
      setOpenFlyoutItemId(null)
      return
    }

    if (item.kind === 'setting') {
      setOpenFlyoutItemId((current) => (current === item.id ? null : item.id))
      return
    }

    if (item.kind === 'action' && item.actionId) {
      runAction(item.actionId)
      setOpenFlyoutItemId(null)
      return
    }

    if (item.kind === 'toggle' && item.toggleId) {
      toggleValue(item.toggleId)
      setOpenFlyoutItemId(null)
      return
    }

    if (item.kind === 'choice' && item.choiceId) {
      applyChoice(item.choiceId)
      setOpenFlyoutItemId(null)
    }
  }

  function isQuickItemActive(item: QuickAddableItem): boolean {
    if (item.kind === 'tool' && item.toolId) {
      return props.tool === item.toolId
    }

    if (item.kind === 'symbol' && item.symbolType) {
      return props.tool === 'symbol' && props.activeSymbol === item.symbolType
    }

    if (item.kind === 'toggle' && item.toggleId) {
      return isToggleEnabled(item.toggleId)
    }

    if (item.kind === 'choice' && item.choiceId) {
      return isChoiceActive(item.choiceId)
    }

    return openFlyoutItemId() === item.id
  }

  onMount(() => {
    const addableItemIds = new Set(addableItems().map((item) => item.id))
    try {
      const raw = window.localStorage.getItem(QUICK_ACCESS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setEntries(decodeQuickEntries(parsed, addableItemIds))
      }
    } catch {
      setEntries([])
    }

    const pointerDownListener = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target || !railRef) {
        return
      }

      if (railRef.contains(target)) {
        return
      }

      setCustomizerOpen(false)
      setOpenFlyoutItemId(null)
      setSelectedAvailableItemId(null)
      setSelectedQuickEntryId(null)
    }

    const keyDownListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCustomizerOpen(false)
        setOpenFlyoutItemId(null)
      }
    }

    window.addEventListener('pointerdown', pointerDownListener)
    window.addEventListener('keydown', keyDownListener)
    onCleanup(() => {
      window.removeEventListener('pointerdown', pointerDownListener)
      window.removeEventListener('keydown', keyDownListener)
    })
  })

  createEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const serialized = JSON.stringify(encodeQuickEntries(entries()))
    window.localStorage.setItem(QUICK_ACCESS_STORAGE_KEY, serialized)
  })

  return (
    <div ref={railRef} class="quick-access-rail" data-toolbar-quick-tools="active">
      <input
        ref={importPdfInput}
        type="file"
        accept="application/pdf"
        onChange={props.onImportPdf}
        hidden
      />
      <input
        ref={loadProjectInput}
        type="file"
        accept="application/json,.json"
        onChange={props.onLoadProject}
        hidden
      />

      <button
        type="button"
        class={`quick-access-btn ${customizerOpen() ? 'active' : ''}`}
        aria-label="Customize quick-access toolbar"
        aria-pressed={customizerOpen()}
        title="Customize quick-access toolbar"
        onClick={() => {
          setCustomizerOpen((open) => !open)
          setOpenFlyoutItemId(null)
        }}
      >
        <i class={tablerIconClass('settings')} />
      </button>

      <button
        type="button"
        class={`quick-access-btn ${props.tool === 'select' ? 'active' : ''}`}
        aria-label="Quick select mode"
        aria-pressed={props.tool === 'select'}
        title="Select mode"
        onClick={() => props.onSelectTool('select')}
      >
        {renderIcon(TOOL_ICON.select, TOOL_CUSTOM_ICON.select)}
      </button>

      <button
        type="button"
        class={`quick-access-btn ${props.tool === 'multi_select' ? 'active' : ''}`}
        aria-label="Quick multi-select mode"
        aria-pressed={props.tool === 'multi_select'}
        title="Multi-select mode"
        onClick={() => props.onSelectTool('multi_select')}
      >
        {renderIcon(TOOL_ICON.multi_select, TOOL_CUSTOM_ICON.multi_select)}
      </button>

      <button
        type="button"
        class={`quick-access-btn ${props.tool === 'pan' ? 'active' : ''}`}
        aria-label="Quick pan mode"
        aria-pressed={props.tool === 'pan'}
        title="Pan mode"
        onClick={() => props.onSelectTool('pan')}
      >
        {renderIcon(TOOL_ICON.pan, TOOL_CUSTOM_ICON.pan)}
      </button>

      <button
        type="button"
        class="quick-access-btn"
        aria-label="Quick undo"
        title="Undo"
        disabled={props.historyPastCount === 0}
        onClick={props.onUndo}
      >
        <i class={tablerIconClass(COMMAND_ICON.undo)} />
      </button>

      <button
        type="button"
        class="quick-access-btn"
        aria-label="Quick redo"
        title="Redo"
        disabled={props.historyFutureCount === 0}
        onClick={props.onRedo}
      >
        <i class={tablerIconClass(COMMAND_ICON.redo)} />
      </button>

      <For each={entriesWithItems()}>
        {({ entry, item }) => (
          <Show
            when={entry.kind === 'item' && item}
            fallback={<div class="quick-access-separator" role="separator" />}
          >
            <button
              type="button"
              class={`quick-access-btn ${item && isQuickItemActive(item) ? 'active' : ''}`}
              aria-label={item?.label}
              aria-pressed={item ? isQuickItemActive(item) : false}
              title={item ? quickItemTitle(item) : undefined}
              disabled={item ? isQuickItemDisabled(item) : false}
              onClick={() => {
                if (!item) {
                  return
                }
                activateQuickItem(item)
              }}
            >
              {item ? renderIcon(item.icon, item.customIcon) : null}
            </button>
          </Show>
        )}
      </For>

      <Show when={currentFlyoutItem()}>
        {(item) => (
          <div
            class="quick-access-flyout"
            role="dialog"
            aria-modal="false"
            aria-label={`${item().label} quick settings`}
          >
            <div class="quick-access-flyout-title">{item().label}</div>
            <Show when={item().settingId === 'manual_scale'}>
              <>
                <div class="scale-row">
                  <div class="scale-input-wrap">
                    <input
                      class="input-field"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      placeholder="X"
                      value={props.manualScaleInchesInput}
                      onInput={(event) => props.onSetManualScaleInchesInput(event.currentTarget.value)}
                      aria-label="Scale inches"
                    />
                    <span class="scale-input-unit">in</span>
                  </div>
                  <span class="hint-line" style={{ "align-self": "center", "white-space": "nowrap" }}>
                    =
                  </span>
                  <div class="scale-input-wrap">
                    <input
                      class="input-field"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      placeholder="Y"
                      value={props.manualScaleFeetInput}
                      onInput={(event) => props.onSetManualScaleFeetInput(event.currentTarget.value)}
                      aria-label="Scale feet"
                    />
                    <span class="scale-input-unit">ft</span>
                  </div>
                </div>
                <div class="btn-row">
                  <button class="btn btn-sm" type="button" onClick={props.onApplyManualScale}>
                    Apply Scale
                  </button>
                </div>
                <div class="scale-badge">{props.currentScaleInfo}</div>
              </>
            </Show>
            <Show when={item().settingId === 'annotation_size'}>
              <div class="class-selector" role="radiogroup" aria-label="Annotation size">
                <button
                  class={`btn ${props.designScale === 'small' ? 'active' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={props.designScale === 'small'}
                  onClick={() => props.onSetDesignScale('small')}
                >
                  Small
                </button>
                <button
                  class={`btn ${props.designScale === 'medium' ? 'active' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={props.designScale === 'medium'}
                  onClick={() => props.onSetDesignScale('medium')}
                >
                  Medium
                </button>
                <button
                  class={`btn ${props.designScale === 'large' ? 'active' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={props.designScale === 'large'}
                  onClick={() => props.onSetDesignScale('large')}
                >
                  Large
                </button>
              </div>
            </Show>
            <Show when={item().settingId === 'pdf_brightness'}>
              <>
                <div class="brightness-row">
                  <input
                    class="brightness-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={props.pdfBrightness}
                    aria-label="PDF background brightness"
                    title={props.hasPdf ? 'Adjust PDF background brightness' : 'Import a PDF to enable brightness control'}
                    disabled={!props.hasPdf}
                    onInput={(event) => props.onPreviewPdfBrightness(Number.parseFloat(event.currentTarget.value))}
                    onChange={(event) => props.onCommitPdfBrightness(Number.parseFloat(event.currentTarget.value))}
                  />
                  <span class="brightness-value">{Math.round(props.pdfBrightness * 100)}%</span>
                </div>
                <Show when={!props.hasPdf}>
                  <div class="hint-line">Import a PDF to enable brightness control.</div>
                </Show>
              </>
            </Show>
          </div>
        )}
      </Show>

      <Show when={customizerOpen()}>
        <div
          class="quick-access-customizer"
          role="dialog"
          aria-modal="false"
          aria-label="Customize quick-access toolbar"
        >
          <div class="floating-input-title">Quick-Access Toolbar</div>
          <div class="quick-access-customizer-grid">
            <div class="quick-access-customizer-col">
              <div class="tb-field-label">All Tools</div>
              <select
                class="quick-access-listbox"
                size={12}
                aria-label="All quick-access tools"
                value={selectedAvailableItemId() ?? ''}
                onChange={(event) => selectAvailableItem(event.currentTarget.value)}
              >
                <For each={addableItems()}>
                  {(item) => (
                    <option value={item.id}>{item.label}</option>
                  )}
                </For>
              </select>
            </div>

            <div class="quick-access-customizer-actions">
              <button
                class="btn btn-sm"
                type="button"
                onClick={addSelectedAvailableItem}
                disabled={!canAddSelectedAvailable()}
              >
                Add &gt;&gt;
              </button>
              <button
                class="btn btn-sm"
                type="button"
                onClick={removeSelectedQuickEntry}
                disabled={!selectedQuickEntry()}
              >
                &lt;&lt; Remove
              </button>
              <button
                class="btn btn-sm"
                type="button"
                onClick={addSeparator}
              >
                Add Separator
              </button>
              <button
                class="btn btn-sm"
                type="button"
                onClick={() => moveSelectedQuickEntry('up')}
                disabled={!canMoveQuickSelectionUp()}
              >
                Move Up
              </button>
              <button
                class="btn btn-sm"
                type="button"
                onClick={() => moveSelectedQuickEntry('down')}
                disabled={!canMoveQuickSelectionDown()}
              >
                Move Down
              </button>
            </div>

            <div class="quick-access-customizer-col">
              <div class="tb-field-label">Quick-Access Tools</div>
              <select
                class="quick-access-listbox"
                size={12}
                aria-label="Quick-access tools"
                value={selectedQuickEntryId() ?? ''}
                onChange={(event) => selectQuickEntry(event.currentTarget.value)}
              >
                <For each={entries()}>
                  {(entry) => (
                    <option value={entry.id}>
                      {entry.kind === 'separator'
                        ? '--- Separator ---'
                        : addableItemById().get(entry.itemId)?.label ?? entry.itemId}
                    </option>
                  )}
                </For>
              </select>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
