import { useState, useEffect, useRef } from 'react'
import type { StandingEntry, GameDayResponse, GameResponse, LeagueTeamResponse, LeagueResultResponse } from '@/types'
import { Pencil, TrashBin, XMark } from '@/icons'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { CollapsibleSection } from '@/components/shared/CollapsibleSection'
import { TeamCombobox } from '@/components/shared'
import * as api from '@/api/client'

interface Props {
  seasonId: number
  gameDays: GameDayResponse[]
  onGameDaysChanged: () => void
}

export function Standings({ seasonId, gameDays, onGameDaysChanged }: Props) {
  const [standings, setStandings] = useState<StandingEntry[]>([])
  const [teams, setTeams] = useState<LeagueTeamResponse[]>([])
  const [leagueResults, setLeagueResults] = useState<LeagueResultResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTeam, setDeleteTeam] = useState<{ id: number; name: string } | null>(null)
  const [editingTeam, setEditingTeam] = useState<{ id: number; name: string } | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)

  const reloadAll = () => {
    Promise.all([
      api.getStandings(seasonId).catch(() => []),
      api.getLeagueTeams(seasonId).catch(() => []),
      api.getLeagueResults(seasonId).catch(() => []),
    ]).then(([st, tm, lr]) => {
      setStandings(st)
      setTeams(tm)
      setLeagueResults(lr)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    reloadAll()
  }, [seasonId])

  const confirmDelete = async () => {
    if (!deleteTeam) return
    await api.deleteLeagueTeam(deleteTeam.id)
    setDeleteTeam(null)
    reloadAll()
    onGameDaysChanged()
  }

  const handleCreateTeam = async () => {
    if (creating || !newTeamName.trim()) return
    setCreating(true)
    try {
      await api.createLeagueTeam(seasonId, newTeamName.trim())
      setNewTeamName('')
      reloadAll()
    } finally {
      setCreating(false)
    }
  }

  const handleRenameTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) return
    try {
      await api.updateLeagueTeam(editingTeam.id, editingTeam.name.trim())
      setEditingTeam(null)
      reloadAll()
      onGameDaysChanged()
    } catch {
      // revert on error
    }
  }

  if (loading) return null

  const gamesWithOpponent = gameDays.flatMap(gd => gd.games.filter(g => g.opponentTeam))
  const nonOwnTeams = teams.filter(t => !t.ownTeam)
  const totalResults = gamesWithOpponent.length + leagueResults.length

  return (
    <section className="space-y-6">
      {/* Standings Table */}
      <div>
        <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 mb-3 inline-flex items-center gap-2">
          <span className="w-1 h-5 bg-softball-red-600 rounded-full" />
          Liga-Tabelle
        </h2>
        {standings.length > 0 && (
          <div className="bg-cream-50 border border-cream-300 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-900 text-white">
                    <th className="font-display text-left px-4 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-8">#</th>
                    <th className="font-display text-left px-4 py-2.5 font-extrabold text-[10px] uppercase tracking-widest">Team</th>
                    <th className="font-display text-center px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-12" title="Spiele">Sp</th>
                    <th className="font-display text-center px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-12" title="Siege">S</th>
                    <th className="font-display text-center px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-12" title="Niederlagen">N</th>
                    <th className="font-display hidden sm:table-cell text-center px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-12" title="Unentschieden">U</th>
                    <th className="font-display text-center px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-16" title="Siegquote">Win%</th>
                    <th className="font-display hidden sm:table-cell text-center px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-14" title="Runs Scored (erzielte Punkte)">RS</th>
                    <th className="font-display hidden sm:table-cell text-center px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-14" title="Runs Against (kassierte Punkte)">RA</th>
                    <th className="font-display hidden sm:table-cell text-center px-3 py-2.5 font-extrabold text-[10px] uppercase tracking-widest w-14" title="Run Differential (Differenz)">+/-</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr
                      key={s.team.id}
                      className={`border-b border-cream-200 last:border-0 transition-colors ${
                        s.team.ownTeam ? 'bg-navy-50 border-l-2 border-l-navy-600' : 'hover:bg-cream-100'
                      }`}
                    >
                      <td className={`font-display px-4 py-2 text-left tabular-nums font-extrabold ${s.team.ownTeam ? 'text-navy-900' : 'text-gray-400'}`}>{i + 1}</td>
                      <td className="px-4 py-2 font-display font-bold text-navy-900 whitespace-nowrap tracking-wide">
                        {!s.team.ownTeam && editingTeam?.id === s.team.id ? (
                          <input
                            autoFocus
                            value={editingTeam.name}
                            onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameTeam()
                              if (e.key === 'Escape') setEditingTeam(null)
                            }}
                            onBlur={handleRenameTeam}
                            className="font-display border border-navy-300 rounded px-2 py-0.5 text-sm outline-none focus:border-navy-600 w-full"
                          />
                        ) : (
                          <span
                            onClick={!s.team.ownTeam ? () => setEditingTeam({ id: s.team.id, name: s.team.name }) : undefined}
                            className={!s.team.ownTeam ? 'group/name inline-flex items-center gap-1.5 cursor-pointer hover:text-navy-700' : ''}
                            title={!s.team.ownTeam ? 'Klicken zum Umbenennen' : undefined}
                          >
                            {s.team.name}
                            {!s.team.ownTeam && <Pencil size={13} className="opacity-60 sm:opacity-0 sm:group-hover/name:opacity-60 transition-opacity text-navy-600" />}
                          </span>
                        )}
                      </td>
                      <td className="font-display text-center px-3 py-2 tabular-nums text-gray-700">{s.games}</td>
                      <td className="font-display text-center px-3 py-2 tabular-nums font-bold text-emerald-700">{s.wins}</td>
                      <td className="font-display text-center px-3 py-2 tabular-nums font-bold text-softball-red-600">{s.losses}</td>
                      <td className="font-display hidden sm:table-cell text-center px-3 py-2 tabular-nums text-gray-500">{s.ties}</td>
                      <td className="font-display text-center px-3 py-2 tabular-nums font-extrabold text-navy-900">
                        {s.games > 0 ? (s.winPct * 100).toFixed(0) + '%' : '—'}
                      </td>
                      <td className="font-display hidden sm:table-cell text-center px-3 py-2 tabular-nums text-gray-700">{s.runsScored}</td>
                      <td className="font-display hidden sm:table-cell text-center px-3 py-2 tabular-nums text-gray-700">{s.runsAgainst}</td>
                      <td className={`font-display hidden sm:table-cell text-center px-3 py-2 tabular-nums font-bold ${
                        s.runDiff > 0 ? 'text-emerald-700' : s.runDiff < 0 ? 'text-softball-red-600' : 'text-gray-500'
                      }`}>
                        {s.runDiff > 0 ? '+' : ''}{s.runDiff}
                      </td>
                      <td className="px-1 py-2">
                        {!s.team.ownTeam && (
                          <button
                            onClick={() => setDeleteTeam({ id: s.team.id, name: s.team.name })}
                            className="p-1 text-gray-300 hover:text-softball-red-500 hover:bg-softball-red-50 rounded transition-colors cursor-pointer"
                            title="Team löschen"
                            aria-label="Team löschen"
                          >
                            <TrashBin size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add team inline */}
        <div className="mt-3 flex items-center gap-2">
          <input
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateTeam() }}
            placeholder="Neues Team..."
            className="border border-cream-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-100 w-48"
          />
          <button
            onClick={handleCreateTeam}
            disabled={creating || !newTeamName.trim()}
            className="px-3 py-2 text-sm font-medium text-navy-700 border border-cream-300 hover:bg-navy-800 hover:text-white hover:border-navy-800 rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
          >
            + Hinzufügen
          </button>
        </div>
      </div>

      {/* All Results */}
      <CollapsibleSection title="Ergebnisse" count={totalResults} defaultOpen>
        <div className="space-y-4">
          {/* Our games */}
          {gamesWithOpponent.length > 0 && (
            <div className="bg-cream-50 border border-cream-300 rounded-xl divide-y divide-cream-200">
              {gameDays.filter(gd => gd.games.some(g => g.opponentTeam)).map(gd => (
                <div key={gd.id} className="px-4 py-3">
                  <div className="font-display text-[10px] font-extrabold tracking-widest uppercase text-gray-500 mb-2">
                    {gd.label || 'Spieltag'} — {formatDate(gd.date)}
                  </div>
                  <div className="space-y-1.5">
                    {gd.games.filter(g => g.opponentTeam).map(game => (
                      <OurGameRow
                        key={game.id}
                        game={game}
                        onChanged={() => { reloadAll(); onGameDaysChanged() }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* League results (other teams) */}
          {leagueResults.length > 0 && (
            <div className="bg-cream-50 border border-cream-300 rounded-xl px-4 py-3">
              <div className="font-display text-[10px] font-extrabold tracking-widest uppercase text-gray-500 mb-2">
                Andere Ergebnisse
              </div>
              <div className="space-y-1.5">
                {leagueResults.map(r => (
                  <div key={r.id} className="flex items-center gap-2.5 text-sm">
                    <span className="font-display font-bold text-navy-900 tracking-wide">{r.homeTeam.name}</span>
                    <span className="font-display font-extrabold tabular-nums text-gray-700">
                      {r.homeScore}:{r.awayScore}
                    </span>
                    <span className="font-display font-bold text-navy-900 tracking-wide">{r.awayTeam.name}</span>
                    <button
                      onClick={async () => { await api.deleteLeagueResult(r.id); reloadAll() }}
                      className="p-1 text-gray-300 hover:text-softball-red-500 hover:bg-softball-red-50 rounded transition-colors cursor-pointer ml-auto"
                      title="Löschen"
                      aria-label="Ergebnis löschen"
                    >
                      <XMark size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add league result */}
          {nonOwnTeams.length >= 2 && (
            <AddLeagueResult
              seasonId={seasonId}
              teams={nonOwnTeams}
              onAdded={reloadAll}
            />
          )}
        </div>
      </CollapsibleSection>

      {deleteTeam && (
        <ConfirmModal
          title="Team löschen"
          message={`Team "${deleteTeam.name}" wirklich löschen? Alle Spielzuordnungen zu diesem Team werden entfernt.`}
          confirmLabel="Löschen"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTeam(null)}
        />
      )}
    </section>
  )
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function OurGameRow({ game, onChanged }: { game: GameResponse; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [us, setUs] = useState(game.scoreUs?.toString() ?? '')
  const [them, setThem] = useState(game.scoreThem?.toString() ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select() }
  }, [editing])

  useEffect(() => {
    setUs(game.scoreUs?.toString() ?? '')
    setThem(game.scoreThem?.toString() ?? '')
  }, [game.scoreUs, game.scoreThem])

  const handleSave = async () => {
    const usNum = us.trim() === '' ? null : parseInt(us)
    const themNum = them.trim() === '' ? null : parseInt(them)
    if ((usNum != null && isNaN(usNum)) || (themNum != null && isNaN(themNum))) return
    if ((usNum == null) !== (themNum == null)) return
    await api.updateScore(game.id, usNum, themNum)
    setEditing(false)
    onChanged()
  }

  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="font-display text-[10px] tracking-widest uppercase font-bold text-gray-400 w-16 shrink-0">Spiel {game.gameNumber}</span>
      <span className="font-display font-bold text-navy-900 tracking-wide">vs {game.opponentTeam!.name}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input ref={inputRef} type="number" min="0" value={us} onChange={e => setUs(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="font-display w-12 border border-cream-300 rounded px-1.5 py-1 text-center tabular-nums text-sm outline-none focus:border-navy-600" />
          <span className="text-gray-400">:</span>
          <input type="number" min="0" value={them} onChange={e => setThem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="font-display w-12 border border-cream-300 rounded px-1.5 py-1 text-center tabular-nums text-sm outline-none focus:border-navy-600" />
          <button onClick={handleSave} className="font-display text-[10px] tracking-widest uppercase text-navy-700 hover:text-navy-900 font-bold cursor-pointer ml-1">OK</button>
          {game.scoreUs != null && (
            <button onClick={async () => { await api.updateScore(game.id, null, null); setUs(''); setThem(''); setEditing(false); onChanged() }}
              className="font-display text-[10px] tracking-widest uppercase text-gray-400 hover:text-softball-red-500 cursor-pointer">Löschen</button>
          )}
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          className={`font-display tabular-nums font-extrabold cursor-pointer px-2 py-0.5 rounded hover:bg-cream-200 ${
            game.scoreUs != null
              ? game.scoreUs > game.scoreThem! ? 'text-emerald-700' : game.scoreUs < game.scoreThem! ? 'text-softball-red-600' : 'text-gray-500'
              : 'text-gray-300'
          }`}>
          {game.scoreUs != null ? `${game.scoreUs}:${game.scoreThem}` : '—:—'}
        </button>
      )}
    </div>
  )
}

function AddLeagueResult({ seasonId, teams, onAdded }: {
  seasonId: number
  teams: LeagueTeamResponse[]
  onAdded: () => void
}) {
  const [homeTeam, setHomeTeam] = useState<LeagueTeamResponse | null>(null)
  const [awayTeam, setAwayTeam] = useState<LeagueTeamResponse | null>(null)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = homeTeam && awayTeam && homeTeam.id !== awayTeam.id && homeScore !== '' && awayScore !== ''

  const handleAdd = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await api.createLeagueResult(seasonId, {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
      })
      setHomeTeam(null)
      setAwayTeam(null)
      setHomeScore('')
      setAwayScore('')
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      <TeamCombobox
        teams={teams}
        selected={homeTeam}
        placeholder="Team A"
        seasonId={seasonId}
        autoFlip
        onSelect={setHomeTeam}
        onTeamCreated={() => onAdded()}
      />
      <input type="number" min="0" value={homeScore} onChange={e => setHomeScore(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        placeholder="—" className="font-display w-12 border border-cream-300 rounded px-1.5 py-1.5 text-center tabular-nums text-sm outline-none focus:border-navy-600" />
      <span className="text-gray-400 font-bold">:</span>
      <input type="number" min="0" value={awayScore} onChange={e => setAwayScore(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        placeholder="—" className="font-display w-12 border border-cream-300 rounded px-1.5 py-1.5 text-center tabular-nums text-sm outline-none focus:border-navy-600" />
      <TeamCombobox
        teams={teams}
        selected={awayTeam}
        placeholder="Team B"
        seasonId={seasonId}
        autoFlip
        onSelect={setAwayTeam}
        onTeamCreated={() => onAdded()}
      />
      <button onClick={handleAdd} disabled={!canSave || saving}
        className="px-3 py-1.5 text-sm font-medium text-navy-700 border border-cream-300 hover:bg-navy-800 hover:text-white hover:border-navy-800 rounded-lg disabled:opacity-30 cursor-pointer transition-colors">
        + Eintragen
      </button>
    </div>
  )
}

