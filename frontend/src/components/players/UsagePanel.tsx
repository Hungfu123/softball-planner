import type { PlayerUsage } from '@/types'

/** Mehr als zehn Plätze hat keine Schlagreihenfolge. */
const LINEUP_SIZE = 10

/**
 * Einsatz und Verfügbarkeit — die zweite Hälfte der Aufstellungs-Entscheidung.
 *
 * Die Schlagzahlen sagen, wie gut jemand trifft. Hier steht, wie oft man mit ihm
 * überhaupt planen kann: Zusagen, tatsächliche Aufstellungen, Training. Dazu der
 * Platz im Lineup, damit man sieht, wo diese Person zu Hause ist.
 */
export function UsagePanel({ usage, trainingsOutOfScope = false }: {
  usage: PlayerUsage
  /** Saison gewählt: Trainings hängen an keiner Saison und bleiben draußen. */
  trainingsOutOfScope?: boolean
}) {
  // Immer alle zehn Plaetze zeigen, auch die leeren: die Luecken sind die Aussage.
  // Vier breite Bloecke nebeneinander sehen aus wie „schlaegt ueberall".
  const counts = usage.battingOrderCounts
  const orders = Array.from({ length: LINEUP_SIZE }, (_, i) => ({
    slot: i + 1,
    count: counts[String(i + 1)] ?? 0,
  }))
  const maxOrderCount = Math.max(1, ...orders.map(o => o.count))
  const everBatted = orders.some(o => o.count > 0)
  // Spieler bekommen keine Trainingszahlen (null), auch nicht die eigenen: die Beteiligung
  // fließt in die Auto-Aufstellung ein und soll nicht zur Verhandlung werden. Der Block
  // fehlt dann ganz, statt leer oder mit Nullen zu erscheinen.
  const { trainingsTotal, trainingsAttended } = usage
  const showTraining = trainingsTotal !== null && trainingsAttended !== null

  if (usage.gameDaysTotal === 0 && !(showTraining && trainingsTotal > 0)) {
    return (
      <p className="text-sm text-gray-500 italic">
        {showTraining ? 'Noch keine Spieltage und keine Trainings erfasst.' : 'Noch keine Spieltage erfasst.'}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {usage.gameDaysTotal > 0 && (
        <>
          <Ratio
            label="Zugesagt"
            explain="Spieltage, für die diese Person verfügbar war"
            value={usage.gameDaysAvailable}
            total={usage.gameDaysTotal}
            unit="Spieltagen"
          />
          <Ratio
            label="Aufgestellt"
            explain="Spieltage, an denen sie im Lineup stand"
            value={usage.gameDaysPlayed}
            total={usage.gameDaysTotal}
            unit="Spieltagen"
          />
        </>
      )}
      {showTraining && trainingsTotal > 0 && (
        <Ratio
          label="Training"
          explain="Anwesend bei nicht abgesagten Trainings"
          value={trainingsAttended}
          total={trainingsTotal}
          unit="Trainings"
        />
      )}

      {everBatted && (
        <div className="pt-1">
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <span className="text-xs text-navy-900">Platz im Lineup</span>
            <span className="text-sm font-semibold text-navy-900 tabular-nums">
              Ø {usage.averageBattingOrder?.toFixed(1).replace('.', ',')}
            </span>
          </div>
          {/* Der Schnitt allein verwischt den Unterschied zwischen „immer vierter"
              und „mal zweiter, mal siebter" — deshalb die Verteilung daneben. */}
          <ul className="flex items-end gap-1">
            {orders.map(({ slot, count }) => (
              <li key={slot} className="flex-1 flex flex-col items-center gap-1">
                <span
                  className={`w-full rounded-sm ${count > 0 ? 'bg-bar' : 'bg-bar-track'}`}
                  style={{ height: `${count > 0 ? 8 + (count / maxOrderCount) * 28 : 4}px` }}
                  title={count > 0 ? `${count}× auf Platz ${slot}` : `nie auf Platz ${slot}`}
                />
                <span className={`text-[10px] tabular-nums ${count > 0 ? 'text-gray-500' : 'text-gray-300'}`}>
                  {slot}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-gray-500 pt-1">
        {!showTraining
          ? 'Gezählt ab dem ersten Spieltag, an dem diese Person dabei war — davor gab es sie für das Team nicht.'
          : trainingsOutOfScope
            ? 'Trainings gehören zu keiner Saison und bleiben hier außen vor.'
            : 'Gezählt ab dem ersten Spieltag oder Training, an dem diese Person dabei war — davor gab es sie für das Team nicht.'}
      </p>
    </div>
  )
}

function Ratio({ label, explain, value, total, unit }: {
  label: string
  explain: string
  value: number
  total: number
  unit: string
}) {
  const share = total > 0 ? value / total : 0
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs text-navy-900" title={explain}>{label}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-navy-900 tabular-nums">
            {value} von {total} {unit}
          </span>
          <span className="text-[11px] font-semibold text-gray-500 tabular-nums">
            {Math.round(share * 100)} %
          </span>
        </span>
      </div>
      <div className="h-2 bg-bar-track rounded-full overflow-hidden">
        <span className="block h-full bg-bar rounded-full" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  )
}
