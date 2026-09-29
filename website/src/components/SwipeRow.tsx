import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretRight } from '@phosphor-icons/react'

type Breakpoint = 'sm' | 'md'

/** Volle Klassennamen pro Breakpoint — Tailwind scannt den Source, keine
 *  Template-Strings wie `${bp}:hidden` (die würden nicht gefunden). */
const BREAKPOINTS: Record<Breakpoint, { row: string; chrome: string }> = {
  sm: { row: 'sm:overflow-visible sm:px-0 sm:pb-0', chrome: 'sm:hidden' },
  md: { row: 'md:overflow-visible md:px-0 md:pb-0', chrome: 'md:hidden' },
}

/** Farbvariante des Chrome (Fade + Pfeil) je nach Sektions-Hintergrund. */
type Tone = 'cream' | 'navy'
const TONES: Record<Tone, { fade: string; arrow: string }> = {
  cream: { fade: 'from-cream-50', arrow: 'bg-navy-900/90 text-cream-50' },
  navy: { fade: 'from-navy-950', arrow: 'bg-cream-50 text-navy-900' },
}

type SwipeRowProps = {
  children: ReactNode
  /** Ab dieser Tailwind-Breakpoint ist das Desktop-Grid aktiv (Swipe nur darunter). */
  hideAt: Breakpoint
  /** Desktop-Grid-Zustand, z. B. "md:grid md:grid-cols-3". */
  desktop: string
  /** Hintergrund der Sektion — steuert Fade-Richtung & Pfeil-Farben. Default: cream. */
  tone?: Tone
}

/**
 * Mobile Wisch-Reihe mit Scroll-Snap — das wiederkehrende Pattern für
 * Galerie und Regel-Karten. Bringt drei Affordances mit:
 *   1. Peek: Karten sind 78% breit, die nächste schaut hervor
 *   2. Cream-Fade am rechten Rand: "geht weiter"
 *   3. Pfeil-Button: tastbar, scrollt eine Karte weiter — und blendet
 *      sich am Ende der Reihe aus (ein Control, das nichts mehr tut,
 *      hat keinen Grund da zu sein)
 */
export function SwipeRow({ children, hideAt, desktop, tone = 'cream' }: SwipeRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)
  const bp = BREAKPOINTS[hideAt]
  const t = TONES[tone]

  const checkEnd = () => {
    const el = rowRef.current
    if (!el) return
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8)
  }

  // Initial prüfen: Desktop-Grids haben keinen Überlauf (scrollWidth ==
  // clientWidth) — der Pfeil darf dort nie erscheinen, auch ohne Scroll-Event.
  // ResizeObserver als Race-Absicherung: beim ersten Effekt-Durchlauf ist das
  // Layout teils noch nicht final (Fonts, lazy-Images) — ein zu klein
  // gemessenes scrollWidth ließ den Pfeil dauerhaft verschwinden, weil kein
  // weiteres Event nachfeuerte. Der Observer re-checkt, sobald die
  // Geometrie von Reihe oder Karten steht.
  useEffect(() => {
    checkEnd()
    const el = rowRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => checkEnd())
    ro.observe(el)
    Array.from(el.children).forEach((child) => ro.observe(child))
    return () => ro.disconnect()
  }, [])

  const next = () => {
    const el = rowRef.current
    if (!el) return
    el.scrollBy({ left: el.clientWidth * 0.75, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={rowRef}
        onScroll={checkEnd}
        className={`no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-1 ${bp.row} ${desktop}`}
      >
        {children}
      </div>

      {/* Fade-Hinweis: Inhalt läuft unter der Kante weiter */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l ${t.fade} to-transparent ${bp.chrome}`}
      />

      {/* Pfeil-Hint: sichtbar, tastbar, verschwindet am Ende */}
      <AnimatePresence>
        {!atEnd && (
          <motion.button
            type="button"
            aria-label="Weitere Karten ansehen"
            onClick={next}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className={`press absolute right-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full ${t.arrow} shadow-lg shadow-navy-950/25 backdrop-blur-sm ${bp.chrome}`}
          >
            <CaretRight size={20} weight="bold" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
