import { createEffect, createSignal, on, onCleanup, onMount, Show } from 'solid-js'
import { useHelp } from '../../context/HelpContext'
import { tablerIconClass } from '../../config/iconRegistry'
import './help-content.css'
import './help-drawer.css'

const STORAGE_KEY_SCROLL = 'lp-sketch.help.scroll.v1'

interface HistoryStack {
  stack: string[]
  index: number
}

interface SectionEntry {
  anchorId: string
  heading: string
  text: string
}

/** Walk heading elements in the content, collecting text for each section. */
function buildSectionIndex(container: HTMLElement): SectionEntry[] {
  const entries: SectionEntry[] = []
  const headings = container.querySelectorAll('[id]')
  headings.forEach((el) => {
    if (!/^H[1-6]$/.test(el.tagName)) return
    const heading = el.textContent?.trim() ?? ''
    let text = ''
    let sibling = el.nextElementSibling
    while (sibling && !/^H[1-6]$/.test(sibling.tagName)) {
      text += ' ' + (sibling.textContent ?? '')
      sibling = sibling.nextElementSibling
    }
    entries.push({ anchorId: el.id, heading, text: text.trim() })
  })
  return entries
}

interface GlossaryTerm {
  term: string
  aliases?: string[]
  definition: string
}

/** Post-process help content to wrap glossary terms in annotated spans. */
function annotateGlossaryTerms(container: HTMLElement, terms: GlossaryTerm[]): void {
  if (terms.length === 0) return

  // Build a map: lowercase match string → term data
  const matchMap = new Map<string, GlossaryTerm>()
  const allMatches: string[] = []
  for (const term of terms) {
    matchMap.set(term.term.toLowerCase(), term)
    allMatches.push(term.term)
    if (term.aliases) {
      for (const alias of term.aliases) {
        matchMap.set(alias.toLowerCase(), term)
        allMatches.push(alias)
      }
    }
  }

  // Sort longest first to prevent partial matches (e.g. "Air Terminal" before "Air")
  allMatches.sort((a, b) => b.length - a.length)

  // Build regex with non-word boundary assertions (handles terms with parens/special chars)
  const escaped = allMatches.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(?<!\\w)(${escaped.join('|')})(?!\\w)`, 'gi')

  // Collect all text nodes first (avoid mutating DOM during traversal)
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node)
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? ''
    if (!text.trim()) continue

    // Skip text inside headings, links, code, or existing glossary terms
    const parent = textNode.parentElement
    if (!parent) continue
    if (parent.closest('a, h1, h2, h3, h4, h5, h6, pre, code, .help-glossary-term')) continue

    // Find all matches in this text node
    pattern.lastIndex = 0
    const matches: Array<{ index: number; length: number; text: string; termKey: string }> = []
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) {
      const termData = matchMap.get(m[1].toLowerCase())
      if (termData) {
        matches.push({
          index: m.index,
          length: m[1].length,
          text: m[1],
          termKey: termData.term.toLowerCase(),
        })
      }
    }
    if (matches.length === 0) continue

    // Build replacement fragment
    const frag = document.createDocumentFragment()
    let lastIdx = 0
    for (const match of matches) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)))
      }
      const span = document.createElement('span')
      span.className = 'help-glossary-term'
      span.dataset.term = match.termKey
      span.tabIndex = 0
      span.textContent = match.text
      frag.appendChild(span)
      lastIdx = match.index + match.length
    }
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)))
    }
    parent.replaceChild(frag, textNode)
  }
}

/** Extract the <body> inner HTML from the fetched help.html. */
function extractBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return match ? match[1] : html
}

export default function HelpDrawer() {
  const help = useHelp()
  let contentRef: HTMLDivElement | undefined
  let scrollRef: HTMLDivElement | undefined
  let searchInputRef: HTMLInputElement | undefined
  let drawerRef: HTMLElement | undefined
  let previouslyFocused: Element | null = null

  const [htmlContent, setHtmlContent] = createSignal('')
  const [loading, setLoading] = createSignal(true)
  const [history, setHistory] = createSignal<HistoryStack>({ stack: [], index: -1 })
  const [searchQuery, setSearchQuery] = createSignal('')
  const [searchResults, setSearchResults] = createSignal<SearchResult[] | null>(null)

  /** Pre-built index of section headings and text (built once after HTML loads). */
  let sectionIndex: SectionEntry[] = []
  /** Scroll position saved when the user enters search mode. */
  let preSearchScrollTop = 0

  /** Loaded glossary terms for annotation and tooltips. */
  let glossaryTerms: GlossaryTerm[] = []
  let tooltipRef: HTMLDivElement | undefined
  let tooltipShowTimer: ReturnType<typeof setTimeout> | undefined
  let tooltipDismissTimer: ReturnType<typeof setTimeout> | undefined
  let activeGlossarySpan: HTMLElement | null = null

  // ── Fetch help HTML on mount ───────────────────────────────────

  onMount(() => {
    if (import.meta.env.MODE === 'test') {
      setHtmlContent('<p>Help content unavailable in test environment.</p>')
      setLoading(false)
      return
    }

    const resolveHelpAssetUrl = (path: string) => {
      if (typeof window !== 'undefined' && /^https?:/i.test(window.location.href)) {
        return new URL(path, window.location.href).toString()
      }
      return path
    }

    const htmlPromise = fetch(resolveHelpAssetUrl('/help.html'))
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load help: ${res.status}`)
        return res.text()
      })
    const glossaryPromise = fetch(resolveHelpAssetUrl('/help-glossary.json'))
      .then((res) => (res.ok ? (res.json() as Promise<GlossaryTerm[]>) : []))
      .catch(() => [] as GlossaryTerm[])

    Promise.all([htmlPromise, glossaryPromise])
      .then(([html, terms]) => {
        glossaryTerms = terms
        setHtmlContent(extractBody(html))
        setLoading(false)
      })
      .catch((err) => {
        console.error('Help drawer: failed to load help.html', err)
        setHtmlContent('<p>Unable to load help content.</p>')
        setLoading(false)
      })
  })

  // ── Scroll to anchor ──────────────────────────────────────────

  function scrollToAnchor(anchorId: string, smooth = true) {
    if (!contentRef) return
    if (anchorId === 'help-top') {
      scrollRef?.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' })
      return
    }
    const target = contentRef.querySelector(`#${CSS.escape(anchorId)}`)
    if (target) {
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' })
      // Flash effect
      target.classList.add('help-target-flash')
      setTimeout(() => target.classList.remove('help-target-flash'), 1500)
    }
  }

  function navigateTo(anchorId: string, pushHistory = true) {
    // Clear search when navigating
    setSearchQuery('')
    setSearchResults(null)

    if (pushHistory) {
      setHistory((prev) => {
        // Trim forward entries when navigating from middle of stack
        const trimmed = prev.stack.slice(0, prev.index + 1)
        return {
          stack: [...trimmed, anchorId],
          index: trimmed.length,
        }
      })
    }
    scrollToAnchor(anchorId)
    saveLastAnchor(anchorId)
  }

  function saveLastAnchor(anchorId: string) {
    try {
      window.localStorage.setItem('lp-sketch.help.last-anchor.v1', anchorId)
    } catch {
      // Ignore
    }
  }

  // ── History navigation ─────────────────────────────────────────

  function canGoBack() {
    return history().index > 0
  }

  function canGoForward() {
    const h = history()
    return h.index < h.stack.length - 1
  }

  function goBack() {
    if (!canGoBack()) return
    setHistory((prev) => ({ ...prev, index: prev.index - 1 }))
    scrollToAnchor(history().stack[history().index])
  }

  function goForward() {
    if (!canGoForward()) return
    setHistory((prev) => ({ ...prev, index: prev.index + 1 }))
    scrollToAnchor(history().stack[history().index])
  }

  function goHome() {
    navigateTo('help-top')
  }

  // ── Cross-reference link interception ──────────────────────────

  function handleContentClick(event: MouseEvent) {
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href || !href.startsWith('#')) return
    event.preventDefault()
    const anchorId = href.slice(1)
    navigateTo(anchorId)
  }

  // ── Search ─────────────────────────────────────────────────────

  interface SearchResult {
    anchorId: string
    heading: string
    preview: string
  }

  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined

  function handleSearchInput(value: string) {
    const prev = searchQuery()
    setSearchQuery(value)
    clearTimeout(searchDebounceTimer)

    // Save scroll position when entering search mode
    if (!prev.trim() && value.trim() && scrollRef) {
      preSearchScrollTop = scrollRef.scrollTop
    }

    if (!value.trim()) {
      setSearchResults(null)
      // Restore scroll position when clearing search
      if (scrollRef) {
        requestAnimationFrame(() => {
          scrollRef!.scrollTop = preSearchScrollTop
        })
      }
      return
    }
    searchDebounceTimer = setTimeout(() => {
      performSearch(value.trim())
    }, 200)
  }

  function performSearch(query: string) {
    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()

    for (const entry of sectionIndex) {
      const fullText = entry.heading + ' ' + entry.text
      const lowerFull = fullText.toLowerCase()
      const idx = lowerFull.indexOf(lowerQuery)
      if (idx === -1) continue

      // Build preview around match
      const start = Math.max(0, idx - 40)
      const end = Math.min(fullText.length, idx + query.length + 80)
      let preview = ''
      if (start > 0) preview += '...'
      preview += fullText.slice(start, end)
      if (end < fullText.length) preview += '...'

      results.push({
        anchorId: entry.anchorId,
        heading: entry.heading,
        preview,
      })
    }

    // Sort: heading matches first
    results.sort((a, b) => {
      const aHead = a.heading.toLowerCase().includes(lowerQuery) ? 0 : 1
      const bHead = b.heading.toLowerCase().includes(lowerQuery) ? 0 : 1
      return aHead - bHead
    })

    setSearchResults(results)
  }

  function handleSearchResultClick(anchorId: string) {
    const query = searchQuery().trim()
    setSearchResults(null)
    setSearchQuery('')
    navigateTo(anchorId)
    // Apply search highlights after navigation scroll completes
    if (query) {
      requestAnimationFrame(() => {
        highlightSearchTerms(anchorId, query)
      })
    }
  }

  /** Highlight occurrences of a search term within the target section's DOM. */
  function highlightSearchTerms(anchorId: string, query: string) {
    if (!contentRef) return
    const heading = contentRef.querySelector(`#${CSS.escape(anchorId)}`)
    if (!heading) return

    // Collect all element nodes from heading through its section siblings
    const sectionElements: Element[] = [heading]
    let sibling = heading.nextElementSibling
    while (sibling && !/^H[1-6]$/.test(sibling.tagName)) {
      sectionElements.push(sibling)
      sibling = sibling.nextElementSibling
    }

    const marks: HTMLElement[] = []
    const lowerQuery = query.toLowerCase()

    for (const el of sectionElements) {
      // Walk text nodes within this element
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const textNodes: Text[] = []
      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) {
        textNodes.push(node)
      }

      for (const textNode of textNodes) {
        const text = textNode.textContent ?? ''
        const lowerText = text.toLowerCase()
        const idx = lowerText.indexOf(lowerQuery)
        if (idx === -1) continue

        // Skip text inside headings, links, or existing marks
        const parent = textNode.parentElement
        if (!parent) continue
        if (parent.closest('a, h1, h2, h3, h4, h5, h6, mark')) continue

        // Split the text node and wrap the match in a <mark>
        const before = text.slice(0, idx)
        const match = text.slice(idx, idx + query.length)
        const after = text.slice(idx + query.length)

        const mark = document.createElement('mark')
        mark.className = 'help-search-highlight'
        mark.textContent = match
        marks.push(mark)

        const frag = document.createDocumentFragment()
        if (before) frag.appendChild(document.createTextNode(before))
        frag.appendChild(mark)
        if (after) frag.appendChild(document.createTextNode(after))
        parent.replaceChild(frag, textNode)
      }
    }

    // After 3 seconds, fade out highlights and then remove them
    if (marks.length > 0) {
      setTimeout(() => {
        for (const mark of marks) {
          mark.classList.add('fading')
        }
        // Remove mark elements after fade transition
        setTimeout(() => {
          for (const mark of marks) {
            const parent = mark.parentNode
            if (!parent) continue
            const text = document.createTextNode(mark.textContent ?? '')
            parent.replaceChild(text, mark)
            parent.normalize()
          }
        }, 500)
      }, 3000)
    }
  }

  // ── Glossary tooltips ─────────────────────────────────────────

  function showGlossaryTooltip(termSpan: HTMLElement) {
    const termKey = termSpan.dataset.term
    if (!termKey || !tooltipRef || !drawerRef) return

    const term = glossaryTerms.find((t) => t.term.toLowerCase() === termKey)
    if (!term) return

    // Set content and accessibility
    tooltipRef.textContent = term.definition
    termSpan.setAttribute('aria-describedby', 'help-glossary-tooltip')
    activeGlossarySpan = termSpan

    // The drawer has transform: translateX(0) when open, which makes it the
    // containing block for position:fixed children. All coordinates must be
    // drawer-relative, not viewport-relative.
    const termRect = termSpan.getBoundingClientRect()
    const drawerRect = drawerRef.getBoundingClientRect()
    const termLeft = termRect.left - drawerRect.left
    const termTop = termRect.top - drawerRect.top
    const termBottom = termRect.bottom - drawerRect.top

    // Make visible to measure dimensions
    tooltipRef.classList.add('visible')
    const tooltipHeight = tooltipRef.offsetHeight
    const tooltipWidth = tooltipRef.offsetWidth

    // Horizontal: align with term start, clamped to drawer bounds
    let left = termLeft
    if (left + tooltipWidth > drawerRect.width - 8) {
      left = drawerRect.width - tooltipWidth - 8
    }
    left = Math.max(8, left)
    tooltipRef.style.left = `${left}px`

    // Vertical: prefer below, flip above if overflowing
    if (termBottom + tooltipHeight + 6 > drawerRect.height) {
      tooltipRef.style.top = `${termTop - tooltipHeight - 6}px`
    } else {
      tooltipRef.style.top = `${termBottom + 6}px`
    }

    // Auto-dismiss after 5 seconds
    clearTimeout(tooltipDismissTimer)
    tooltipDismissTimer = setTimeout(hideGlossaryTooltip, 5000)
  }

  function hideGlossaryTooltip() {
    if (!tooltipRef) return
    tooltipRef.classList.remove('visible')
    clearTimeout(tooltipShowTimer)
    clearTimeout(tooltipDismissTimer)
    if (activeGlossarySpan) {
      activeGlossarySpan.removeAttribute('aria-describedby')
      activeGlossarySpan = null
    }
  }

  function handleGlossaryPointerOver(event: MouseEvent) {
    const span = (event.target as HTMLElement).closest('.help-glossary-term') as HTMLElement | null
    if (!span) {
      clearTimeout(tooltipShowTimer)
      if (activeGlossarySpan) hideGlossaryTooltip()
      return
    }
    if (span === activeGlossarySpan) return
    clearTimeout(tooltipShowTimer)
    hideGlossaryTooltip()
    tooltipShowTimer = setTimeout(() => showGlossaryTooltip(span), 300)
  }

  function handleGlossaryFocusIn(event: FocusEvent) {
    const span = (event.target as HTMLElement).closest('.help-glossary-term') as HTMLElement | null
    if (!span) return
    clearTimeout(tooltipShowTimer)
    showGlossaryTooltip(span)
  }

  function handleGlossaryFocusOut() {
    hideGlossaryTooltip()
  }

  // ── Scroll position persistence ────────────────────────────────

  function saveScrollPosition() {
    if (!scrollRef) return
    try {
      window.localStorage.setItem(STORAGE_KEY_SCROLL, String(scrollRef.scrollTop))
    } catch {
      // Ignore
    }
  }

  function restoreScrollPosition() {
    if (!scrollRef) return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_SCROLL)
      if (raw) {
        scrollRef.scrollTop = Number.parseFloat(raw)
      }
    } catch {
      // Ignore
    }
  }

  // ── Keyboard shortcuts (scoped to drawer) ──────────────────────

  function handleDrawerKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      help.closeHelp()
      return
    }

    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault()
      goBack()
      return
    }

    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault()
      goForward()
      return
    }

    const ctrlOrCmd = event.ctrlKey || event.metaKey
    if (ctrlOrCmd && event.key.toLowerCase() === 'f') {
      event.preventDefault()
      event.stopPropagation()
      searchInputRef?.focus()
      searchInputRef?.select()
    }
  }

  // ── Open/close effects ─────────────────────────────────────────

  createEffect(
    on(
      () => help.isOpen(),
      (open) => {
        if (open) {
          previouslyFocused = document.activeElement
          // Reset history stack
          setHistory({ stack: [], index: -1 })
          // Focus the drawer after a tick to allow slide transition
          requestAnimationFrame(() => {
            drawerRef?.focus()
          })
        } else {
          saveScrollPosition()
          // Restore focus
          if (previouslyFocused instanceof HTMLElement) {
            previouslyFocused.focus()
          }
          previouslyFocused = null
        }
      },
    ),
  )

  // Navigate to target anchor when it changes
  createEffect(
    on(
      () => help.targetAnchor(),
      (anchor) => {
        if (!anchor || loading()) return
        // Small delay to ensure DOM is ready
        requestAnimationFrame(() => {
          navigateTo(anchor)
          help.clearTarget()
        })
      },
    ),
  )

  // When content finishes loading, build index and handle initial navigation
  createEffect(
    on(
      () => loading(),
      (isLoading) => {
        if (isLoading) return
        // Build section index and annotate glossary terms once content is in the DOM
        requestAnimationFrame(() => {
          if (contentRef) {
            sectionIndex = buildSectionIndex(contentRef)
            annotateGlossaryTerms(contentRef, glossaryTerms)
          }
        })
        const anchor = help.targetAnchor()
        if (anchor) {
          requestAnimationFrame(() => {
            navigateTo(anchor, true)
            help.clearTarget()
          })
        } else {
          restoreScrollPosition()
        }
      },
    ),
  )

  // ── Close on click-outside (unless pinned) ──────────────────
  function handleClickOutside(e: PointerEvent) {
    if (!help.isOpen() || help.isPinned()) return
    if (drawerRef && !drawerRef.contains(e.target as Node)) {
      help.closeHelp()
    }
  }

  onMount(() => {
    document.addEventListener('pointerdown', handleClickOutside)
  })

  // Cleanup
  onCleanup(() => {
    document.removeEventListener('pointerdown', handleClickOutside)
    clearTimeout(searchDebounceTimer)
    clearTimeout(tooltipShowTimer)
    clearTimeout(tooltipDismissTimer)
  })

  return (
    <aside
      ref={drawerRef}
      class={`help-drawer ${help.isOpen() ? 'help-drawer-open' : ''}`}
      role="complementary"
      aria-label="Help"
      tabIndex={-1}
      onKeyDown={handleDrawerKeyDown}
    >
      {/* ── Header bar ──────────────────────────────── */}
      <div class="help-drawer-header">
        <div class="help-drawer-nav">
          <button
            class="help-drawer-btn"
            type="button"
            title="Home"
            onClick={goHome}
          >
            <i class={tablerIconClass('home')} />
          </button>
          <button
            class="help-drawer-btn"
            type="button"
            title="Back"
            disabled={!canGoBack()}
            onClick={goBack}
          >
            <i class={tablerIconClass('arrow-left')} />
          </button>
          <button
            class="help-drawer-btn"
            type="button"
            title="Forward"
            disabled={!canGoForward()}
            onClick={goForward}
          >
            <i class={tablerIconClass('arrow-right')} />
          </button>
        </div>

        <div class="help-drawer-search">
          <i class={`${tablerIconClass('search')} help-drawer-search-icon`} />
          <input
            ref={searchInputRef}
            class="help-drawer-search-input"
            type="text"
            placeholder="Search help..."
            value={searchQuery()}
            onInput={(e) => handleSearchInput(e.currentTarget.value)}
          />
          <Show when={searchQuery()}>
            <button
              class="help-drawer-btn help-drawer-search-clear"
              type="button"
              title="Clear search"
              onClick={() => {
                setSearchQuery('')
                setSearchResults(null)
                searchInputRef?.focus()
                // Restore pre-search scroll position
                if (scrollRef) {
                  requestAnimationFrame(() => {
                    scrollRef!.scrollTop = preSearchScrollTop
                  })
                }
              }}
            >
              <i class={tablerIconClass('x')} />
            </button>
          </Show>
        </div>

        <button
          class={`help-drawer-btn ${help.isPinned() ? 'help-drawer-btn-active' : ''}`}
          type="button"
          title={help.isPinned() ? 'Unpin drawer' : 'Pin drawer open'}
          onClick={help.togglePin}
        >
          <i class={tablerIconClass(help.isPinned() ? 'pinned' : 'pin')} />
        </button>
        <button
          class="help-drawer-btn"
          type="button"
          title="Close help"
          onClick={help.closeHelp}
        >
          <i class={tablerIconClass('x')} />
        </button>
      </div>

      {/* ── Content area ────────────────────────────── */}
      <div class="help-drawer-scroll" ref={scrollRef} onScroll={hideGlossaryTooltip}>
        <Show when={loading()}>
          <div class="help-drawer-loading">Loading help...</div>
        </Show>

        <Show when={searchResults()}>
          {(results) => (
            <div class="help-search-results">
              <Show
                when={results().length > 0}
                fallback={
                  <div class="help-search-no-results">
                    No results for &ldquo;{searchQuery()}&rdquo;
                  </div>
                }
              >
                <div class="help-search-results-count">
                  {results().length} result{results().length !== 1 ? 's' : ''}
                </div>
                {results().map((result) => (
                  <button
                    class="help-search-result-item"
                    type="button"
                    onClick={() => handleSearchResultClick(result.anchorId)}
                  >
                    <div class="help-search-result-heading">{result.heading}</div>
                    <div class="help-search-result-preview">{result.preview}</div>
                  </button>
                ))}
              </Show>
            </div>
          )}
        </Show>

        <div
          ref={contentRef}
          class="help-content"
          style={{ display: searchResults() ? 'none' : undefined }}
          onClick={handleContentClick}
          onMouseOver={handleGlossaryPointerOver}
          onFocusIn={handleGlossaryFocusIn}
          onFocusOut={handleGlossaryFocusOut}
          // biome-ignore lint: innerHTML is from our own build pipeline, not user input
          innerHTML={htmlContent()}
        />
      </div>

      {/* ── Glossary tooltip ─────────────────────────── */}
      <div
        ref={tooltipRef}
        class="help-glossary-tooltip"
        role="tooltip"
        id="help-glossary-tooltip"
      />
    </aside>
  )
}
