import { useMemo } from 'react'
import type { PlayerFormPoint } from '@/types'

interface SeasonRow {
  year: number
  games: number
  plateAppearances: number
  atBats: number
  hits: number
  timesOnBase: number
  totalBases: number
  stolenBases: number
}

/**
 * Saison für Saison — ob es über die Jahre nach oben geht.
 *
 * Die Form-Kurve beantwortet „wie läuft es gerade", diese Tabelle „wie war das
 * letztes Jahr". Sie ignoriert den Jahres-Filter der Seite absichtlich: ein
 * Vergleich, bei dem man die Vergleichsjahre wegklicken kann, vergleicht nichts.
 */
export function SeasonTable({ points }: { points: PlayerFormPoint[] }) {
  const rows = useMemo(() => {
    const byYear = new Map<number, SeasonRow>()
    for (const point of points) {
      if (point.year == null) continue
      const row = byYear.get(point.year) ?? {
        year: point.year, games: 0, plateAppearances: 0, atBats: 0,
        hits: 0, timesOnBase: 0, totalBases: 0, stolenBases: 0,
      }
      row.games += 1
      row.plateAppearances += point.plateAppearances
      row.atBats += point.atBats
      row.hits += point.hits
      row.timesOnBase += point.timesOnBase
      row.totalBases += point.totalBases
      row.stolenBases += point.stolenBases
      byYear.set(point.year, row)
    }
    return [...byYear.values()].sort((a, b) => b.year - a.year)
  }, [points])

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 italic">Noch keine gescorten Spiele.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] text-gray-500">
          <th className="text-left font-normal pb-1">Jahr</th>
          <th className="text-right font-normal pb-1">Sp</th>
          <th className="text-right font-normal pb-1">PA</th>
          <th className="text-right font-normal pb-1">AVG</th>
          <th className="text-right font-normal pb-1">OBP</th>
          <th className="text-right font-normal pb-1">OPS</th>
          <th className="text-right font-normal pb-1">SB</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-cream-200">
        {rows.map(row => (
          <tr key={row.year} className="text-navy-900 tabular-nums">
            <td className="py-1.5 font-semibold">{row.year}</td>
            <td className="py-1.5 text-right">{row.games}</td>
            <td className="py-1.5 text-right">{row.plateAppearances}</td>
            <td className="py-1.5 text-right">{rate(row.hits, row.atBats)}</td>
            <td className="py-1.5 text-right">{rate(row.timesOnBase, row.plateAppearances)}</td>
            <td className="py-1.5 text-right font-semibold">{ops(row)}</td>
            <td className="py-1.5 text-right">{row.stolenBases}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Quoten ohne führende Null (.312), leere Nenner als Gedankenstrich. */
function rate(numerator: number, denominator: number): string {
  if (denominator === 0) return '–'
  return (numerator / denominator).toFixed(3).replace(/^0/, '')
}

function ops(row: SeasonRow): string {
  if (row.atBats === 0 || row.plateAppearances === 0) return '–'
  const value = row.timesOnBase / row.plateAppearances + row.totalBases / row.atBats
  return value.toFixed(3).replace(/^0/, '')
}
