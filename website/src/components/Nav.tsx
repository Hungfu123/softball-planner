import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { List, X } from '@phosphor-icons/react'
import { PROBETRAINING_MAILTO } from '@/lib/contact'

const LINKS = [
  { label: 'Wer wir sind', href: '#ueber-uns' },
  { label: 'Training', href: '#training' },
  { label: 'Galerie', href: '#galerie' },
  { label: 'FAQ', href: '#faq' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 24))

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', open)
    return () => document.body.classList.remove('overflow-hidden')
  }, [open])

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

            <button
              type="button"
              aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid size-11 place-items-center rounded-sm text-ink-200 transition-colors hover:bg-cream-50/10 hover:text-cream-50 md:hidden"
            >
              {open ? <X size={26} weight="bold" /> : <List size={26} weight="bold" />}
            </button>
         </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-navy-950/98 backdrop-blur-md md:hidden"
          >
            <div className="flex h-16 items-center justify-end px-4 sm:px-6">
              <button
                type="button"
                aria-label="Menü schließen"
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center rounded-sm text-ink-200 transition-colors hover:bg-cream-50/10 hover:text-cream-50"
              >
                <X size={26} weight="bold" />
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2 px-8">
              {[
                ...LINKS,
                { label: 'Impressum', href: '/impressum' },
                { label: 'Datenschutz', href: '/datenschutz' },
              ].map((link) =>
                link.href.startsWith('#') ? (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="py-3 font-display text-4xl tracking-wide text-cream-50"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className="py-3 font-display text-4xl tracking-wide text-cream-50"
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <a
                href={PROBETRAINING_MAILTO}
                onClick={() => setOpen(false)}
                className="press mt-6 self-start rounded-sm bg-brand-600 px-7 py-3.5 font-medium text-cream-50 hover:-translate-y-0.5 hover:bg-brand-500"
              >
                Komm zum Probetraining
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
