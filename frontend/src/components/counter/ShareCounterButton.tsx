import { useEffect, useRef, useState } from 'react'
import { ShareIcon } from '@/icons'

type Hint = null | 'copied' | 'failed'

const HINT_TEXT: Record<Exclude<Hint, null>, string> = {
  copied: 'Link kopiert',
  failed: 'Kopieren nicht möglich',
}

const HINT_MS = 2000

/**
 * Gibt die Adresse der Zähler-Seite weiter, damit Leute ohne Zugangsdaten den
 * Zähler auf ihrem eigenen Gerät öffnen können.
 *
 * Geteilt wird die Seite, nicht der Spielstand — der liegt im localStorage des
 * jeweiligen Geräts. Wer den Link öffnet, startet bei 0:0.
 */
export function ShareCounterButton() {
  const [hint, setHint] = useState<Hint>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  function flash(next: Exclude<Hint, null>) {
    if (timer.current) clearTimeout(timer.current)
    setHint(next)
    timer.current = setTimeout(() => setHint(null), HINT_MS)
  }

  async function handleShare() {
    // Die Route ist bekannt und fest — teile explizit den Zähler, nicht die aktuelle URL mit
    // ihren Query-Parametern oder Hash-Fragmenten
    const url = new URL('/counter', window.location.origin).href

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Softball-Zähler', url })
        return
      } catch (err) {
        // Abbruch im Teilen-Blatt ist kein Fehler — kein Fallback, keine Meldung.
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      flash('copied')
    } catch {
      flash('failed')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {hint && (
        <span role="status" className="font-display text-[10px] font-bold uppercase tracking-widest text-navy-100">
          {HINT_TEXT[hint]}
        </span>
      )}
      <button
        type="button"
        onClick={handleShare}
        aria-label="Zähler teilen"
        title="Zähler teilen"
        className="rounded-lg p-2 text-navy-100/70 hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <ShareIcon size={20} />
      </button>
    </div>
  )
}
