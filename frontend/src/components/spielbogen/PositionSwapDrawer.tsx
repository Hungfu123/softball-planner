import { useState, useMemo } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { Button } from '@/components/shared'
import type { BogenSide, SpielbogenSlotResponse, PositionSwapEntry } from '@/types'

const POSITION_OPTIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DH']

interface Props {
  open: boolean
  onClose: () => void
  side: BogenSide
  slots: SpielbogenSlotResponse[]
  currentInning: number
  onSubmit: (req: { inning: number; changes: PositionSwapEntry[] }) => Promise<void>
}

export function PositionSwapDrawer({ open, onClose, side, slots, currentInning, onSubmit }: Props) {
  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => a.battingOrder - b.battingOrder),
    [slots],
  )
  const [draft, setDraft] = useState<Record<number, string | null>>(() =>
    Object.fromEntries(sortedSlots.map(s => [s.id, s.position ?? null])),
  )
  const [inning, setInning] = useState<number>(currentInning)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changes: PositionSwapEntry[] = sortedSlots
    .filter(s => (draft[s.id] ?? null) !== (s.position ?? null))
    .map(s => ({ slotId: s.id, newPosition: draft[s.id] }))

  const duplicate = (() => {
    const seen = new Set<string>()
    for (const s of sortedSlots) {
      const pos = draft[s.id]
      if (!pos || pos === 'EH') continue
      if (seen.has(pos)) return pos
      seen.add(pos)
    }
    return null
  })()

  const canSubmit = changes.length > 0 && !duplicate && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ inning, changes })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="secondary" onClick={onClose} className="h-11">
        Abbrechen
      </Button>
      <Button variant="navy" onClick={handleSubmit} disabled={!canSubmit} className="h-11 font-bold">
        {submitting ? 'Speichere…' : `Tauschen (${changes.length})`}
      </Button>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title={`Positionen tauschen — ${side === 'HOME' ? 'Heim' : 'Gast'}`} maxWidth="lg" footer={footer}>
      <div className="px-4 py-2 shrink-0">
        <label className="font-body text-xs text-gray-700">
          Inning:&nbsp;
          <input
            type="number"
            min={1}
            value={inning}
            onChange={(e) => setInning(Math.max(1, parseInt(e.target.value || '1', 10)))}
            className="w-14 px-1 py-0.5 border border-gray-300 rounded font-display text-sm"
          />
        </label>
      </div>

      <div className="px-4 py-2">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-cream-50">
            <tr className="border-b border-cream-300">
              <th className="text-left py-1 font-display font-bold text-navy-900">#</th>
              <th className="text-left py-1 font-display font-bold text-navy-900">Name</th>
              <th className="text-left py-1 font-display font-bold text-navy-900">Aktuell</th>
              <th className="text-left py-1 font-display font-bold text-navy-900">Neu</th>
            </tr>
          </thead>
          <tbody>
            {sortedSlots.map(slot => {
              const newPos = draft[slot.id] ?? null
              const changed = newPos !== (slot.position ?? null)
              return (
                <tr key={slot.id} className={changed ? 'bg-amber-50' : ''}>
                  <td className="py-1 font-display font-bold text-navy-700">{slot.battingOrder}</td>
                  <td className="py-1 font-body text-navy-900">{slot.name}</td>
                  <td className="py-1 font-display text-navy-500 uppercase">{slot.position ?? '—'}</td>
                  <td className="py-1">
                    <select
                      value={newPos ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, [slot.id]: e.target.value || null }))}
                      className="px-1 py-0.5 border border-gray-300 rounded font-display text-sm"
                    >
                      <option value="">— (keine)</option>
                      {POSITION_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {duplicate && (
        <div className="px-4 py-2 text-softball-red-700 font-body text-sm">
          Position {duplicate} ist doppelt belegt.
        </div>
      )}
      {error && (
        <div className="px-4 py-2 text-softball-red-700 font-body text-sm">{error}</div>
      )}
    </ResponsiveSheet>
  )
}
