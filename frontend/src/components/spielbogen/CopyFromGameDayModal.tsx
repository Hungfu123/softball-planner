import { useEffect, useState } from 'react'
import { useSeasons } from '@/hooks/useSeasons'
import * as api from '@/api/client'
import type { GameDayResponse, SetLineupRequest } from '@/types'
import { Button, ResponsiveSheet } from '@/components/shared'

interface Props {
  open: boolean
  onClose: () => void
  onCopy: (slots: SetLineupRequest['slots']) => void
}

export function CopyFromGameDayModal({ open, onClose, onCopy }: Props) {
  const { seasons } = useSeasons()
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || seasons.length === 0) return
    const load = async () => {
      setLoading(true)
      try {
        const arrs = await Promise.all(seasons.map(s => api.getGameDays(s.id)))
        setGameDays(arrs.flat().sort((a, b) => b.date.localeCompare(a.date)))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [open, seasons])

  const handlePick = async (gameId: number) => {
    const lineup = await api.getLineup(gameId)
    const slots: SetLineupRequest['slots'] = lineup
      .sort((a, b) => a.battingOrder - b.battingOrder)
      .map((entry, idx) => ({
        slot: idx + 1,
        name: entry.player.name,
        position: entry.position,
        battingOrder: entry.battingOrder,
      }))
    onCopy(slots)
    onClose()
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Aus Spieltag laden" maxWidth="md">
      <div className="p-3 space-y-2">
        {loading && (
          <div className="text-sm text-gray-500 text-center py-4">Lade…</div>
        )}
        {!loading && gameDays.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4">Keine Spieltage gefunden</div>
        )}
        {gameDays.map(gd => (
          <div key={gd.id} className="bg-cream-50 border border-cream-300 rounded-lg p-2">
            <div className="font-display text-sm font-bold text-navy-900">
              {new Date(gd.date + 'T00:00:00').toLocaleDateString('de-DE')}
              {gd.label ? ` · ${gd.label}` : ' · Spieltag'}
            </div>
            {gd.location && (
              <div className="text-xs text-gray-500 mb-2">{gd.location}</div>
            )}
            <div className="flex gap-1 flex-wrap mt-1">
              {gd.games.map((g, idx) => (
                <Button
                  key={g.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePick(g.id)}
                >
                  Spiel {idx + 1}
                  {g.opponentTeam ? ` vs ${g.opponentTeam.name}` : ''}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ResponsiveSheet>
  )
}
