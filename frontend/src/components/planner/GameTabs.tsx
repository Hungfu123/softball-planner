import { useState, useRef, useEffect } from 'react'
import type { GameResponse, LeagueTeamResponse } from '@/types'
import { TeamCombobox } from '@/components/shared'
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [menuGameId, setMenuGameId] = useState<number | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeamResponse[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getLeagueTeams(seasonId).then(setLeagueTeams)
  }, [seasonId])

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

  const activeGame = games[activeIndex]
  const scoreColor = (g: GameResponse) =>
    g.scoreUs == null || g.scoreThem == null
      ? 'text-gray-400 italic'
      : g.scoreUs > g.scoreThem
        ? 'text-emerald-700'
        : g.scoreUs < g.scoreThem
          ? 'text-softball-red-600'
          : 'text-gray-500'

  return (
    <div>
      {/* Tab strip — pure nav */}
      <div className="flex border-b border-cream-300 items-stretch">
        {games.map((game, i) => (
          <div key={game.id} className="relative group flex items-center">
            <button
              onClick={() => onSelect(i)}
              className={`group/tab relative px-3 sm:px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                i === activeIndex
                  ? 'text-navy-900 font-bold'
                  : 'text-gray-400 hover:text-navy-800 hover:bg-navy-50/50 rounded-t-lg'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                Spiel {game.gameNumber}
                {(() => {
                  const c = gameCompletions?.get(game.id)
                  if (!c || c.total === 0) return null
                  if (c.fieldCount >= 9) return null
                  return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title={`${c.fieldCount}/9 Feldpositionen`} />
                })()}
              </span>
              <span className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t transition-colors ${
                i === activeIndex ? 'bg-softball-red-600' : 'bg-transparent group-hover/tab:bg-navy-300'
              }`} />
            </button>

            {games.length > 1 && (
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setMenuGameId(menuGameId === game.id ? null : game.id) }}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity cursor-pointer"
                  title="Lineup tauschen"
                  aria-label="Lineup-Aktionen"
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
                    className="absolute top-full left-0 mt-1 bg-cream-50 border border-cream-300 rounded-lg shadow-lg py-1 z-50 min-w-[200px]"
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

      {/* Active-game meta-row: Gegner + Score (kompakt + editierbar) */}
      {activeGame && (
        <div className="flex flex-wrap items-center gap-2 px-1 sm:px-2 py-2.5">
          <div className="relative">
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                activeGame.opponentTeam
                  ? 'text-gray-700 bg-cream-100 hover:bg-navy-50 hover:text-navy-700'
                  : 'text-gray-500 italic bg-cream-100 hover:bg-navy-50 hover:text-navy-600'
              }`}
              title="Gegner wählen"
            >
              {activeGame.opponentTeam ? (
                <>
                  <span className="text-gray-400 text-xs">vs</span>
                  <span className="font-semibold">{activeGame.opponentTeam.name}</span>
                </>
              ) : (
                <span>+ Gegner wählen</span>
              )}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <TeamCombobox
              seasonId={seasonId}
              teams={leagueTeams}
              selected={activeGame.opponentTeam}
              variant="inline"
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              onTeamCreated={team => setLeagueTeams(prev => [...prev, team])}
              onSelect={async (team) => {
                setPickerOpen(false)
                onOpponentChanged(activeGame.id, team)
                await api.updateOpponent(activeGame.id, team?.id ?? null)
              }}
            />
          </div>

          {activeGame.opponentTeam && (
            <div className="relative">
              <button
                onClick={() => setScoreOpen(!scoreOpen)}
                className={`text-sm px-2.5 py-1.5 rounded-md cursor-pointer font-mono transition-colors bg-cream-100 hover:bg-navy-50 ${scoreColor(activeGame)}`}
                title="Ergebnis eintragen"
              >
                {activeGame.scoreUs != null ? `${activeGame.scoreUs} : ${activeGame.scoreThem}` : '— : —'}
              </button>
              {scoreOpen && (
                <ScoreEditor
                  scoreUs={activeGame.scoreUs}
                  scoreThem={activeGame.scoreThem}
                  onSave={async (scoreUs, scoreThem) => {
                    setScoreOpen(false)
                    onScoreChanged?.(activeGame.id, scoreUs, scoreThem)
                    await api.updateScore(activeGame.id, scoreUs, scoreThem)
                  }}
                  onClose={() => setScoreOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      )}
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
      className="absolute top-full left-0 mt-1 z-50 bg-cream-50 border border-cream-300 rounded-lg shadow-lg p-3 w-48"
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
          className="w-16 border border-cream-300 rounded px-2 py-1.5 text-sm text-center font-mono outline-none focus:border-navy-600"
        />
        <span className="text-gray-400 font-bold">:</span>
        <input
          type="number"
          min="0"
          value={them}
          onChange={e => setThem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
          placeholder="Sie"
          className="w-16 border border-cream-300 rounded px-2 py-1.5 text-sm text-center font-mono outline-none focus:border-navy-600"
        />
      </div>
      <div className="flex justify-between mt-2">
        {scoreUs != null && (
          <button
            onClick={() => onSave(null, null)}
            className="text-xs text-gray-400 hover:text-softball-red-500 cursor-pointer"
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

