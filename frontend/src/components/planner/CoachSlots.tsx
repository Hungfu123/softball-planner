import { useState, useEffect, useMemo } from 'react'
import type { Player, GameStaffResponse, CoachRotationPair, GameResponse } from '@/types'
import type { CoachRotationLineupRow } from '@/utils/coachRotation'
import { STAFF_ROLES } from '@/types'
import { StarIcon, ArrowsSwap, XMark } from '@/icons'
import { getPairLabel, getPairPositions, recommendRotationPair, resolveRotation, scoreRotationPair, validRotationPairs } from '@/utils/coachRotation'

interface Props {
  staff: GameStaffResponse[]
  availablePlayers: Player[]
  lineup: CoachRotationLineupRow[]
  game: GameResponse
  loading?: boolean
  onSave: (entries: { playerId: number; role: string }[]) => Promise<void>
  onSaveRotation: (
    firstBase: CoachRotationPair | null,
    firstReversed: boolean,
    thirdBase: CoachRotationPair | null,
    thirdReversed: boolean,
  ) => Promise<void>
}

export function CoachSlots({ staff, availablePlayers, lineup, game, loading, onSave, onSaveRotation }: Props) {
  const [coach1st, setCoach1st] = useState<number | ''>('')
  const [coach3rd, setCoach3rd] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const c1 = staff.find(s => s.role === 'BASE_COACH_1ST')
    const c3 = staff.find(s => s.role === 'BASE_COACH_3RD')
    setCoach1st(c1?.player.id ?? '')
    setCoach3rd(c3?.player.id ?? '')
  }, [staff])

  const doSave = async (c1: number | '', c3: number | '') => {
    const entries: { playerId: number; role: string }[] = []
    if (c1) entries.push({ playerId: c1, role: 'BASE_COACH_1ST' })
    if (c3) entries.push({ playerId: c3, role: 'BASE_COACH_3RD' })
    setSaving(true)
    try {
      await onSave(entries)
    } finally {
      setSaving(false)
    }
  }

  const handleRotationPick = (role: string, pair: CoachRotationPair | null, reversed: boolean) => {
    const next1B = role === 'BASE_COACH_1ST' ? pair : (game.firstBaseCoachRotation ?? null)
    const next1Rev = role === 'BASE_COACH_1ST' ? reversed : (game.firstBaseCoachRotationReversed ?? false)
    const next3B = role === 'BASE_COACH_3RD' ? pair : (game.thirdBaseCoachRotation ?? null)
    const next3Rev = role === 'BASE_COACH_3RD' ? reversed : (game.thirdBaseCoachRotationReversed ?? false)
    onSaveRotation(next1B, next1Rev, next3B, next3Rev)
  }

  const handleChange = (role: string, val: number | '') => {
    const newC1 = role === 'BASE_COACH_1ST' ? val : coach1st
    const newC3 = role === 'BASE_COACH_3RD' ? val : coach3rd
    if (role === 'BASE_COACH_1ST') setCoach1st(val)
    else setCoach3rd(val)
    doSave(newC1, newC3)
    // Fester Coach und Rotation schließen sich aus. Blieb die Rotation stehen,
    // zeigte der Bogen weiter 1B/3B-Badges, obwohl die Base besetzt war.
    const isFirst = role === 'BASE_COACH_1ST'
    const ownRotation = (isFirst ? game.firstBaseCoachRotation : game.thirdBaseCoachRotation) ?? null
    if (val && ownRotation) {
      handleRotationPick(role, null, false)
    }
  }


  return (
    <div>
      <h2 className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900 mb-2 pb-1.5 border-b border-cream-200 flex items-center gap-2">
        <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
        Coaches
      </h2>
      <div className="bg-cream-50 border border-cream-300 rounded-2xl shadow-sm p-3 space-y-4 xl:space-y-2.5">
        {loading ? (
          [0, 1].map(i => (
            <div key={i}>
              <div className="skeleton-shimmer h-3 w-20 rounded-full bg-cream-200 mb-1.5" />
              <div className="skeleton-shimmer h-[38px] w-full rounded-lg bg-cream-200" />
            </div>
          ))
        ) : Object.entries(STAFF_ROLES).map(([role, label]) => {
          const isFirst = role === 'BASE_COACH_1ST'
          const value = isFirst ? coach1st : coach3rd
          const currentRotation = (isFirst ? game.firstBaseCoachRotation : game.thirdBaseCoachRotation) ?? null
          const currentReversed = (isFirst ? game.firstBaseCoachRotationReversed : game.thirdBaseCoachRotationReversed) ?? false
          // Dasselbe Paar kann nicht an beiden Bases stehen — es sind dieselben
          // zwei Spieler. Das jeweils andere Base blockiert sein Paar.
          const takenByOther = (isFirst ? game.thirdBaseCoachRotation : game.firstBaseCoachRotation) ?? null
          // Läuft eine Rotation, darf das Dropdown nicht „nicht besetzt" behaupten —
          // die Base IST besetzt, nur eben aus dem Lineup heraus.
          const rotationActive = !value && currentRotation != null
            && lineup.length >= 9 && validRotationPairs(lineup).includes(currentRotation)
          const selectId = `coach-${role}`

          return (
            <div key={role}>
              {/* Läuft eine Rotation, steht die Antwort darunter — das Dropdown
                  schrumpft dann zur Nebenaktion neben dem Label, statt als volle
                  Zeile „— Rotation aus dem Lineup —" zu wiederholen. */}
              <div className={rotationActive ? 'flex items-center gap-2 mb-1' : ''}>
                <label
                  htmlFor={selectId}
                  className={`font-display text-[10px] tracking-widest uppercase font-bold text-gray-500 cursor-pointer ${
                    rotationActive ? '' : 'block mb-1'
                  }`}
                >
                  {label}
                </label>
                <select
                  id={selectId}
                  value={value}
                  onChange={e => handleChange(role, e.target.value ? Number(e.target.value) : '')}
                  disabled={saving}
                  /* 16px auf Touch: alles darunter lässt iOS Safari beim Fokus zoomen. */
                  className={`font-display rounded-lg text-navy-900 bg-cream-50 outline-none focus:border-navy-600 focus:ring-2 focus:ring-cream-200 cursor-pointer transition-colors disabled:opacity-50 ${
                    rotationActive
                      ? 'ml-auto max-w-[11rem] px-1.5 py-0.5 text-[11px] font-bold text-gray-400 border border-transparent hover:border-cream-400 hover:text-navy-900'
                      : 'w-full px-3 py-2 text-base xl:text-sm font-bold border border-cream-300 hover:border-navy-400'
                  }`}
                >
                  <option value="">{rotationActive ? 'Fester Coach…' : '— nicht besetzt —'}</option>
                  {availablePlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {!value && lineup.length >= 9 && (
                <RotationPicker
                  lineup={lineup}
                  currentValue={currentRotation}
                  currentReversed={currentReversed}
                  takenByOther={takenByOther}
                  onPick={(pair, reversed) => handleRotationPick(role, pair, reversed)}
                />
              )}
              {!value && lineup.length < 9 && (
                <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                  Lineup mit mind. 9 Spielern nötig für Coach-Rotation
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface RotationPickerProps {
  lineup: CoachRotationLineupRow[]
  currentValue: CoachRotationPair | null
  currentReversed: boolean
  /** Paar, das am anderen Base schon rotiert — dieselben Spieler können nicht doppelt. */
  takenByOther: CoachRotationPair | null
  onPick: (pair: CoachRotationPair | null, reversed: boolean) => void
}

function RotationPicker({ lineup, currentValue, currentReversed, takenByOther, onPick }: RotationPickerProps) {
  const pairs = useMemo(() => validRotationPairs(lineup), [lineup])
  // Empfehlung nie auf das Paar legen, das am anderen Base schon läuft.
  const recommended = useMemo(() => {
    const free = pairs.filter(p => p !== takenByOther)
    if (free.length === 0) return recommendRotationPair(lineup)
    return free.reduce((best, p) =>
      scoreRotationPair(p, lineup) > scoreRotationPair(best, lineup) ? p : best, free[0])
  }, [pairs, takenByOther, lineup])

  // Gespeichertes Paar nur nutzen, wenn es für die aktuelle Lineup-Größe gültig ist.
  const stored = currentValue && pairs.includes(currentValue) ? currentValue : null
  // Ist das Paar gewählt, sind die fünf Chips erledigte Arbeit — sie verschwinden
  // hinter „Ändern". Vorher stand die komplette Auswahl dauerhaft offen.
  const [editing, setEditing] = useState(false)
  const showPairs = !stored || editing
  // Ohne gespeicherte Rotation ist NICHTS aktiv — der Vorschlag wird nur gezeigt,
  // nicht behauptet. Vorher stand hier „Aktiv" samt Primary/Backup, während im
  // Bogen keine Coach-Badges auftauchten und die DB null hielt.
  const shown = stored ?? recommended
  const resolved = useMemo(
    () => resolveRotation(shown, lineup, stored ? currentReversed : false),
    [shown, lineup, stored, currentReversed],
  )

  const pairNames = (pair: CoachRotationPair) => {
    const [lo, hi] = getPairPositions(pair)
    const n = (p: number) => lineup.find(e => e.battingOrder === p)?.player.name ?? '—'
    return `${n(lo)} (#${lo}) und ${n(hi)} (#${hi})`
  }

  return (
    <div className="mt-2 space-y-2 xl:mt-1.5 xl:space-y-1.5">
      {/* Überschrift nur solange sie etwas sagt: ist das Paar gewählt, steht
          „Rotation aus dem Lineup" bereits im Dropdown darüber. */}
      {showPairs && (
        <div className="font-display text-[10px] tracking-widest uppercase font-bold text-gray-500">
          {stored ? 'Anderes Paar wählen' : 'oder Rotation aus dem Lineup'}
        </div>
      )}
      {showPairs && (
      <div className="flex flex-wrap gap-1.5">
        {pairs.map(pair => {
          const isActive = stored === pair
          const isRecommended = recommended === pair && !stored
          const blocked = takenByOther === pair
          return (
            <button
              key={pair}
              type="button"
              disabled={blocked}
              onClick={() => { setEditing(false); onPick(isActive ? null : pair, isActive ? currentReversed : false) }}
              title={
                blocked
                  ? `${getPairLabel(pair)} rotiert bereits am anderen Base`
                  : isActive
                    ? `${pairNames(pair)} — nochmal tippen entfernt die Rotation`
                    : `${pairNames(pair)}${isRecommended ? ' — Empfehlung' : ''}`
              }
              className={`relative font-display min-w-[78px] px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full transition-[background-color,color,border-color,transform,box-shadow] duration-150 min-h-[40px] xl:min-w-[64px] xl:px-2 xl:py-1 xl:min-h-[28px] whitespace-nowrap inline-flex items-center justify-center gap-1 touch-manipulation
                ${blocked
                  ? 'bg-cream-100 text-gray-300 border border-cream-200 cursor-not-allowed line-through'
                  : 'cursor-pointer hover:-translate-y-px active:scale-[0.96]'}
                ${isActive
                  ? 'bg-navy-900 text-white shadow-md'
                  : blocked ? '' : 'bg-cream-100 text-gray-700 hover:bg-cream-200 hover:text-navy-900 active:bg-cream-300 border border-cream-300'}`}
            >
              {getPairLabel(pair)}
              {isRecommended && (
                <span
                  className="absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-cream-50"
                  aria-label="Empfehlung"
                >
                  <StarIcon size={7} className="text-white fill-white" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      )}

      {stored ? (
        /* Zwei Zeilen reichen: wer coacht, wer wann übernimmt, und die drei
           Aktionen. Die frühere Primary/Backup-Karte wiederholte Paar-Label und
           Schlag-Fenster je zweimal und trug Spaltenköpfe für je einen Namen. */
        <div className="rounded-lg border border-cream-300 bg-cream-50 px-2 py-1.5">
          {/* Hierarchie statt Satz: der Name oben ist die Antwort auf „wer steht
              an der Base", die kleine Zeile darunter die Fußnote „und wenn der
              schlägt". Als Fließtext („X coacht, Y übernimmt Schlag …") brauchte
              dieselbe Information fünf Stilwechsel und drei Zeilen Umbruch. */}
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[15px] font-extrabold leading-none text-navy-900 truncate">
              {resolved.primary.name}
            </span>
            <span className="font-display text-[10px] tabular-nums leading-none text-gray-400">
              #{resolved.primary.pos}
            </span>
            <div className="ml-auto flex items-center gap-0.5 self-center">
              <button
                type="button"
                onClick={() => onPick(stored, !currentReversed)}
                className="p-1 rounded text-gray-400 hover:text-navy-900 hover:bg-cream-200 transition-colors cursor-pointer"
                title={`Tauschen — dann coacht ${resolved.backup.name}`}
                aria-label="Primary und Backup tauschen"
              >
                <ArrowsSwap size={12} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(e => !e)}
                className={`font-display px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer ${
                  editing ? 'bg-navy-900 text-white' : 'text-gray-400 hover:text-navy-900 hover:bg-cream-200'
                }`}
                title={`${getPairLabel(stored)} — anderes Paar wählen`}
              >
                Ändern
              </button>
              <button
                type="button"
                onClick={() => onPick(null, false)}
                className="p-1 rounded text-gray-400 hover:text-softball-red-600 hover:bg-softball-red-50 transition-colors cursor-pointer"
                title="Rotation entfernen"
                aria-label="Rotation entfernen"
              >
                <XMark size={12} />
              </button>
            </div>
          </div>
          <p className="mt-0.5 text-[10px] leading-tight text-gray-500">
            <span className="font-display font-bold text-gray-600">{resolved.backup.name}</span>
            <span className="font-display tabular-nums text-gray-400"> #{resolved.backup.pos}</span>
            {' '}übernimmt Schlag <span className="font-display tabular-nums">{resolved.backupCoverRange}</span>
          </p>
        </div>
      ) : (
        /* Kein gespeichertes Paar: nur ein Vorschlag, klar als solcher markiert. */
        <button
          type="button"
          onClick={() => onPick(recommended, false)}
          className="w-full text-left rounded-lg border border-dashed border-cream-400 bg-cream-50 px-2 py-1.5 text-[11px] leading-tight text-gray-600 hover:border-navy-500 hover:text-navy-900 transition-colors cursor-pointer"
          title={`${pairNames(recommended)} übernehmen`}
        >
          <span className="font-display font-bold tracking-widest uppercase text-[10px] text-gray-400">Vorschlag</span>{' '}
          <strong className="font-bold text-navy-900">{resolved.primary.name}</strong>
          {' / '}
          <strong className="font-bold text-navy-900">{resolved.backup.name}</strong>
          <span className="text-gray-400"> — antippen zum Übernehmen</span>
        </button>
      )}
    </div>
  )
}
