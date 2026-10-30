import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { FeldMiniatur } from '@/components/start/FeldMiniatur'
import { KAPITEL, stichworte } from './kapitel'

/**
 * Der Einstieg ins Spielwissen.
 *
 * Die oberste Ebene ist der Schnitt, in dem ein Softballer denkt: **Offense gegen
 * Defense**. Sie ordnet die beiden Haelften ohne ein erklaerendes Wort, und sie sagt dem
 * Neuen nebenbei, dass es ueberhaupt zwei gibt.
 *
 * Die Kapitel tragen **keine Nummern, sondern ihre Frage**. Wer vor dem Spiel etwas
 * nachschlaegt, sucht eine Frage, keine Ordnungszahl.
 *
 * Defense fuehrt **ohne Zwischenseite** in die bestehende Play-Uebersicht. Eine Seite,
 * auf der nur „hier geht es weiter" steht, ist ein Tipp, der nichts bringt.
 */

/**
 * Was hinter Defense liegt, in Stichworten.
 *
 * **Geschriebene Worte, keine geladenen Kategorien.** Die Kategorien stehen in der
 * Datenbank, und ein Abruf dafuer wuerde das Versprechen dieser Seite brechen: Offense
 * laeuft ohne Netz, und ein Test haelt fest, dass hier nichts unter `/api` gerufen wird.
 * Der Preis ist, dass die Zeile von den Kategorien abweichen kann; sie nennt deshalb die
 * Lagen, nicht die Liste — stimmen muss sie im Sinn, nicht im Wortlaut.
 */
const DEFENSE_STICHWORTE = ['Cut-off', 'Bunt-Defense', 'Rundown', 'Pickoff', 'Wer deckt was']

function Ueberschrift({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="font-display text-xs font-bold uppercase tracking-widest text-ink-muted">{children}</h2>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  )
}

export default function SpielwissenHome() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-6 sm:space-y-4">
      <h1 className="font-headline text-2xl font-extrabold uppercase tracking-wide text-ink-strong sm:text-3xl">
        Spielwissen
      </h1>

      <Ueberschrift>Offense</Ueberschrift>
      <div className="space-y-2">
        {KAPITEL.map(k => (
          <Link
            key={k.id}
            to={`/spielwissen/${k.id}`}
            className="group flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-ink-strong transition-colors hover:bg-accent hover:text-accent-ink active:bg-accent active:text-accent-ink"
          >
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-extrabold uppercase leading-tight tracking-wide sm:text-base">
                {k.titel}
              </div>
              <div className="mt-0.5 text-[12px] leading-tight text-ink-muted group-hover:text-accent-ink sm:text-sm">
                {k.frage}
              </div>
              {/* Was drinsteht, in Stichworten. Ein Kapitel ist rund drei Bildschirme;
                  wer eine Sache sucht, soll nicht drei davon durchwischen muessen, um zu
                  merken, dass sie im naechsten Kapitel liegt. */}
              <div className="font-display mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-accent-ink/70">
                {stichworte(k).join(' · ')}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-faint group-hover:text-accent-ink/75" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <Ueberschrift>Defense</Ueberschrift>
      <Link
        to="/orga/playmaker"
        className="group flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 text-ink-strong transition-colors hover:bg-accent hover:text-accent-ink active:bg-accent active:text-accent-ink"
      >
        {/* Dieselbe Geometrie wie die Plays dahinter. Das Bild ist die Ankuendigung. */}
        <FeldMiniatur className="h-12 w-14 shrink-0 text-ink-faint group-hover:text-accent-ink/70" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-extrabold uppercase leading-tight tracking-wide sm:text-base">
            Defense
          </div>
          <div className="mt-0.5 text-[12px] leading-tight text-ink-muted group-hover:text-accent-ink sm:text-sm">
            Wer steht wo, und wohin geht der Ball?
          </div>
          <div className="font-display mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-accent-ink/70">
            {DEFENSE_STICHWORTE.join(' · ')}
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink-faint group-hover:text-accent-ink/75" aria-hidden="true" />
      </Link>
    </div>
  )
}
