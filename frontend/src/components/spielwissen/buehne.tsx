import type { ReactNode } from 'react'
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

export function MiniFeld({ ausschnitt, className = '', children }: {
  ausschnitt: keyof typeof AUSSCHNITTE
  className?: string
  children?: ReactNode
}) {
  const a = AUSSCHNITTE[ausschnitt]
  return (
    <svg viewBox={`${a.x} ${a.y} ${a.w} ${a.h}`} className={`w-full ${className}`} aria-hidden focusable="false">
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
  )
}
