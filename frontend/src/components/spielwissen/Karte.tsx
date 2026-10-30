import { useState } from 'react'
import { useReducedMotionConfig } from 'motion/react'
import type { KartenDaten } from './kapitel'

/**
 * Die Huelle um eine Karte: Buehne oben, Aussage unten, „nochmal" darunter.
 *
 * **Navy in beiden Themes.** Wie die Analyse-Seiten ist das Gestaltung der Seite und
 * nicht das Theme: auf dunklem Grund stehen die Zeichnungen, und die Pointe in Amber
 * liegt darauf, wo sie im Hellen verschwaende. Der helle Rand ist dafuer der Preis: im
 * Dunkeln liegt die Karte sonst auf einer fast gleich dunklen Seite und hoert auf, ein
 * Gegenstand zu sein. Im Hellen faellt er nicht auf.
 *
 * **Nichts laeuft in Schleife.** Eine Dauerbewegung neben einem Satz, den man liest, ist
 * Laerm. Wer sie noch einmal sehen will, tippt „nochmal"; der Zaehler `lauf` geht an die
 * Buehne, die ihn an ihre `key`s haengt und dadurch neu beginnt.
 *
 * **Reduzierte Bewegung traegt die Karte selbst.** Die Regel in `styles/index.css` ist
 * reines CSS und fasst `motion/react` nicht an, weil das aus JavaScript animiert. Ohne
 * `ruhig` liefen die Sequenzen bei abgeschalteter Bewegung weiter, und zwar in voller
 * Laenge. Dann faellt auch „nochmal" weg: es gibt nichts abzuspielen.
 *
 * Gelesen wird `useReducedMotionConfig`, nicht `useReducedMotion`: nur das erste achtet
 * auf das `<MotionConfig reducedMotion>` der App (main.tsx setzt dort „user", faellt also
 * auf die Systemeinstellung durch). Das zweite liest `matchMedia` einmal in einen
 * Modulzustand und ist danach fuer den ganzen Prozess festgenagelt.
 */
export function Karte({ karte }: { karte: KartenDaten }) {
  const [lauf, setLauf] = useState(0)
  const ruhig = Boolean(useReducedMotionConfig())
  const { Buehne } = karte

  return (
    <article className="overflow-hidden rounded-2xl border border-cream-50/12 bg-navy-900 text-cream-50">
      <div className="relative">
        <Buehne lauf={lauf} ruhig={ruhig} />
      </div>

      <div className="px-4 pb-3 pt-1">
        <h3 className="font-display text-base font-extrabold uppercase leading-tight tracking-wide text-amber-400 sm:text-lg">
          {karte.pointe}
        </h3>
        {karte.satz && (
          <p className="mt-1 text-[13px] leading-snug text-cream-50/75">{karte.satz}</p>
        )}
      </div>

      {!ruhig && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => setLauf(x => x + 1)}
            className="font-display min-h-11 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-cream-50/70 hover:bg-navy-800 hover:text-cream-50 active:bg-navy-700 active:text-cream-50"
          >
            nochmal
          </button>
        </div>
      )}
    </article>
  )
}
