import { useEffect, useState } from 'react'
import { XMark } from '@/icons'
import { Button, PortalOverlay } from '@/components/shared'
import type { SpielbogenSlotResponse, UpdateSlotRequest } from '@/types'

const POSITION_OPTIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'EH', 'DH']

interface Props {
  open: boolean
  onClose: () => void
  slot: SpielbogenSlotResponse | null
  onSubmit: (slotId: number, req: UpdateSlotRequest) => Promise<void>
}

export function BogenSlotEditModal({ open, onClose, slot, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState<string>('')
  const [battingOrder, setBattingOrder] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when slot changes (modal re-opened for different slot)
  useEffect(() => {
    if (open && slot) {
      setName(slot.name)
      setPosition(slot.position ?? '')
      setBattingOrder(slot.battingOrder)
      setError(null)
    }
  }, [open, slot])

  if (!open || !slot) return null

  const trimmedName = name.trim()
  const canSubmit =
    !!trimmedName &&
    battingOrder >= 1 && battingOrder <= 10 &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(slot.id, {
        name: trimmedName,
        position: position || null,
        battingOrder,
      })
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  // PortalOverlay: wird aus dem offenen Spielbogen-Drawer heraus geöffnet, der selbst
  // ans body portalt — ohne Portal läge dieses Modal als #root-Kind hinter dem Drawer.
  // Zusätzlich die beiden Schutzmechanismen gegen den Radix-Lock eines offenen
  // vaul-Drawers (Details in PortalOverlay).
  return (
    <PortalOverlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-edit-title"
        className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream-300">
          <h2 id="slot-edit-title" className="text-lg font-bold text-gray-900">Slot bearbeiten</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
            <XMark size={20} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Position</span>
            <select
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            >
              <option value="">— (keine)</option>
              {POSITION_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-display font-bold text-navy-900 uppercase tracking-wide mb-1">Batting-Order</span>
            <input
              type="number"
              min={1}
              max={10}
              value={battingOrder}
              onChange={e => setBattingOrder(Math.max(1, Math.min(10, parseInt(e.target.value || '1', 10))))}
              className="w-full px-3 py-2 border border-cream-300 rounded font-body text-sm bg-white"
            />
          </label>

          {error && (
            <div className="text-softball-red-700 font-body text-sm">{error}</div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-cream-300 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="navy" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Speichere…' : 'Speichern'}
          </Button>
        </div>
      </div>
    </PortalOverlay>
  )
}
