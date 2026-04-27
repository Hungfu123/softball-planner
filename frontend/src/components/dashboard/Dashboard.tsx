import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSeasons } from '@/hooks/useSeasons'
import { useToastContext } from '@/components/layout/Layout'
import { SeasonSelector } from './SeasonSelector'
import { HeroNextGameDay } from './HeroNextGameDay'
import { SeasonTileGrid } from './SeasonTileGrid'
import { UpcomingList } from './UpcomingList'
import { Standings } from './Standings'
import { DetailSheet } from './DashboardSheets'
import { PlusCircle, XMark } from '@/icons'
import { EditGameDayModal } from './EditGameDayModal'
import {
  Button,
  ConfirmModal, LoadingSkeleton,
} from '@/components/shared'
import type { GameDayResponse, SeasonPlayerStats, PlayerBattingStatsResponse } from '@/types'
import * as api from '@/api/client'


export function Dashboard() {
  const { seasons, loading: seasonsLoading, create: createSeason, update: updateSeason, remove: removeSeason } = useSeasons()
  const toast = useToastContext()
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])
  const [stats, setStats] = useState<SeasonPlayerStats[]>([])
  const [battingStats, setBattingStats] = useState<PlayerBattingStatsResponse[]>([])
  const [openSheet, setOpenSheet] = useState<'liga' | 'stats' | 'results' | null>(null)
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
      api.getSeasonBattingStats(selectedSeasonId).catch(() => [] as PlayerBattingStatsResponse[]),
    ]).then(([gd, st, bs]) => { setGameDays(gd); setStats(st); setBattingStats(bs) })
      .catch(e => toast.show(e.message, 'error'))
  }, [selectedSeasonId, toast])

  // Auto-Refresh wenn Dashboard sichtbar — alle 30s gameDays re-fetchen
  // damit Live-Scores im Hero aktuell bleiben
  useEffect(() => {
    if (!selectedSeasonId) return
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      api.getGameDays(selectedSeasonId).then(setGameDays).catch(() => { /* silent */ })
    }
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [selectedSeasonId])

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
    return <LoadingSkeleton />
  }

  // Hero-GameDay: bevorzugt heute/zukünftig, sonst letzter vergangener
  const today = new Date().toISOString().slice(0, 10)
  const upcomingGd = gameDays.find(gd => gd.date >= today) ?? null
  const lastPastGd = [...gameDays].reverse().find(gd => gd.date < today) ?? null
  const heroGameDay = upcomingGd ?? lastPastGd
  const heroVariant: 'today' | 'upcoming' | 'past' =
    upcomingGd?.date === today ? 'today' : upcomingGd ? 'upcoming' : 'past'

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Kompakter Saison-Selector — flach, mit Full-Width Trennstrich */}
      <div className="-mx-3 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-3 border-b border-cream-300">
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

      {selectedSeasonId && heroGameDay && (
        <HeroNextGameDay gameDay={heroGameDay} variant={heroVariant} />
      )}

      {selectedSeasonId && (
        <>
          {/* Anstehende Spieltage — Header immer sichtbar */}
          {(() => {
            const upcoming = gameDays.filter(gd => gd.date >= today && gd.id !== heroGameDay?.id)
            const past = [...gameDays].reverse().filter(gd => gd.date < today && gd.id !== heroGameDay?.id)
            // Wenn Hero ein Upcoming ist → Liste nur weitere Upcoming (kein Past mischen)
            // Wenn Hero ein Past ist → Liste zeigt Past
            const heroIsUpcoming = heroVariant === 'today' || heroVariant === 'upcoming'
            const showList = heroIsUpcoming ? upcoming : past
            const listLabel = heroIsUpcoming ? 'Anstehend' : 'Letzte Spieltage'
            return (
              <div>
                <div className="flex items-center justify-between px-1 mb-2">
                  <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-gray-700">
                    {listLabel}
                  </h2>
                  <button
                    onClick={() => setShowNewGameDay(true)}
                    className="font-display text-[11px] font-bold tracking-widest uppercase text-navy-700 hover:text-navy-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle size={14} />
                    Neuer Spieltag
                  </button>
                </div>
                {showList.length > 0 && (
                  <UpcomingList
                    gameDays={showList}
                    showAll={showAllGameDays}
                    onShowAll={() => setShowAllGameDays(true)}
                    onShowLess={() => setShowAllGameDays(false)}
                    visibleCount={3}
                  />
                )}
              </div>
            )
          })()}

          {selectedSeasonId && (gameDays.length > 0 || stats.length > 0) && (
            <SeasonTileGrid
              seasonId={selectedSeasonId}
              gameDays={gameDays}
              battingStats={battingStats}
              onOpenLiga={() => setOpenSheet('liga')}
              onOpenStats={() => setOpenSheet('stats')}
              onOpenResults={() => setOpenSheet('results')}
            />
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
                    <Button variant="ghost" onClick={() => setShowNewGameDay(false)}>Abbrechen</Button>
                    <Button onClick={handleCreateGameDay} disabled={!newGdDate || !newGdGameCount}>
                      Erstellen
                    </Button>
                  </div>
                </div>
              </div>
            )}

          {/* Detail-Sheets statt embedded sections — Tiles oben triggern */}
          <DetailSheet open={openSheet === 'liga'} onClose={() => setOpenSheet(null)} title="Liga-Tabelle">
            <Standings
              seasonId={selectedSeasonId}
              gameDays={gameDays}
              onGameDaysChanged={() => {
                api.getGameDays(selectedSeasonId).then(setGameDays)
                api.getSeasonStats(selectedSeasonId).then(setStats)
              }}
            />
          </DetailSheet>

          <DetailSheet open={openSheet === 'stats'} onClose={() => setOpenSheet(null)} title="Saison-Statistik">
            {stats.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Noch keine Daten in dieser Saison.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-cream-300">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cream-300 bg-cream-100">
                        <th className="text-left px-4 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700">Spieler</th>
                        <th className="text-right px-4 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700 w-24">Spiele</th>
                        <th className="text-left px-4 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700 hidden sm:table-cell">Positionen</th>
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
                            <tr key={s.playerId} className="border-b border-cream-200 last:border-0 hover:bg-cream-100">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{s.playerName}</td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-12 sm:w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-navy-800 rounded-full" style={{ width: `${(s.totalGames / maxGames) * 100}%` }} />
                                  </div>
                                  <span className="font-display font-bold text-gray-900 w-6 text-right">{s.totalGames}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 hidden sm:table-cell">{positions}</td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-right">
                  <Link
                    to={`/stats?scope=season&seasonId=${selectedSeasonId}`}
                    onClick={() => setOpenSheet(null)}
                    className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-softball-red-600 hover:underline"
                  >
                    Alle Statistiken (Schlagen, Jahr, …) →
                  </Link>
                </div>
              </>
            )}
          </DetailSheet>

          <DetailSheet open={openSheet === 'results'} onClose={() => setOpenSheet(null)} title="Ergebnisse">
            {(() => {
              const playedGames = gameDays.flatMap(gd => gd.games.map(g => ({ gd, g }))).filter(({ g }) => g.scoreUs != null && g.scoreThem != null)
              if (playedGames.length === 0) {
                return <p className="text-sm text-gray-500 text-center py-6">Noch keine gespielten Spiele.</p>
              }
              return (
                <div className="space-y-1.5">
                  {playedGames.slice().reverse().map(({ gd, g }) => {
                    const us = g.scoreUs ?? 0
                    const them = g.scoreThem ?? 0
                    const r = us > them ? 'W' : us < them ? 'L' : 'T'
                    const pipColor = r === 'W' ? 'bg-emerald-600' : r === 'L' ? 'bg-softball-red-600' : 'bg-gray-500'
                    return (
                      <Link
                        key={g.id}
                        to={`/gameday/${gd.id}`}
                        onClick={() => setOpenSheet(null)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-white border border-cream-300 rounded-xl hover:border-navy-400"
                      >
                        <span className={`font-display ${pipColor} w-7 h-7 rounded-lg text-white text-xs font-extrabold flex items-center justify-center`}>{r}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[13px] truncate">{g.opponentTeam?.name ?? 'Unbekannt'}</div>
                          <div className="text-[11px] text-gray-500">{gd.date}</div>
                        </div>
                        <span className="font-display text-sm font-extrabold tabular-nums text-navy-900">{us}–{them}</span>
                      </Link>
                    )
                  })}
                </div>
              )
            })()}
          </DetailSheet>
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
