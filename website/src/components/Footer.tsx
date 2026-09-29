import { Link } from 'react-router-dom'
import { EnvelopeSimple, InstagramLogo } from '@phosphor-icons/react'
import { INSTAGRAM, KONTAKT_MAIL } from '@/lib/contact'

const NAV_LINKS = [
  { label: 'Über uns', href: '#ueber-uns' },
  { label: 'Einstieg', href: '#einstieg' },
  { label: 'Training', href: '#training' },
  { label: 'Galerie', href: '#galerie' },
  { label: 'FAQ', href: '#faq' },
]

export function Footer() {
  return (
    <footer className="border-t border-navy-800/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <img
            src="/logo.jpeg"
            alt="Dead Sox Logo"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div>
            <p className="font-display text-xl tracking-wide">Dead Sox</p>
            <p className="mt-0.5 text-sm text-ink-200">
              Mixed-Fastpitch-Softballteam
              <br />
              des Düsseldorfer Hochschulsports
            </p>
          </div>
        </div>

        <nav aria-label="Seiten" className="flex flex-col gap-2.5">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-ink-200 transition-colors hover:text-cream-50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-medium text-cream-50">
            Orga: Hung Luu & Anne Steinfort
          </p>
          <a
            href={`mailto:${KONTAKT_MAIL}`}
            className="inline-flex items-center gap-2 text-sm text-ink-200 transition-colors hover:text-cream-50"
          >
            <EnvelopeSimple size={16} weight="duotone" />
            {KONTAKT_MAIL}
          </a>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-ink-200 transition-colors hover:text-cream-50"
          >
            <InstagramLogo size={16} weight="duotone" />
            @dusseldorf_deadsox
          </a>
        </div>

        <div className="flex flex-col gap-2.5 text-sm text-ink-200">
          <Link to="/impressum" className="transition-colors hover:text-cream-50">
            Impressum
          </Link>
          <Link to="/datenschutz" className="transition-colors hover:text-cream-50">
            Datenschutz
          </Link>
        </div>
      </div>

      <div className="border-t border-navy-800/60">
        <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 font-mono text-xs tracking-wide text-ink-200/70 sm:px-6">
          <span>© {new Date().getFullYear()} Dead Sox Düsseldorf</span>
          <span>Mixed Fastpitch · Hochschulsport Düsseldorf e.V.</span>
        </p>
      </div>
    </footer>
  )
}
