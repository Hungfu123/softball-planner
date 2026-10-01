import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import * as api from '@/api/client'
import type { GameDayResponse, TeamDirectoryEntry } from '@/types'
import { Pencil, TrashBin, CrossBones, ArrowsSwap } from '@/icons'
import { ConfirmModal, Button } from '@/components/shared'
import { ResponsiveSheet } from '@/components/shared'
import { useToastContext } from '@/components/layout/Layout'

/** Ein Spiel gegen einen Club — client-seitig aus den Spieltagen abgeleitet. */
interface ClubGame {
  gameId: number
  date: string
  gameNumber: number
  leagueName: string
  scoreUs: number | null
  scoreThem: number | null
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Bilanz "W–L–T" — Navy für positive, Softball-Red für negative Differenz. */
function Record({ entry }: { entry: TeamDirectoryEntry }) {
  const diff = entry.runsFor - entry.runsAgainst
  const decided = entry.wins + entry.losses + entry.ties
  if (decided === 0) {
    return <span className="font-display text-sm tabular-nums text-gray-400">—</span>
  }
  return (
    <span className="font-display text-sm font-bold tabular-nums whitespace-nowrap">
      <span className="text-navy-900">{entry.wins}</span>
      <span className="text-gray-400">–</span>
      <span className="text-softball-red-700">{entry.losses}</span>
      {entry.ties > 0 && (
        <>
          <span className="text-gray-400">–</span>
          <span className="text-gray-500">{entry.ties}</span>
        </>
      )}
      <span className={`ml-1.5 text-xs ${diff >= 0 ? 'text-navy-500' : 'text-softball-red-600'}`}>
        ({diff >= 0 ? '+' : ''}{diff})
      </span>
    </span>
  )
}

function ClubCard({ entry, history, allClubNames, onRenamed, onLeagueDeleted }: {
  entry: TeamDirectoryEntry
  history: ClubGame[]
  allClubNames: string[]
  onRenamed: () => void
  onLeagueDeleted: () => void
}) {
  const toast = useToastContext()
  const [expanded, setExpanded] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameRunning, setRenameRunning] = useState(false)
  const [renameLeagueOcc, setRenameLeagueOcc] = useState<{ teamId: number; leagueLabel: string } | null>(null)
  const [renameLeagueValue, setRenameLeagueValue] = useState('')
  const [deleteTeamId, setDeleteTeamId] = useState<number | null>(null)
  const deleteRunningRef = useRef(false)
  const navigate = useNavigate()

