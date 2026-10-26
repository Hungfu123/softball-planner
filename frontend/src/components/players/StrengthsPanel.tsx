import { useMemo } from 'react'
import type { PlayerBattingStatsResponse } from '@/types'

/**
 * Eine Kennzahl im Vergleich. `higherIsBetter` dreht die Wertung für Strikeouts:
 * dort ist weniger besser, und die Farbe muss das wissen.
 */
interface Measure {
  key: string
  label: string
  explain: string
  value: (s: PlayerBattingStatsResponse) => number
  format: (value: number) => string
  higherIsBetter: boolean
}

const RATE = (value: number) => value.toFixed(3).replace(/^0/, '')
const PERCENT = (value: number) => `${Math.round(value * 100)} %`
const MEASURES: Measure[] = [
  { key: 'avg', label: 'AVG', explain: 'Hits je At-Bat', higherIsBetter: true, format: RATE,
    value: s => s.battingAverage },
  { key: 'obp', label: 'OBP', explain: 'wie oft er eine Base erreicht', higherIsBetter: true, format: RATE,
    value: s => s.onBasePct },
  { key: 'slg', label: 'SLG', explain: 'Bases je At-Bat', higherIsBetter: true, format: RATE,
    value: s => s.sluggingPct },
  { key: 'ops', label: 'OPS', explain: 'OBP plus SLG', higherIsBetter: true, format: RATE,
    value: s => s.ops },
  { key: 'bb', label: 'Walk-Quote', explain: 'Anteil Walks an allen PA', higherIsBetter: true, format: PERCENT,
    value: s => s.plateAppearances > 0 ? s.walks / s.plateAppearances : 0 },
  { key: 'k', label: 'Strikeout-Quote', explain: 'Anteil Strikeouts — weniger ist besser', higherIsBetter: false, format: PERCENT,
    value: s => s.plateAppearances > 0 ? s.strikeouts / s.plateAppearances : 0 },
  // Rohe Steal-Zahlen wären unfair: wer doppelt so viele Spiele hat, klaut doppelt so
  // oft. Gemessen wird deshalb je Auftritt am Schlag.
  { key: 'sb', label: 'Steal-Quote', explain: 'geklaute Bases je Auftritt am Schlag', higherIsBetter: true, format: PERCENT,
    value: s => s.plateAppearances > 0 ? s.stolenBases / s.plateAppearances : 0 },
]

/**
 * Stärken und Schwächen: jede Kennzahl gegen den Teamschnitt.
 *
 * Eine Zahl allein sagt wenig — .300 ist stark oder mittelmäßig, je nachdem was der
 * Rest des Kaders schlägt. Deshalb trägt jede Zeile den Teamschnitt als Markierung
 * im Balken und die Differenz als Vorzeichen daneben.
 *
 * Der Schnitt bildet sich nur aus Spielern mit genug At-Bats (`qualified`, ab 5),
 * sonst zöge ein 1-für-1 den Vergleich nach oben. Quelle ist die All-Time-Statistik,
 * damit die Zahlen zu denen der Statistik-Seite passen.
 */
export function StrengthsPanel({ playerId, allTime }: {
  playerId: number
  allTime: PlayerBattingStatsResponse[]
}) {
  const rows = useMemo(() => {
    const mine = allTime.find(s => s.playerId === playerId)
    if (!mine || mine.plateAppearances === 0) return null
    const field = allTime.filter(s => s.qualified && s.playerId !== playerId)
    if (field.length === 0) return null

    return MEASURES.map(measure => {
      const value = measure.value(mine)
      const teamValues = field.map(measure.value)
      const teamAverage = teamValues.reduce((a, b) => a + b, 0) / teamValues.length
      const scale = Math.max(value, ...teamValues, 0.001)
      const delta = value - teamAverage
      const better = measure.higherIsBetter ? delta > 0 : delta < 0
      // Unterschiede unter einem Prozent des Maßstabs sind Rauschen, nicht Aussage.
      const neutral = Math.abs(delta) < scale * 0.01
      return { measure, value, teamAverage, scale, delta, better, neutral }
    })
  }, [allTime, playerId])

  if (!rows) {
    return (
      <p className="text-sm text-gray-500 italic">
        Für den Vergleich fehlen gescorte Spiele — entweder bei dieser Person oder im Rest des Kaders.
      </p>
    )
  }

  return (
    <ul className="space-y-2.5">
      {rows.map(({ measure, value, teamAverage, scale, delta, better, neutral }) => (
        <li key={measure.key}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-xs text-navy-900" title={measure.explain}>{measure.label}</span>
            <span className="flex items-baseline gap-2 tabular-nums">
              <span className="text-sm font-semibold text-navy-900">{measure.format(value)}</span>
              <span className={`text-[11px] font-semibold ${
                neutral ? 'text-gray-400' : better ? 'text-emerald-700' : 'text-softball-red-600'
              }`}>
                {/* Pfeil sagt die Richtung, Farbe sagt die Wertung — bei Strikeouts zeigt
                    der Pfeil nach oben und die Farbe trotzdem auf Schwäche. */}
                {neutral ? 'wie das Team' : `${delta > 0 ? '↑' : '↓'} ${measure.format(Math.abs(delta))}`}
              </span>
            </span>
          </div>
          <div className="relative h-2 bg-cream-200 rounded-full">
            <div
              className="absolute inset-y-0 left-0 bg-bar rounded-full"
              style={{ width: `${Math.min(100, (value / scale) * 100)}%` }}
            />
            {/* Teamschnitt als Kerbe: der Balken sagt „wie viel", die Kerbe sagt „im Vergleich wozu". */}
            <span
              className="absolute -top-0.5 h-3 w-0.5 bg-navy-900/70 rounded"
              style={{ left: `calc(${Math.min(100, (teamAverage / scale) * 100)}% - 1px)` }}
              title={`Teamschnitt ${measure.format(teamAverage)}`}
            />
          </div>
        </li>
      ))}
      <li className="text-[11px] text-gray-500 pt-1">
        Kerbe = Schnitt des übrigen Kaders — nur Spieler mit mindestens 5 At-Bats.
      </li>
    </ul>
  )
}
