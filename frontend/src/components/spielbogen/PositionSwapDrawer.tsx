import { useState, useMemo } from 'react'
import { Drawer } from 'vaul'
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

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl flex flex-col focus:outline-none"
          style={{ maxHeight: '90vh' }}
        >
          <Drawer.Title className="sr-only">Positionen tauschen</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />

          <div className="px-4 py-3 border-b border-cream-200 shrink-0 flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-navy-900 uppercase tracking-wide">
              Positionen tauschen — {side === 'HOME' ? 'Heim' : 'Gast'}
            </h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
              ✕
            </button>
          </div>

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

          <div className="flex-1 overflow-y-auto px-4 py-2">
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

          <div className="px-4 py-3 border-t border-cream-200 shrink-0 flex gap-2"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={onClose}
              className="flex-1 py-2.5 font-display text-xs font-bold tracking-widest uppercase rounded-xl border border-navy-700 text-navy-700 hover:bg-navy-50 cursor-pointer transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-2.5 font-display text-xs font-bold tracking-widest uppercase rounded-xl bg-navy-800 text-white hover:bg-navy-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Speichere…' : `Tauschen (${changes.length})`}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
