import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '@/api/client'
import type { GameDayResponse, Season, TeamDirectoryEntry, TeamLeagueOccurrence } from '@/types'
import { Pencil, TrashBin, ArrowsSwap } from '@/icons'
import { Button, ResponsiveSheet, ConfirmModal } from '@/components/shared'
import { useRolle } from '@/hooks/useRolle'
import { useToastContext } from '@/components/layout/Layout'

/** Ein Spiel gegen einen Club — client-seitig aus den Spieltagen abgeleitet. */
export interface ClubGame {
  gameId: number
  date: string
  gameNumber: number
  leagueName: string
  scoreUs: number | null
  scoreThem: number | null
}

/** 'W' | 'L' | 'T' | null (offen) für ein Spiel. */
export function gameResult(g: ClubGame): 'W' | 'L' | 'T' | null {
  if (g.scoreUs == null || g.scoreThem == null) return null
  if (g.scoreUs > g.scoreThem) return 'W'
  if (g.scoreUs < g.scoreThem) return 'L'
  return 'T'
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function winRate(entry: TeamDirectoryEntry): number | null {
  const decided = entry.wins + entry.losses + entry.ties
  return decided === 0 ? null : Math.round((entry.wins / decided) * 100)
}

/** Spiel-Historie pro Club aus allen Spieltagen ableiten (Liga-Name über die Saison). */
export function buildHistoryByClub(gameDays: GameDayResponse[], seasons: Season[]): Map<string, ClubGame[]> {
  const seasonById = new Map(seasons.map(s => [s.id, s]))
  const byClub = new Map<string, ClubGame[]>()
  for (const gd of gameDays) {
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
  return byClub
}

/** Directory-Eintrag für einen Club, der (noch) nicht im Verzeichnis liegt —
 *  Bilanz wird aus der Spiel-Historie synthetisiert. */
export function syntheticEntry(club: string, history: ClubGame[]): TeamDirectoryEntry {
  let wins = 0
  let losses = 0
  let ties = 0
  let runsFor = 0
  let runsAgainst = 0
  for (const g of history) {
    if (g.scoreUs != null) runsFor += g.scoreUs
    if (g.scoreThem != null) runsAgainst += g.scoreThem
    if (g.scoreUs == null || g.scoreThem == null) continue
    if (g.scoreUs > g.scoreThem) wins++
    else if (g.scoreUs < g.scoreThem) losses++
    else ties++
  }
  return { clubName: club, leagues: [], games: history.length, wins, losses, ties, runsFor, runsAgainst, battingAverage: null }
}

/** Bilanz-Balken (navy = Siege, rot = Niederlagen) — dieselbe Balkensprache wie die Stats-Tabelle. */
export function WinBar({ entry, className = '' }: { entry: TeamDirectoryEntry; className?: string }) {
  const decided = entry.wins + entry.losses + entry.ties
  if (decided === 0) return <div className={`h-1.5 rounded-full bg-cream-200 ${className}`} />
  const winsPct = (entry.wins / decided) * 100
  const lossesPct = (entry.losses / decided) * 100
  return (
    <div className={`h-1.5 rounded-full bg-bar-track overflow-hidden flex ${className}`}>
      <div className="h-full bg-bar" style={{ width: `${winsPct}%` }} />
      <div className="h-full bg-softball-red-600" style={{ width: `${lossesPct}%` }} />
    </div>
  )
}

/** Form-Pills der letzten 5 Spiele (alt → neu, wie Formtabellen im Fußball). */
export function FormPills({ history }: { history: ClubGame[] }) {
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
export function WinRateNumber({ entry, dark = false }: { entry: TeamDirectoryEntry; dark?: boolean }) {
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
export function ClubTile({ entry, history, rank, onOpen }: {
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

/** Detail-Sheet pro Club: Umbenennen, Stats-Link, Liga-Zeilen (Edit/Delete), Spiel-Historie.
 *  `loading`: Sheet-Frame bleibt, Inhalt ist Skeleton — verhindert Remount/Neu-Animation
 *  beim Übergang Laden → Inhalt (z.B. OpponentSheet im Spieltag). */
export function ClubSheet({ entry, history, allClubNames, loading = false, onClose, onChanged }: {
  entry: TeamDirectoryEntry
  history: ClubGame[]
  allClubNames: string[]
  loading?: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToastContext()
  const navigate = useNavigate()
  const { istAdmin } = useRolle()
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
        footer={loading ? undefined : (
          <div className="flex flex-wrap justify-end gap-2">
            {istAdmin && <button
              onClick={() => { setRenameValue(entry.clubName); setShowRename(true) }}
              className="font-display px-3.5 py-2 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-gray-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Pencil size={12} /> Umbenennen
            </button>}
            <button
              onClick={() => navigate(`/stats?scope=opponent&opponent=${encodeURIComponent(entry.clubName)}`)}
              className="font-display px-3.5 py-2 text-[11px] font-bold tracking-widest uppercase rounded-full border border-cream-300 text-navy-700 hover:bg-cream-100 hover:border-navy-400 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-transform"
              title="Schlag-Statistik gegen diesen Gegner"
            >
              <ArrowsSwap size={12} /> Stats gegen sie
            </button>
          </div>
        )}
      >
        {loading ? (
          <div className="p-5 space-y-3">
            <div className="bg-cream-50 border border-cream-200 rounded-2xl p-4 space-y-3">
              <div className="h-4 w-1/3 rounded bg-cream-200 animate-pulse" />
              <div className="h-1.5 w-full rounded bg-cream-200 animate-pulse" />
            </div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 rounded-xl bg-cream-100 animate-pulse" />
            ))}
          </div>
        ) : (
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
                  {istAdmin && <div className="actions-reveal flex gap-1 shrink-0">
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
                  </div>}
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
        )}
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
