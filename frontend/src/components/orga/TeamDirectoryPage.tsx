import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import type { GameDayResponse, Season, TeamDirectoryEntry } from '@/types'
import { CrossBones, PlusCircle } from '@/icons'
import { Button } from '@/components/shared'
import { useToastContext } from '@/components/layout/Layout'
import { AnalysisModeTabs } from '@/components/analysis/AnalysisModeTabs'
import { CreateTeamSheet } from './CreateTeamSheet'
import {
  type ClubGame,
  buildHistoryByClub,
  ClubSheet,
  ClubTile,
  formatDate,
  FormPills,
  winRate,
  WinRateNumber,
} from './clubDirectoryShared'

export function TeamDirectoryPage() {
  const toast = useToastContext()
  const [directory, setDirectory] = useState<TeamDirectoryEntry[]>([])
  const [historyByClub, setHistoryByClub] = useState<Map<string, ClubGame[]>>(new Map())
  const [gameDays, setGameDays] = useState<GameDayResponse[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'record'>('name')
  const [openClub, setOpenClub] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  // Deep-Link (?club=Name): öffnet das Club-Sheet direkt — genutzt vom Gegner-Chip der Spieltag-Seite
  const [searchParams, setSearchParams] = useSearchParams()

  const closeClubSheet = () => {
    setOpenClub(null)
    if (searchParams.get('club')) {
      const next = new URLSearchParams(searchParams)
      next.delete('club')
      setSearchParams(next, { replace: true })
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [dir, gds, seasons] = await Promise.all([
        api.getTeamDirectory(),
        api.getAllGameDays(),
        api.getSeasons(),
      ])
      setDirectory(dir)
      setGameDays(gds)
      setSeasons(seasons)
      setHistoryByClub(buildHistoryByClub(gds, seasons))
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load ist stabil genug (bewusster Init-Fetch, wie usePlayers)
  useEffect(() => { load() }, [])

  useEffect(() => {
    const club = searchParams.get('club')
    if (club) setOpenClub(club)
  }, [searchParams])

  const availableLeagues = useMemo(() => {
    const names = new Map<string, number>()
    for (const d of directory) {
      for (const l of d.leagues) names.set(l.leagueName, (names.get(l.leagueName) ?? 0) + 1)
    }
    return [...names.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [directory])

  /** Vorselektierte Liga im Anlegen-Sheet: wo man sich gerade "befindet".
   *  1. aktiver Liga-Filter der Seite (neuestes Jahr dieses Namens),
   *  2. die auf dem Dashboard gewählte Saison (persistiert),
   *  3. aktuelle Saison des Kalenderjahres, sonst die zuletzt angelegte. */
  const recommendedSeasonId = useMemo(() => {
    if (leagueFilter) {
      const match = seasons.filter(s => s.name === leagueFilter).sort((a, b) => b.year - a.year)[0]
      if (match) return match.id
    }
    const persisted = Number(localStorage.getItem('dashboard-season-id'))
    if (!Number.isNaN(persisted) && seasons.some(s => s.id === persisted)) return persisted
    const currentYear = new Date().getFullYear()
    const ofCurrentYear = seasons.filter(s => s.year === currentYear)
    if (ofCurrentYear.length > 0) return ofCurrentYear[ofCurrentYear.length - 1].id
    return seasons.length > 0 ? seasons[seasons.length - 1].id : null
  }, [leagueFilter, seasons])

  /** Nach dem Anlegen: Liste neu laden + nur dann den Liga-Filter umschalten,
   *  wenn ein aktiver Filter das neue Team verbergen würde. */
  const handleTeamCreated = (season: Season) => {
    setShowCreate(false)
    if (leagueFilter && leagueFilter !== season.name) setLeagueFilter(season.name)
    load()
  }

  /** Nächster anstehender Gegner: erstes zukünftiges Spiel mit Gegner (Spieltage sind nach Datum sortiert). */
  const nextOpponent = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    for (const gd of [...gameDays].sort((a, b) => a.date.localeCompare(b.date))) {
      if (gd.date < today) continue
      const game = (gd.games ?? []).find(g => g.opponentTeam?.name?.trim())
      const club = game?.opponentTeam?.name?.trim()
      if (club) return { club, date: gd.date, league: historyByClub.get(club)?.find(h => h.date === gd.date)?.leagueName ?? '' }
    }
    return null
  }, [gameDays, historyByClub])

  const filtered = useMemo(() => {
    let list = directory
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d => d.clubName.toLowerCase().includes(q))
    }
    if (leagueFilter) {
      list = list.filter(d => d.leagues.some(l => l.leagueName === leagueFilter))
    }
    const sorted = [...list]
    if (sortBy === 'record') {
      sorted.sort((a, b) => {
        const ra = winRate(a) ?? -1
        const rb = winRate(b) ?? -1
        if (ra !== rb) return rb - ra
        return a.clubName.localeCompare(b.clubName)
      })
    } else {
      sorted.sort((a, b) => a.clubName.localeCompare(b.clubName))
    }
    return sorted
  }, [directory, search, leagueFilter, sortBy])

  /** Gruppierung nach Liga (Mitgliedschafts-Verzeichnis): Club steht unter jeder seiner Ligen.
   *  Bei Bilanz-Sortierung oder aktivem Filter: eine flache Rangliste mit Platzierung. */
  const sections = useMemo(() => {
    if (sortBy === 'record' || leagueFilter || search.trim()) {
      return [{ league: null as string | null, entries: filtered }]
    }
    const byLeague = new Map<string, TeamDirectoryEntry[]>()
    for (const entry of filtered) {
      for (const l of entry.leagues) {
        if (!byLeague.has(l.leagueName)) byLeague.set(l.leagueName, [])
        byLeague.get(l.leagueName)!.push(entry)
      }
    }
    return [...byLeague.entries()]
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([league, entries]) => ({ league, entries }))
  }, [filtered, sortBy, leagueFilter, search])

  const openEntry = openClub != null ? directory.find(d => d.clubName === openClub) : undefined
  const nextOpponentEntry = nextOpponent ? directory.find(d => d.clubName === nextOpponent.club) : undefined

  const renderTile = (entry: TeamDirectoryEntry, rank?: number) => (
    <ClubTile
      key={`${entry.clubName}-${rank ?? 'x'}`}
      entry={entry}
      history={historyByClub.get(entry.clubName) ?? []}
      rank={rank}
      onOpen={() => setOpenClub(entry.clubName)}
    />
  )

  return (
    <div className="min-h-screen">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">
            Gegner
            {directory.length > 0 && <span className="text-navy-500 font-bold text-xl"> ({directory.length})</span>}
          </h1>
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle size={13} />}
            onClick={() => setShowCreate(true)}
            className="font-display text-[11px] font-bold tracking-widest uppercase rounded-full px-3.5 py-2 shrink-0 active:scale-95 transition-transform"
            title="Neues Gegner-Team anlegen"
          >
            Gegner anlegen
          </Button>
        </div>

        <AnalysisModeTabs />

        {directory.length > 6 && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Gegner suchen…"
            className="w-full border border-cream-300 rounded-full px-4 py-2.5 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
          />
        )}

        {/* Filter-Zeile: Liga-Chips + Sortierung */}
        {!loading && directory.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
            <button
              onClick={() => setLeagueFilter(null)}
              className={`font-display px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full cursor-pointer whitespace-nowrap transition-colors ${
                leagueFilter == null ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-cream-200 hover:text-navy-900'
              }`}
            >
              Alle
            </button>
            {availableLeagues.map(league => (
              <button
                key={league}
                onClick={() => setLeagueFilter(leagueFilter === league ? null : league)}
                className={`font-display px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full cursor-pointer whitespace-nowrap transition-colors ${
                  leagueFilter === league ? 'bg-navy-900 text-white' : 'text-gray-600 hover:bg-cream-200 hover:text-navy-900'
                }`}
              >
                {league.replace(' Series', '').replace(' Liga', '')}
              </button>
            ))}
            <span className="w-px h-5 bg-cream-300 shrink-0 mx-0.5" />
            <button
              onClick={() => setSortBy(sortBy === 'name' ? 'record' : 'name')}
              className={`font-display px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full border shrink-0 cursor-pointer whitespace-nowrap transition-colors ${
                sortBy === 'record'
                  ? 'border-navy-900 text-navy-900 bg-cream-100'
                  : 'border-cream-300 text-gray-600 hover:bg-cream-200 hover:text-navy-900'
              }`}
              title={sortBy === 'name' ? 'Nach Erfolgsquote sortieren (Power-Ranking)' : 'Alphabetisch sortieren'}
            >
              {sortBy === 'name' ? 'A–Z' : 'Bilanz-Ranking'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white border border-cream-300 rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-cream-50 border border-cream-300 rounded-2xl p-10 text-center text-gray-500">
            <CrossBones size={40} className="mx-auto mb-3 text-gray-300" />
            {search.trim() ? 'Keine Treffer.' : 'Noch keine Gegner-Teams angelegt.'}
          </div>
        ) : (
          <>
            {/* Nächster Gegner — die eigentliche Vor-dem-Spiel-Frage */}
            {nextOpponent && nextOpponentEntry && (
              <button
                onClick={() => setOpenClub(nextOpponent.club)}
                className="w-full bg-navy-900 rounded-2xl p-4 sm:p-5 text-left cursor-pointer
                           hover:bg-navy-800 transition-colors active:scale-[0.99]
                           flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[10px] font-bold tracking-widest uppercase text-white/50">
                    Nächster Gegner
                  </p>
                  <p className="font-display font-extrabold text-white text-lg sm:text-xl truncate mt-0.5">
                    {nextOpponent.club}
                  </p>
                  <p className="text-xs text-white/60 tabular-nums mt-0.5">
                    {formatDate(nextOpponent.date)}{nextOpponent.league ? ` · ${nextOpponent.league}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col items-end">
                    <WinRateNumber entry={nextOpponentEntry} dark />
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Bilanz</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <FormPills history={historyByClub.get(nextOpponent.club) ?? []} />
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Form</span>
                  </div>
                </div>
              </button>
            )}

            {/* Sektionen: Liga-Gruppen (Mitgliedschaften) oder flache Rangliste */}
            {sections.map(section => (
              <div key={section.league ?? 'ranking'}>
                {section.league && (
                  <div className="sticky top-0 z-10 bg-cream-50/95 backdrop-blur-sm py-1.5 mb-2 border-b border-cream-200">
                    <p className="font-display text-[11px] font-extrabold tracking-widest uppercase text-navy-600">
                      {section.league}
                      <span className="text-gray-400 ml-1.5">({section.entries.length})</span>
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {sortBy === 'record'
                    ? section.entries.map((entry, i) => renderTile(entry, i + 1))
                    : section.entries.map(entry => renderTile(entry))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {openEntry && (
        <ClubSheet
          key={openEntry.clubName}
          entry={openEntry}
          history={historyByClub.get(openEntry.clubName) ?? []}
          allClubNames={directory.map(d => d.clubName)}
          onClose={closeClubSheet}
          onChanged={() => { load(); closeClubSheet() }}
        />
      )}

      {showCreate && (
        <CreateTeamSheet
          seasons={seasons}
          recommendedSeasonId={recommendedSeasonId}
          directory={directory}
          onClose={() => setShowCreate(false)}
          onCreated={handleTeamCreated}
        />
      )}
    </div>
  )
}
