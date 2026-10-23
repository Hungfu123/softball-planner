import { useEffect, type ReactNode } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { Button, PortalOverlay } from '@/components/shared'

interface Props {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Ankündigung vor einer Aktion, die nichts zerstört, aber viel auslöst: wie ConfirmModal, nur
 * ohne die rote Warnung — Rot bleibt negativen Signalen vorbehalten. Portalt nach body.
 */
export function AnkuendigungModal({ title, children, confirmLabel, onConfirm, onCancel }: Props) {
  useBodyScrollLock(true)

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [onCancel])

  return (
    <PortalOverlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ankuendigung-titel"
        className="bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-cream-300">
          <h2 id="ankuendigung-titel" className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <div className="px-4 py-5 text-sm text-gray-600 space-y-2">{children}</div>
        <div className="px-4 py-3 border-t border-cream-300 flex justify-end gap-2">
          <Button variant="ghost" className="min-h-11" onClick={onCancel}>Abbrechen</Button>
          <Button variant="navy" className="min-h-11" autoFocus onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </PortalOverlay>
  )
}
