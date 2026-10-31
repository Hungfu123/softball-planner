import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { HOME, FIRST_BASE, SECOND_BASE, SKIN_PATH, FOUL_LINES_PATH, FENCE_PATH, BASES } from '@/components/playmaker/board/geometry'

/**
 * Die Zeichenteile, die sich alle Karten teilen.
 *
 * Keines davon bewegt sich selbst. Bewegung gehoert der Karte, die weiss, was sie
 * erzaehlt; hier liegen nur die Formen, damit eine Schlagfrau auf jeder Karte dieselbe
 * Schlagfrau ist.
 */

/**
 * Dauer und Verzoegerung, bei reduzierter Bewegung auf null.
 *
 * Steht hier und nicht dreimal in den Kartendateien: alle sechzehn Buehnen muessen
 * denselben Schalter umlegen, sonst laeuft eine von ihnen weiter.
 */
export const takt = (ruhig: boolean, t: { duration?: number; delay?: number } & Record<string, unknown>) =>
  ruhig ? { duration: 0, delay: 0 } : t

/*
 * Die Farben liegen beim Board (`board/farben.ts`), seit der Playmaker dieselbe Buehne
 * benutzt. Hier nur noch durchgereicht, damit die sechzehn Karten ihren Import behalten.
 */
import { FARBE } from '@/components/playmaker/board/farben'

export { FARBE }

/**
 * Die Schlagfrau als Strichfigur, von der Seite, Blickrichtung rechts.
 *
 * `boden` ist die Fusssohle, `k` der Groessenfaktor. Skaliert wird **vom Boden aus**,
 * nicht von der Bildmitte: ein Mensch waechst nach oben, und genau darauf beruht die
 * Karte „Die Zone bist du".
 */
export function Figur({ k = 1, boden = 152, ohneSchlaeger = false }: {
  k?: number
  boden?: number
  ohneSchlaeger?: boolean
}) {
  return (
    <g transform={`translate(40 ${boden}) scale(${k}) translate(-40 ${-boden})`}>
      <circle cx="40" cy={boden - 128} r="11" fill={FARBE.hell} />
      <rect x="30" y={boden - 115} width="20" height="40" rx="9" fill={FARBE.hell} />
      <rect x="33" y={boden - 75} width="6" height="75" rx="3" fill={FARBE.hell} />
      <rect x="42" y={boden - 75} width="6" height="75" rx="3" fill={FARBE.hell} />
      {!ohneSchlaeger && (
        <rect
          x="52" y={boden - 138} width="5" height="46" rx="2.5"
          fill={FARBE.matt}
          transform={`rotate(22 54 ${boden - 112})`}
        />
      )}
    </g>
  )
}

/**
 * Ein Verteidiger von oben: helle Scheibe mit dunklem Kuerzel — **dieselbe wie im
 * Playmaker**.
 *
 * Damit heisst eine helle Scheibe mit Buchstaben in beiden Haelften dasselbe: da steht
 * jemand, und zwar der. Auf den Offense-Karten standen Verteidiger vorher als blasse
 * Flecken ohne Namen da, wenn ueberhaupt.
 */
export function Verteidiger({ x, y, kuerzel, r = 4.5 }: {
  x: number
  y: number
  kuerzel: string
  r?: number
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={FARBE.hell} />
      <text
        x={x} y={y + r * 0.34} textAnchor="middle"
        fontSize={r * 0.62} fontWeight="700" fill={FARBE.grund}
        style={{ pointerEvents: 'none' }}
      >
        {kuerzel}
      </text>
    </g>
  )
}

/**
 * Ein Laeufer von oben: amber mit dunklem Ring — **dieselbe Scheibe wie im Playmaker**.
 *
 * Dort ist Amber die Farbe dessen, worauf man achtet, und der dunkle Ring trennt ihn von
 * den hellen Scheiben der Verteidiger (amber auf cream misst 1,55:1). Auf den Karten gibt
 * es meist keine Verteidiger, aber die Farbe muss dieselbe sein: wer im Spielwissen einen
 * cremefarbenen Laeufer lernt und im Playmaker einen amberfarbenen sieht, haelt sie fuer
 * zwei verschiedene Dinge.
 */
