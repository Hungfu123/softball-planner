import { motion, useReducedMotion } from 'motion/react'
import { PROBETRAINING_MAILTO } from '@/lib/contact'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
}

export function Hero() {
  const reduce = useReducedMotion()

  return (
    <section id="top" className="relative flex min-h-[100dvh] items-center overflow-hidden">
      <motion.img
        src="/img/hero-team.webp"
        alt="Dead Sox Team auf dem Softballfeld"
        className="absolute inset-0 size-full object-cover object-[center_45%]"
        initial={reduce ? false : { scale: 1.02 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/55 to-navy-950" />
      {/* Seitlicher Scrim: dunkelt nur die Textzone ab — das Bild rechts bleibt sichtbar */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/70 via-navy-950/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-navy-950 via-navy-950/60 to-transparent" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6"
      >
        <motion.p
          variants={item}
          className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-cream-300"
        >
          <span aria-hidden className="h-px w-8 bg-brand-500" />
          Mixed Fastpitch · Düsseldorf
        </motion.p>
         <motion.h1
           variants={item}
           className="mt-5 max-w-5xl font-display text-[clamp(3.75rem,12.5vw,9.5rem)] font-black leading-[0.9] tracking-wide text-cream-50 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)]"
         >
           <span className="text-outline">Lust auf</span>{' '}
           Softball
           <span className="text-brand-500">?</span>
         </motion.h1>
        <motion.p variants={item} className="mt-6 max-w-md text-lg leading-relaxed text-ink-200">
           Mixed Softball beim Hochschulsport Düsseldorf. Offen für alle, die es einfach mal
           ausprobieren wollen.
        </motion.p>
        <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-4">
          <a
            href={PROBETRAINING_MAILTO}
            className="press rounded-sm bg-brand-600 px-7 py-3.5 font-medium text-cream-50 hover:-translate-y-0.5 hover:bg-brand-500"
          >
            Komm zum Probetraining
          </a>
          <a
            href="#ueber-uns"
            className="press rounded-sm border border-cream-50/30 px-7 py-3.5 text-cream-50 hover:-translate-y-0.5 hover:border-cream-50/70 hover:bg-cream-50/5"
          >
            Wer wir sind
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
