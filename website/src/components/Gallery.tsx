import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import { Reveal, SectionTag } from '@/components/Reveal'
import { EdgeFade } from '@/components/EdgeFade'
import { SwipeRow } from '@/components/SwipeRow'

// Emotionale Abfolge + Bento-Layout: Auftakt → Action → Spannung → Detail → Individuum → Weite
const IMAGES = [
  {
    src: '/img/gallery/batter-action.webp',
    alt: 'Batter:in im Schlagwechsel',
    span: 'sm:col-span-2 lg:col-span-3',
    ratio: 'sm:aspect-[16/9]',
  },
  {
    src: '/img/gallery/catcher-batter.webp',
    alt: 'Catcher:in und Batter:in am Heimplate',
    span: '',
    ratio: 'sm:aspect-[4/3]',
  },
  {
    src: '/img/gallery/training-detail.webp',
    alt: 'Training mit Schlägern',
    span: '',
    ratio: 'sm:aspect-[4/3]',
  },
  {
    src: '/img/gallery/player-72.webp',
    alt: 'Dead Sox Spielerin auf dem Feld',
    span: '',
    ratio: 'sm:aspect-[4/3]',
  },
  {
    src: '/img/gallery/wide-field.webp',
    alt: 'Spielfeld im Überblick',
    span: 'sm:col-span-2 lg:col-span-2',
    ratio: 'sm:aspect-[21/9]',
  },
  {
    src: '/img/gallery/batting-training.webp',
    alt: 'Schlagtraining',
    span: '',
    ratio: 'sm:aspect-[21/9]',
  },
]

export function Gallery() {
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    if (active === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
      if (e.key === 'ArrowLeft') setActive((a) => (a === null ? null : (a + IMAGES.length - 1) % IMAGES.length))
      if (e.key === 'ArrowRight') setActive((a) => (a === null ? null : (a + 1) % IMAGES.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', active !== null)
    return () => document.body.classList.remove('overflow-hidden')
  }, [active])

  return (
    <section id="galerie" className="relative scroll-mt-24 bg-cream-50 text-navy-900">
      <EdgeFade edge="top" />
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 md:pt-32">
        <Reveal>
          <SectionTag index="05" tone="dark">
            Eindrücke
          </SectionTag>
          <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-wide md:text-6xl">
            Vom Feld, zwischen den Bases.
          </h2>
        </Reveal>
      </div>

      {/* Full-Bleed: Die Galerie läuft über die volle Viewport-Breite — kein Box-Layout.
          Mobile (unter sm): SwipeRow mit Pfeil-Hint statt 6 gestapelter Bilder. */}
      <div className="pb-16 md:pb-36">
        <SwipeRow hideAt="sm" desktop="sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-3 lg:auto-rows-[18rem]">
          {IMAGES.map((img, i) => (
            <Reveal
              key={img.src}
              delay={Math.min(i * 0.06, 0.3)}
              className={`${img.span} w-[78%] shrink-0 snap-center sm:w-auto sm:shrink ${
                img.span.includes('col-span') ? 'sm:size-full' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setActive(i)}
                className="press block size-full overflow-hidden rounded-none"
                aria-label={`Foto vergrößern: ${img.alt}`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className={`img-hover size-full aspect-[4/3] object-cover ${img.ratio} lg:aspect-auto lg:h-full`}
                />
              </button>
            </Reveal>
          ))}
        </SwipeRow>
      </div>
      <EdgeFade edge="bottom" />

      <AnimatePresence>
        {active !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 p-4 backdrop-blur-sm"
            onClick={() => setActive(null)}
          >
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => setActive(null)}
              className="press absolute right-4 top-4 grid size-11 place-items-center rounded-sm text-cream-50 hover:text-brand-500"
            >
              <X size={26} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Vorheriges Foto"
              onClick={(e) => {
                e.stopPropagation()
                setActive((a) => (a === null ? null : (a + IMAGES.length - 1) % IMAGES.length))
              }}
              className="press absolute left-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-sm text-cream-50 hover:text-brand-500 sm:left-6"
            >
              <CaretLeft size={30} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Nächstes Foto"
              onClick={(e) => {
                e.stopPropagation()
                setActive((a) => (a === null ? null : (a + 1) % IMAGES.length))
              }}
              className="press absolute right-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-sm text-cream-50 hover:text-brand-500 sm:right-6"
            >
              <CaretRight size={30} weight="bold" />
            </button>
            <motion.img
              key={active}
              src={IMAGES[active].src}
              alt={IMAGES[active].alt}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85dvh] w-auto max-w-full rounded-sm object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
