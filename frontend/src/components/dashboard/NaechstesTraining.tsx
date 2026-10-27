import { Link } from 'react-router-dom'
import { Clock, MapPin } from 'lucide-react'
import { Abschnittsmarke } from '@/components/shared'
import type { Termin } from '@/hooks/useTermine'
import { heuteIso } from '@/hooks/useTermine'

const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function tag(datum: string) {
  const d = new Date(datum + 'T00:00:00')
  // Das Jahr nur, wenn es nicht das laufende ist: "15. Mär" reicht fuer alles, was
  // dieses Jahr noch kommt, und wird irrefuehrend, sobald es das nicht mehr tut.
  const anderesJahr = d.getFullYear() !== new Date().getFullYear()
  return {
    wochentag: WOCHENTAG[d.getDay()],
    kurz: d.toLocaleDateString('de-DE',
      anderesJahr ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short' }),
  }
}

/** Wie viele Tage liegen zwischen heute und dem Termin? Nur Tage, keine Stunden. */
function inTagen(datum: string): number {
  const a = new Date(heuteIso() + 'T00:00:00').getTime()
  const b = new Date(datum + 'T00:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * Die Entfernung in Worten — oder gar nicht.
 *
 * Ueber etwa zwei Monaten hinaus sagt "in 9 Wochen" weniger als das Datum selbst, und
 * bei einem verirrten Termin steht dort "in 3307 Wochen" (so gesehen, Testdatensatz mit
 * Jahr 2090). Jenseits der Grenze traegt deshalb das Datum allein — mit Jahr.
 */
function wann(datum: string): string | null {
  const d = inTagen(datum)
  if (d === 0) return 'Heute'
  if (d === 1) return 'Morgen'
  if (d < 7) return `In ${d} Tagen`
  if (d < 14) return 'Nächste Woche'
  if (d <= 56) return `In ${Math.round(d / 7)} Wochen`
  return null
}

/**
 * Das naechste Training — die Frage, die im Team am oeftesten gestellt wird.
 *
 * Bewusst ohne jede Zahl zur Beteiligung: die fliesst in die Auto-Aufstellung ein und
 * ist vor Spielern verborgen, auch vor ihrer eigenen. Hier steht, WANN und WO — mehr
 * braucht niemand, um hinzukommen.
 */
export function NaechstesTraining({ termine, laden, fehler }: {
  termine: Termin[]
  laden: boolean
  fehler: boolean
}) {
  const heute = heuteIso()
  // Selbst sortieren, nicht darauf vertrauen, dass es jemand anders getan hat: `useTermine`
  // liefert zwar sortiert, aber "der naechste Termin" darf nicht von einer Zusage abhaengen,
  // die nirgends im Typ steht. Genau das ist im Test aufgefallen — bei unsortierter Eingabe
  // stand der September oben und der Juni unter "Danach".
  const kommende = termine
    .filter(t => t.art === 'TRAINING' && t.datum >= heute)
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const naechstes = kommende[0]
  const danach = kommende[1]

  return (
    <section aria-label="Nächstes Training" className="bg-surface-raised border border-line rounded-2xl shadow-card p-4">
      <h2 className="font-display inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-ink-muted mb-2.5">
        <Abschnittsmarke size="sm" />
        Nächstes Training
      </h2>

      {laden ? (
        <p className="text-sm text-ink-muted">Termine laden …</p>
      ) : fehler ? (
        <p className="text-sm text-ink-muted">
          Die Termine sind gerade nicht erreichbar. Das heißt nicht, dass keins ansteht.
        </p>
      ) : !naechstes ? (
        <p className="text-sm text-ink-muted">
          Kein Training angesetzt. Sobald die nächste Periode steht, erscheint es hier.
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="font-display text-2xl font-extrabold tracking-wide uppercase text-ink leading-none">
              {tag(naechstes.datum).wochentag} · {tag(naechstes.datum).kurz}
            </span>
            {wann(naechstes.datum) && (
              <span className="font-display text-[11px] font-bold tracking-widest uppercase text-label">
                {wann(naechstes.datum)}
              </span>
            )}
          </div>
          <div className="mt-2 space-y-1">
            {naechstes.zeit && (
              <p className="text-sm text-ink-muted inline-flex items-center gap-1.5">
                <Clock size={13} className="shrink-0" /> {naechstes.zeit}
              </p>
            )}
            {naechstes.ort && (
              <p className="text-sm text-ink-muted inline-flex items-center gap-1.5">
                <MapPin size={13} className="shrink-0" /> {naechstes.ort}
              </p>
            )}
          </div>
          {danach && (
            <p className="text-[11px] text-ink-faint mt-2.5">
              Danach {tag(danach.datum).wochentag} · {tag(danach.datum).kurz}
            </p>
          )}
        </>
      )}

      <Link
        to="/kalender"
        className="font-display mt-3 inline-flex items-center min-h-11 text-[11px] font-bold tracking-widest uppercase text-label hover:text-ink underline decoration-line underline-offset-4 hover:decoration-ink-muted transition-colors"
      >
        Alle Termine
      </Link>
    </section>
  )
}
