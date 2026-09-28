import { Reveal, SectionTag } from '@/components/Reveal'

type Cell = {
  title: string
  text: string
  img?: string
  alt?: string
  variant?: 'cream' | 'solid' | 'brand'
  span?: string
}

const CELLS: Cell[] = [
  {
    title: 'Schau vorbei',
    text: 'Ohne Anmeldung, ohne Vorkenntnisse: Erst zugucken, dann selbst zum Bat.',
    img: '/img/gallery/group-training.webp',
    alt: 'Dead Sox beim Training auf dem Feld',
    span: 'md:col-span-2',
    variant: 'solid',
  },
  {
    title: 'Lernen im Teamtraining',
    text: 'Werfen, Fangen, Bases, Regeln: Du lernst alles von Grund auf, in deinem Tempo.',
    variant: 'cream',
  },
  {
    title: 'Spiel mit',
    // Kein zweites Mal die Ligennamen (RFL, College Series) — die stehen in 01 "Wo wir spielen".
    // Diese Karte erzählt den Weg, nicht die Fakten.
    text: 'Vom ersten Turnier bis in die Liga: Wer will, ist dabei — ohne Zwang.',
    variant: 'brand',
  },
]

export function Steps() {
  return (
    <section className="grain bg-navy-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-32">
        <Reveal>
          <SectionTag index="03">Der Einstieg</SectionTag>
          <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-wide text-cream-50 md:text-6xl">
            In drei Schritten auf den Diamant.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {CELLS.map((cell, i) => (
            <Reveal key={cell.title} delay={i * 0.07} className={cell.span}>
              <article
                className={`group flex size-full flex-col overflow-hidden rounded-sm transition-colors duration-200 ${
                  cell.variant === 'cream'
                    ? 'bg-cream-50 text-navy-900'
                    : cell.variant === 'brand'
                      ? 'bg-brand-600 text-cream-50'
                      : 'border border-navy-700 bg-navy-900/60 text-cream-50 hover:border-cream-50/25'
                }`}
              >
                {cell.img && (
                  <img
                    src={cell.img}
                    alt={cell.alt}
                    className="img-hover aspect-[16/9] w-full object-cover object-[center_30%]"
                    loading="lazy"
                  />
                )}
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <span
                    aria-hidden
                    className={`font-mono text-xs tracking-[0.2em] ${
                      cell.variant === 'cream'
                        ? 'text-navy-900/50'
                        : cell.variant === 'brand'
                          ? 'text-cream-50/60'
                          : 'text-ink-200/70'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')} / 03
                  </span>
                  <h3 className="font-display text-3xl tracking-wide uppercase">{cell.title}</h3>
                  <p
                    className={`max-w-md text-sm leading-relaxed ${
                      cell.variant === 'cream'
                        ? 'text-navy-700'
                        : cell.variant === 'brand'
                          ? 'text-cream-100'
                          : 'text-ink-200'
                    }`}
                  >
                    {cell.text}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
