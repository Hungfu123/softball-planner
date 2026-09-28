import { Reveal, RevealImg, SectionTag } from '@/components/Reveal'

const FORMATE = [
  {
    name: 'College Series',
    meta: 'Sommer',
    text: 'Die Deutsche Hochschulmeisterschaft im Softball: Uni-Teams aus ganz Deutschland.',
  },
  {
    name: 'RFL',
    meta: 'Ruhr Fun Liga',
    text: 'Mixed-Liga im Ruhrgebiet: Spiele gegen Teams, bei denen das Ergebnis zweitrangig ist.',
  },
  {
    name: 'Indoor Series',
    meta: 'Winter',
    text: 'Wenn es draußen kalt wird, spielen wir in der Halle weiter. Gleicher Sport, kürzere Wege.',
  },
]

export function About() {
  return (
    <section id="ueber-uns" className="scroll-mt-24 overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="flex flex-col justify-center">
            <SectionTag index="01">Wer wir sind</SectionTag>
            <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-wide md:text-6xl">
              Bei uns spielt{' '}
              <span className="underline decoration-brand-500 decoration-4 underline-offset-8">
                jeder
              </span>{' '}
              mit, egal wie lange schon.
            </h2>
            <p className="mt-7 max-w-lg leading-relaxed text-ink-200">
              Die Dead Sox sind die Softball-Abteilung des Düsseldorfer Hochschulsports. Auf dem
              Feld sind wir einfach ein Team: Studierende, Alumni und Externe.
            </p>
            <p className="mt-4 max-w-lg leading-relaxed text-ink-200">
              Im Sommer trainieren wir zweimal pro Woche draußen, im Winter einmal in der Halle.
              In der RFL und der Indoor Series stehen uns dann Vereine gegenüber. Und wenn die
              Saison vorbei ist, treffen wir uns noch mal alle. Diesmal ohne Handschuhe.
            </p>
          </Reveal>

          {/* Bildkollage blutet auf Desktop rechts aus dem Container — bewusster Grid-Bruch */}
          <div className="grid grid-cols-2 gap-4 lg:-mr-24">
            <RevealImg
              src="/img/team-portrait.webp"
              alt="Dead Sox beim Training"
              className="h-full w-full translate-y-0 object-cover lg:aspect-[2/3] lg:translate-y-10"
            />
            <div className="flex flex-col gap-4">
              <RevealImg
                src="/img/gallery/player-72.webp"
                alt="Dead Sox Spielerin auf dem Feld"
                className="aspect-[4/3] w-full object-cover"
              />
              <RevealImg
                src="/img/gallery/training-detail.webp"
                alt="Dead Sox beim Schlagtraining"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Ligen-Karten: volle Breite unter dem Text-Bild-Grid —
            vorher in der schmalen Textspalte gequetscht, lief "Hochschulmeisterschaft" über den Rand */}
        <Reveal className="mt-10 lg:mt-14">
          {/* Sub-Eyebrow statt SectionTag-Kopie: bewusst OHNE Nummer — die Sektion
              ist bereits "01 — Wer wir sind", ein zweites "01" würde die Kapitel-Zählung brechen */}
          <p className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-brand-500">
            <span aria-hidden className="size-1.5 rotate-45 bg-current" />
            Wo wir spielen
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATE.map((format) => (
              <div
                key={format.name}
                className="grain group relative overflow-hidden rounded-sm border border-navy-600 bg-navy-900/60 p-5 transition-colors duration-200 hover:border-cream-300/40"
              >
                <span aria-hidden className="card-accent" />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-2xl tracking-wide text-cream-50">
                    {format.name}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-500">
                    {format.meta}
                  </span>
                </div>
                <p className="mt-3 break-words text-sm leading-relaxed text-ink-200">
                  {format.text}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
