import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '@/api/client'
import { generatePdf, type GameData } from '@/utils/pdfExport'
import type { GameDayResponse, Season } from '@/types'

export function LineupSheet() {
  const { id } = useParams<{ id: string }>()
  const [gameDay, setGameDay] = useState<GameDayResponse | null>(null)
  const [games, setGames] = useState<GameData[]>([])
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = async () => {
      const gd = await api.getGameDay(Number(id))
      setGameDay(gd)

      const [{ lineups, staff }, seasons] = await Promise.all([
        api.getGameDayLineups(gd.id),
        api.getSeasons(),
      ])
      setSeason(seasons.find(s => s.id === gd.seasonId) ?? null)
      setGames(gd.games.map(g => ({
        game: g,
        lineup: lineups[String(g.id)] ?? [],
        staff: staff[String(g.id)] ?? [],
      })))
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!loading && gameDay) {
      const parts = ['Lineup']
      if (gameDay.location) parts.push(gameDay.location)
      if (season) parts.push(`${season.name}_${season.year}`)
      document.title = parts.join('_')
    }
  }, [loading, gameDay, season])

  if (loading || !gameDay) {
    return <div className="p-8 text-center text-gray-500">Laden...</div>
  }

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    })

  return (
    <div className="max-w-md mx-auto p-4">
      {/* Controls */}
      <div className="no-print flex items-center justify-end gap-3 mb-4">
        <button
          onClick={() => generatePdf(gameDay, games, season)}
          className="px-3 py-1.5 text-xs text-white bg-navy-800 rounded-lg hover:shadow-md hover:scale-105 cursor-pointer transition-all"
        >
          Als PDF
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold text-gray-900">
          {gameDay.label || 'Spieltag'} — {formatDate(gameDay.date)}
          {gameDay.location && <span className="font-normal text-gray-500"> @ {gameDay.location}</span>}
        </h1>
      </div>

      {/* Games — stacked, tight */}
      <div className="space-y-5">
        {games.map(({ game, lineup, staff }, index) => (
          <div key={game.id} className={`break-inside-avoid${index > 0 && index % 3 === 0 ? ' break-before-page' : ''}`}>
            <h2 className="text-xs font-bold text-gray-800 border-b-2 border-navy-800 pb-0.5">
              Spiel {game.gameNumber}
              {game.opponentTeam && <span className="font-normal text-gray-600"> vs {game.opponentTeam.name}</span>}
              {game.scoreUs != null && (
                <span className="font-normal text-gray-500 ml-1">({game.scoreUs}:{game.scoreThem})</span>
              )}
              {staff.length > 0 && (
                <span className="font-normal text-gray-400 ml-2">
                  {staff.map(s => `${s.role === 'BASE_COACH_1ST' ? '1B' : '3B'}: ${s.player.name}`).join(' · ')}
                </span>
              )}
            </h2>

            {lineup.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">Kein Lineup</p>
            ) : (
              <table className="w-full text-xs leading-tight">
                <tbody>
                  {lineup
                    .sort((a, b) => a.battingOrder - b.battingOrder)
                    .map(entry => (
                      <tr key={entry.id} className="border-b border-gray-100">
                        <td className="py-1 w-5 font-mono text-gray-400">{entry.battingOrder}</td>
                        <td className="py-1 font-medium">
                          {entry.player.name}
                          {entry.dhBatterPlayer && (
                            <span className="text-gray-400 font-normal"> (DH: {entry.dhBatterPlayer.name})</span>
                          )}
                        </td>
                        <td className="py-1 w-10 text-right font-mono font-semibold">{entry.position}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {/* Bench per game */}
            {lineup.length > 0 && (() => {
              const gameUsedIds = new Set<number>()
              for (const e of lineup) {
                gameUsedIds.add(e.player.id)
                if (e.dhBatterPlayer) gameUsedIds.add(e.dhBatterPlayer.id)
              }
              for (const s of staff) gameUsedIds.add(s.player.id)
              const bench = gameDay.availablePlayers.filter(p => !gameUsedIds.has(p.id))
              if (bench.length === 0) return null
              return (
                <p className="text-[10px] text-gray-400 mt-1">
                  Bank: {bench.map(p => p.name).join(', ')}
                </p>
              )
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}
