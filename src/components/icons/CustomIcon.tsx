import type { JSX } from 'solid-js'
import type { CustomIconName } from '../../config/iconRegistry'

interface CustomIconProps {
  name: CustomIconName
}

function AtArcIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6" cy="17" r="1.8" fill="currentColor" />
      <circle cx="12" cy="10.8" r="1.8" fill="currentColor" />
      <circle cx="18" cy="8" r="1.8" fill="currentColor" />
    </svg>
  )
}

function SteelBondFilledIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3 L21 12 L12 21 L3 12 Z"
        fill="currentColor"
      />
      <line x1="12" y1="8.2" x2="12" y2="15.8" stroke="var(--bg-base)" stroke-width="2" stroke-linecap="round" />
      <line x1="9" y1="10.1" x2="15" y2="13.9" stroke="var(--bg-base)" stroke-width="2" stroke-linecap="round" />
      <line x1="9" y1="13.9" x2="15" y2="10.1" stroke="var(--bg-base)" stroke-width="2" stroke-linecap="round" />
    </svg>
  )
}

function MultiSelectHandPlusIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M11 11.5v-2a1.5 1.5 0 1 1 3 0v2.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <line
        x1="18.5"
        y1="2.5"
        x2="18.5"
        y2="7.5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
      <line
        x1="16"
        y1="5"
        x2="21"
        y2="5"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  )
}

export function CustomIcon(props: CustomIconProps): JSX.Element {
  const glyph = () => {
    switch (props.name) {
      case 'at-arc':
        return <AtArcIcon />
      case 'multi-select-hand-plus':
        return <MultiSelectHandPlusIcon />
      case 'steel-bond-filled':
      default:
        return <SteelBondFilledIcon />
    }
  }

  return (
    <i class="ti ti-custom-icon" data-custom-icon={props.name}>
      {glyph()}
    </i>
  )
}

export default CustomIcon
