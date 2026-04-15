import { useEffect, useRef } from 'react'
import { XMark, AlertTriangle } from '@/icons'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ title, message, confirmLabel = 'Löschen', onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="confirm-modal-title" className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
            <XMark size={20} />
          </button>
        </div>

        <div className="px-4 py-5 flex items-start gap-3">
          <AlertTriangle size={24} className="text-softball-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="px-4 py-2 text-sm font-medium text-white bg-softball-red-600 rounded-lg hover:bg-softball-red-500 cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
