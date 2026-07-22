import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { Button } from '@/components/shared'
import type { Player, LocalLineupEntry } from '@/types'

interface Props {
  open: boolean
  position: string | null
  entries: LocalLineupEntry[]
  poolPlayers: Player[]
  onAssign: (player: Player, position: string) => void
  onClear: (position: string) => void
  onClose: () => void
}

export function FieldPositionAssignSheet({ open, position, entries, poolPlayers, onAssign, onClear, onClose }: Props) {
  if (!position) return null

  const currentOnPosition = entries.find(e => e.position === position)?.player ?? null
  // Lineup-Player ohne Position (für Re-Assign)
  const lineupNoPosition = entries.filter(e => !e.position).map(e => e.player)
  // Lineup-Player mit Position (für direkten Positions-Tausch)
  const lineupOnField = entries
    .filter(e => e.position && e.position !== position && e.position !== 'EH')
    .map(e => ({ player: e.player, fromPosition: e.position! }))

  const handlePick = (player: Player) => {
    onAssign(player, position)
    onClose()
  }

  const handleClear = () => {
    onClear(position)
    onClose()
  }

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title={`Position ${position}`}
      maxWidth="md"
      footer={
        <div className="grid grid-cols-2 gap-2">
          {currentOnPosition ? (
            <Button
              variant="secondary"
              onClick={handleClear}
              className="h-11 w-full font-medium"
            >
              Position leeren
            </Button>
          ) : <span />}
          <Button
            variant="navy"
            onClick={onClose}
            className="h-11 w-full font-bold"
          >
            Schließen
          </Button>
        </div>
      }
    >
      <div className="px-4 py-4 space-y-4">
        {currentOnPosition && (
          <div className="bg-navy-50 border border-navy-200 rounded-lg p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-0.5">Aktuell</div>
            <div className="font-display text-base font-extrabold text-navy-900">{currentOnPosition.name}</div>
          </div>
        )}

        {lineupNoPosition.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">
              Aus Lineup (Batting-Only)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {lineupNoPosition.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className="h-11 rounded-lg border border-cream-300 bg-white text-navy-800 text-sm font-semibold hover:border-navy-400 hover:bg-cream-100 cursor-pointer text-left px-3 truncate"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {lineupOnField.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">
              Aus Feld {currentOnPosition ? '(tauschen)' : '(verschieben)'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {lineupOnField.map(({ player, fromPosition }) => (
                <button
                  key={player.id}
                  onClick={() => handlePick(player)}
                  className="h-11 rounded-lg border border-cream-300 bg-white text-navy-800 text-sm font-semibold hover:border-navy-400 hover:bg-cream-100 cursor-pointer text-left px-3 truncate flex items-center justify-between gap-2"
                >
                  <span className="truncate">{player.name}</span>
                  <span className="text-[10px] font-bold text-softball-red-600 shrink-0">{fromPosition}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">
            Aus Pool ({poolPlayers.length})
          </div>
          {poolPlayers.length === 0 ? (
            <p className="text-sm text-navy-500 italic">Keine verfügbaren Spieler im Pool.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {poolPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePick(p)}
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
