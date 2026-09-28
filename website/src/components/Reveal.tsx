import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type RevealProps = {
  children: ReactNode
  delay?: number
  className?: string
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Bild-Reveal per clip-path: wischt von unten auf, wie ein Vorhang — nie scale(0). */
export function RevealImg({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  eager?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <div className="overflow-hidden">
      <motion.img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        className={className}
        initial={reduce ? false : { clipPath: 'inset(0 0 100% 0)' }}
        whileInView={{ clipPath: 'inset(0 0 0% 0)' }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
      />
    </div>
  )
}

/** Mono-Sektionslabel im Scorecard-Stil: "01 — Wer wir sind" */
export function SectionTag({
  index,
  tone = 'light',
  children,
}: {
  index: string
  tone?: 'light' | 'dark'
  children: ReactNode
}) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] ${
        tone === 'light' ? 'text-ink-200' : 'text-navy-700'
      }`}
    >
      <span className={tone === 'dark' ? 'text-brand-600' : 'text-brand-500'}>{index}</span>
      <span aria-hidden className="h-px w-6 bg-current opacity-40" />
      {children}
    </p>
  )
}
