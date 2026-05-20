import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { Player, LocalLineupEntry } from '@/types'

interface Props {
  open: boolean
  row: LocalLineupEntry | null
  rowIndex: number | null
  entries: LocalLineupEntry[]
  poolPlayers: Player[]
  onSwapWithPool: (rowPlayerId: number, poolPlayer: Player) => void
  onSwapWithLineup: (rowPlayerId: number, otherRowPlayerId: number) => void
  onClose: () => void
}

export function LineupRowSwapSheet({
  open, row, rowIndex, entries, poolPlayers,
  onSwapWithPool, onSwapWithLineup, onClose,
}: Props) {
  if (!row || rowIndex === null) return null

  const others = entries.filter(e => e.player.id !== row.player.id)

  // DH-batter invariant: DH-batter must be a bench player.
  // Exclude pool players who are currently DH-batter on a *different* row.
  const activeDhBatterIds = new Set(
    entries
      .filter(e => e.dhBatterId !== null && e.dhBatterId !== row.player.id)
      .map(e => e.dhBatterId as number)
  )
  const pickablePool = poolPlayers.filter(p => !activeDhBatterIds.has(p.id))

  const handleLineupPick = (otherId: number) => {
    onSwapWithLineup(row.player.id, otherId)
    onClose()
  }
  const handlePoolPick = (p: Player) => {
    onSwapWithPool(row.player.id, p)
    onClose()
  }

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title="Spieler tauschen"
      maxWidth="md"
      footer={
        <button
          onClick={onClose}
          className="h-11 w-full rounded-lg bg-navy-800 hover:bg-navy-900 text-white font-bold cursor-pointer"
        >
          Abbrechen
        </button>
      }
    >
      <div className="px-4 py-4 space-y-4">
        <div className="bg-navy-50 border border-navy-200 rounded-lg p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-0.5">
            Aktuell #{rowIndex + 1}
          </div>
          <div className="font-display text-base font-extrabold text-navy-900 flex items-center gap-2">
            <span>{row.player.name}</span>
            {row.position && (
              <span className="text-xs font-bold text-softball-red-600">{row.position}</span>
            )}
          </div>
        </div>

        {others.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">
              Mit Lineup tauschen (Plätze tauschen)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {others.map(e => {
                const idxInLineup = entries.findIndex(x => x.player.id === e.player.id)
                return (
                  <button
                    key={e.player.id}
                    onClick={() => handleLineupPick(e.player.id)}
                    className="h-11 rounded-lg border border-cream-300 bg-white text-navy-800 text-sm font-semibold hover:border-navy-400 hover:bg-cream-100 cursor-pointer text-left px-3 truncate flex items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      <span className="text-gray-400 font-bold tabular-nums mr-1.5">#{idxInLineup + 1}</span>
                      {e.player.name}
                    </span>
                    {e.position && (
                      <span className="text-[10px] font-bold text-softball-red-600 shrink-0">{e.position}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">
            Aus Pool ersetzen ({pickablePool.length})
          </div>
          {pickablePool.length === 0 ? (
            <p className="text-sm text-navy-500 italic">Keine verfügbaren Spieler.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {pickablePool.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePoolPick(p)}
                  className="h-11 rounded-lg border border-cream-300 bg-white text-navy-800 text-sm font-semibold hover:border-softball-red-400 hover:bg-softball-red-50 cursor-pointer text-left px-3 truncate"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
