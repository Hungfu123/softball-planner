import { useState } from 'react'
import type { Player } from '@/types'
import type { PlayerAttendanceStats } from '@/hooks/useAttendanceStats'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { HistoryMatrix } from './HistoryMatrix'

type Training = { id: number; date: string; cancelled?: boolean }

type Props = {
  open: boolean
  onClose: () => void
  players: Player[]
  stats: Map<number, PlayerAttendanceStats>
  avgPresent: number
  totalTrainings: number
  trainings: Training[]
  attendance: Map<number, Map<number, boolean>>
}

type Tab = 'anzahl' | 'matrix'

export function StatsDrawer({ open, onClose, players, stats, avgPresent, totalTrainings, trainings, attendance }: Props) {
  const [tab, setTab] = useState<Tab>('anzahl')

  const sorted = [...players].sort((a, b) => {
    const cA = stats.get(a.id)?.last3Months.attended ?? 0
    const cB = stats.get(b.id)?.last3Months.attended ?? 0
    return cB - cA || a.name.localeCompare(b.name)
  })

  const max3M = Math.max(1, ...sorted.map(p => stats.get(p.id)?.last3Months.attended ?? 0))

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Anwesenheits-Statistik" maxWidth="lg">
      <div className="px-4 py-4 space-y-4">
        <p className="text-xs text-navy-600">Anzahl Teilnahmen · letzte 3 Monate &amp; Jahr</p>

            {/* Tab Toggle */}
            <div className="inline-flex bg-cream-200 rounded-lg p-0.5">
              <button
                onClick={() => setTab('anzahl')}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold cursor-pointer transition-colors ${tab === 'anzahl' ? 'bg-navy-700 text-white' : 'text-navy-700'}`}
              >
                Anzahl
              </button>
              <button
                onClick={() => setTab('matrix')}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold cursor-pointer transition-colors ${tab === 'matrix' ? 'bg-navy-700 text-white' : 'text-navy-700'}`}
              >
                Matrix
              </button>
            </div>

            {tab === 'anzahl' && (
              <>
                <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-navy-500 border-b border-cream-200">
                    <span>Spieler</span>
                    <span className="text-right w-16">3 Monate</span>
                    <span className="text-right w-12">Jahr</span>
                  </div>
                  {sorted.map(p => {
                    const s = stats.get(p.id) ?? { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }
                    const ratio = s.last3Months.attended / max3M
                    return (
                      <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-3 py-2 border-b border-cream-100 last:border-b-0">
                        <div className="min-w-0">
                          <div data-stats-row-name className="text-sm font-medium text-navy-900 truncate">{p.name}</div>
                          <div className="h-1.5 bg-cream-200 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-navy-700 transition-all duration-300"
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-navy-900 w-16 text-right">{s.last3Months.attended}</span>
                        <span className="text-xs tabular-nums text-navy-500 w-12 text-right">{s.lastYear.attended}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-cream-300 rounded-xl p-3">
                    <div className="text-xs text-navy-500 uppercase tracking-wide">⌀ Spieler</div>
                    <div className="font-display text-2xl font-black text-navy-800 tabular-nums">{avgPresent.toFixed(1)}</div>
                  </div>
                  <div className="bg-white border border-cream-300 rounded-xl p-3">
                    <div className="text-xs text-navy-500 uppercase tracking-wide">Trainings</div>
                    <div className="font-display text-2xl font-black text-navy-800 tabular-nums">{totalTrainings}</div>
                  </div>
                </div>
              </>
            )}

            {tab === 'matrix' && (
              <HistoryMatrix players={players} trainings={trainings} attendance={attendance} />
            )}
      </div>
    </ResponsiveSheet>
  )
}
