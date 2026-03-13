import { useState } from 'react'
import { XMark } from '@/icons'
import type { GameDayResponse, LocalLineupEntry } from '@/types'
import * as api from '@/api/client'

interface Props {
  gameDays: GameDayResponse[]
  currentGameId: number
  availablePlayerIds: Set<number>
  onImport: (entries: LocalLineupEntry[]) => void
  onClose: () => void
}

export function CopyLineupModal({
  gameDays, currentGameId, availablePlayerIds, onImport, onClose,
}: Props) {
  const [importing, setImporting] = useState(false)

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

  const handleSelect = async (gameId: number) => {
    setImporting(true)
    try {
      const lineup = await api.getLineup(gameId)
      const filtered: LocalLineupEntry[] = lineup
        .filter(e => availablePlayerIds.has(e.player.id))
        .map(e => ({
          player: e.player,
          position: e.position,
          dhBatterId: e.dhBatterPlayer && availablePlayerIds.has(e.dhBatterPlayer.id) ? e.dhBatterPlayer.id : null,
          dhBatterName: e.dhBatterPlayer && availablePlayerIds.has(e.dhBatterPlayer.id) ? e.dhBatterPlayer.name : null,
        }))
      onImport(filtered)
    } finally {
      setImporting(false)
    }
  }

  // Group by game day, newest first, exclude current game
  const grouped = [...gameDays].reverse().map(gd => ({
    ...gd,
    games: gd.games.filter(g => g.id !== currentGameId),
  })).filter(gd => gd.games.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Lineup kopieren</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMark size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {grouped.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Keine anderen Spiele vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {grouped.map(gd => (
                <div key={gd.id}>
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {gd.label || 'Spieltag'} — {formatDate(gd.date)}
                  </div>
                  <div className="space-y-0.5">
                    {gd.games.map(g => (
                      <button
                        key={g.id}
                        onClick={() => handleSelect(g.id)}
                        disabled={importing}
                        className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-50"
                      >
                        <span className="text-sm text-gray-900">
                          Spiel {g.gameNumber}
                        </span>
                        {g.opponentTeam && (
                          <span className="text-sm text-gray-500"> vs {g.opponentTeam.name}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
