import { useEffect, useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { PROBETRAINING_MAILTO } from '@/lib/contact'

const LINKS = [
  { label: 'Über uns', href: '#ueber-uns' },
  { label: 'Einstieg', href: '#einstieg' },
  { label: 'Training', href: '#training' },
  { label: 'Galerie', href: '#galerie' },
  { label: 'FAQ', href: '#faq' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [active, setActive] = useState('')
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 24)
    setPastHero(latest > window.innerHeight * 0.85)
  })

  /* Scroll-Spy: aktiv ist die Sektion, die durch die Bildmitte läuft.
     Ein-Tap-Navigation braucht die Rückmeldung, wo man gerade ist. */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    LINKS.forEach(({ href }) => {
      const el = document.querySelector(href)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Skip-Link: unsichtbar, bis er per Tastatur fokussiert wird */}
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-base focus:font-medium focus:text-cream-50"
      >
        Zum Inhalt springen
      </a>
      <header className="fixed inset-x-0 top-0 z-40">
        {/* Backdrop-Layer reicht 8px über den Viewport: der helle Rand-
            Artefakt von backdrop-filter landet damit off-screen. */}
        <div
          aria-hidden
          className={`absolute inset-x-0 -top-2 bottom-0 border-b transition-colors duration-200 ${
            scrolled
              ? 'border-navy-800/60 bg-navy-950/85 backdrop-blur-md'
              : 'border-transparent bg-transparent'
          }`}
        />
        <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-[72px]">
          <a href="#top" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <img
              src="/logo.jpeg"
              alt="Dead Sox Logo"
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="font-display text-3xl tracking-wide">Dead Sox</span>
          </a>

          {/* Mobile: kein Nav-CTA mehr — Hero-CTA am Anfang, Sticky-CTA
              beim Scrollen und die Cta-Sektion unten decken den Intent ab.
              Ein dritter roter Button oben wäre nur Redundanz
              (CTA-Intent-Regel: eine persistente Fläche pro Intent). */}

          <div className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative text-base font-medium text-ink-200 transition-colors duration-200 after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:bg-brand-500 after:transition-all after:duration-200 hover:text-cream-50 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
            <a
              href={PROBETRAINING_MAILTO}
              className="press rounded-sm bg-brand-600 px-6 py-2.5 text-base font-medium text-cream-50 hover:-translate-y-0.5 hover:bg-brand-500"
            >
              Probetraining
            </a>
          </div>
        </nav>

        {/* Mobile Sektions-Navigation: erscheint erst, wenn der Hero
            verlassen ist — der Einstieg bleibt unverstellt. */}
        {pastHero && (
          <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="relative border-b border-navy-800/60 bg-navy-950/90 backdrop-blur-md md:hidden"
          >
            {/* Kompakt-Pills: 5 Einträge passen ohne horizontales Scrollen
                (Nutzerwunsch) — engeres Padding/Gap statt Wisch-Leiste.
                Rein statisch, damit justify-center exakt mittig sitzt
                (overflow-x-auto verschiebt die Zentrierung, siehe Bug-Runde). */}
            <div className="flex items-center justify-center gap-1 px-3 py-2">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={active === link.href ? 'location' : undefined}
                  className={`press shrink-0 rounded-sm px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    active === link.href
                      ? 'bg-cream-50 text-navy-950'
                      : 'text-ink-200 hover:text-cream-50'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </header>
    </>
  )
}
