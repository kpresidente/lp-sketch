import { SectionHelp } from '../components/SectionHelp'
import { useAppController } from '../context/AppControllerContext'

/** Block: PDF page navigation. Landmark: a group named "Pages". */
export default function PageNavigation() {
  const props = useAppController()

  return (
    <div class="block" data-block="pages" role="group" aria-label="Pages">
      <div class="section-label">Pages <SectionHelp anchor="help-project-pages" /></div>
      <div class="page-nav-row">
        <button
          class="btn page-nav-button"
          type="button"
          title="Previous page"
          onClick={props.onGoToPreviousPage}
          disabled={!props.hasPdf || !props.canGoToPreviousPage}
        >
          Back
        </button>
        <button
          class="btn page-nav-button"
          type="button"
          title="Next page"
          onClick={props.onGoToNextPage}
          disabled={!props.hasPdf || !props.canGoToNextPage}
        >
          Forward
        </button>
        <span class="page-nav-value">
          {props.currentPage} of {props.pageCount}
        </span>
      </div>
    </div>
  )
}
