import { MotionConfig, PresenceContext, useReducedMotionConfig } from 'motion/react'
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
 * **Eine wartende Karte steht auf ihrer Ausgangssituation**, nicht auf ihrem Ergebnis.
 * Das ist der Unterschied zwischen einem Anfang und einem Standbild: zeigt man das Ende,
 * ist die Pointe schon weg, und wer dann abspielt, sieht zweimal dasselbe Bild.
 *
 * Gemacht wird das mit `MotionConfig isStatic`: die Buehnen setzen ihr `initial` wie
 * immer, motion rendert es und laesst es stehen, statt zu animieren. Der Preis ist ein
 * `key` auf der Config — motion friert `isStatic` je Instanz ein (`useConstant`), weil
 * daran haengt, wie viele Hooks ein motion-Bauteil feuert. Der Vorteil: **keine der
 * sechzehn Buehnen muss einen dritten Zustand kennen.**
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
  const ruhig = Boolean(useReducedMotionConfig())
  const { Buehne } = karte

  /*
   * Die Sequenz beginnt, wenn die Karte die aktive ist, nicht beim Aufbau der Seite.
   * Wer dran ist und ab wann, entscheidet die Kapitelseite — dort steht der ▶.
   *
   * Bei reduzierter Bewegung gibt es nichts zu warten: dort traegt der Endzustand die
   * ganze Auskunft, und ein eingefrorener Anfang waere die halbe.
   */
  const wartet = !aktiv && !ruhig

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
      data-wartet={String(wartet)}
      className="flex h-full min-h-0 flex-col justify-center overflow-hidden"
    >
      {/*
        **Der abgeschnittene PresenceContext.** Die Kapitelseite blaettert in einer
        `AnimatePresence initial={false}` — beim Ankommen soll nichts einfliegen. Das
        gilt aber nicht nur fuer das blaetternde Element: der Wert reicht ueber den
        Context in den ganzen Teilbaum, und jedes motion-Bauteil darin rendert beim
        Aufbau sofort seinen Zielzustand statt sein `initial`.

        Getroffen hat das genau eine Karte je Kapitel, die erste — die zweite kommt beim
        Blaettern an und ist frei. Ausgerechnet die Karte, die man zuerst sieht, stand
        also auf ihrem Ergebnis, und ▶ tat nichts. `null` heisst „hier ist keine
        Presence": die Buehne bekommt ihr `initial` zurueck, das Blaettern der Seite
        bleibt unberuehrt.
      */}
      <PresenceContext.Provider value={null}>
        <MotionConfig key={String(wartet)} isStatic={wartet}>
          <Buehne key={`${wartet}-${lauf}`} lauf={lauf} ruhig={ruhig} />
        </MotionConfig>
      </PresenceContext.Provider>
    </div>
  )
}
