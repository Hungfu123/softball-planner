import {
  BASES,
  DEFAULT_DEFENSE,
  FOUL_LINES_PATH,
  FENCE_PATH,
  HOME,
  POSITIONS,
  SKIN_PATH,
} from '@/components/playmaker/board/geometry'

/**
 * Das Feld als stille Strichzeichnung: Linien, Bases, neun Punkte.
 *
 * Gezeichnet aus **derselben** Geometrie wie das echte Board (`board/geometry`), samt der
 * Normalaufstellung `DEFAULT_DEFENSE` — wer dort eine Tiefe aendert, aendert dieses Bild
 * mit. Nichts ist hier nachgebaut oder gegriffen.
 *
 * Ohne Gras und Sand: das echte Board ist bunt, weil man dort Laufwege verfolgt. Ein
 * Daumennagel auf einer Kachel soll sich dagegen in die Karte einfuegen, nicht aus ihr
 * herausspringen — deshalb traegt er die Linienfarben der Oberflaeche und faerbt sich mit
 * dem Theme um. Und ohne Beschriftung: neun Buchstaben in Daumennagelgroesse sind kein
 * Text, sondern Grieß.
 *
 * `currentColor` fuer die Punkte, damit die Kachel die Farbe bestimmt.
 *
 * `aria-hidden`: fuer Screenreader ist das Bild nichts. Was die Kachel bedeutet, steht in
 * ihrer Ueberschrift.
 */

/**
 * Der Ausschnitt: Infield plus so viel Aussenfeld, dass die drei Outfielder mit
 * draufpassen. Gerechnet aus HOME, nicht gegriffen.
 */
const AUSSCHNITT = {
  x: HOME.x - 108,
  y: HOME.y - 175,
  w: 216,
  h: 196,
}

export function FeldMiniatur({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox={`${AUSSCHNITT.x} ${AUSSCHNITT.y} ${AUSSCHNITT.w} ${AUSSCHNITT.h}`}
      className={className}
      aria-hidden
      focusable="false"
    >
      {/* Zaun und Foul-Linien: der Umriss, mehr braucht es nicht. */}
      <path d={FENCE_PATH} fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
      <path d={FOUL_LINES_PATH} fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
      {/* Das Infield als zarte Flaeche — der Diamant, an dem man ein Softballfeld erkennt. */}
      <path d={SKIN_PATH} fill="currentColor" opacity="0.14" />
      <path d={SKIN_PATH} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      {BASES.map((b, i) => (
        <rect
          key={i}
          x={b.x - 3}
          y={b.y - 3}
          width="6"
          height="6"
          fill="currentColor"
          opacity="0.7"
          transform={`rotate(45 ${b.x} ${b.y})`}
        />
      ))}
      {/* Die Normalaufstellung. Punkte ohne Buchstaben: wer sie liest, oeffnet den Playmaker. */}
      {POSITIONS.map(code => {
        const p = DEFAULT_DEFENSE[code]
        return <circle key={code} cx={p.x} cy={p.y} r="7" fill="var(--color-bar)" />
      })}
    </svg>
  )
}
