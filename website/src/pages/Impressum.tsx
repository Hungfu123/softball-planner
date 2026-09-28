import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useHead } from '@/lib/head'

export default function Impressum() {
  useHead({ title: 'Impressum - Dead Sox', noindex: true })

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-ink-200 transition-colors hover:text-cream-50"
      >
        <ArrowLeft size={14} />
        Zurück zur Startseite
      </Link>

      <h1 className="mt-10 font-display text-6xl tracking-wide">Impressum</h1>

      <div className="mt-10 space-y-8 leading-relaxed text-ink-200">
        <section>
          <h2 className="font-medium text-cream-50">Angaben gemäß § 5 DDG</h2>
          <p className="mt-2">
            Dead Sox Düsseldorf
            <br />
            Softballteam des Hochschulsport Düsseldorf e.&nbsp;V.
            <br />
            Universitätsstr. 1, 40225 Düsseldorf
          </p>
        </section>

        <section>
          <h2 className="font-medium text-cream-50">Kontakt</h2>
          <p className="mt-2">
            Über den Hochschulsport Düsseldorf e.&nbsp;V.:
            <br />
            E-Mail:{' '}
            <a href="mailto:info@hss-d.de" className="underline decoration-brand-500 underline-offset-4">
              info@hss-d.de
            </a>
            <br />
            Telefon: 0211 81 13285
          </p>
        </section>

        <section>
          <h2 className="font-medium text-cream-50">Verantwortlich für den Inhalt</h2>
          <p className="mt-2">
            Hung Luu, Anne Steinfort
            <br />
            Universitätsstr. 1, 40225 Düsseldorf
          </p>
        </section>

        <section>
          <h2 className="font-medium text-cream-50">Hosting</h2>
          <p className="mt-2">
            Hetzner Online GmbH
            <br />
            Industriestr. 25, 91710 Gunzenhausen
          </p>
        </section>
      </div>
    </main>
  )
}
