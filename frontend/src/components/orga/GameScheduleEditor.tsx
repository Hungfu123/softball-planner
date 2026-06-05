import { PlusCircle, TrashBin } from '@/icons'
import type { InvitationGame } from '@/types'

interface Props {
  games: InvitationGame[]
  teams: string[]
  onChange: (games: InvitationGame[]) => void
}

const inputCls =
  'w-full border border-cream-300 rounded-lg px-3 py-2 text-sm text-navy-900 bg-cream-100 focus:bg-white focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none'

export function GameScheduleEditor({ games, teams, onChange }: Props) {
  const update = (index: number, patch: Partial<InvitationGame>) => {
    onChange(games.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  const addGame = () => {
    onChange([...games, { time: '', teamA: '', teamB: '', ump: '' }])
  }

  const removeGame = (index: number) => {
    onChange(games.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-navy-700">Spielplan</h3>
        <button
          type="button"
          onClick={addGame}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-navy-700 bg-white border border-cream-300 rounded-lg hover:bg-navy-800 hover:text-white hover:border-navy-800 cursor-pointer transition-colors"
        >
          <PlusCircle size={16} /> Spiel
        </button>
      </div>

      {games.length === 0 ? (
        <p className="text-center text-sm text-navy-400 italic py-4 border border-dashed border-cream-300 rounded-lg">
          Noch keine Spiele.
        </p>
      ) : (
        <div className="space-y-2">
          {games.map((g, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr_auto] items-center gap-2 group">
              <input
                value={g.time}
                onChange={e => update(i, { time: e.target.value })}
                placeholder="10:00"
                className={inputCls}
              />
              <select value={g.teamA} onChange={e => update(i, { teamA: e.target.value })} className={inputCls}>
                <option value="">– Team –</option>
                {teams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={g.teamB} onChange={e => update(i, { teamB: e.target.value })} className={inputCls}>
                <option value="">– Team –</option>
                {teams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={g.ump} onChange={e => update(i, { ump: e.target.value })} className={inputCls}>
                <option value="">– Ump –</option>
                {teams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeGame(i)}
                aria-label="Spiel entfernen"
                title="Entfernen"
                className="p-2 rounded-lg text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 cursor-pointer"
              >
                <TrashBin size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
