import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Drawer } from 'vaul'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { portalOverlayClickable } from './portalOverlay'
import { motion, AnimatePresence } from 'motion/react'
import { XMark } from '@/icons'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  /** Mobile breakpoint in px below which we switch to bottom-sheet. Default 640 (sm). */
  mobileBreakpoint?: number
  /** Set true when opened from inside another ResponsiveSheet — uses Drawer.NestedRoot on mobile. */
  nested?: boolean
}

const MAX_WIDTH = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
} as const

/**
 * Responsive container: bottom-sheet auf Mobile (vaul Drawer),
 * Center-Modal auf Desktop. Beide teilen Title + Footer Slots.
 */
export function ResponsiveSheet({ open, onClose, title, children, footer, maxWidth = 'sm', mobileBreakpoint = 640, nested = false }: Props) {
  const isMobile = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(`(max-width: ${mobileBreakpoint - 1}px)`).matches

  // Mobile: vaul Drawer sperrt das Scrollen selbst. Desktop-Modal braucht eigenen Lock.
  useBodyScrollLock(open && !isMobile)

  if (isMobile) {
    const Root = nested ? Drawer.NestedRoot : Drawer.Root
    return (
      <Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content
            // Klicks in Portal-Overlays (ConfirmModal, BogenSlotEditModal, …) liegen außerhalb
            // dieses Layers und würden vauls Outside-Dismiss auslösen — das Sheet schliesst
            // sich, bevor der Handler des Overlays läuft (der Klick trifft ein unmountendes
            // Element). data-portal-overlay markiert solche Overlays; für sie nicht dismissen.
            onPointerDownOutside={(e) => {
              const target = e.target as HTMLElement | null
              if (target?.closest('[data-portal-overlay]')) e.preventDefault()
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl overflow-hidden max-h-[90vh] flex flex-col focus:outline-none"
          >
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            <div className="w-12 h-1.5 bg-cream-300 rounded-full mx-auto mt-3 shrink-0" />
            <div className="flex items-center justify-between px-5 py-3 border-b border-cream-300 shrink-0">
              <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
                {title}
              </h2>
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
      </Root>
    )
  }

  // Portal ans document.body: sonst wäre der Desktop-Dialog (fixed inset-0, Backdrop + Box)
  // ein DOM-Kind des aufrufenden ResponsiveSheet — dessen overflow-hidden würde ihn abschneiden,
  // wenn ein Sheet aus einem anderen heraus geöffnet wird (z.B. NewPlayerModal aus PollVoteSyncSheet).
  return createPortal(
    <AnimatePresence>
      {open && (
        <CenterModal onClose={onClose} title={title} maxWidth={maxWidth} footer={footer}>{children}</CenterModal>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function CenterModal({ onClose, title, maxWidth, footer, children }: { onClose: () => void; title: string; maxWidth: keyof typeof MAX_WIDTH; footer?: ReactNode; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    // Focus dialog on mount
    requestAnimationFrame(() => dialogRef.current?.focus())

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      // Focus-Trap: cycle within dialog
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [onClose])

  // portalOverlayClickable am Backdrop entkommt dem body-Lock eines offenen vaul-Drawers
  // (Details in PortalOverlay) — nötig, wenn dieses CenterModal selbst aus einem vaul
  // heraus geöffnet wird. data-portal-overlay braucht es hier bewusst NICHT: der Backdrop
  // gehört zum Sheet und soll darunterliegende Sheets sehr wohl schließen.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ${portalOverlayClickable}`}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={`bg-cream-50 border border-cream-300 rounded-2xl overflow-hidden shadow-xl w-full ${MAX_WIDTH[maxWidth]} max-h-[85vh] flex flex-col focus:outline-none`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-300 shrink-0">
          <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide flex items-center gap-2">
            <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
            {title}
          </h2>
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
      </motion.div>
    </motion.div>
  )
}
