import { POSITIONS } from './board/geometry'
import type { PositionCode } from './board/types'

/**
 * Die Wahl der eigenen Position.
 *
 * **Ein festes Raster, keine fliessende Zeile.** Der gewaehlte Knopf ist gefuellt und
 * dadurch minimal breiter; in einer fliessenden Zeile rutschte deshalb bei jeder Wahl
 * die ganze Reihe um — mal stand SS unten, mal oben. Neun Positionen und „Alle" passen
 * in zwei Reihen zu fuenf, und die stehen still.
 *
 * Noch einmal auf dieselbe Position tippt sie wieder weg: ein Filter, den man nur ueber
 * einen zweiten Knopf loswird, fuehlt sich an wie eine Falle.
 */
export function PositionWahl({ position, onWahl, className = '', titel = true }: {
  position: PositionCode | null
  onWahl: (pos: PositionCode | null) => void
  className?: string
  /**
   * Auf der Uebersicht steht „Deine Position" schon rechts in der Ueberschriftzeile.
   * Eine eigene Zeile dafuer kostete dort 23 Pixel — genau die, die der Seite zum
   * Bildschirm fehlten.
   */
  titel?: boolean
}) {
  return (
    <div className={className}>
      {titel && (
        <span className="font-display text-[11px] font-bold uppercase tracking-widest text-ink-faint">
          Deine Position
        </span>
      )}
      <div className={`grid grid-cols-5 gap-1.5 ${titel ? 'mt-1.5' : ''}`}>
        {([null, ...POSITIONS] as (PositionCode | null)[]).map(pos => {
          const aktiv = position === pos
          return (
            <button
              key={pos ?? 'alle'}
              type="button"
              onClick={() => onWahl(aktiv ? null : pos)}
              aria-pressed={aktiv}
              className={`font-display flex h-10 items-center justify-center rounded-lg text-[11px] font-bold uppercase tracking-widest ${
                aktiv ? 'bg-accent text-accent-ink' : 'border border-line text-ink-muted active:bg-surface-raised'
              }`}
            >
              {pos ?? 'Alle'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
