import type { LocalLineupEntry } from '@/types'
import { FIELD_POSITIONS } from '@/types'

interface Props {
  entries: LocalLineupEntry[]
  /** Mit Handler ist das Feld die Werkbank (Knoepfe, Zaehler); ohne ist es
   *  eine reine Ansicht — eine Flaeche, die wie ein Knopf aussieht und nichts
   *  tut, ist schlimmer als eine, die nach nichts aussieht. */
  onPositionClick?: (position: string) => void
  /** Genau dieser Spieler wird in Amber gefaerbt — dieselbe Farbe, mit der die
   *  Aufstellungsliste die eigene Zeile traegt, damit Zeile und Punkt zusammengehoeren. */
  hervorgehobenerSpielerId?: number
}

/** Position-Koordinaten im Feld-Koordinatensystem (Home Plate = 50/70).
 *  Müssen mit `FIELD_COORDS` in utils/pdfExport.ts übereinstimmen — sonst steht
 *  ein Spieler auf dem Papier woanders als auf dem Schirm. */
const FIELD_COORDS: Record<string, { x: number; y: number }> = {
  CF: { x: 50, y: 8 },
  LF: { x: 14, y: 18 },
  RF: { x: 86, y: 18 },
  SS: { x: 33, y: 28 },
  '2B': { x: 67, y: 28 },
  '3B': { x: 24, y: 56 },
  '1B': { x: 76, y: 56 },
  P:  { x: 50, y: 52 },
  C:  { x: 50, y: 76 },
}

/* Sichtfenster. Breiter als die 100 Einheiten der Koordinaten, weil die
   Foul-Linien bis x≈1 und x≈99 laufen und sonst an der Kartenkante kleben.
   Marker werden über dasselbe Fenster umgerechnet wie das SVG — vorher lag das
   SVG mit `meet` zentriert und schmaler in der Box, die Marker aber auf die
   volle Box-Breite: Outfielder standen dadurch außerhalb des Zauns. */
const VB = { x: -7, y: -1, w: 114, h: 84 }
const left = (x: number) => ((x - VB.x) / VB.w) * 100
const top = (y: number) => ((y - VB.y) / VB.h) * 100

/* Zaun: Kreisbogen um die Home Plate. r=66 liegt hinter allen Outfield-Markern
   (weitester: CF mit 62), die Foul-Linien enden genau auf dem Bogen. */
const FENCE_R = 66
const FOUL_END = { lx: 1.1, rx: 98.9, y: 25.6 }

