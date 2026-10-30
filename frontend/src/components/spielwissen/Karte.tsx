import { useEffect, useState } from 'react'
import { useReducedMotionConfig } from 'motion/react'
import type { KartenDaten } from './kapitel'
import { RefreshIcon } from '@/icons'

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
 * Laerm. Wer sie noch einmal sehen will, tippt „nochmal".
 *
 * Der Zaehler `lauf` sitzt als `key` an der **Buehne selbst**, nicht an einem Element
 * darin. Das ist der Unterschied zwischen „laeuft neu ab" und „faengt neu an": ein key
 * weiter innen haengt nur das DOM neu, die Komponente bleibt stehen und mit ihr ihr
 * `useState`. Die Count-Karte blieb so nach drei Strikes fuer immer auf OUT, mit einem
 * Knopf daneben, der nichts tat.
 *
 * **Reduzierte Bewegung traegt die Karte selbst.** Die Regel in `styles/index.css` ist
 * reines CSS und fasst `motion/react` nicht an, weil das aus JavaScript animiert. Ohne
 * `ruhig` liefen die Sequenzen bei abgeschalteter Bewegung weiter, und zwar in voller
 * Laenge. Dann faellt auch „nochmal" weg: es gibt nichts abzuspielen.
 *
 * Dasselbe gilt fuer `selbstgesteuert`: eine Karte mit eigenen Knoepfen laeuft nicht ab,
 * sie wird bedient. „nochmal" waere dort ein zweiter Weg zum selben Ziel.
 *
 * Gelesen wird `useReducedMotionConfig`, nicht `useReducedMotion`: nur das erste achtet
 * auf das `<MotionConfig reducedMotion>` der App (main.tsx setzt dort „user", faellt also
 * auf die Systemeinstellung durch). Das zweite liest `matchMedia` einmal in einen
 * Modulzustand und ist danach fuer den ganzen Prozess festgenagelt.
 */
export function Karte({ karte, aktiv }: { karte: KartenDaten; aktiv: boolean }) {
  const [lauf, setLauf] = useState(0)
  const [gespielt, setGespielt] = useState(false)
  const ruhig = Boolean(useReducedMotionConfig())
  const { Buehne } = karte

  /*
   * Die Sequenz beginnt, wenn die Karte die aktive ist, nicht beim Aufbau der Seite.
   *
   * Gemessen: ein Kapitel ist rund drei Bildschirme hoch, beim Laden ist genau EINE Karte
   * zur Haelfte zu sehen, und bis zu DREI stehen gleichzeitig weit genug im Bild, um eine
   * Schwelle zu reissen. Starteten alle beim Aufbau, waeren fuenf von sechs vorbei, bevor
   * jemand hinsieht; startete jede fuer sich, liefen drei nebeneinander. Welche dran ist,
   * entscheidet deshalb die Kapitelseite — sie sieht alle.
   *
   * Einmal gespielt bleibt gespielt: beim Zurueckscrollen faengt nichts von selbst wieder
   * an. Dafuer gibt es „nochmal".
   */
  useEffect(() => {
    if (aktiv && !ruhig) setGespielt(true)
  }, [aktiv, ruhig])

  const steht = ruhig || !gespielt

  return (
    <article id={`karte-${karte.id}`} className="overflow-hidden rounded-2xl border border-cream-50/12 bg-navy-900 text-cream-50">
      <div className="relative">
        <Buehne key={`${gespielt}-${lauf}`} lauf={lauf} ruhig={steht} />
      </div>

      <div className="px-4 pb-3 pt-1">
        <h3 className="font-display text-base font-extrabold uppercase leading-tight tracking-wide text-amber-400 sm:text-lg">
          {karte.pointe}
        </h3>
        {karte.satz && (
          <p className="mt-1 text-[13px] leading-snug text-cream-50/75">{karte.satz}</p>
        )}
      </div>

      {!ruhig && !karte.selbstgesteuert && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => setLauf(x => x + 1)}
            className="font-display flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-cream-50/70 hover:bg-navy-800 hover:text-cream-50 active:bg-navy-700 active:text-cream-50"
          >
            {/* Dasselbe Zeichen wie in der Wiedergabeleiste des Playmakers: ein Knopf,
                der in beiden Haelften gleich aussieht, ist einer und nicht zwei. */}
            <RefreshIcon size={14} />
            nochmal
          </button>
        </div>
      )}
    </article>
  )
}
