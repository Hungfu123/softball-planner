import { useState } from 'react'
import { GENDER_LABELS, GENDER_ORDER } from '@/types'
import type { Gender, Player } from '@/types'

/**
 * Geschlecht für den ganzen Kader auf einen Rutsch.
 *
 * Die Liga verlangt mindestens zwei Frauen auf dem Feld, davon eine im Infield —
 * dafür muss die App wissen, wer wer ist. Einzeln über 31 Profile zu tippen wäre
 * eine Viertelstunde, hier sind es zwei Taps je Person.
 *
 * Nicht zugeordnet bleibt eine gültige Antwort: wer hier leer steht, zählt für
 * keine Quote mit, statt stillschweigend als Mann zu gelten.
 */
export function GenderSheet({ players, onSet }: {
  players: Player[]
  onSet: (playerId: number, gender: Gender | null) => Promise<unknown>
}) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const choose = async (player: Player, gender: Gender | null) => {
    setBusyId(player.id)
    setError(null)
    try {
      await onSet(player.id, player.gender === gender ? null : gender)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const open = players.filter(p => !p.gender).length
  // Eine Person: der Sheet-Titel nennt sie schon, dann braucht die Zeile keinen Namen
  // und der Zähler keine Arbeit.
  const single = players.length === 1

  return (
    <div className="px-5 py-4">
      <p className="text-xs text-gray-500 mb-3">
        Grundlage der Liga-Regel: mindestens zwei Frauen auf dem Feld, davon eine im Infield.
        Für die Quote zählt nur „Frau" — was für „Divers" gilt, entscheidet der Verband.
        {!single && open > 0 && <> Noch <span className="font-semibold text-navy-900">{open}</span> ohne Zuordnung.</>}
      </p>
      {error && <p className="text-xs text-softball-red-700 mb-2">{error}</p>}
      <ul className="divide-y divide-cream-200">
        {players.map(player => (
          <li key={player.id} className={`flex items-center gap-3 py-2 ${single ? 'justify-center' : ''}`}>
            {!single && <span className="flex-1 min-w-0 truncate text-sm text-navy-900">{player.name}</span>}
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-cream-300 bg-cream-100 p-0.5">
              {GENDER_ORDER.map(gender => (
                <button
                  key={gender}
                  onClick={() => choose(player, gender)}
                  disabled={busyId === player.id}
                  aria-pressed={player.gender === gender}
                  className={`font-display text-[11px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 cursor-pointer transition-colors disabled:opacity-50 ${
                    player.gender === gender
                      ? 'bg-navy-800 text-white'
                      : 'text-gray-600 hover:text-navy-900'
                  }`}
                >
                  {GENDER_LABELS[gender]}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-gray-500 pt-3">
        Nochmal auf die gewählte Seite tippen hebt die Zuordnung wieder auf.
      </p>
    </div>
  )
}