export function Laeufer({ r = 4.5 }: { r?: number }) {
  return <circle r={r} fill={FARBE.gut} stroke={FARBE.grund} strokeWidth={r * 0.18} />
}

/** Der Ball: cream mit rotem Nahtring, damit er auf jeder Karte derselbe ist. */
export function Ball({ r = 6 }: { r?: number }) {
  return (
    <g>
      <circle r={r} fill={FARBE.ball} />
      <circle r={r * 0.66} fill="none" stroke={FARBE.naht} strokeWidth={r * 0.18} opacity="0.7" />
    </g>
  )
}

/**
 * Der Ring um eine Base: „hier passiert dir nichts".
 *
 * Dieselbe Form auf jeder Karte, die sie benutzt, und sie meint ueberall dasselbe. Die
 * Lauf-Karten enden damit, weil der Lauf nur die halbe Auskunft ist: wer danach von der
 * Base geht, wird getickt und ist out.
 */
export function SicherRing({ ort, ruhig, delay = 0 }: {
  ort: { x: number; y: number }
  ruhig: boolean
  delay?: number
}) {
  return (
    <motion.circle
      cx={ort.x} cy={ort.y}
      fill="none" stroke={FARBE.gut} strokeWidth="1.6"
      initial={ruhig ? false : { r: 4, opacity: 0 }}
      animate={{ r: 10, opacity: 0.8 }}
      transition={takt(ruhig, { delay, duration: 0.4, ease: 'easeOut' })}
    />
  )
}

/**
 * Die Ausschnitte des Feldes. Gerechnet aus `HOME`, nicht gegriffen — wer in
 * `board/geometry` eine Entfernung aendert, aendert diese Bilder mit.
 */
const AUSSCHNITTE = {
  /** Der Diamant mit beiden Foul-Linien. Fuer alles, was auf dem Feld passiert. */
  infield: { x: HOME.x - 104, y: HOME.y - 112, w: 208, h: 132 },
  /** Nur die Gegend um die Platte. Fuer alles, was am Schlag passiert. */
  home: { x: HOME.x - 70, y: HOME.y - 78, w: 140, h: 92 },
  /**
   * Nah an die erste Base. Die Foul-Linie laeuft mitten durch, und nur in dieser
   * Vergroesserung sind die beiden Haelften des Doppel-Base ueberhaupt zwei Dinge.
   */
  erste: { x: FIRST_BASE.x - 34, y: FIRST_BASE.y - 22, w: 62, h: 54 },
  /**
   * Der Weg zwischen 1 und 2, nah herangeholt.
   *
   * Auf dem ganzen Infield-Ausschnitt lagen Laeufer, Verteidiger und Ball beim Tag als
   * ein Fleck uebereinander: drei Scheiben von je neun Fuss Durchmesser auf einem Weg
   * von sechzig. Hier ist jede einzeln zu sehen.
   */
  einsTeilZwei: {
    x: (FIRST_BASE.x + SECOND_BASE.x) / 2 - 44,
    y: (FIRST_BASE.y + SECOND_BASE.y) / 2 - 31,
    w: 88,
    h: 62,
  },
} as const

/**
 * Zieht einen Ausschnitt auf das Seitenverhaeltnis der Flaeche **auf** — nie zu.
 *
 * Dieselbe Regel wie `fitViewBox` im Playmaker, mit einem Unterschied: dort bleibt Home
 * unten verankert, weil ein Play unten anfaengt und oben das Outfield liegt. Hier sind
 * die Ausschnitte von Hand auf ihren Gegenstand zentriert — die erste Base, der Weg
 * zwischen 1 und 2 —, also waechst der Rand nach beiden Seiten gleich. Waechse er nur
 * nach oben, rutschte die Base an den unteren Bildrand.
 *
 * Beschnitten wird nicht: der Zuwachs ist mehr Platz, und Platz ist hier Gras.
 */
