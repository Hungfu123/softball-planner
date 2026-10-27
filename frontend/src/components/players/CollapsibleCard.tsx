import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronRight } from '@/icons'
import { Abschnittsmarke } from '@/components/shared'

/**
 * Karte, die am Handy zugeklappt startet und ab `sm` offen.
 *
 * Für Nachschlage-Inhalte: sie beantworten keine Frage, die man beim Öffnen des
 * Profils hat, sind aber die längsten Karten der Seite. Zugeklappt bleiben sie an
 * ihrem Platz in der Reihenfolge — anders als bei Tabs sieht man weiter, dass es
 * sie gibt, und die Zeile darunter sagt, was drinsteht.
 */
export function CollapsibleCard({ title, subtitle, summary, children }: {
  title: string
  /** Zeile unter dem Titel, solange die Karte offen ist. */
  subtitle: string
  /** Zeile unter dem Titel, solange sie zu ist — sagt, was man aufklappt. */
  summary: string
  children: ReactNode
}) {
  // Der Zustand folgt dem Breakpoint, bis jemand selbst tippt — sonst bliebe eine
  // am Handy zugeklappte Karte auch nach dem Drehen oder am Desktop zu.
  const wide = useIsWide()
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? wide
  const reduceMotion = useReducedMotion()

  return (
    <section className="bg-white border border-cream-300 rounded-2xl px-4 py-4">
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        aria-expanded={open}
        className="w-full min-h-11 flex items-start justify-between gap-3 text-left cursor-pointer"
      >
        <span className="min-w-0">
          <h2 className="inline-flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wide text-navy-900"><Abschnittsmarke size="sm" />
            {title}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{open ? subtitle : summary}</p>
        </span>
        <ChevronRight
          size={16}
          className={`shrink-0 mt-0.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

const WIDE = '(min-width: 640px)'

/** Ab `sm`? Ohne matchMedia (jsdom) gilt „breit", damit Tests den vollen Inhalt sehen. */
function useIsWide(): boolean {
  return useSyncExternalStore(
    listener => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
      const query = window.matchMedia(WIDE)
      query.addEventListener?.('change', listener)
      return () => query.removeEventListener?.('change', listener)
    },
    () => typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? true
      : window.matchMedia(WIDE).matches,
    () => true,
  )
}
