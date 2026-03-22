import { useState, useEffect } from 'react'
import { useSeasons } from '@/hooks/useSeasons'
import { useToastContext } from '@/components/layout/Layout'
import { SeasonSelector } from './SeasonSelector'
import { GameDayCard } from './GameDayCard'
import { Standings } from './Standings'
import { CollapsibleSection } from '@/components/shared/CollapsibleSection'
import { PlusCircle, CrossBones, XMark } from '@/icons'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { EditGameDayModal } from './EditGameDayModal'
import type { GameDayResponse, SeasonPlayerStats } from '@/types'
import * as api from '@/api/client'

const VISIBLE_GAME_DAYS = 3

export function Dashboard() {
  const { seasons, loading: seasonsLoading, create: createSeason, update: updateSeason, remove: removeSeason } = useSeasons()
  const toast = useToastContext()
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])
  const [stats, setStats] = useState<SeasonPlayerStats[]>([])
  const [showAllGameDays, setShowAllGameDays] = useState(false)
  const [showNewGameDay, setShowNewGameDay] = useState(false)
  const [newGdDate, setNewGdDate] = useState('')
  const [newGdLabel, setNewGdLabel] = useState('')
  const [newGdLocation, setNewGdLocation] = useState('')
  const [newGdGameCount, setNewGdGameCount] = useState(3)

  useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(seasons[seasons.length - 1].id)
    }
  }, [seasons, selectedSeasonId])

  useEffect(() => {
    if (!selectedSeasonId) return
    setShowAllGameDays(false)
    Promise.all([
      api.getGameDays(selectedSeasonId),
      api.getSeasonStats(selectedSeasonId),
    ]).then(([gd, st]) => { setGameDays(gd); setStats(st) })
      .catch(e => toast.show(e.message, 'error'))
  }, [selectedSeasonId, toast])

  const handleCreateGameDay = async () => {
    if (!selectedSeasonId || !newGdDate || !newGdGameCount) return
    try {
      const gd = await api.createGameDay(selectedSeasonId, newGdDate, newGdLabel, newGdLocation, newGdGameCount)
      setGameDays(prev => [...prev, gd])
      setShowNewGameDay(false)
      setNewGdDate('')
      setNewGdLabel('')
      setNewGdLocation('')
      setNewGdGameCount(3)
      toast.show('Spieltag erstellt')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  const [deleteGameDayId, setDeleteGameDayId] = useState<number | null>(null)
  const [editGameDayId, setEditGameDayId] = useState<number | null>(null)

  const confirmDeleteGameDay = async () => {
    if (!deleteGameDayId) return
    setDeleteGameDayId(null)
    try {
      await api.deleteGameDay(deleteGameDayId)
      setGameDays(prev => prev.filter(g => g.id !== deleteGameDayId))
      toast.show('Spieltag gelöscht')
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }

  if (seasonsLoading) {
    return <div className="text-center py-12 text-gray-500">Laden...</div>
  }

  // Show latest game days first (reversed), limit to VISIBLE_GAME_DAYS
  const sortedGameDays = [...gameDays].reverse()
  const visibleGameDays = showAllGameDays ? sortedGameDays : sortedGameDays.slice(0, VISIBLE_GAME_DAYS)
  const hiddenCount = gameDays.length - VISIBLE_GAME_DAYS

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-5">
      <SeasonSelector
        seasons={seasons}
        selectedId={selectedSeasonId}
        onSelect={setSelectedSeasonId}
        onCreate={createSeason}
        onUpdate={updateSeason}
        onDelete={async (id) => {
          await removeSeason(id)
          setSelectedSeasonId(null)
          setGameDays([])
          setStats([])
        }}
      />
      </div>

      {selectedSeasonId && (
        <>
          {/* Game Days */}
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-950 flex items-center gap-2">
                <span className="w-1 h-5 bg-softball-red-500 rounded-full" />
                Spieltage
                {gameDays.length > 0 && (
                  <span className="text-sm font-normal text-gray-400">{gameDays.length} gesamt</span>
                )}
              </h2>
              <button
                onClick={() => setShowNewGameDay(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-softball-red-600 text-white hover:bg-softball-red-500 font-medium text-sm cursor-pointer transition-colors"
              >
                <PlusCircle size={16} /> Neuer Spieltag
              </button>
            </div>

            {gameDays.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CrossBones size={48} className="mx-auto mb-3 opacity-40" />
                <p>Noch keine Spieltage in dieser Saison.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleGameDays.map(gd => (
                    <GameDayCard key={gd.id} gameDay={gd} onDelete={setDeleteGameDayId} onEdit={setEditGameDayId} />
                  ))}
                </div>

                {hiddenCount > 0 && !showAllGameDays && (
                  <button
                    onClick={() => setShowAllGameDays(true)}
                    className="mt-3 text-sm text-navy-700 hover:text-navy-900 font-medium cursor-pointer underline underline-offset-2"
                  >
                    Alle {gameDays.length} Spieltage anzeigen
                  </button>
                )}
                {showAllGameDays && hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllGameDays(false)}
                    className="mt-3 text-sm text-gray-400 hover:text-gray-600 cursor-pointer underline underline-offset-2"
                  >
                    Weniger anzeigen
                  </button>
                )}
              </>
            )}

            {showNewGameDay && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowNewGameDay(false)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900">Neuer Spieltag</h2>
                    <button onClick={() => setShowNewGameDay(false)} className="p-1 text-gray-400 hover:text-gray-600">
                      <XMark size={20} />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                      <input
                        type="date"
                        value={newGdDate}
                        onChange={e => setNewGdDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Anzahl Spiele</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newGdGameCount}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val === '') { setNewGdGameCount('' as any); return; }
                          setNewGdGameCount(Math.max(1, Math.min(10, Number(val))));
                        }}
                        onBlur={() => { if (!newGdGameCount) setNewGdGameCount(1); }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label <span className="font-normal text-gray-400">(optional)</span></label>
                      <input
                        placeholder="z.B. Spieltag 3"
                        value={newGdLabel}
                        onChange={e => setNewGdLabel(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ort <span className="font-normal text-gray-400">(optional)</span></label>
                      <input
                        placeholder="z.B. Berlin Tegel"
                        value={newGdLocation}
                        onChange={e => setNewGdLocation(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                      />
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button
                      onClick={() => setShowNewGameDay(false)}
                      className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleCreateGameDay}
                      disabled={!newGdDate || !newGdGameCount}
                      className="px-4 py-2 text-sm font-medium text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500 disabled:opacity-50"
                    >
                      Erstellen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Liga + Stats side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-white rounded-2xl shadow-sm p-5">
            <Standings
              seasonId={selectedSeasonId}
              gameDays={gameDays}
              onGameDaysChanged={() => {
                api.getGameDays(selectedSeasonId).then(setGameDays)
                api.getSeasonStats(selectedSeasonId).then(setStats)
              }}
            />
            </div>
            {stats.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
              <CollapsibleSection title="Saison-Statistik" count={stats.length} defaultOpen>
                <div className="rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Spieler</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Spiele</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Positionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const maxGames = Math.max(...stats.map(st => st.totalGames), 1)
                          return stats.map(s => {
                          const entries = Object.entries(s.positionCounts)
                          entries.sort((a, b) => b[1] - a[1])
                          const positions = entries.length === 0 ? '—' : entries.map(([pos, count]) => `${pos} (${count}x)`).join(', ')
                          return (
                            <tr key={s.playerId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{s.playerName}</td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-navy-800 rounded-full" style={{ width: `${(s.totalGames / maxGames) * 100}%` }} />
                                  </div>
                                  <span className="font-mono font-semibold text-gray-900 w-8 text-right">{s.totalGames}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-gray-600">{positions}</td>
                            </tr>
                          )
                        })
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CollapsibleSection>
              </div>
            )}
          </div>
        </>
      )}
      {deleteGameDayId && (
        <ConfirmModal
          title="Spieltag löschen"
          message="Spieltag und alle Lineups wirklich löschen? Das kann nicht rückgängig gemacht werden."
          onConfirm={confirmDeleteGameDay}
          onCancel={() => setDeleteGameDayId(null)}
        />
      )}

      {editGameDayId && (() => {
        const gd = gameDays.find(g => g.id === editGameDayId)
        if (!gd) return null
        return (
          <EditGameDayModal
            gameDay={gd}
            onSaved={updated => {
              setGameDays(prev => prev.map(g => g.id === updated.id ? updated : g))
              setEditGameDayId(null)
              toast.show('Spieltag aktualisiert')
            }}
            onClose={() => setEditGameDayId(null)}
          />
        )
      })()}
    </div>
  )
}
