import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '@/api/client'
import type { GameDayResponse, Season, TeamDirectoryEntry, TeamLeagueOccurrence } from '@/types'
import { Pencil, TrashBin, CrossBones, ArrowsSwap, PlusCircle } from '@/icons'
import { ConfirmModal, Button, ResponsiveSheet } from '@/components/shared'
import { useToastContext } from '@/components/layout/Layout'
import { CreateTeamSheet } from './CreateTeamSheet'

/** Ein Spiel gegen einen Club — client-seitig aus den Spieltagen abgeleitet. */
interface ClubGame {
  gameId: number
  date: string
  gameNumber: number
  leagueName: string
  scoreUs: number | null
  scoreThem: number | null
}

/** 'W' | 'L' | 'T' | null (offen) für ein Spiel. */
function gameResult(g: ClubGame): 'W' | 'L' | 'T' | null {
  if (g.scoreUs == null || g.scoreThem == null) return null
  if (g.scoreUs > g.scoreThem) return 'W'
  if (g.scoreUs < g.scoreThem) return 'L'
  return 'T'
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function winRate(entry: TeamDirectoryEntry): number | null {
  const decided = entry.wins + entry.losses + entry.ties
  return decided === 0 ? null : Math.round((entry.wins / decided) * 100)
}

/** Bilanz-Balken (navy = Siege, rot = Niederlagen) — dieselbe Balkensprache wie die Stats-Tabelle. */
function WinBar({ entry, className = '' }: { entry: TeamDirectoryEntry; className?: string }) {
  const decided = entry.wins + entry.losses + entry.ties
  if (decided === 0) return <div className={`h-1.5 rounded-full bg-cream-200 ${className}`} />
  const winsPct = (entry.wins / decided) * 100
  const lossesPct = (entry.losses / decided) * 100
  return (
    <div className={`h-1.5 rounded-full bg-gray-300 overflow-hidden flex ${className}`}>
      <div className="h-full bg-navy-800" style={{ width: `${winsPct}%` }} />
      <div className="h-full bg-softball-red-600" style={{ width: `${lossesPct}%` }} />
    </div>
  )
}

/** Form-Pills der letzten 5 Spiele (alt → neu, wie Formtabellen im Fußball). */
function FormPills({ history }: { history: ClubGame[] }) {
  const last5 = history.slice(0, 5).map(gameResult).filter(r => r != null).reverse().slice(-5)
  if (last5.length === 0) return null
  return (
    <span className="inline-flex gap-0.5 shrink-0">
      {last5.map((r, i) => (
        <span
          key={i}
          className={`font-display w-4 h-4 inline-flex items-center justify-center rounded text-[9px] font-extrabold ${
            r === 'W' ? 'bg-navy-800 text-white' : r === 'L' ? 'bg-softball-red-600 text-white' : 'bg-gray-300 text-navy-900'
          }`}
        >
          {r}
        </span>
      ))}
    </span>
  )
}

/** Erfolgsquote als große Zahl — navy bei ≥50%, sonst rot; dark-Variante für den Navy-Teaser. */
function WinRateNumber({ entry, dark = false }: { entry: TeamDirectoryEntry; dark?: boolean }) {
  const rate = winRate(entry)
  if (rate == null) {
    return <span className={`font-display text-lg font-extrabold tabular-nums ${dark ? 'text-white/20' : 'text-gray-200'}`}>–</span>
  }
  const cls = dark
    ? (rate >= 50 ? 'text-white' : 'text-softball-red-400')
    : (rate >= 50 ? 'text-navy-900' : 'text-softball-red-700')
  return (
    <span className={`font-display text-xl font-extrabold tabular-nums ${cls}`}>
      {rate}<span className="text-xs align-top">%</span>
    </span>
  )
}

/** Scouting-Kachel: Name · Quote · Bilanzbar · Form · Ligen. Klick öffnet das Detail-Sheet. */
function ClubTile({ entry, history, rank, onOpen }: {
  entry: TeamDirectoryEntry
  history: ClubGame[]
  rank?: number
  onOpen: () => void
}) {
  const decided = entry.wins + entry.losses + entry.ties
  return (
    <button
      onClick={onOpen}
      className="bg-white border border-cream-300 rounded-2xl p-4 text-left cursor-pointer
                 hover:border-navy-400 hover:shadow-md transition-all active:scale-[0.98]
                 flex flex-col gap-2.5 h-full"
    >
      <div className="flex items-start gap-2">
        {rank != null && (
          <span className="font-display text-xs font-extrabold text-gray-300 tabular-nums mt-1.5 w-5 shrink-0">{rank}</span>
        )}
        <span className="font-display font-bold text-navy-900 text-base leading-snug flex-1">{entry.clubName}</span>
        <WinRateNumber entry={entry} />
      </div>
      <div className="flex items-center gap-2">
        <WinBar entry={entry} className="flex-1" />
        <span className="font-display text-[11px] font-bold tabular-nums text-gray-400 shrink-0">
          {decided === 0 ? 'neu' : `${entry.wins}W–${entry.losses}L${entry.ties > 0 ? `–${entry.ties}T` : ''}`}
        </span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <FormPills history={history} />
        <span className="text-[10px] text-gray-400 truncate">
          {entry.leagues.map(l => l.leagueName.replace(' Series', '').replace(' Liga', '')).join(' · ')}
        </span>
      </div>
    </button>
  )
}

/** Detail-Sheet pro Club: Umbenennen, Stats-Link, Liga-Zeilen (Edit/Delete), Spiel-Historie. */
function ClubSheet({ entry, history, allClubNames, onClose, onChanged }: {
  entry: TeamDirectoryEntry
  history: ClubGame[]
  allClubNames: string[]
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToastContext()
  const navigate = useNavigate()
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState(entry.clubName)
  const [renameRunning, setRenameRunning] = useState(false)
  const [renameLeagueOcc, setRenameLeagueOcc] = useState<TeamLeagueOccurrence | null>(null)
  const [renameLeagueValue, setRenameLeagueValue] = useState('')
  const [deleteTeamId, setDeleteTeamId] = useState<number | null>(null)
  const deleteRunningRef = useRef(false)

  const renameMergeTarget = useMemo(() => {
    const trimmed = renameValue.trim().toLowerCase()
    if (!trimmed || trimmed === entry.clubName.toLowerCase()) return null
    return allClubNames.find(n => n !== entry.clubName && n.toLowerCase() === trimmed) ?? null
  }, [renameValue, entry.clubName, allClubNames])

  const handleRename = async () => {
    const newName = renameValue.trim()
    if (!newName || newName === entry.clubName) { setShowRename(false); return }
    setRenameRunning(true)
    try {
      await api.renameTeamClub(entry.clubName, newName)
      toast.show(renameMergeTarget
        ? `Clubs verschmolzen: '${entry.clubName}' und '${renameMergeTarget}' sind jetzt '${newName}'`
        : `'${entry.clubName}' → '${newName}' umbenannt`)
      onChanged()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setRenameRunning(false)
    }
  }

  const handleRenameLeagueRow = async () => {
    if (!renameLeagueOcc) return
    const newName = renameLeagueValue.trim()
    if (!newName || newName === entry.clubName) { setRenameLeagueOcc(null); return }
    setRenameRunning(true)
    try {
      await api.updateLeagueTeam(renameLeagueOcc.teamId, newName)
      toast.show('Liga-Zeile umbenannt — nur diese Liga, der Club kann sich im Verzeichnis dadurch aufteilen')
      onChanged()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setRenameRunning(false)
    }
  }

  const handleDeleteLeagueRow = async () => {
    if (deleteTeamId == null || deleteRunningRef.current) return
    const teamId = deleteTeamId
    deleteRunningRef.current = true
    setDeleteTeamId(null)
    try {
      await api.deleteLeagueTeam(teamId)
      toast.show('Team aus der Liga entfernt')
      onChanged()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      deleteRunningRef.current = false
    }
  }

  return (
    <>
      <ResponsiveSheet
        open
        onClose={() => { if (!renameRunning) onClose() }}
        title={entry.clubName}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => { setRenameValue(entry.clubName); setShowRename(true) }}
              className="font-display px-3.5 py-2 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-gray-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Pencil size={12} /> Umbenennen
            </button>
            <button
              onClick={() => navigate(`/stats?scope=opponent&opponent=${encodeURIComponent(entry.clubName)}`)}
              className="font-display px-3.5 py-2 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-navy-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-transform"
              title="Schlag-Statistik gegen diesen Gegner"
            >
              <ArrowsSwap size={12} /> Stats gegen sie
            </button>
          </div>
        }
      >
        <div className="p-5 space-y-5">
          {/* Bilanz-Kopf */}
          <div className="bg-cream-50 border border-cream-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-sm font-bold tabular-nums text-navy-900">
                {entry.wins}W–{entry.losses}L{entry.ties > 0 ? `–${entry.ties}T` : ''}
              </span>
              <span className="font-display text-xs tabular-nums text-gray-400">
                {entry.runsFor}:{entry.runsAgainst} Runs · {entry.games} {entry.games === 1 ? 'Spiel' : 'Spiele'}
              </span>
            </div>
            <WinBar entry={entry} />
          </div>

          {/* Liga-Anwesenheiten */}
          <div>
            <p className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1.5">
              Ligen ({entry.leagues.length})
            </p>
            <div className="bg-white border border-cream-200 rounded-xl overflow-hidden">
              {entry.leagues.map(l => (
                <div key={l.teamId} className="group flex items-center gap-2 px-3 py-2.5 border-b border-cream-100 last:border-b-0">
                  <span className="flex-1 text-sm text-navy-900 font-medium truncate">
                    {l.leagueName}
                    {l.year != null && <span className="text-gray-400 font-normal"> · {l.year}</span>}
                  </span>
                  <div className="actions-reveal flex gap-1 shrink-0">
                    <button
                      onClick={() => { setRenameLeagueOcc(l); setRenameLeagueValue(entry.clubName) }}
                      aria-label={`${entry.clubName} in ${l.leagueName} umbenennen`}
                      className="p-3.5 rounded-lg text-gray-400 hover:text-navy-800 hover:bg-navy-50 cursor-pointer active:scale-95 transition-transform"
                      title="Nur diese Liga-Zeile umbenennen"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTeamId(l.teamId)}
                      aria-label={`${entry.clubName} aus ${l.leagueName} entfernen`}
                      className="p-3.5 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer active:scale-95 transition-transform"
                      title="Team aus dieser Liga entfernen (Spiele bleiben, Gegner-Verweis wird geleert)"
                    >
                      <TrashBin size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spiel-Historie */}
          <div>
            <p className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1.5">
              Spiele gegen uns ({history.length})
            </p>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">Noch nie gespielt.</p>
            ) : (
              <div className="bg-white border border-cream-200 rounded-xl overflow-hidden">
                {history.map(g => {
                  const result = gameResult(g)
                  return (
                    <div key={g.gameId} className="flex items-center gap-2 px-3 py-2.5 border-b border-cream-100 last:border-b-0">
                      {result ? (
                        <span className={`font-display w-5 h-5 shrink-0 inline-flex items-center justify-center rounded-md text-[10px] font-extrabold ${
                          result === 'W' ? 'bg-navy-800 text-white' : result === 'L' ? 'bg-softball-red-600 text-white' : 'bg-gray-300 text-navy-900'
                        }`}>
                          {result}
                        </span>
                      ) : (
                        <span className="w-5 h-5 shrink-0 inline-flex items-center justify-center text-gray-300 text-xs">·</span>
                      )}
                      <span className="text-xs text-gray-500 tabular-nums shrink-0">{formatDate(g.date)}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide truncate flex-1">{g.leagueName} · Spiel {g.gameNumber}</span>
                      {g.scoreUs != null && g.scoreThem != null ? (
                        <span className="font-display text-sm font-bold tabular-nums text-navy-900 shrink-0">
                          {g.scoreUs}:{g.scoreThem}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 shrink-0">offen</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </ResponsiveSheet>

      {/* Club-Umbenennung */}
      {showRename && (
        <ResponsiveSheet
          open
          onClose={() => { if (!renameRunning) setShowRename(false) }}
          title="Club umbenennen"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRename(false)}
                disabled={renameRunning}
                className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer disabled:opacity-50"
              >
                Abbrechen
              </button>
              <Button
                variant="primary"
                onClick={handleRename}
                disabled={!renameValue.trim() || renameRunning}
                className="font-display text-xs font-extrabold tracking-widest uppercase hover:bg-softball-red-700"
              >
                {renameRunning ? 'Umbenennen…' : 'Umbenennen'}
              </Button>
            </div>
          }
        >
          <div className="p-5 space-y-3">
            <p className="text-sm text-gray-600">
              Benennt den Club in <strong className="text-navy-900">allen {entry.leagues.length} Ligen</strong> um —
              Statistik und Verlauf bleiben erhalten, nur der Name ändert sich.
            </p>
            <input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              autoFocus
            />
            {renameMergeTarget && (
              <p className="text-xs text-softball-red-700 bg-softball-red-50 border border-softball-red-100 rounded-lg px-3 py-2">
                Ein Club namens '{renameMergeTarget}' existiert bereits — durch das Umbenennen
                verschmelzen beide Clubs zu einem (Bilanz und Ligen werden zusammengeführt).
              </p>
            )}
          </div>
        </ResponsiveSheet>
      )}

      {/* Liga-Zeile umbenennen */}
      {renameLeagueOcc && (
        <ResponsiveSheet
          open
          onClose={() => { if (!renameRunning) setRenameLeagueOcc(null) }}
          title={`Nur ${renameLeagueOcc.leagueName} umbenennen`}
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameLeagueOcc(null)}
                disabled={renameRunning}
                className="font-display px-4 py-2 text-xs font-bold tracking-widest uppercase text-gray-600 rounded-lg hover:bg-cream-200 cursor-pointer disabled:opacity-50"
              >
                Abbrechen
              </button>
              <Button
                variant="navy"
                onClick={handleRenameLeagueRow}
                disabled={!renameLeagueValue.trim() || renameRunning}
                className="font-display text-xs font-extrabold tracking-widest uppercase"
              >
                {renameRunning ? 'Umbenennen…' : 'Umbenennen'}
              </Button>
            </div>
          }
        >
          <div className="p-5 space-y-3">
            <p className="text-sm text-gray-600">
              Ändert <strong className="text-navy-900">nur diese eine Liga-Zeile</strong> von
              '{entry.clubName}'. Wenn der neue Name abweicht, teilt sich der Club im Verzeichnis
              auf — für eine Club-weite Umbenennung oben "Umbenennen" nutzen.
            </p>
            <input
              value={renameLeagueValue}
              onChange={e => setRenameLeagueValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameLeagueRow()}
              className="w-full border border-cream-300 rounded-lg px-3 py-2.5 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
              autoFocus
            />
          </div>
        </ResponsiveSheet>
      )}

      {/* Liga-Zeile löschen */}
      {deleteTeamId != null && (
        <ConfirmModal
          title="Team aus Liga entfernen"
          message={`${entry.clubName} aus dieser Liga entfernen? Die gespielten Spiele bleiben erhalten, nur der Gegner-Verweis wird geleert.`}
          onConfirm={handleDeleteLeagueRow}
          onCancel={() => setDeleteTeamId(null)}
        />
      )}
    </>
  )
}

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

      const seasonById = new Map(seasons.map(s => [s.id, s]))
      const byClub = new Map<string, ClubGame[]>()
      for (const gd of gds) {
        const leagueName = seasonById.get(gd.seasonId)?.name ?? '—'
        for (const g of gd.games ?? []) {
          const club = g.opponentTeam?.name?.trim()
          if (!club) continue
          if (!byClub.has(club)) byClub.set(club, [])
          byClub.get(club)!.push({
            gameId: g.id,
            date: gd.date,
            gameNumber: g.gameNumber,
            leagueName,
            scoreUs: g.scoreUs,
            scoreThem: g.scoreThem,
          })
        }
      }
      for (const games of byClub.values()) games.sort((a, b) => b.date.localeCompare(a.date) || a.gameNumber - b.gameNumber)
      setHistoryByClub(byClub)
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
      <div className="max-w-md md:max-w-3xl xl:max-w-5xl mx-auto p-4 space-y-4">
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
