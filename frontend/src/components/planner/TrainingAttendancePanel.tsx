import type { Player, TrainingPeriodResponse, TrainingStatsResponse } from '@/types'
import { trainingYearFilterLabel, trainingYearTitle } from '@/utils/trainingYear'

/** Zeitraum der Zählung: das laufende Trainingsjahr oder alles, was je erfasst wurde. */
export type TrainingWindow = 'trainingYear' | 'all'

type Props = {
  stats: TrainingStatsResponse[]
  availablePlayers: Player[]
  /** Spieltag — Stichtag für Zeitraum und Beschriftung. */
  gameDayDate: string
  periods: TrainingPeriodResponse[]
  selectedPeriodId: number | null
  onSelectPeriod: (periodId: number | null) => void
  window: TrainingWindow
  onSelectWindow: (window: TrainingWindow) => void
}

/**
 * Trainings-Teilnahme der verfügbaren Spieler als Balkenliste — die Entscheidungshilfe
 * neben der Aufstellung.
 *
 * Gezeigt und sortiert wird die **Quote**, nicht der absolute Zähler: danach sortiert
 * auch die Auto-Aufstellung. Vorher stand hier der Zähler, und dann erklärte die Liste
 * die Aufstellung nicht — wer später dazukam, stand unten und wurde trotzdem früh
 * aufgestellt.
 */
export function TrainingAttendancePanel({
  stats, availablePlayers, gameDayDate,
  periods, selectedPeriodId, onSelectPeriod, window, onSelectWindow,
}: Props) {
  const availableIds = new Set(availablePlayers.map(p => p.id))
  const filtered = stats
    .filter(s => availableIds.has(s.playerId))
    .sort((a, b) => b.participation - a.participation || b.attended - a.attended)

  return (
    <div>
      <h2 className="flex items-center gap-2 mb-2 pb-1.5 xl:mb-1 xl:pb-0.5 border-b border-cream-200 font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Training
        <span className="ml-auto font-display text-[10px] tracking-widest uppercase text-gray-400 font-bold tabular-nums">
          {filtered.length}
        </span>
      </h2>
      <div className="bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden p-3 xl:p-2 space-y-2 xl:space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={selectedPeriodId ?? ''}
            onChange={e => onSelectPeriod(e.target.value ? Number(e.target.value) : null)}
            aria-label="Zeitraum"
            className="text-[11px] font-medium text-gray-600 bg-transparent border border-cream-300 rounded px-1.5 py-1 cursor-pointer hover:border-navy-500 transition-colors focus:outline-none focus:border-navy-600"
          >
            <option value="">Zeitraum</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {!selectedPeriodId && ([
            ['trainingYear', trainingYearFilterLabel(gameDayDate), trainingYearTitle(gameDayDate)],
            ['all', 'Gesamt', 'Alle jemals erfassten Trainings, über alle Trainingsjahre'],
          ] as const).map(([key, label, hint]) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelectWindow(key)}
              title={hint}
              aria-label={hint}
              aria-pressed={window === key}
              className={`text-[11px] px-2 py-1 rounded-full font-medium cursor-pointer transition-colors active:scale-95 motion-reduce:active:scale-100 ${
                window === key ? 'bg-navy-800 text-white' : 'bg-cream-200 text-gray-500 hover:bg-cream-300'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Kein P/C-Schalter mehr: Termine, zu denen nur ein Teil des Kaders geladen
              war, gehoeren nie in die Fairness-Rechnung. Das Backend filtert sie ueber
              Training.openToAll — es gibt nichts umzuschalten. */}
          <span className="text-[9px] text-gray-400 whitespace-nowrap">
            ohne Nur-P/C
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Keine Trainingsdaten.</p>
        ) : (
          // Balken liegt IN der Zeile, nicht daneben: gleiche Information, halbe Höhe.
          // Auf der Werkbank zweispaltig.
          <div className="space-y-0.5 xl:grid xl:grid-cols-2 xl:gap-x-3 xl:gap-y-0 xl:space-y-0">
          {filtered.map(s => (
            <div
              key={s.playerId}
              className="relative flex items-center gap-2 overflow-hidden rounded px-1.5 py-1 xl:py-0.5"
              title={`${s.attended} von ${s.heldSinceFirstSeen} Trainings seit dem ersten Mal dabei`}
            >
              {/* scaleX statt width: der Balken laeuft auf dem Compositor und ruckelt
                  nicht, wenn beim Umschalten dreizehn Zeilen gleichzeitig wandern. */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-full origin-left rounded bg-navy-200 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                style={{ transform: `scaleX(${s.participation})` }}
              />
              <span className="relative flex-1 min-w-0 truncate text-xs font-medium text-navy-900">
                {s.playerName}
              </span>
              <span className="relative font-display text-[11px] font-bold tabular-nums text-navy-700">
                {Math.round(s.participation * 100)}%
              </span>
              <span className="relative font-display text-[10px] tabular-nums text-gray-400 w-6 text-right">
                {s.attended}
              </span>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  )
}
