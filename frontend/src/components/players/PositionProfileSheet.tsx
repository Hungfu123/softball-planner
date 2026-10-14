import { useEffect, useState } from 'react'
import { ResponsiveSheet } from '@/components/shared'
import { Button } from '@/components/shared'
import type { Player, PositionSlot } from '@/types'
import { POSITION_SLOT_DESCRIPTIONS, POSITION_SLOT_LABELS, POSITION_SLOT_ORDER } from '@/types'

type Slots = [PositionSlot | null, PositionSlot | null, PositionSlot | null]

const SLOT_TITLES = ['Erste Position', 'Zweite Position', 'Dritte Position']
const SLOT_HINTS = [
  'Stammposten',
  'Springt dort ein',
  'Geht zur Not auch',
]

/**
 * Setzt das Positions-Profil. Antippen statt Dropdown: alle zwölf Werte liegen
 * offen, ein Tap reicht, und wer das Tablet am Feld bedient trifft 44px-Flächen.
 *
 * Zwei Regeln hält die UI selbst ein, damit das Backend nie ablehnen muss:
 * Eine schon vergebene Position wechselt den Platz (Tausch statt Fehlermeldung),
 * und Lücken rutschen zusammen — wer die Erste löscht, rückt die Zweite auf.
 */
export function PositionProfileSheet({ player, open, onClose, onSave }: {
  player: Player
  open: boolean
  onClose: () => void
  onSave: (slots: { primary: PositionSlot | null; secondary: PositionSlot | null; tertiary: PositionSlot | null }) => Promise<void>
}) {
  const [slots, setSlots] = useState<Slots>([null, null, null])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSlots([
      player.primaryPosition ?? null,
      player.secondaryPosition ?? null,
      player.tertiaryPosition ?? null,
    ])
  }, [open, player])

  /** Tap auf einen Wert: setzen, abwählen — und eine andernorts belegte Position tauschen. */
  const pick = (index: number, value: PositionSlot) => {
    setSlots(prev => {
      const next: Slots = [...prev] as Slots
      if (next[index] === value) {
        next[index] = null
      } else {
        const takenAt = next.findIndex(s => s === value)
        if (takenAt >= 0) next[takenAt] = next[index]
        next[index] = value
      }
      return compact(next)
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ primary: slots[0], secondary: slots[1], tertiary: slots[2] })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const unchanged =
    slots[0] === (player.primaryPosition ?? null) &&
    slots[1] === (player.secondaryPosition ?? null) &&
    slots[2] === (player.tertiaryPosition ?? null)

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title={`Positionen — ${player.name}`}
      maxWidth="lg"
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-navy-700 bg-white border border-cream-300 rounded-xl hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <Button variant="primary" onClick={handleSave} disabled={saving || unchanged} className="py-2.5 rounded-xl">
            {saving ? 'Speichern…' : 'Positionen speichern'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 px-5 py-4">
        {SLOT_TITLES.map((title, index) => (
          <section key={title}>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-navy-900">{title}</h3>
              <p className="text-[11px] text-gray-500">{SLOT_HINTS[index]}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POSITION_SLOT_ORDER.map(value => {
                const active = slots[index] === value
                const elsewhere = !active && slots.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => pick(index, value)}
                    aria-pressed={active}
                    title={POSITION_SLOT_DESCRIPTIONS[value]}
                    className={`min-w-11 h-11 px-3 rounded-xl font-display text-sm font-bold uppercase tracking-wide cursor-pointer transition-colors active:scale-95 motion-reduce:active:scale-100 ${
                      active
                        ? 'bg-navy-800 text-white'
                        : elsewhere
                          ? 'bg-cream-200 text-gray-400 line-through decoration-1'
                          : 'bg-white border border-cream-300 text-navy-800 hover:bg-navy-800 hover:text-white hover:border-navy-800'
                    }`}
                  >
                    {POSITION_SLOT_LABELS[value]}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
        <p className="text-[11px] text-gray-500 leading-relaxed">
          IF, OF und IF/OF decken mehrere Posten ab — für alle, die überall einsetzbar sind.
          Pitcher und Catcher stehen immer für sich und stecken in keiner Sammelposition.
        </p>
      </div>
    </ResponsiveSheet>
  )
}

/** Lücken schließen: eine leere Erstposition zieht die folgenden nach oben. */
function compact(slots: Slots): Slots {
  const filled = slots.filter((s): s is PositionSlot => !!s)
  return [filled[0] ?? null, filled[1] ?? null, filled[2] ?? null]
}
