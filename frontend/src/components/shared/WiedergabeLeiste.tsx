import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { RefreshIcon } from '@/icons'

/** Ein Ziel ist eine Adresse (Defense blaettert per Route) oder ein Handgriff (Offense
 *  blaettert im Zustand derselben Seite). Die Leiste traegt beides gleich. */
export type Ziel = { to: string } | { onClick: () => void }

/**
 * Die Leiste unter der Buehne. **Eine Zeile, eine Sprache, beide Haelften.**
 *
 * Vorher waren es zwei Zeilen uebereinander: blaettern oben, abspielen unten. Zusammen
 * kosteten sie rund 120 Pixel Hoehe und zeigten zwei Rangfolgen, die sich widersprachen —
 * oben war Amber „Weiter", unten lag der Knopf, den man tatsaechlich zuerst drueckt. Wer
 * ankam, tippte auf das Gelbe und blaetterte aus dem Play heraus, das er sehen wollte.
 *
 * Jetzt: der Stand als duenne Zeile, darunter die Knoepfe nebeneinander. Links zurueck,
 * rechts weiter, in der Mitte, was es auf dieser Seite zu bedienen gibt. **Amber genau
 * einmal**, naemlich auf dem, was man hier als Naechstes tut: beim Play das Abspielen
 * (es wartet), im Spielwissen das Weiterblaettern (die Karte laeuft von selbst).
 *
 * Woerter stehen auf keinem der Zeichen-Knoepfe. ▶, ❚❚, ↻ und die Winkel versteht jeder,
 * und vier beschriftete Knoepfe passen am Handy ohnehin nicht nebeneinander.
 */
export function WiedergabeLeiste({
  zurueck,
  zurueckLabel,
  stand,
  weiter,
  weiterLabel,
  fertig,
  abspielen,
  nochmal,
}: {
  zurueck: Ziel | null
  /** „Vorheriges Play" / „Vorherige Karte" — der Knopf traegt nur das Zeichen. */
  zurueckLabel: string
  /** Wo man ist: „Play 6 von 9". */
  stand: string
  /** Fehlt es, steht am Ende „Fertig". */
  weiter: Ziel | null
  /** „Naechstes Play" / „Naechste Karte", nur fuers Vorlesen. */
  weiterLabel: string
  fertig: { to: string }
  /** Wiedergabe, wo es eine gibt. Ihr gehoert dann Amber. */
  abspielen?: { laeuft: boolean; kann: boolean; onToggle: () => void }
  /** Von vorn. */
  nochmal?: { onNochmal: () => void; kann?: boolean }
}) {
  const amberAufWeiter = !abspielen
  return (
    <div className="border-t border-cream-50/12 px-4 pb-3 pt-1.5 safe-bottom">
      <p className="font-display pb-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-cream-50/55">
        {stand}
      </p>
      <div className="flex items-center gap-2">
        <Knopf ziel={zurueck} aria-label={zurueckLabel} className={`w-14 shrink-0 ${RUHIG}`}>
          <ChevronLeft size={20} aria-hidden="true" />
        </Knopf>

        {abspielen && (
          <Knopf
            ziel={abspielen.kann ? { onClick: abspielen.onToggle } : null}
            aria-label={abspielen.laeuft ? 'Pause' : 'Abspielen'}
            className={`flex-1 text-lg leading-none ${abspielen.laeuft ? RUHIG : AMBER}`}
          >
            {abspielen.laeuft ? '❚❚' : '▶'}
          </Knopf>
        )}

        {nochmal && (
          <Knopf
            ziel={nochmal.kann === false ? null : { onClick: nochmal.onNochmal }}
            aria-label="Nochmal"
            className={`flex-1 ${RUHIG}`}
          >
            <RefreshIcon size={20} />
          </Knopf>
        )}

        {weiter ? (
          <Knopf
            ziel={weiter}
            aria-label={weiterLabel}
            className={`w-14 shrink-0 ${amberAufWeiter ? AMBER : RUHIG}`}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </Knopf>
        ) : (
          <Link
            to={fertig.to}
            className={`${BASIS} shrink-0 px-5 text-[11px] font-extrabold uppercase tracking-widest ${amberAufWeiter ? AMBER : RUHIG}`}
          >
            Fertig
          </Link>
        )}
      </div>
    </div>
  )
}

const BASIS = 'font-display flex h-12 items-center justify-center gap-1.5 rounded-xl'
const AMBER = 'bg-amber-400 text-navy-900 active:brightness-110'
const RUHIG = 'border border-cream-50/25 text-cream-50 active:bg-cream-50/10'

/** Ohne Ziel bleibt der Knopf stehen und ist abgeschaltet: er zeigt die Richtung UND
 *  dass sie hier zu Ende ist. Ein leerer Platzhalter zeigte nur eine Luecke. */
function Knopf({
  ziel,
  className,
  children,
  ...rest
}: {
  ziel: Ziel | null
  className: string
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const klassen = `${BASIS} disabled:opacity-35 ${className}`
  if (ziel && 'to' in ziel) {
    return (
      <Link to={ziel.to} className={klassen} aria-label={rest['aria-label']}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={ziel?.onClick} disabled={!ziel} className={klassen} {...rest}>
      {children}
    </button>
  )
}
