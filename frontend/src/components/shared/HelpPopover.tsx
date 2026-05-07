import { useState, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  title: string
  body: React.ReactNode
}

export function HelpPopover({ title, body }: Props) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setCoords({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-5 h-5 inline-flex items-center justify-center rounded-full border border-gray-400 text-gray-500 text-[11px] font-bold hover:bg-gray-100 cursor-pointer"
        aria-label={`Hilfe: ${title}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
      >
        ?
      </button>
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && coords && (
            <>
              <div className="fixed inset-0 z-[1000]" onClick={() => setOpen(false)} />
              <motion.div
                id={popoverId}
                role="dialog"
                aria-modal="false"
                aria-labelledby={`${popoverId}-title`}
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 1001 }}
                className="w-72 max-w-[calc(100vw-2rem)] bg-cream-50 border border-cream-300 rounded-xl shadow-xl p-3"
              >
                <div id={`${popoverId}-title`} className="font-display text-xs font-extrabold tracking-widest uppercase text-navy-900 mb-1.5">
                  {title}
                </div>
                <div className="text-xs text-gray-700 leading-relaxed space-y-1.5">
                  {body}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-2 text-[10px] font-bold tracking-widest uppercase text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Schließen
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
