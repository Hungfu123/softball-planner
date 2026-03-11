import { useState, useRef, useEffect } from 'react'
import type { GameResponse, LeagueTeamResponse } from '@/types'
import * as api from '@/api/client'

interface Props {
  games: GameResponse[]
  activeIndex: number
  seasonId: number
  onSelect: (index: number) => void
  onOpponentChanged: (gameId: number, opponentTeam: LeagueTeamResponse | null) => void
  onScoreChanged?: (gameId: number, scoreUs: number | null, scoreThem: number | null) => void
  onSwapped?: () => void | Promise<void>
  gameCompletions?: Map<number, { total: number; fieldCount: number }>
}

export function GameTabs({ games, activeIndex, onSelect, seasonId, onOpponentChanged, onScoreChanged, onSwapped, gameCompletions }: Props) {
  const [pickerGameId, setPickerGameId] = useState<number | null>(null)
  const [scoreGameId, setScoreGameId] = useState<number | null>(null)
  const [menuGameId, setMenuGameId] = useState<number | null>(null)
  const [swapping, setSwapping] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleSwap = async (gameId1: number, gameId2: number) => {
    setSwapping(true)
    try {
      await api.swapGames(gameId1, gameId2)
      if (onSwapped) await onSwapped()
    } finally {
      setSwapping(false)
      setMenuGameId(null)
    }
  }

  // Close menu on click outside
  useEffect(() => {
    if (!menuGameId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuGameId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuGameId])

  const gameLabel = (g: GameResponse) =>
    g.opponentTeam ? `Spiel ${g.gameNumber} (vs ${g.opponentTeam.name})` : `Spiel ${g.gameNumber}`

  return (
    <div className="flex border-b border-gray-200 overflow-visible items-stretch">
      {games.map((game, i) => (
        <div key={game.id} className="relative group flex items-center">
          <button
            onClick={() => onSelect(i)}
            className={`group/tab relative px-2 sm:px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              i === activeIndex
                ? 'text-navy-800'
                : 'text-gray-400 hover:text-navy-800 hover:bg-navy-50 rounded-t-lg'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                Spiel {game.gameNumber}
                {(() => {
                  const c = gameCompletions?.get(game.id)
                  if (!c || c.total === 0) return null
                  if (c.fieldCount >= 9) return null
                  return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title={`${c.fieldCount}/9 Feldpositionen`} />
                })()}
              </span>

              {i === activeIndex ? (
                <span
                  onClick={e => { e.stopPropagation(); setPickerGameId(pickerGameId === game.id ? null : game.id) }}
                  className={`group/opp inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    game.opponentTeam
                      ? 'text-gray-600 hover:bg-navy-50 hover:text-navy-700'
                      : 'text-gray-400 italic hover:bg-navy-50 hover:text-navy-600'
                  }`}
                  title="Gegner wählen"
                >
                  {game.opponentTeam ? `vs ${game.opponentTeam.name}` : '+ Gegner'}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="opacity-0 group-hover/opp:opacity-60 transition-opacity">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              ) : game.opponentTeam ? (
                <span className="text-xs px-1.5 py-0.5 opacity-50 hidden sm:inline">
                  vs {game.opponentTeam.name}
                </span>
              ) : null}

              {/* Score badge */}
              {game.opponentTeam && (
                i === activeIndex ? (
                  <span
                    onClick={e => { e.stopPropagation(); setScoreGameId(scoreGameId === game.id ? null : game.id) }}
                    className={`text-xs px-2 py-1 rounded-md cursor-pointer font-mono transition-colors hover:bg-navy-50 ${
                      game.scoreUs != null
                        ? game.scoreUs > game.scoreThem! ? 'text-green-700' : game.scoreUs < game.scoreThem! ? 'text-red-600' : 'text-gray-500'
                        : 'text-gray-400 italic'
                    }`}
                    title="Ergebnis eintragen"
                  >
                    {game.scoreUs != null ? `${game.scoreUs}:${game.scoreThem}` : '—:—'}
                  </span>
                ) : game.scoreUs != null ? (
                  <span className={`text-xs px-1.5 py-0.5 font-mono hidden sm:inline ${
                    game.scoreUs > game.scoreThem! ? 'text-green-700' : game.scoreUs < game.scoreThem! ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {game.scoreUs}:{game.scoreThem}
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 font-mono opacity-40 italic hidden sm:inline">—:—</span>
                )
              )}
            </div>
            <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t transition-colors ${
              i === activeIndex ? 'bg-navy-800' : 'bg-transparent group-hover/tab:bg-navy-300'
            }`} />
          </button>

          {/* Team Picker Popover */}
          {pickerGameId === game.id && (
            <TeamPicker
              seasonId={seasonId}
              currentTeam={game.opponentTeam}
              onSelect={async (team) => {
                setPickerGameId(null)
                onOpponentChanged(game.id, team)
                await api.updateOpponent(game.id, team?.id ?? null)
              }}
              onClose={() => setPickerGameId(null)}
            />
          )}

          {/* Score Editor Popover */}
          {scoreGameId === game.id && (
            <ScoreEditor
              scoreUs={game.scoreUs}
              scoreThem={game.scoreThem}
              onSave={async (scoreUs, scoreThem) => {
                setScoreGameId(null)
                onScoreChanged?.(game.id, scoreUs, scoreThem)
                await api.updateScore(game.id, scoreUs, scoreThem)
              }}
              onClose={() => setScoreGameId(null)}
            />
          )}

          {/* Three-dot menu — only show if more than 1 game */}
          {games.length > 1 && (
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setMenuGameId(menuGameId === game.id ? null : game.id) }}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity cursor-pointer"
                title="Lineup tauschen"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {menuGameId === game.id && (
                <div
                  ref={menuRef}
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    Lineup tauschen mit...
                  </div>
                  {games.filter(g => g.id !== game.id).map(target => (
                    <button
                      key={target.id}
                      disabled={swapping}
                      onClick={() => handleSwap(game.id, target.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-navy-50 hover:text-navy-700 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {gameLabel(target)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// --- Score Editor Popover ---
function ScoreEditor({ scoreUs, scoreThem, onSave, onClose }: {
  scoreUs: number | null
  scoreThem: number | null
  onSave: (scoreUs: number | null, scoreThem: number | null) => void
  onClose: () => void
}) {
  const [us, setUs] = useState(scoreUs?.toString() ?? '')
  const [them, setThem] = useState(scoreThem?.toString() ?? '')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSubmit = () => {
    const usNum = us.trim() === '' ? null : parseInt(us)
    const themNum = them.trim() === '' ? null : parseInt(them)
    if ((usNum != null && isNaN(usNum)) || (themNum != null && isNaN(themNum))) return
    if ((usNum == null) !== (themNum == null)) return
    onSave(usNum, themNum)
  }

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-48"
    >
      <div className="text-xs font-semibold text-gray-500 mb-2">Ergebnis</div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={us}
          onChange={e => setUs(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
          placeholder="Wir"
          className="w-16 border border-gray-200 rounded px-2 py-1.5 text-sm text-center font-mono outline-none focus:border-navy-600"
        />
        <span className="text-gray-400 font-bold">:</span>
        <input
          type="number"
          min="0"
          value={them}
          onChange={e => setThem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
          placeholder="Sie"
          className="w-16 border border-gray-200 rounded px-2 py-1.5 text-sm text-center font-mono outline-none focus:border-navy-600"
        />
      </div>
      <div className="flex justify-between mt-2">
        {scoreUs != null && (
          <button
            onClick={() => onSave(null, null)}
            className="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
          >
            Löschen
          </button>
        )}
        <button
          onClick={handleSubmit}
          className="ml-auto text-xs font-medium text-navy-700 hover:text-navy-900 cursor-pointer"
        >
          Speichern
        </button>
      </div>
    </div>
  )
}

// --- Team Picker Popover ---
function TeamPicker({ seasonId, currentTeam, onSelect, onClose }: {
  seasonId: number
  currentTeam: LeagueTeamResponse | null
  onSelect: (team: LeagueTeamResponse | null) => void
  onClose: () => void
}) {
  const [teams, setTeams] = useState<LeagueTeamResponse[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.getLeagueTeams(seasonId).then(t => { setTeams(t); setLoading(false) })
  }, [seasonId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [loading])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

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
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-56"
    >
      <div className="p-2">
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && showCreate) handleCreate()
            if (e.key === 'Enter' && filtered.length === 1) onSelect(filtered[0])
            if (e.key === 'Escape') onClose()
          }}
          placeholder="Suchen oder erstellen..."
          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-100"
        />
      </div>

      <div className="max-h-48 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-2 text-xs text-gray-400">Laden...</div>
        ) : (
          <>
            {/* Remove opponent option */}
            {currentTeam && (
              <button
                onClick={() => onSelect(null)}
                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
              >
                Gegner entfernen
              </button>
            )}

            {/* Existing teams */}
            {filtered.map(team => (
              <button
                key={team.id}
                onClick={() => onSelect(team)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-navy-50 cursor-pointer ${
                  currentTeam?.id === team.id ? 'bg-navy-50 text-navy-700 font-medium' : 'text-gray-900'
                }`}
              >
                {team.name}
              </button>
            ))}

            {filtered.length === 0 && !showCreate && !currentTeam && (
              <div className="px-3 py-2 text-xs text-gray-400">Keine Teams gefunden</div>
            )}

            {!showCreate && search.trim().length === 0 && filtered.length > 0 && (
              <div className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">
                Name eingeben um neues Team zu erstellen
              </div>
            )}

            {/* Create new team option */}
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
          </>
        )}
      </div>
    </div>
  )
}
