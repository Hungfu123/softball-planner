import { useEffect, useState } from 'react'
import { useReducedMotionConfig } from 'motion/react'
import type { KartenDaten } from './kapitel'

/**
 * Die Buehne einer Karte, formatfuellend — **das Gegenstueck zum Feld im Play**.
 *
 * Vorher war die Karte ein Gegenstand: gerundeter Kasten mit Rand, Pointe und „nochmal"
 * darin, mitten auf einer cremefarbenen Seite mit Navigation darueber. Nebeneinander
 * gehalten zeigte sich der Bruch sofort — die Defense nimmt den ganzen Bildschirm, die
 * Offense zeigte einen Ausschnitt in der Mitte. Dieselbe Sache, zwei Ansichten.
 *
 * Jetzt traegt die Seite, was die Karte trug: Pointe und Satz stehen unter der Buehne wie
 * die Notiz unter dem Feld, „nochmal" sitzt unten am Rand wie die Wiedergabeleiste. Hier
 * bleibt die Buehne und die Frage, **ob sie laeuft**.
 *
 * **Navy in beiden Themes.** Wie die Analyse-Seiten ist das Gestaltung der Seite und
 * nicht das Theme: auf dunklem Grund stehen die Zeichnungen, und die Pointe in Amber
 * liegt darauf, wo sie im Hellen verschwaende.
 *
 * **Nichts laeuft in Schleife.** Eine Dauerbewegung neben einem Satz, den man liest, ist
 * Laerm. Wer sie noch einmal sehen will, tippt „nochmal".
 *
 * Der Zaehler `lauf` sitzt als `key` an der **Buehne selbst**, nicht an einem Element
 * darin. Das ist der Unterschied zwischen „laeuft neu ab" und „faengt neu an": ein key
 * weiter innen haengt nur das DOM neu, die Komponente bleibt stehen und mit ihr ihr
 * `useState`. Die Count-Karte blieb so nach drei Strikes fuer immer auf OUT, mit einem
 * Knopf daneben, der nichts tat. Er kommt von aussen, weil der Knopf dazu unten am
 * Bildschirmrand steht und nicht mehr in der Karte.
 *
 * **Reduzierte Bewegung traegt die Karte selbst.** Die Regel in `styles/index.css` ist
 * reines CSS und fasst `motion/react` nicht an, weil das aus JavaScript animiert. Ohne
 * `ruhig` liefen die Sequenzen bei abgeschalteter Bewegung weiter, und zwar in voller
 * Laenge.
 *
 * Gelesen wird `useReducedMotionConfig`, nicht `useReducedMotion`: nur das erste achtet
 * auf das `<MotionConfig reducedMotion>` der App (main.tsx setzt dort „user", faellt also
 * auf die Systemeinstellung durch). Das zweite liest `matchMedia` einmal in einen
 * Modulzustand und ist danach fuer den ganzen Prozess festgenagelt.
 */
export function Karte({ karte, aktiv, lauf = 0 }: { karte: KartenDaten; aktiv: boolean; lauf?: number }) {
  const [gespielt, setGespielt] = useState(false)
  const ruhig = Boolean(useReducedMotionConfig())
  const { Buehne } = karte

  /*
   * Die Sequenz beginnt, wenn die Karte die aktive ist, nicht beim Aufbau der Seite.
   * Welche dran ist, entscheidet die Kapitelseite — sie sieht alle.
   *
   * Einmal gespielt bleibt gespielt: beim Zurueckblaettern faengt nichts von selbst
   * wieder an. Dafuer gibt es „nochmal".
   */
  useEffect(() => {
    if (aktiv && !ruhig) setGespielt(true)
  }, [aktiv, ruhig])

  const steht = ruhig || !gespielt

  return (
    /*
     * `justify-center`: eine Buehne, die breiter als hoch ist, kann am Handy nie den
     * ganzen Platz fuellen — das Seitenverhaeltnis steckt im viewBox. Sie steht dann in
     * der Mitte des freien Platzes und teilt den Rest oben und unten, statt oben zu
     * kleben und unten eine Luecke zu lassen.
     */
    <div
      id={`karte-${karte.id}`}
      data-buehne
      className="flex h-full min-h-0 flex-col justify-center overflow-hidden"
    >
      <Buehne key={`${gespielt}-${lauf}`} lauf={lauf} ruhig={steht} />
    </div>
  )
}
