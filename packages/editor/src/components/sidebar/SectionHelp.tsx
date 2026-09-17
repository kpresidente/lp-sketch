import { tablerIconClass } from '../../config/iconRegistry'
import { useHelp } from '../../context/HelpContext'

interface SectionHelpProps {
  anchor: string
}

/** Small help icon button that opens the help drawer to a specific anchor. */
export function SectionHelp(props: SectionHelpProps) {
  const help = useHelp()
  return (
    <button
      class="section-help-btn"
      type="button"
      title="Help"
      onClick={(e) => {
        e.stopPropagation()
        help.openHelp(props.anchor)
      }}
    >
      <i class={tablerIconClass('info-square-rounded')} />
    </button>
  )
}
