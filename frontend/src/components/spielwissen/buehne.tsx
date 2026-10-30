import type { ReactNode } from 'react'
import { HOME, SKIN_PATH, FOUL_LINES_PATH, BASES } from '@/components/playmaker/board/geometry'

/**
 * Die Zeichenteile, die sich alle Karten teilen.
 *
 * Keines davon bewegt sich selbst. Bewegung gehoert der Karte, die weiss, was sie
 * erzaehlt; hier liegen nur die Formen, damit eine Schlagfrau auf jeder Karte dieselbe
 * Schlagfrau ist.
 */

/** Die Farben der Buehne an einer Stelle, damit sechzehn Karten dieselben benutzen. */
export const FARBE = {
  hell: '#f8f5ec',   // cream-50, Figuren und Linien
  ball: '#f8f5ec',
  naht: '#c0392b',   // softball-red, der Nahtring
  gut: '#fbbf24',    // amber-400, Entscheidung und Zone
  raus: '#c0392b',   // softball-red, Strike und Out
  matt: '#6b7b96',   // Boden, Hilfslinien
} as const

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
          fill={FARBE.naht}
          transform={`rotate(22 54 ${boden - 112})`}
        />
      )}
    </g>
  )
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
 * Die Ausschnitte des Feldes. Gerechnet aus `HOME`, nicht gegriffen — wer in
 * `board/geometry` eine Entfernung aendert, aendert diese Bilder mit.
 */
const AUSSCHNITTE = {
  /** Der Diamant mit beiden Foul-Linien. Fuer alles, was auf dem Feld passiert. */
  infield: { x: HOME.x - 104, y: HOME.y - 112, w: 208, h: 132 },
  /** Nur die Gegend um die Platte. Fuer alles, was am Schlag passiert. */
  home: { x: HOME.x - 70, y: HOME.y - 78, w: 140, h: 92 },
} as const

export function MiniFeld({ ausschnitt, className = '', children }: {
  ausschnitt: keyof typeof AUSSCHNITTE
  className?: string
  children?: ReactNode
}) {
  const a = AUSSCHNITTE[ausschnitt]
  return (
    <svg viewBox={`${a.x} ${a.y} ${a.w} ${a.h}`} className={`w-full ${className}`} aria-hidden focusable="false">
      <path d={SKIN_PATH} fill={FARBE.hell} opacity="0.08" />
      <path d={FOUL_LINES_PATH} fill="none" stroke={FARBE.hell} strokeWidth="1.2" opacity="0.55" />
      {BASES.map((b, i) => (
        <rect
          key={i}
          x={b.x - 2.6} y={b.y - 2.6} width="5.2" height="5.2"
          fill={FARBE.hell} opacity="0.75"
          transform={`rotate(45 ${b.x} ${b.y})`}
        />
      ))}
      {children}
    </svg>
  )
}
