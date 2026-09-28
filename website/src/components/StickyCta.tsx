import { useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { PROBETRAINING_MAILTO } from '@/lib/contact'

export function StickyCta() {
  const [visible, setVisible] = useState(false)
  const { scrollY } = useScroll()

  // Erst einblenden, wenn der Hero (inkl. seiner CTAs) verlassen wurde
  useMotionValueEvent(scrollY, 'change', (latest) =>
    setVisible(latest > window.innerHeight * 0.9),
  )

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 88 }}
          animate={{ y: 0 }}
          exit={{ y: 88 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-4 bottom-4 z-40 md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <a
            href={PROBETRAINING_MAILTO}
            className="press block rounded-sm bg-brand-600 py-3.5 text-center font-medium text-cream-50 shadow-lg shadow-navy-950/40 hover:-translate-y-0.5 hover:bg-brand-500"
          >
            Komm zum Probetraining
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
