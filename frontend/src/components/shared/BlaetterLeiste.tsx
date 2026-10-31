import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Ein Ziel ist entweder eine Adresse (Defense blaettert per Route) oder ein Handgriff
 *  (Offense blaettert im Zustand derselben Seite). Die Leiste traegt beides gleich. */
export type Ziel = { to: string } | { onClick: () => void }

/**
 * Die Blaetterzeile der Buehnenseiten: zurueck, wo man ist, weiter.
 *
 * **Sie steht einmal da, weil sie sonst auseinanderlaeuft.** Offense und Defense hatten
 * dieselbe Zeile zweimal gebaut, und dabei hiess der Weg vorwaerts drueben „Naechstes
 * Play", hier „Weiter" und auf der letzten Karte gleich der Name des naechsten Kapitels
 * — drei Beschriftungen fuer eine Handlung, drei Knopfbreiten, und die laengste schob den
 * Stand in der Mitte ab.
 *
 * Geblieben ist **„Weiter"**: was weiter kommt, sagt der Stand links daneben („Play 6 von
 * 9", „Karte 4 von 6") und gleich darauf die Kopfzeile der neuen Seite. Ein Knopf, der
 * seinen eigenen Zielnamen traegt, wird so lang wie dieser Name.
 *
 * Am Ende steht **„Fertig"** und fuehrt zurueck auf die Uebersicht. Der Weg zurueck bleibt
 * auch dann sichtbar, wenn es keinen gibt — abgeschaltet statt weggelassen: so zeigt die
 * Zeile die Richtung UND dass sie hier zu Ende ist. Ein leerer Platzhalter zeigte nur eine
 * Luecke.
 *
 * Amber gibt es auf diesen Seiten genau einmal, und das ist hier.
 */
export function BlaetterLeiste({
  zurueck,
  zurueckLabel,
  stand,
  weiter,
  fertig,
}: {
  zurueck: Ziel | null
  /** „Vorheriges Play" / „Vorherige Karte" — der Knopf traegt nur das Zeichen. */
  zurueckLabel: string
  /** Wo man ist: „Play 6 von 9". */
  stand: string
  /** Fehlt es, steht am Ende „Fertig". */
  weiter: Ziel | null
  fertig: { to: string }
}) {
  return (
    <div className="flex items-center gap-2 border-t border-cream-50/12 px-4 py-2">
      <Knopf
        ziel={zurueck}
        aria-label={zurueckLabel}
        className="font-display flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-cream-50/25 text-cream-50 disabled:opacity-35 active:bg-cream-50/10"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </Knopf>

      <span className="font-display flex-1 truncate text-center text-[11px] font-bold uppercase tracking-widest text-cream-50/55">
        {stand}
      </span>

      {weiter ? (
        <Knopf ziel={weiter} className={VORWAERTS}>
          Weiter
          <ChevronRight size={18} aria-hidden="true" />
        </Knopf>
      ) : (
        <Link to={fertig.to} className={VORWAERTS}>
          Fertig
        </Link>
      )}
    </div>
  )
}

const VORWAERTS =
  'font-display flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-5 text-[11px] font-extrabold uppercase tracking-widest text-navy-900 active:brightness-110'

/** Ohne Ziel bleibt der Knopf stehen und ist abgeschaltet. */
function Knopf({
  ziel,
  className,
  children,
  ...rest
}: {
  ziel: Ziel | null
  className: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  if (ziel && 'to' in ziel) {
    return (
      <Link to={ziel.to} className={className} aria-label={rest['aria-label']}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={ziel?.onClick} disabled={!ziel} className={className} {...rest}>
      {children}
    </button>
  )
}
