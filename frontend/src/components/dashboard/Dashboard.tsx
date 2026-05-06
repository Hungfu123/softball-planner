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
import { PlusCircle, CrossBones } from '@/icons'
import { EditGameDayModal } from './EditGameDayModal'
import {
  Button,
  ConfirmModal, LoadingSkeleton, ResponsiveSheet,
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
  const [deleteGameDayId, setDeleteGameDayId] = useState<number | null>(null)
  const [editGameDayId, setEditGameDayId] = useState<number | null>(null)

  // Letzte Auswahl aus localStorage (überlebt Navigation Logo→Dashboard)
  useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      const persisted = Number(localStorage.getItem('dashboard-season-id'))
      const known = seasons.find(s => s.id === persisted)?.id
      setSelectedSeasonId(known ?? seasons[seasons.length - 1].id)
    }
  }, [seasons, selectedSeasonId])

  // Auswahl persistieren
  useEffect(() => {
    if (selectedSeasonId != null) localStorage.setItem('dashboard-season-id', String(selectedSeasonId))
  }, [selectedSeasonId])

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

  // Auto-Refresh wenn Dashboard sichtbar UND keine Modal/Editor-Aktion läuft —
  // alle 30s gameDays re-fetchen für Live-Scores im Hero. Pausiert während
  // User editiert (Modal offen) damit Server-Reload Eingaben nicht überschreibt.
  const editorActive = showNewGameDay || deleteGameDayId != null || editGameDayId != null || openSheet != null
  useEffect(() => {
    if (!selectedSeasonId) return
    if (editorActive) return
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      api.getGameDays(selectedSeasonId).then(setGameDays).catch(() => { /* silent */ })
    }
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [selectedSeasonId, editorActive])

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
    return <LoadingSkeleton variant="ball" />
  }

  // Erst-User Empty-State: keine Saison existiert → starker Hero-CTA
  if (seasons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-softball-red-600 blur-2xl opacity-30 rounded-full" />
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-navy-900 text-cream-50 shadow-lg shadow-navy-900/30 border-2 border-softball-red-600">
            <CrossBones size={40} />
          </div>
        </div>
        <p className="font-display text-[10px] tracking-[0.4em] uppercase text-softball-red-600 font-bold mb-2">Dead Sox · Lineup HQ</p>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-navy-900 tracking-tight uppercase mb-2 leading-none">
          Ready Up.
        </h1>
        <p className="font-display text-[12px] tracking-widest uppercase text-gray-500 font-bold mb-8 max-w-md">
          Spieltage planen · Lineups würfeln · Live scoren
        </p>
        <div className="bg-cream-50 border border-cream-300 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-sm">
          <p className="font-display text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-2">Erster Pitch</p>
          <h2 className="font-display text-xl font-extrabold text-navy-900 mb-3 uppercase tracking-wide">Saison anlegen</h2>
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
            Saison gruppiert Spieltage, Lineups + Stats. Tap unten um zu starten.
          </p>
          <button
            onClick={() => {
              const yr = new Date().getFullYear()
              createSeason(`Saison ${yr}`, yr).then(s => setSelectedSeasonId(s.id))
            }}
            className="font-display w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-softball-red-600 text-white rounded-xl text-sm font-extrabold tracking-widest uppercase hover:bg-softball-red-700 shadow-sm shadow-softball-red-600/20 cursor-pointer"
          >
            <PlusCircle size={16} /> Saison {new Date().getFullYear()} erstellen
          </button>
          <p className="text-[11px] text-gray-400 mt-3">Name + Jahr später änderbar.</p>
        </div>
      </div>
    )
  }

  // Saison existiert aber 0 Spieltage → kleinerer Empty-State im Dashboard-Layout (kein Full-Page-Hero)

  // Hero-GameDay: bevorzugt heute/zukünftig, sonst letzter vergangener
  const today = new Date().toISOString().slice(0, 10)
  const upcomingGd = gameDays.find(gd => gd.date >= today) ?? null
  const lastPastGd = [...gameDays].reverse().find(gd => gd.date < today) ?? null
  const heroGameDay = upcomingGd ?? lastPastGd
  const heroVariant: 'today' | 'upcoming' | 'past' =
    upcomingGd?.date === today ? 'today' : upcomingGd ? 'upcoming' : 'past'

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Saison-Selector: Dropdown auf allen Screens (konsistent mobile + desktop) */}
      <div className="-mx-3 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-2 border-b border-cream-300">
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

      {/* Saison existiert aber 0 Spieltage → Empty-State Hero-Card */}
      {selectedSeasonId && !heroGameDay && gameDays.length === 0 && (
        <div className="bg-cream-50 border border-cream-300 rounded-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy-50 text-navy-700">
            <CrossBones size={24} />
          </div>
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-navy-900 tracking-wide uppercase mb-2">Noch kein Spieltag</h2>
          <p className="text-sm text-gray-600 mb-5 max-w-md mx-auto leading-relaxed">
            Lege einen Spieltag mit Datum + Anzahl Spielen an. Danach Spieler-Anwesenheit setzen und Lineups vorbereiten.
          </p>
          <button
            onClick={() => setShowNewGameDay(true)}
            className="font-display inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-softball-red-600 text-white rounded-xl text-xs font-extrabold tracking-widest uppercase hover:bg-softball-red-700 shadow-sm shadow-softball-red-600/20 cursor-pointer"
          >
            <PlusCircle size={14} /> Ersten Spieltag erstellen
          </button>
        </div>
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
                    onEdit={id => setEditGameDayId(id)}
                    onDelete={id => setDeleteGameDayId(id)}
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
              <ResponsiveSheet
                open
                onClose={() => setShowNewGameDay(false)}
                title="Neuer Spieltag"
                footer={
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setShowNewGameDay(false)}>Abbrechen</Button>
                    <Button onClick={handleCreateGameDay} disabled={!newGdDate || !newGdGameCount}>
                      Erstellen
                    </Button>
                  </div>
                }
              >
                <div className="p-5 space-y-4">
                  <div>
                    <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Datum</label>
                    <input
                      type="date"
                      value={newGdDate}
                      onChange={e => setNewGdDate(e.target.value)}
                      className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Anzahl Spiele</label>
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
                      className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Label <span className="text-gray-400 normal-case font-bold">(optional)</span></label>
                    <input
                      placeholder="z.B. Spieltag 3"
                      value={newGdLabel}
                      onChange={e => setNewGdLabel(e.target.value)}
                      className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-display block text-[10px] tracking-widest uppercase font-bold text-gray-500 mb-1.5">Ort <span className="text-gray-400 normal-case font-bold">(optional)</span></label>
                    <input
                      placeholder="z.B. Berlin Tegel"
                      value={newGdLocation}
                      onChange={e => setNewGdLocation(e.target.value)}
                      className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
                    />
                  </div>
                </div>
              </ResponsiveSheet>
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
                        <th className="text-right px-3 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700 w-20">Spiele</th>
                        <th className="text-right px-3 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700 w-16">AVG</th>
                        <th className="text-right px-3 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700 w-16">OBP</th>
                        <th className="text-right px-3 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700 w-12 hidden sm:table-cell">H</th>
                        <th className="text-right px-3 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700 w-12 hidden sm:table-cell">PA</th>
                        <th className="text-left px-4 py-3 font-display font-bold tracking-wider uppercase text-[11px] text-gray-700 hidden md:table-cell">Positionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const maxGames = Math.max(...stats.map(st => st.totalGames), 1)
                        const battingByPlayer = new Map(battingStats.map(b => [b.playerId, b]))
                        const fmtAvg = (v: number) => {
                          const s = v.toFixed(3)
                          return s.startsWith('0') ? s.slice(1) : s
                        }
                        return stats.map(s => {
                          const entries = Object.entries(s.positionCounts)
                          entries.sort((a, b) => b[1] - a[1])
                          const positions = entries.length === 0 ? '—' : entries.map(([pos, count]) => `${pos} (${count}x)`).join(', ')
                          const bat = battingByPlayer.get(s.playerId)
                          return (
                            <tr key={s.playerId} className="border-b border-cream-200 last:border-0 hover:bg-cream-100">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{s.playerName}</td>
                              <td className="px-3 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-8 sm:w-12 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-navy-800 rounded-full" style={{ width: `${(s.totalGames / maxGames) * 100}%` }} />
                                  </div>
                                  <span className="font-display font-bold text-gray-900 tabular-nums w-6 text-right">{s.totalGames}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">
                                {bat && bat.atBats > 0
                                  ? <span className="font-display font-bold text-navy-900">{fmtAvg(Number(bat.battingAverage))}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">
                                {bat && bat.plateAppearances > 0
                                  ? <span className="font-display font-semibold text-gray-700">{fmtAvg(Number(bat.onBasePct))}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums hidden sm:table-cell">
                                {bat && bat.plateAppearances > 0
                                  ? <span className="text-gray-700">{bat.hits}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums hidden sm:table-cell">
                                {bat && bat.plateAppearances > 0
                                  ? <span className="text-gray-500">{bat.plateAppearances}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 hidden md:table-cell">{positions}</td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-gray-400 italic">AVG = Schlag-Durchschnitt · OBP = On-Base Percentage · H = Hits · PA = Plate Appearances</p>
                <div className="mt-3 text-right">
                  <Link
                    to={`/stats?scope=season&seasonId=${selectedSeasonId}&view=batting`}
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
              const fmtDate = (iso: string) => {
                const d = new Date(iso + 'T00:00:00')
                return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })
              }
              return (
                <div className="space-y-1.5">
                  {playedGames.slice().reverse().map(({ gd, g }) => {
                    const us = g.scoreUs ?? 0
                    const them = g.scoreThem ?? 0
                    const r = us > them ? 'W' : us < them ? 'L' : 'T'
                    const pipColor = r === 'W' ? 'bg-emerald-600' : r === 'L' ? 'bg-softball-red-600' : 'bg-gray-500'
                    const opponent = g.opponentTeam?.name ?? 'Gegner offen'
                    const context = [gd.label, gd.location].filter(Boolean).join(' · ')
                    return (
                      <Link
                        key={g.id}
                        to={`/gameday/${gd.id}`}
                        onClick={() => setOpenSheet(null)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-white border border-cream-300 rounded-xl hover:border-navy-400"
                      >
                        <span className={`font-display ${pipColor} w-7 h-7 rounded-lg text-white text-xs font-extrabold flex items-center justify-center shrink-0`}>{r}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold text-[13px] uppercase tracking-wide truncate">
                            <span className="text-gray-500">vs</span> <span className="text-navy-900">{opponent}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {fmtDate(gd.date)}{context && ` · ${context}`}
                          </div>
                        </div>
                        <span className="font-display text-base font-extrabold tabular-nums text-navy-900 shrink-0">{us}–{them}</span>
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
