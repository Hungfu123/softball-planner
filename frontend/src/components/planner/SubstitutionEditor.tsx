import { useState } from 'react'
import type { LocalSubstitution, LocalLineupEntry, Player, GameStaffResponse } from '@/types'
import { XMark } from '@/icons'

interface Props {
  substitutions: LocalSubstitution[]
  lineupEntries: LocalLineupEntry[]
  poolPlayers: Player[]
  staff: GameStaffResponse[]
  onAdd: (playerOut: Player, playerIn: Player, inning: number) => void
  onRemove: (index: number) => void
}

export function SubstitutionEditor({ substitutions, lineupEntries, poolPlayers, staff, onAdd, onRemove }: Props) {
  const [adding, setAdding] = useState(false)
  const [playerOutId, setPlayerOutId] = useState<number | ''>('')
  const [playerInId, setPlayerInId] = useState<number | ''>('')
  const [inning, setInning] = useState<number>(3)

  const staffMap = new Map(staff.map(s => [s.player.id, s.role === 'BASE_COACH_1ST' ? '1B Coach' : '3B Coach']))

  const handleAdd = () => {
    if (!playerOutId || !playerInId) return
    const playerOut = lineupEntries.find(e => e.player.id === playerOutId)?.player
    const playerIn = [...poolPlayers, ...staff.map(s => s.player)].find(p => p.id === playerInId)
    if (!playerOut || !playerIn) return
    onAdd(playerOut, playerIn, inning)
    setPlayerOutId('')
    setPlayerInId('')
    setInning(3)
    setAdding(false)
  }

  // Players that can be subbed out (in the lineup)
  const availableOut = lineupEntries.filter(e => e.player)

  // Players that can be subbed in (bench + coaches, not already a sub-in)
  const subsInIds = new Set(substitutions.map(s => s.playerIn.id))
  const coachPlayers = staff.map(s => s.player).filter(p => !subsInIds.has(p.id))
  const benchPlayers = poolPlayers.filter(p => !subsInIds.has(p.id))
  const availableIn = [...coachPlayers, ...benchPlayers]
    // Deduplicate (coach might also be in poolPlayers)
    .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)

  if (lineupEntries.length === 0) return null

  const canAdd = availableOut.length > 0 && availableIn.length > 0

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-cream-200">
        <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 inline-flex items-center gap-2">
          <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
          Auswechslungen
        </h2>
        {!adding && canAdd && (
          <button
            onClick={() => setAdding(true)}
            className="font-display text-[11px] font-bold tracking-widest uppercase text-navy-700 hover:text-navy-900 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            + Hinzufügen
          </button>
        )}
      </div>

      {substitutions.length > 0 && (
        <div className="bg-cream-50 border border-cream-300 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 mb-2">
          {substitutions.map((sub, index) => (
            <div key={index} className="group/sub flex items-center gap-2 px-3 py-2 text-sm">
              <span className="text-navy-600 text-xs font-semibold shrink-0">
                Ab {sub.inning + 1}. Inning
              </span>
              <span className="text-gray-700 truncate">{sub.playerOut.name}</span>
              <span className="text-gray-300">&rarr;</span>
              <span className="text-gray-900 font-medium truncate">{sub.playerIn.name}</span>
              <button
                onClick={() => onRemove(index)}
                className="ml-auto p-1 text-gray-400 hover:text-softball-red-600 opacity-0 group-hover/sub:opacity-100 transition-opacity"
              >
                <XMark size={14} />
              </button>
            </div>
          ))}
        </div>
      )}


      {adding && (
        <div className="bg-cream-100 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Nach Inning</span>
            <select
              value={inning}
              onChange={e => setInning(Number(e.target.value))}
              className="w-14 text-sm border border-cream-300 rounded-lg px-1.5 py-1 bg-cream-50 outline-none focus:border-navy-600"
            >
              {[1, 2, 3, 4, 5, 6].map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={playerOutId}
              onChange={e => setPlayerOutId(Number(e.target.value) || '')}
              className="flex-1 min-w-0 text-sm border border-cream-300 rounded-lg px-1.5 py-1 bg-cream-50 outline-none focus:border-navy-600"
            >
              <option value="">Raus...</option>
              {availableOut.map(e => (
                <option key={e.player.id} value={e.player.id}>{e.player.name}</option>
              ))}
            </select>
            <span className="text-gray-300 text-sm">&rarr;</span>
            <select
              value={playerInId}
              onChange={e => setPlayerInId(Number(e.target.value) || '')}
              className="flex-1 min-w-0 text-sm border border-cream-300 rounded-lg px-1.5 py-1 bg-cream-50 outline-none focus:border-navy-600"
            >
              <option value="">Rein...</option>
              {availableIn.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{staffMap.has(p.id) ? ` (${staffMap.get(p.id)})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => { setAdding(false); setPlayerOutId(''); setPlayerInId('') }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAdd}
              disabled={!playerOutId || !playerInId}
              className="px-3 py-1.5 text-xs font-medium text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
