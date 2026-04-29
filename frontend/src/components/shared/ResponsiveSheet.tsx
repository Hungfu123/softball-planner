import { useEffect, useRef, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { XMark } from '@/icons'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg'
  /** Mobile breakpoint in px below which we switch to bottom-sheet. Default 640 (sm). */
  mobileBreakpoint?: number
}

const MAX_WIDTH = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
} as const

/**
 * Responsive container: bottom-sheet auf Mobile (vaul Drawer),
 * Center-Modal auf Desktop. Beide teilen Title + Footer Slots.
 *
 * Verwendung:
 *   <ResponsiveSheet open={open} onClose={close} title="…" footer={<Buttons/>}>
 *     <Form />
 *   </ResponsiveSheet>
 */
export function ResponsiveSheet({ open, onClose, title, children, footer, maxWidth = 'sm', mobileBreakpoint = 640 }: Props) {
  // Match-media via window check (initial only — Drawer animates open/close anyway)
  const isMobile = typeof window !== 'undefined' && window.matchMedia(`(max-width: ${mobileBreakpoint - 1}px)`).matches

  if (!open) return null

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[90vh] flex flex-col focus:outline-none">
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
            <div className="flex items-center justify-between px-5 py-3 border-b border-cream-300 shrink-0">
              <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">{title}</h2>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
                <XMark size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
            {footer && (
              <div
                className="px-5 py-4 border-t border-cream-300 shrink-0"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
              >
                {footer}
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  return <CenterModal onClose={onClose} title={title} maxWidth={maxWidth} footer={footer}>{children}</CenterModal>
}

function CenterModal({ onClose, title, maxWidth, footer, children }: { onClose: () => void; title: string; maxWidth: keyof typeof MAX_WIDTH; footer?: ReactNode; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={`bg-cream-50 border border-cream-300 rounded-2xl shadow-xl w-full ${MAX_WIDTH[maxWidth]} max-h-[85vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-300 shrink-0">
          <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Schließen">
            <XMark size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-4 border-t border-cream-300 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
