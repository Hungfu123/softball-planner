import { useState, useEffect, useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  title: string
  body: React.ReactNode
}

export function HelpPopover({ title, body }: Props) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <span className="relative inline-block">
      <button
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
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              id={popoverId}
              role="dialog"
              aria-modal="false"
              aria-labelledby={`${popoverId}-title`}
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-7 z-[60] w-72 max-w-[calc(100vw-2rem)] bg-cream-50 border border-cream-300 rounded-xl shadow-xl p-3"
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
      </AnimatePresence>
    </span>
  )
}
