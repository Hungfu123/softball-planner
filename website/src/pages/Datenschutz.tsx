import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useHead } from '@/lib/head'

export default function Datenschutz() {
  useHead({ title: 'Datenschutz - Dead Sox', noindex: true })

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 md:py-24">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-ink-200 transition-colors hover:text-cream-50"
      >
        <ArrowLeft size={14} />
        Zurück zur Startseite
      </Link>

      <h1 className="mt-10 font-display text-6xl tracking-wide">Datenschutz</h1>

      <div className="mt-10 space-y-8 leading-relaxed text-ink-200">
        <p>
          Diese Seite ist statisch und verzichtet auf Tracking, Analyse-Tools und Cookies. Es
          werden keine personenbezogenen Daten an Dritte weitergegeben.
        </p>

        <section>
          <h2 className="font-medium text-cream-50">Server-Logfiles</h2>
          <p className="mt-2">
            Beim Aufruf der Seite speichert der Hosting-Server technisch notwendige Daten wie
            IP-Adresse, Zeitpunkt und abgerufene Datei. Diese Daten werden nicht mit anderen
            Datenquellen zusammengeführt.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-cream-50">Externe Inhalte</h2>
          <p className="mt-2">
            Wir verlinken auf Instagram und die Seiten des Düsseldorfer Hochschulsports. Beim
            Klick auf externe Links gelten die Datenschutzbestimmungen der jeweiligen Anbieter.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-cream-50">Deine Rechte</h2>
          <p className="mt-2">
            Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung deiner
            gespeicherten Daten. Wende dich dazu an den Hochschulsport Düsseldorf e.&nbsp;V. (
            <a href="mailto:info@hss-d.de" className="underline decoration-brand-500 underline-offset-4">
              info@hss-d.de
            </a>
            ).
          </p>
        </section>
      </div>
    </main>
  )
}
