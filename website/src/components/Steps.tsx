import { Reveal, SectionTag } from '@/components/Reveal'
import { SwipeRow } from '@/components/SwipeRow'
import { Play } from '@phosphor-icons/react'

type Cell = {
  title: string
  text: string
  img?: string
  alt?: string
  variant?: 'cream' | 'solid' | 'brand'
  span?: string
}

/** Vorab-Videos: Werfen & Fangen schon zu Hause üben — inhaltlich Teil des
 *  Einstiegs (erweitert die Karte "Lernen im Teamtraining").
 *  Thumbnails kommen direkt vom YouTube-CDN (i.ytimg.com, statisch, keine
 *  Cookies) — bewusst KEINE iframes: die würden beim Seitenaufbau das
 *  komplette YouTube-JS nachladen (Ladezeit + DSGVO). Klick öffnet YouTube
 *  im neuen Tab. */
const VIDEOS: { id: string; title: string; channel: string }[] = [
  { id: 'r4n7ARPHE2w', title: 'Fangen lernen', channel: 'MegRem Softball' },
  { id: 'URcUxaCEpYU', title: 'Werfen lernen', channel: 'MegRem Softball' },
  { id: 'TQpEIJd7wQU', title: 'Werfen Schritt für Schritt', channel: 'MegRem Softball' },
  { id: 'Apv0YumOAjU', title: 'Wurftechnik verfeinern', channel: 'Coach Dan Blewett' },
]

const CELLS: Cell[] = [
  {
    title: 'Schau vorbei',
    text: 'Gib vorher kurz Bescheid — Vorkenntnisse brauchst du keine: Erst zugucken, dann selbst zum Bat.',
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
    // Kein zweites Mal die Ligennamen (RFL, College Series) — die stehen
    // in den Liga-Karten der Sektion 01 ("Wer wir sind", Sub-Eyebrow "Wo wir spielen").
    // Diese Karte erzählt den Weg, nicht die Fakten.
    text: 'Vom ersten Turnier bis in die Liga: Wer will, ist dabei — ohne Zwang.',
    variant: 'brand',
  },
]

export function Steps() {
  return (
    <section id="einstieg" className="grain scroll-mt-24 bg-navy-950">
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 md:pt-32">
        <Reveal>
          <SectionTag index="03">Der Einstieg</SectionTag>
          <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-wide text-cream-50 md:text-6xl">
            Einfach Dead Sox sein.
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

      {/* Vorab-Videos als Teil des Einstiegs: Full-Bleed SwipeRow wie die
          Galerie — Mobile (unter md) wischen, Desktop Grid. */}
      <div className="pb-16 md:pb-32">
        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 md:pt-16">
          <Reveal>
            <span
              aria-hidden
              className="font-mono text-xs tracking-[0.2em] text-ink-200/70"
            >
              Vorab üben
            </span>
            <h3 className="mt-3 font-display text-3xl leading-[0.95] tracking-wide text-cream-50 md:text-4xl">
              Skill-Upgrade in 2 Minuten.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-200">
              Werfen und Fangen als kurze Videos — damit du beim ersten
              Training nicht nur zum Zuschauen da bist.
            </p>
          </Reveal>
        </div>
        <div className="mt-8">
          <SwipeRow
            hideAt="md"
            tone="navy"
            desktop="md:mx-auto md:grid md:max-w-6xl md:grid-cols-2 md:gap-4 md:px-6 md:pb-0 lg:grid-cols-4"
          >
            {VIDEOS.map((video, i) => (
              <Reveal
                key={video.id}
                delay={Math.min(i * 0.06, 0.3)}
                className="w-[78%] shrink-0 snap-center md:w-auto md:shrink"
              >
                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Video ansehen: ${video.title} — ${video.channel} (öffnet YouTube)`}
                  className="press block"
                >
                  <article className="group flex size-full flex-col overflow-hidden rounded-sm border border-navy-700 bg-navy-900/60 transition-colors duration-200 hover:border-cream-50/25">
                    <div className="relative">
                      <img
                        src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                        alt={`Video-Thumbnail: ${video.title}`}
                        loading="lazy"
                        className="img-hover aspect-video w-full object-cover"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-navy-950/35">
                        <span className="grid size-12 place-items-center rounded-full bg-cream-50 text-navy-900 shadow-lg shadow-navy-950/40 transition-transform duration-200 group-hover:scale-110">
                          <Play size={18} weight="fill" className="ml-0.5" />
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <h4 className="font-display text-xl tracking-wide uppercase text-cream-50">
                        {video.title}
                      </h4>
                      <span className="font-mono text-xs tracking-[0.2em] text-ink-200/70">
                        {video.channel}
                      </span>
                    </div>
                  </article>
                </a>
              </Reveal>
            ))}
          </SwipeRow>
        </div>
      </div>
    </section>
  )
}
