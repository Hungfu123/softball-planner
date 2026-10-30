import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { KAPITEL, findeKapitel } from './kapitel'
import { Karte } from './Karte'

/**
 * Ein Kapitel: Frage oben, Karten darunter, am Ende der Weg ins naechste.
 *
 * **Ein unbekanntes Kapitel geht zurueck auf die Uebersicht.** Die Adresse steht jedem
 * offen, und ein Tippfehler darf keine leere Seite ergeben, auf der man nicht merkt,
 * dass man falsch ist.
 *
 * Der Weiter-Link am Ende ist keine Verzierung: die Kapitel folgen dem zeitlichen Ablauf
 * eines At-Bats, und wer in der Box durch ist, steht als naechstes vor der Frage, wohin
 * er laeuft.
 */
export default function KapitelSeite() {
  const { kapitel: id } = useParams()
  const kapitel = findeKapitel(id)

  if (!kapitel) return <Navigate to="/spielwissen" replace />

  const naechstes = KAPITEL[KAPITEL.findIndex(k => k.id === kapitel.id) + 1]

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-8">
      <div>
        <Link
          to="/spielwissen"
          className="font-display inline-flex min-h-11 items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:text-ink-strong active:text-ink-strong"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Spielwissen
        </Link>
        <h1 className="font-headline text-2xl font-extrabold uppercase tracking-wide text-ink-strong sm:text-3xl">
          {kapitel.titel}
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">{kapitel.frage}</p>
      </div>

      <div className="space-y-3">
        {kapitel.karten.map(karte => (
          <Karte key={karte.id} karte={karte} />
        ))}
      </div>

      {naechstes ? (
        <Link
          to={`/spielwissen/${naechstes.id}`}
          className="group flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-ink-strong transition-colors hover:bg-accent hover:text-accent-ink active:bg-accent active:text-accent-ink"
        >
          <div className="min-w-0 flex-1">
            <div className="font-display text-[11px] font-bold uppercase tracking-widest text-ink-muted group-hover:text-accent-ink">
              Weiter
            </div>
            <div className="font-display text-sm font-extrabold uppercase leading-tight tracking-wide sm:text-base">
              {naechstes.titel}
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-faint group-hover:text-accent-ink/75" aria-hidden="true" />
        </Link>
      ) : (
        <Link
          to="/spielwissen"
          className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-ink-strong transition-colors hover:bg-accent hover:text-accent-ink active:bg-accent active:text-accent-ink"
        >
          Zurück zur Übersicht
        </Link>
      )}
    </div>
  )
}
