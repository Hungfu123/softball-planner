import type { PlayerFormPoint } from '@/types'

const MAX_ROWS = 8

/**
 * Die letzten Spiele im Klartext — was hinter dem letzten Stück der Form-Kurve steckt.
 *
 * Eine Kurve zeigt die Richtung, aber nicht den Abend: 0 für 3 mit zwei Strikeouts
 * gegen Köln ist die Information, die im Training ankommt. Neueste zuerst, weil man
 * nach dem Spiel hierher kommt.
 */
export function GameLog({ points }: { points: PlayerFormPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-gray-500 italic">Noch keine gescorten Spiele.</p>
  }

  const rows = [...points].reverse().slice(0, MAX_ROWS)

  return (
    <>
      <ul className="divide-y divide-cream-200">
        {rows.map(point => (
          <li key={point.gameId} className="flex items-center gap-3 py-2">
            <span className="w-12 shrink-0 text-xs text-gray-500 tabular-nums">{shortDate(point.date)}</span>
            <span className="flex-1 min-w-0 truncate text-sm text-navy-900">
              {point.opponent ?? 'Unbekannter Gegner'}
            </span>
            <span className="shrink-0 text-right">
              <span className="text-sm font-semibold text-navy-900 tabular-nums">
                {point.hits} von {point.atBats}
              </span>
              {extras(point).length > 0 && (
                <span className="block text-[11px] text-gray-500">{extras(point).join(' · ')}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {points.length > MAX_ROWS && (
        <p className="text-[11px] text-gray-500 pt-2">
          Die {MAX_ROWS} jüngsten von {points.length} Spielen.
        </p>
      )}
    </>
  )
}

/** Alles, was neben der Trefferquote an diesem Abend passiert ist. */
function extras(point: PlayerFormPoint): string[] {
  const parts: string[] = []
  if (point.runsBattedIn > 0) parts.push(`${point.runsBattedIn} RBI`)
  if (point.walks > 0) parts.push(`${point.walks} BB`)
  if (point.strikeouts > 0) parts.push(`${point.strikeouts} K`)
  if (point.stolenBases > 0) parts.push(`${point.stolenBases} SB`)
  return parts
}

function shortDate(date: string | null): string {
  if (!date) return '–'
  const [, month, day] = date.split('-')
  return `${day}.${month}.`
}