export function FieldView({ entries, onPositionClick, hervorgehobenerSpielerId }: Props) {
  const posMap = new Map<string, { name: string; order: number; playerId: number }>()
  entries.forEach((e, i) => {
    if (e.position) posMap.set(e.position, { name: e.player.name, order: i + 1, playerId: e.player.id })
  })
  const taken = FIELD_POSITIONS.filter(p => posMap.has(p)).length
  const open = FIELD_POSITIONS.length - taken

  return (
    <div>
      <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-ink mb-2 pb-1.5 border-b border-line flex items-center gap-2">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Feld
        {onPositionClick && (
          <>
            <span className="font-display text-[11px] font-bold tabular-nums text-ink-faint">
              {taken}/{FIELD_POSITIONS.length}
            </span>
            <span className={`ml-auto font-display text-[10px] tracking-widest uppercase font-bold ${
              open > 0 ? 'text-amber-700' : 'text-ink-faint'
            }`}>
              {open > 0 ? `${open} offen` : 'komplett'}
            </span>
          </>
        )}
      </h2>

      {/*
        Reines Linien-Diagramm auf Papier: Base-Pfade in Navy, Foul-Linien und
        Zaun als Navy-Haarlinie, kleine rote Bases — die Spielernamen sind das
        Lauteste im Bild und tragen keinen eigenen Rahmen. Flächig gefüllte
        Varianten (dunkles Navy, kaltes navy-50, warme Cream-Abstufungen) kippten
        die Karte jeweils in einen Farbblock gegen das Cream ringsum.
        Die Marker liegen als HTML über dem SVG, nicht als <text> darin — nur so
        sind sie echte Buttons (Tastatur, Fokus) und Namen brechen sauber um.
      */}
      <div
        className="relative select-none overflow-hidden rounded-2xl bg-surface-sunken border border-line shadow-card"
        style={{ aspectRatio: `${VB.w} / ${VB.h}`, touchAction: 'pan-y' }}
      >
        <svg
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          {/* Foul-Linien und Zaun — dieselbe Navy-Familie wie die
              Base-Pfade, aber als Haarlinie: Form ohne Gewicht. Keine Flächen —
              gefüllter Rasen und gefülltes Infield machten aus dem Diagramm zwei
              Farbblöcke statt einer Zeichnung. */}
          <g stroke="var(--color-ink)" strokeWidth="0.28" opacity="0.5" fill="none">
            <path d={`M 50 70 L ${FOUL_END.lx} ${FOUL_END.y} M 50 70 L ${FOUL_END.rx} ${FOUL_END.y}`} />
            <path d={`M ${FOUL_END.lx} ${FOUL_END.y} A ${FENCE_R} ${FENCE_R} 0 0 1 ${FOUL_END.rx} ${FOUL_END.y}`} />
          </g>

          {/* Base-Pfade in Navy — die einzige Linie, die tragen soll */}
          <polygon points="50,70 72,50 50,30 28,50" fill="none" stroke="var(--color-ink)" strokeWidth="0.5" />

          {/* Bases — klein gehalten: sie markieren das Feld, sie sind nicht der Inhalt */}
          {[[72, 50], [50, 30], [28, 50]].map(([bx, by]) => (
            <rect
              key={`${bx}-${by}`}
              x={bx - 1.2} y={by - 1.2} width="2.4" height="2.4"
              fill="var(--color-softball-red-500)"
              transform={`rotate(45 ${bx} ${by})`}
            />
          ))}
          {/* Home Plate — gefüllt wie die anderen Bases, nur in Plattenform */}
          <polygon
            points="48.4,68.6 51.6,68.6 51.6,70.3 50,71.8 48.4,70.3"
            fill="var(--color-softball-red-500)"
            stroke="var(--color-softball-red-700)"
            strokeWidth="0.4"
          />
        </svg>

        {FIELD_POSITIONS.map(pos => {
          const coord = FIELD_COORDS[pos]
          const filled = posMap.get(pos)
          const Tag = onPositionClick ? 'button' : 'div'
          const hervorgehoben = filled !== undefined && filled.playerId === hervorgehobenerSpielerId
          return (
            <Tag
              key={pos}
              {...(onPositionClick
                ? {
                    type: 'button' as const,
                    onClick: () => onPositionClick(pos),
                    title: filled ? `${pos} — ${filled.name} (Schlag ${filled.order})` : `${pos} besetzen`,
                  }
                : {})}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center leading-none rounded-lg px-2 py-1 transition-colors [@media(hover:none)]:min-h-11 [@media(hover:none)]:min-w-11 ${
                onPositionClick
                  ? 'cursor-pointer hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
                  : ''
              } ${hervorgehoben ? 'bg-amber-400/15 border border-amber-400/50' : ''}`}
              style={{ left: `${left(coord.x)}%`, top: `${top(coord.y)}%` }}
            >
              <span
                className={`font-display text-[10px] font-extrabold tracking-widest ${
                  filled ? 'text-softball-red-600' : 'text-ink-faint'
                }`}
              >
                {pos}
              </span>
              {filled ? (
                <span className="mt-0.5 font-display text-[14px] font-extrabold text-ink max-w-[7rem] truncate">
                  {filled.name}
                </span>
              ) : (
                <span className="mt-0.5 font-display text-[11px] font-bold text-ink-faint underline decoration-dashed decoration-from-font underline-offset-2">
                  frei
                </span>
              )}
            </Tag>
          )
        })}
      </div>
    </div>
  )
}
