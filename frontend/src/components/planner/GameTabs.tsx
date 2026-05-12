import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { GameResponse, LeagueTeamResponse } from '@/types'
import { TeamCombobox } from '@/components/shared'
import * as api from '@/api/client'

interface Props {
  games: GameResponse[]
  activeIndex: number
  seasonId: number
  onSelect: (index: number) => void
  onOpponentChanged: (gameId: number, opponentTeam: LeagueTeamResponse | null) => void
  onSwapped?: () => void | Promise<void>
  gameCompletions?: Map<number, { total: number; fieldCount: number }>
}

export function GameTabs({ games, activeIndex, onSelect, seasonId, onOpponentChanged, onSwapped, gameCompletions }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
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

  const prevDisabled = activeIndex <= 0
  const nextDisabled = activeIndex >= games.length - 1
  const activeCompletion = activeGame ? gameCompletions?.get(activeGame.id) : undefined
  const activeNeedsAttention = activeCompletion && activeCompletion.total > 0 && activeCompletion.fieldCount < 9

  return (
    <div>
      {/* Mobile: Pagination-Bar — Pfeile + Hero-Title + Dots (Swipe primär) */}
      <div className="lg:hidden flex items-center gap-2 py-2 border-b border-cream-300">
        <button
          type="button"
          onClick={() => !prevDisabled && onSelect(activeIndex - 1)}
          disabled={prevDisabled}
          aria-label="Vorheriges Spiel"
          className="p-2 text-navy-700 disabled:opacity-30 cursor-pointer disabled:cursor-default rounded-md hover:bg-cream-100"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide truncate flex items-center justify-center gap-1.5">
            Spiel {activeGame?.gameNumber ?? '?'}
            {activeNeedsAttention && (
              <span className="w-2 h-2 rounded-full bg-amber-400" title={`${activeCompletion!.fieldCount}/9 Feldpositionen`} />
            )}
          </div>
          {games.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {games.map((g, i) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={`Spiel ${g.gameNumber}`}
                  className={`h-1.5 rounded-full transition-all ${i === activeIndex ? 'w-4 bg-softball-red-600' : 'w-1.5 bg-cream-400 hover:bg-navy-300'}`}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => !nextDisabled && onSelect(activeIndex + 1)}
          disabled={nextDisabled}
          aria-label="Nächstes Spiel"
          className="p-2 text-navy-700 disabled:opacity-30 cursor-pointer disabled:cursor-default rounded-md hover:bg-cream-100"
        >
          <ChevronRight size={20} />
        </button>
        {games.length > 1 && activeGame && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuGameId(menuGameId === activeGame.id ? null : activeGame.id)}
              aria-label="Lineup-Aktionen"
              className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer rounded-md"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {menuGameId === activeGame.id && (
              <div ref={menuRef} className="absolute top-full right-0 mt-1 bg-cream-50 border border-cream-300 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Lineup tauschen mit…</div>
                {games.filter(g => g.id !== activeGame.id).map(target => (
                  <button
                    key={target.id}
                    disabled={swapping}
                    onClick={() => handleSwap(activeGame.id, target.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-navy-50 hover:text-navy-700 disabled:opacity-50 cursor-pointer"
                  >
                    {gameLabel(target)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop: Tab strip */}
      <div className="hidden lg:flex border-b border-cream-300 items-stretch overflow-x-auto -mx-1 px-1 scrollbar-thin">
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

      {/* Active-game meta-row: Gegner */}
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
        </div>
      )}
    </div>
  )
}