function fuelle(a: { x: number; y: number; w: number; h: number }, breite: number, hoehe: number) {
  if (breite <= 0 || hoehe <= 0) return a
  const flaeche = breite / hoehe
  if (a.w / a.h < flaeche) {
    const w = a.h * flaeche
    return { ...a, x: a.x - (w - a.w) / 2, w }
  }
  const h = a.w / flaeche
  return { ...a, y: a.y - (h - a.h) / 2, h }
}

/**
 * Ein Ausschnitt des Feldes, der **seine Flaeche fuellt**.
 *
 * Vorher hatte jede Karte einen Deckel (`max-h-56` und Geschwister) und das Bild stand
 * als Streifen in der Mitte einer leeren Flaeche. Gemessen am Handy: von 852 px nahm die
 * Zeichnung 229, der Rest war Nichts. Drueben fuellt das Feld den Bildschirm — deshalb
 * misst sich die Buehne jetzt selbst und zieht ihren Ausschnitt auf die Flaeche auf.
 *
 * Die Zeichnung wird dadurch nicht groesser (die Breite deckelt sie ohnehin), aber was um
 * sie herum liegt, ist Feld statt Leere. Genau das unterscheidet die beiden Haelften:
 * nicht die Groesse des Diamanten, sondern ob um ihn herum ein Platz ist.
 */
export function MiniFeld({ ausschnitt, className = '', children }: {
  ausschnitt: keyof typeof AUSSCHNITTE
  className?: string
  children?: ReactNode
}) {
  const huelle = useRef<HTMLDivElement>(null)
  const [kasten, setKasten] = useState<{ w: number; h: number } | null>(null)

  useLayoutEffect(() => {
    const element = huelle.current
    if (!element) return
    const messen = () => {
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      // Nur setzen, wenn sich wirklich etwas geaendert hat: ein neues Objekt mit
      // denselben Zahlen rendert trotzdem, der Beobachter feuert erneut, und die Seite
      // laeuft in eine Schleife. Dieselbe Falle steht im PlayBoard beschrieben.
      setKasten(alt =>
        alt && Math.abs(alt.w - rect.width) < 0.5 && Math.abs(alt.h - rect.height) < 0.5
          ? alt
          : { w: rect.width, h: rect.height },
      )
    }
    messen()
    // Ohne ResizeObserver (jsdom) bleibt es beim Ausschnitt, wie er gemeint war.
    if (typeof ResizeObserver === 'undefined') return
    const beobachter = new ResizeObserver(messen)
    beobachter.observe(element)
    return () => beobachter.disconnect()
  }, [])

  const a = kasten ? fuelle(AUSSCHNITTE[ausschnitt], kasten.w, kasten.h) : AUSSCHNITTE[ausschnitt]
  return (
    <div ref={huelle} className={`min-h-0 flex-1 ${className}`}>
    <svg viewBox={`${a.x} ${a.y} ${a.w} ${a.h}`} className="block h-full w-full" aria-hidden focusable="false">
      {/*
        Dieselben Werte wie das Board im Playmaker (`PlayBoard`, Feld): Sand als Ahnung,
        Linien halb, Zaun schwaecher, Bases fast voll. Die beiden Haelften der App zeigen
        denselben Platz — dann soll er auch gleich aussehen, egal ob eine Karte ihn im
        Ausschnitt zeigt oder ein Play ihn ganz.
      */}
      <path d={SKIN_PATH} fill={FARBE.hell} opacity="0.08" />
      <path d={FOUL_LINES_PATH} fill="none" stroke={FARBE.hell} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <path d={FENCE_PATH} fill="none" stroke={FARBE.hell} strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
      {BASES.map((b, i) => (
        <rect
          key={i}
          x={b.x - 2.6} y={b.y - 2.6} width="5.2" height="5.2"
          fill={FARBE.hell} opacity="0.8"
          transform={`rotate(45 ${b.x} ${b.y})`}
        />
      ))}
      {children}
    </svg>
    </div>
  )
}
