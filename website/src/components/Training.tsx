import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, MapPin } from '@phosphor-icons/react'
import { Reveal, SectionTag } from '@/components/Reveal'

type Slot = { day: string; time: string; what: string }
type Season = {
  label: string
  period: string
  location: string
  slots: Slot[]
}

const ANFAHRT = 'https://hss-d.de/allgemeines-organisatorisches/anfahrt-hochschulsport/'

const SEASONS: Record<'sommer' | 'winter', Season> = {
  sommer: {
    label: 'Sommer',
    period: 'April bis Oktober, draußen auf dem Rasenplatz',
    location: 'Hochschulsport Düsseldorf',
    slots: [
      { day: 'Montag', time: '20-22 Uhr', what: 'Pitcher & Catcher' },
      { day: 'Donnerstag', time: '19-22 Uhr', what: 'Teamtraining' },
      { day: 'Samstag', time: '13-15 Uhr', what: 'Teamtraining' },
    ],
  },
  winter: {
    label: 'Winter',
    period: 'November bis März, in der Halle',
    location: 'Hochschulsport Düsseldorf',
    slots: [
      { day: 'Montag', time: '20-22 Uhr', what: 'Pitcher & Catcher' },
      { day: 'Samstag', time: '15-17:30 Uhr', what: 'Teamtraining' },
    ],
  },
}

function currentSeason(): 'sommer' | 'winter' {
  const month = new Date().getMonth()
  return month >= 10 || month <= 2 ? 'winter' : 'sommer'
}

export function Training() {
  const auto = currentSeason()
  const [season, setSeason] = useState<'sommer' | 'winter'>(auto)
  const data = SEASONS[season]

  return (
    <section id="training" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <Reveal>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionTag index="04">Trainingszeiten</SectionTag>
              <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-wide md:text-6xl">
                Sommer wie Winter.
              </h2>
            </div>
            <div
              role="tablist"
              aria-label="Saison wählen"
              className="flex w-fit rounded-sm border border-navy-700 bg-navy-950 p-1"
            >
              {(['sommer', 'winter'] as const).map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={season === key}
                  onClick={() => setSeason(key)}
                  className={`press relative flex items-center gap-2 rounded-sm px-5 py-2 text-sm font-medium ${
                    season === key ? 'text-navy-950' : 'text-ink-200 hover:text-cream-50'
                  }`}
                >
                  {season === key && (
                    <motion.span
                      layoutId="season-thumb"
                      className="absolute inset-0 rounded-sm bg-cream-50"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{SEASONS[key].label}</span>
                  {key === auto && (
                    <span
                      aria-label="aktuelle Saison"
                      title="Aktuell"
                      className="relative size-2 rounded-full bg-brand-500"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={season}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="mt-12"
          >
            <div className="divide-y divide-navy-700/60">
              {data.slots.map((slot) => (
                <div
                  key={slot.day}
                  className="grid items-baseline gap-1 py-7 transition-colors duration-200 hover:bg-navy-900/40 md:grid-cols-[9rem_1fr_1fr] md:gap-6"
                >
                  <span className="font-display text-2xl uppercase tracking-wide text-cream-50 md:text-3xl">
                    {slot.day}
                  </span>
                  <span className="font-display text-5xl tracking-wide text-cream-50 md:text-7xl">
                    {slot.time}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-200 md:text-right">
                    {slot.what}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-navy-700/60 pt-6 text-sm text-ink-200">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink-200">
                Trainingsleitung · <span className="text-cream-50">Hung Luu</span>
              </span>
              <span className="max-sm:w-full max-sm:text-xs">{data.period}.</span>
              <a
                href={ANFAHRT}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-1.5 text-cream-50 hover:text-brand-500"
              >
                <MapPin size={16} weight="duotone" />
                {data.location}, Anfahrt auf hss-d.de
                <ArrowUpRight size={14} />
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