  // Umbenennen auf einen existierenden Club-Namen = beide Clubs verschmelzen (gewolltes Feature für Tippfehler, aber der Nutzer soll es wissen)
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
      setShowRename(false)
      onRenamed()
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
      onLeagueDeleted()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      deleteRunningRef.current = false
    }
  }

  const handleRenameLeagueRow = async () => {
    if (!renameLeagueOcc) return
    const newName = renameLeagueValue.trim()
    if (!newName || newName === entry.clubName) { setRenameLeagueOcc(null); return }
    setRenameRunning(true)
    try {
      await api.updateLeagueTeam(renameLeagueOcc.teamId, newName)
      toast.show('Liga-Zeile umbenannt — Hinweis: nur diese Liga, der Club kann sich im Verzeichnis dadurch aufteilen')
      setRenameLeagueOcc(null)
      onRenamed()
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    } finally {
      setRenameRunning(false)
    }
  }

  return (
    <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden">
      {/* Kopfzeile — immer da, große Touch-Fläche */}
      <button
        onClick={() => setExpanded(x => !x)}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3.5 cursor-pointer hover:bg-cream-50 active:scale-[0.99] transition-transform flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-display font-bold text-navy-900 text-base sm:text-base truncate">{entry.clubName}</span>
          <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform duration-200 ease-out ${expanded ? 'rotate-180' : ''}`} />
        </div>
        {/* Mobile: Chips unter dem Namen, Desktop: rechts in der Zeile */}
        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
          {entry.leagues.slice(0, 3).map(l => (
            <span key={l.teamId} className="font-display text-[10px] font-bold tracking-widest uppercase text-navy-600 bg-cream-100 border border-cream-200 rounded-full px-2 py-0.5">
              {l.leagueName.replace(' Series', '').replace(' Liga', '')}
            </span>
          ))}
          {entry.leagues.length > 3 && (
            <span className="font-display text-[10px] font-bold text-gray-400">+{entry.leagues.length - 3}</span>
          )}
          <Record entry={entry} />
        </div>
      </button>

      {/* Expand — Ligen + Spiel-Historie */}
      {expanded && (
        <div className="border-t border-cream-200 px-4 py-3 space-y-4 bg-cream-50/50">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setRenameValue(entry.clubName); setShowRename(true) }}
              className="font-display px-3.5 py-2 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-gray-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Pencil size={12} /> Club umbenennen
            </button>
            <button
              onClick={() => navigate(`/stats?scope=opponent&opponent=${encodeURIComponent(entry.clubName)}`)}
              className="font-display px-3.5 py-2 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-navy-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-transform"
              title="Schlag-Statistik gegen diesen Gegner"
            >
              <ArrowsSwap size={12} /> Stats gegen sie
            </button>
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
                      onClick={() => { setRenameLeagueOcc({ teamId: l.teamId, leagueLabel: l.leagueName }); setRenameLeagueValue(entry.clubName) }}
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
                  const hasScore = g.scoreUs != null && g.scoreThem != null
                  const won = hasScore && g.scoreUs! > g.scoreThem!
                  const lost = hasScore && g.scoreUs! < g.scoreThem!
                  return (
                    <div key={g.gameId} className="flex items-center gap-2 px-3 py-2.5 border-b border-cream-100 last:border-b-0">
                      <span className="text-xs text-gray-500 tabular-nums shrink-0">{formatDate(g.date)}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide truncate flex-1">{g.leagueName} · Spiel {g.gameNumber}</span>
                      {hasScore ? (
                        <span className={`font-display text-sm font-bold tabular-nums shrink-0 ${won ? 'text-navy-900' : lost ? 'text-softball-red-700' : 'text-gray-500'}`}>
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
      )}

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
          title={`Nur ${renameLeagueOcc.leagueLabel} umbenennen`}
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
              auf — für eine Club-weite Umbenennung oben "Club umbenennen" nutzen.
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
    </div>
  )
}

export function TeamDirectoryPage() {
  const toast = useToastContext()
  const [directory, setDirectory] = useState<TeamDirectoryEntry[]>([])
  const [historyByClub, setHistoryByClub] = useState<Map<string, ClubGame[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [dir, gameDays, seasons] = await Promise.all([
        api.getTeamDirectory(),
        api.getAllGameDays(),
        api.getSeasons(),
      ])
      setDirectory(dir)

      // Spiel-Historie je Club client-seitig ableiten (gleiche Datenquelle wie die Stats-Seite)
      const seasonById = new Map(seasons.map(s => [s.id, s]))
      const byClub = new Map<string, ClubGame[]>()
      for (const gd of gameDays as GameDayResponse[]) {
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
      // Neueste zuerst
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

  const filtered = useMemo(() => {
    if (!search.trim()) return directory
    const q = search.toLowerCase()
    return directory.filter(d => d.clubName.toLowerCase().includes(q))
  }, [directory, search])

  return (
    <div className="min-h-screen">
      <div className="max-w-md md:max-w-2xl lg:max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-wide uppercase">
          Teams
          {directory.length > 0 && <span className="text-navy-500 font-bold text-xl"> ({directory.length})</span>}
        </h1>

        {directory.length > 6 && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="w-full border border-cream-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
          />
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white border border-cream-300 rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-cream-50 border border-cream-300 rounded-2xl p-10 text-center text-gray-500">
            <CrossBones size={40} className="mx-auto mb-3 text-gray-300" />
            {search.trim() ? 'Keine Treffer.' : 'Noch keine Gegner-Teams angelegt.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(entry => (
              <ClubCard
                key={entry.clubName}
                entry={entry}
                history={historyByClub.get(entry.clubName) ?? []}
                allClubNames={directory.map(d => d.clubName)}
                onRenamed={load}
                onLeagueDeleted={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
