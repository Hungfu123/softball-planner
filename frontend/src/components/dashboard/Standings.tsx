import { useState, useEffect, useRef } from 'react'
import type { StandingEntry, GameDayResponse, GameResponse, LeagueTeamResponse, LeagueResultResponse } from '@/types'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { CollapsibleSection } from '@/components/shared/CollapsibleSection'
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

  if (loading) return null

  const gamesWithOpponent = gameDays.flatMap(gd => gd.games.filter(g => g.opponentTeam))
  const nonOwnTeams = teams.filter(t => !t.ownTeam)
  const totalResults = gamesWithOpponent.length + leagueResults.length

  return (
    <section className="space-y-6">
      {/* Standings Table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-950 mb-4">Liga-Tabelle</h2>
        {standings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-8">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Team</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-12" title="Spiele">Sp</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-12" title="Siege">S</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-12" title="Niederlagen">N</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-12" title="Unentschieden">U</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-16" title="Siegquote">Win%</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-14" title="Runs Scored (erzielte Punkte)">RS</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-14" title="Runs Against (kassierte Punkte)">RA</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-600 w-14" title="Run Differential (Differenz)">+/-</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr
                      key={s.team.id}
                      className={`border-b border-gray-100 last:border-0 ${
                        s.team.ownTeam ? 'bg-navy-50/50 font-medium' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-900">
                        {s.team.name}
                      </td>
                      <td className="text-center px-3 py-2.5 font-mono">{s.games}</td>
                      <td className="text-center px-3 py-2.5 font-mono text-green-700">{s.wins}</td>
                      <td className="text-center px-3 py-2.5 font-mono text-red-600">{s.losses}</td>
                      <td className="text-center px-3 py-2.5 font-mono text-gray-500">{s.ties}</td>
                      <td className="text-center px-3 py-2.5 font-mono font-semibold">
                        {s.games > 0 ? (s.winPct * 100).toFixed(0) + '%' : '—'}
                      </td>
                      <td className="text-center px-3 py-2.5 font-mono">{s.runsScored}</td>
                      <td className="text-center px-3 py-2.5 font-mono">{s.runsAgainst}</td>
                      <td className={`text-center px-3 py-2.5 font-mono font-semibold ${
                        s.runDiff > 0 ? 'text-green-700' : s.runDiff < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {s.runDiff > 0 ? '+' : ''}{s.runDiff}
                      </td>
                      <td className="px-1 py-2.5">
                        {!s.team.ownTeam && (
                          <button
                            onClick={() => setDeleteTeam({ id: s.team.id, name: s.team.name })}
                            className="p-1 text-gray-200 hover:text-red-500 transition-colors cursor-pointer"
                            title="Team löschen"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
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
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-100 w-48"
          />
          <button
            onClick={handleCreateTeam}
            disabled={creating || !newTeamName.trim()}
            className="px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 rounded-lg disabled:opacity-40 cursor-pointer"
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
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {gameDays.filter(gd => gd.games.some(g => g.opponentTeam)).map(gd => (
                <div key={gd.id} className="px-4 py-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
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
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Andere Ergebnisse
              </div>
              <div className="space-y-1.5">
                {leagueResults.map(r => (
                  <div key={r.id} className="flex items-center gap-2.5 text-sm">
                    <span className="text-gray-700">{r.homeTeam.name}</span>
                    <span className="font-mono font-semibold text-gray-500">
                      {r.homeScore}:{r.awayScore}
                    </span>
                    <span className="text-gray-700">{r.awayTeam.name}</span>
                    <button
                      onClick={async () => { await api.deleteLeagueResult(r.id); reloadAll() }}
                      className="p-0.5 text-gray-200 hover:text-red-500 transition-colors cursor-pointer ml-auto"
                      title="Löschen"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
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
      <span className="text-gray-400 w-14 shrink-0">Spiel {game.gameNumber}</span>
      <span className="text-gray-700">vs {game.opponentTeam!.name}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input ref={inputRef} type="number" min="0" value={us} onChange={e => setUs(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="w-12 border border-gray-200 rounded px-1.5 py-1 text-center font-mono text-sm outline-none focus:border-navy-600" />
          <span className="text-gray-400">:</span>
          <input type="number" min="0" value={them} onChange={e => setThem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="w-12 border border-gray-200 rounded px-1.5 py-1 text-center font-mono text-sm outline-none focus:border-navy-600" />
          <button onClick={handleSave} className="text-xs text-navy-700 hover:text-navy-900 font-medium cursor-pointer ml-1">OK</button>
          {game.scoreUs != null && (
            <button onClick={async () => { await api.updateScore(game.id, null, null); setUs(''); setThem(''); setEditing(false); onChanged() }}
              className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">Löschen</button>
          )}
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          className={`font-mono cursor-pointer px-2 py-0.5 rounded hover:bg-gray-100 ${
            game.scoreUs != null
              ? game.scoreUs > game.scoreThem! ? 'text-green-700 font-semibold' : game.scoreUs < game.scoreThem! ? 'text-red-600 font-semibold' : 'text-gray-500'
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
        onSelect={setHomeTeam}
        onCreated={onAdded}
      />
      <input type="number" min="0" value={homeScore} onChange={e => setHomeScore(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        placeholder="—" className="w-12 border border-gray-200 rounded px-1.5 py-1.5 text-center font-mono text-sm outline-none focus:border-navy-600" />
      <span className="text-gray-400 font-bold">:</span>
      <input type="number" min="0" value={awayScore} onChange={e => setAwayScore(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
        placeholder="—" className="w-12 border border-gray-200 rounded px-1.5 py-1.5 text-center font-mono text-sm outline-none focus:border-navy-600" />
      <TeamCombobox
        teams={teams}
        selected={awayTeam}
        placeholder="Team B"
        seasonId={seasonId}
        onSelect={setAwayTeam}
        onCreated={onAdded}
      />
      <button onClick={handleAdd} disabled={!canSave || saving}
        className="px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50 rounded-lg disabled:opacity-30 cursor-pointer">
        + Eintragen
      </button>
    </div>
  )
}

function TeamCombobox({ teams, selected, placeholder, seasonId, onSelect, onCreated }: {
  teams: LeagueTeamResponse[]
  selected: LeagueTeamResponse | null
  placeholder: string
  seasonId: number
  onSelect: (team: LeagueTeamResponse | null) => void
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) && !t.ownTeam
  )
  const exactMatch = teams.some(t => t.name.toLowerCase() === search.trim().toLowerCase())
  const showCreate = search.trim().length > 0 && !exactMatch

  const handleCreate = async () => {
    if (creating || !search.trim()) return
    setCreating(true)
    try {
      const team = await api.createLeagueTeam(seasonId, search.trim())
      onSelect(team)
      setOpen(false)
      setSearch('')
      onCreated()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setSearch('') }}
        className={`border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none min-w-[100px] text-left cursor-pointer hover:border-gray-300 ${
          selected ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {selected ? selected.name : placeholder}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-52">
          <div className="p-2">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && showCreate) handleCreate()
                if (e.key === 'Enter' && filtered.length === 1) { onSelect(filtered[0]); setOpen(false); setSearch('') }
                if (e.key === 'Escape') setOpen(false)
              }}
              placeholder="Suchen oder erstellen..."
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-100"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {selected && (
              <button
                onClick={() => { onSelect(null); setOpen(false); setSearch('') }}
                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
              >
                Auswahl entfernen
              </button>
            )}
            {filtered.map(team => (
              <button
                key={team.id}
                onClick={() => { onSelect(team); setOpen(false); setSearch('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-navy-50 cursor-pointer ${
                  selected?.id === team.id ? 'bg-navy-50 text-navy-700 font-medium' : 'text-gray-900'
                }`}
              >
                {team.name}
              </button>
            ))}
            {filtered.length === 0 && !showCreate && (
              <div className="px-3 py-2 text-xs text-gray-400">Keine Teams gefunden</div>
            )}
            {!showCreate && search.trim().length === 0 && filtered.length > 0 && (
              <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">
                Name eingeben um neues Team zu erstellen
              </div>
            )}
            {showCreate && (
              <>
                {filtered.length > 0 && <div className="border-t border-gray-100" />}
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-sm text-navy-600 hover:bg-navy-50 font-medium cursor-pointer disabled:opacity-50"
                >
                  + „{search.trim()}" erstellen
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
