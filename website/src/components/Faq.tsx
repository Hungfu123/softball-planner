import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from '@phosphor-icons/react'
import { Reveal, SectionTag } from '@/components/Reveal'
import { KONTAKT_MAIL } from '@/lib/contact'

const HSS = 'https://hss-d.de'

const FAQS = [
  {
    q: 'Ich habe noch nie Softball gespielt.',
    a: 'Erstens: Das ist keine Frage. Zweitens: Das sagt hier jede:r am ersten Tag — und die Antwort ist seit Jahren dieselbe: Deshalb existiert dieses Team. Fast alle von uns haben an der Uni angefangen, die meisten ohne eine Sekunde Ballsport-Erfahrung. Alles lernst du im Training.',
  },
  {
    q: 'Brauche ich eigene Ausrüstung?',
    a: 'Nein. Wir haben aufgehört mitzuzählen, wie oft wir das gefragt wurden: Bat, Bälle, Handschuhe und Helme stellt das Team. Bring Sportsachen mit und ein bisschen Neugier, den Rest haben wir.',
  },
  {
    q: 'Was kostet es?',
    a: 'Das Training läuft als Kurs des Düsseldorfer Hochschulsports, die aktuellen Teilnahmebeiträge stehen auf hss-d.de. Und nein — daran hat sich nichts geändert, seit du es das letzte Mal nachgeschlagen hast.',
  },
  {
    q: 'Wo und wann trainiert ihr?',
    a: 'Steht alles auf dieser Seite — aber schön, gern auch zum hundertsten Mal: im Sommer draußen auf dem Rasenplatz, im Winter in der Halle, beim Hochschulsport Düsseldorf. Die genauen Zeiten zwei Sektionen weiter oben bei „Training“, die Anfahrt auf der Hochschulsport-Seite.',
  },
  {
    q: 'Ich studiere nicht in Düsseldorf. Kann ich trotzdem mitmachen?',
    a: 'Diese Frage kommt jede Woche. Die Antwort ändert sich trotzdem nicht: Das Training ist ein Angebot des Hochschulsports und meistens auch für externe Teilnehmende offen. Im Zweifel: schreib uns, wir klären das gemeinsam.',
  },
  {
    q: 'Wie bleibe ich auf dem Laufenden?',
    a: 'Instagram: @dusseldorf_deadsox. Ja, das ist auch die Antwort auf „Wie bleibe ich auf dem Laufenden?“ — dort posten wir Trainings, Turniere und alles, was im Team passiert.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <Reveal>
          <SectionTag index="06">Fragen &amp; Antworten</SectionTag>
          <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-wide md:text-6xl">
            Die Fragen, die immer kommen.
          </h2>
        </Reveal>

        <div className="mt-12 max-w-3xl divide-y divide-navy-700/60">
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            return (
              <Reveal key={faq.q} delay={Math.min(i * 0.06, 0.3)}>
                <div className="flex gap-4 sm:gap-6">
                  <span
                    aria-hidden
                    className="pt-5 font-display text-3xl leading-none tracking-wide text-cream-50/10 md:text-4xl shrink-0"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="press group flex w-full items-center justify-between gap-4 py-6 text-left hover:text-cream-50"
                    >
                      <span className="text-lg font-medium transition-colors group-hover:text-cream-50">
                        {faq.q}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="grid size-9 shrink-0 place-items-center rounded-sm border border-navy-600 text-cream-50 transition-colors group-hover:border-brand-500 group-hover:text-brand-500"
                      >
                        <Plus size={16} weight="bold" />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-xl pb-6 leading-relaxed text-ink-200">
                            {faq.a}
                            {i === 2 && (
                              <>
                                {' '}
                                <a
                                  href={HSS}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cream-50 underline decoration-brand-500 underline-offset-4 hover:text-brand-500"
                                >
                                  Zu hss-d.de
                                </a>
                              </>
                            )}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-8 text-sm text-ink-200">
          Deine Frage fehlt? Respekt — das kommt tatsächlich selten vor. Schreib
          uns an{' '}
          <a
            href={`mailto:${KONTAKT_MAIL}`}
            className="text-cream-50 underline decoration-brand-500 underline-offset-4 hover:text-brand-500"
          >
            {KONTAKT_MAIL}
          </a>
          .
        </Reveal>
      </div>
    </section>
  )
}
