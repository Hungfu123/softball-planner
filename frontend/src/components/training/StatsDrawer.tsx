import { useState } from 'react'
import { Drawer } from 'vaul'
import type { Player } from '@/types'
import type { PlayerAttendanceStats } from '@/hooks/useAttendanceStats'
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

function barColor(percentage: number): string {
  if (percentage >= 70) return 'bg-navy-700'
  if (percentage < 30) return 'bg-softball-red-400'
  return 'bg-navy-500'
}

type Tab = 'quoten' | 'matrix'

export function StatsDrawer({ open, onClose, players, stats, avgPresent, totalTrainings, trainings, attendance }: Props) {
  const [tab, setTab] = useState<Tab>('quoten')

  const sorted = [...players].sort((a, b) => {
    const qA = stats.get(a.id)?.last3Months.percentage ?? 0
    const qB = stats.get(b.id)?.last3Months.percentage ?? 0
    return qB - qA || a.name.localeCompare(b.name)
  })

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[85vh] overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Anwesenheits-Statistik</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div className="px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <div>
              <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">Anwesenheits-Statistik</h2>
              <p className="text-xs text-navy-600">Letzte 3 Monate · {totalTrainings} Trainings</p>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setTab('quoten')}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold cursor-pointer ${tab === 'quoten' ? 'bg-navy-700 text-white' : 'bg-cream-200 text-navy-700'}`}
              >
                Quoten
              </button>
              <button
                onClick={() => setTab('matrix')}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold cursor-pointer ${tab === 'matrix' ? 'bg-navy-700 text-white' : 'bg-cream-200 text-navy-700'}`}
              >
                Matrix
              </button>
            </div>

            {tab === 'quoten' && (
              <>
                <div className="bg-white border border-cream-300 rounded-xl p-3 space-y-2">
                  {sorted.map(p => {
                    const s = stats.get(p.id) ?? { last3Months: { attended: 0, total: 0, percentage: 0 }, lastYear: { attended: 0, total: 0, percentage: 0 } }
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <span data-stats-row-name className="w-24 text-sm font-medium text-navy-900 truncate">{p.name}</span>
                        <div className="flex-1 h-2.5 bg-cream-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor(s.last3Months.percentage)} transition-all duration-300`}
                            style={{ width: `${s.last3Months.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-navy-700 w-20 text-right">
                          {s.last3Months.attended}/{s.last3Months.total} · {s.last3Months.percentage}%
                        </span>
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
