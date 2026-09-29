import { ArrowUpRight, EnvelopeSimple, InstagramLogo } from '@phosphor-icons/react'
import { Reveal, SectionTag } from '@/components/Reveal'
import { EdgeFade } from '@/components/EdgeFade'
import { INSTAGRAM, KONTAKT_MAIL, PROBETRAINING_MAILTO } from '@/lib/contact'

export function Cta() {
  return (
    <section id="kontakt" className="relative scroll-mt-24 bg-cream-50 text-navy-900">
      <EdgeFade edge="top" />
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-44">
        <Reveal className="flex flex-col items-start gap-8">
          <SectionTag index="07" tone="dark">
            Mitmachen
          </SectionTag>
          <h2 className="font-display text-5xl font-black leading-[0.95] tracking-wide sm:text-6xl md:text-8xl">
            Sag kurz <span className="text-brand-600">Bescheid.</span>
          </h2>
          <p className="max-w-lg leading-relaxed text-navy-700">
            Eine kurze Mail reicht: sag uns, wann du kommst. Und wenn du erst mal nur
            schauen willst: Auf Instagram zeigen wir, was bei uns los ist.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={PROBETRAINING_MAILTO}
              className="press rounded-sm bg-navy-900 px-7 py-3.5 font-medium text-cream-50 hover:-translate-y-0.5 hover:bg-navy-700"
            >
              <EnvelopeSimple size={18} weight="duotone" className="mr-1 inline align-[-3px]" />
              Schreib uns eine Mail
            </a>
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="press rounded-sm border border-navy-900/30 px-7 py-3.5 font-medium hover:-translate-y-0.5 hover:border-navy-900/60"
            >
              <InstagramLogo size={18} weight="duotone" className="mr-1 inline align-[-3px]" />
              Instagram
              <ArrowUpRight size={14} className="ml-1 inline" />
            </a>
          </div>
          <p className="font-mono text-xs tracking-wide text-navy-700/70">
            {KONTAKT_MAIL} · Dead Sox · Hochschulsport Düsseldorf
          </p>
        </Reveal>
      </div>
      <EdgeFade edge="bottom" />
    </section>
  )
}
