import { useState } from 'react'
import { Button } from './Button'
import { NewPlayerModal } from './NewPlayerModal'
import { PlusCircle } from '@/icons'
import type { Player } from '@/types'

interface Props {
  voterName: string
  subline?: string
  players: Player[]
  busy?: boolean
  onAssign: (playerId: number) => void | Promise<void>
  onCreate: (playerName: string) => void | Promise<void>
  /** true, wenn die Zeile in einem Sheet steckt — reicht `nested` an das NewPlayerModal-Sheet durch. */
  nestedDialog?: boolean
}

/** Zeile zur Zuordnung eines unbekannten WhatsApp-Wählers zu einem Spieler (bestehend oder neu). */
export function UnknownVoterRow({ voterName, subline, players, busy = false, onAssign, onCreate, nestedDialog }: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [creatingPlayer, setCreatingPlayer] = useState(false)

  const handleAssign = () => {
    const playerId = Number(selectedPlayerId)
    if (!playerId) return
    onAssign(playerId)
  }

  const handleCreate = (name: string) => {
    setCreatingPlayer(false)
    onCreate(name)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border border-cream-300 rounded-lg bg-cream-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy-900 truncate leading-tight">{voterName}</p>
        {subline && <p className="text-[11px] text-gray-500 leading-tight">{subline}</p>}
      </div>
      <select
        value={selectedPlayerId}
        onChange={e => setSelectedPlayerId(e.target.value)}
        disabled={busy}
        aria-label={`Spieler für ${voterName}`}
        className="w-28 sm:w-40 shrink-0 border border-cream-300 rounded-lg px-2 py-1.5 text-sm text-navy-900 bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none disabled:opacity-50"
      >
        <option value="">Spieler wählen…</option>
        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <Button
        type="button"
        variant="primary"
        onClick={handleAssign}
        disabled={!selectedPlayerId || busy}
        className="shrink-0 px-2.5 py-1.5 text-sm font-semibold"
      >
        Zuweisen
      </Button>
      <button
        type="button"
        onClick={() => setCreatingPlayer(true)}
        disabled={busy}
        title="Neuer Spieler"
        aria-label="Neuer Spieler"
        className="shrink-0 inline-flex items-center justify-center p-2 text-navy-700 bg-white border border-navy-200 rounded-lg hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlusCircle size={16} />
      </button>

      {creatingPlayer && (
        <NewPlayerModal
          voterName={voterName}
          nested={nestedDialog}
          onCancel={() => setCreatingPlayer(false)}
          onConfirm={handleCreate}
        />
      )}
    </div>
  )
}
