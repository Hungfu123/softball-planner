import { type ReactNode } from 'react'
import { XMark } from '@/icons'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Bottom-Sheet auf mobile / Center-Modal auf Desktop. Tap auf Backdrop schließt. */
export function DetailSheet({ open, onClose, title, children }: SheetProps) {
  useBodyScrollLock(open)
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-cream-50 border-b border-cream-300 z-10">
          <div className="w-12 h-1.5 bg-cream-300 rounded-full mx-auto mt-3 sm:hidden" />
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-display text-lg font-extrabold tracking-wider uppercase text-navy-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-700 cursor-pointer"
              aria-label="Schließen"
            >
              <XMark size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
