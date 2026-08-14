import { Link } from 'react-router-dom'
import { ChevronLeft } from '@/icons'
import { battingTeam, type CounterState } from '@/utils/counterRules'
import { ShareCounterButton } from './ShareCounterButton'

interface Props {
  state: CounterState
  backTo: string
  backLabel: string
}

interface LampsProps {
  label: string
  count: number
  total: number
  /** Tailwind-Klasse für die leuchtende Lampe. */
  onClass: string
}

/**
 * Ball/Strike/Out als Lampenreihe statt Ziffer: drei Punkte erfasst man peripher,
 * eine Ziffer muss man lesen. Out und Strike haben nur zwei Lampen — beim dritten
 * greift sofort Out bzw. Halbinning-Wechsel, die Tafel steht nie auf dem Maximum.
 */
function Lamps({ label, count, total, onClass }: LampsProps) {
  return (
    <div className="flex-1 text-center">
      <div className="font-display text-xs font-bold uppercase tracking-[0.18em] text-navy-100/70">
        {label}
      </div>
      <div className="mt-2 flex justify-center gap-2" role="img" aria-label={`${label}: ${count} von ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-6 w-6 rounded-full ring-1 ring-inset ring-white/20 ${i < count ? onClass : 'bg-white/10'}`}
          />
        ))}
      </div>
    </div>
  )
}

interface ScoreProps {
  label: string
  runs: number
  atBat: boolean
}

/*
 * Die Ziffern wachsen mit der Bildschirmhöhe (`clamp`), damit die Tafel den Platz
 * wirklich füllt statt in der Mitte zu schweben — eine Anzeigetafel soll man von der
 * Bank aus lesen können. Untergrenze für kleine Geräte, Obergrenze gegen Riesenziffern
 * auf dem Tablet.
 */
const SCORE_ZIFFER = 'text-[clamp(3.5rem,17vh,9rem)]'

function Score({ label, runs, atBat }: ScoreProps) {
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl py-2 ${atBat ? 'bg-white/10' : 'opacity-40'}`}
    >
      <div
        className={`font-display text-xs font-bold uppercase tracking-[0.18em] ${atBat ? 'text-white' : 'text-navy-100/70'}`}
      >
        {label}
      </div>
      <div className={`font-display font-extrabold leading-none tabular-nums text-white ${SCORE_ZIFFER}`}>
        {runs}
      </div>
    </div>
  )
}

export function CounterBoard({ state, backTo, backLabel }: Props) {
  const batting = battingTeam(state)

  return (
    /*
     * Drei Bänder: dünne Kopfzeile, wachsendes Score-Band, Lampen am unteren Rand.
     * Das Score-Band nimmt den freien Platz auf und gibt ihn an die Ziffern weiter,
     * statt den Inhalt in einer leeren Fläche schweben zu lassen. Die Lampen sitzen
     * fest an der Unterkante, damit die Tafel dort eine Kante hat und nicht ausläuft.
     */
    <div className="flex grow shrink-0 flex-col bg-navy-900 px-4 pb-4 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
      <div className="flex shrink-0 items-center justify-between">
        <Link
          to={backTo}
          aria-label={backLabel}
          title={backLabel}
          className="rounded-lg p-2 text-navy-100/70 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={22} />
        </Link>
        <ShareCounterButton />
      </div>

      <div className="flex grow items-stretch py-2">
        <Score label="Heim" runs={state.home} atBat={batting === 'home'} />
        <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 border-x border-white/15 px-1">
          <div className="font-display text-xs font-bold uppercase tracking-[0.18em] text-navy-100/70">
            Inning
          </div>
          <div aria-hidden className="flex items-center justify-center gap-1 font-display text-4xl font-extrabold leading-none tabular-nums">
            <span className="text-lg text-softball-red-400">
              {state.half === 'top' ? '▲' : '▼'}
            </span>
            {state.inning}
          </div>
          <span className="sr-only">
            {state.inning}. Inning, {state.half === 'top' ? 'oben, Gast schlägt' : 'unten, Heim schlägt'}
          </span>
        </div>
        <Score label="Gast" runs={state.away} atBat={batting === 'away'} />
      </div>

      <div className="flex shrink-0 border-t border-white/15 pt-3">
        <Lamps label="Ball" count={state.balls} total={3} onClass="bg-cream-50" />
        <Lamps label="Strike" count={state.strikes} total={2} onClass="bg-amber-400" />
        <Lamps label="Out" count={state.outs} total={2} onClass="bg-softball-red-400" />
      </div>
    </div>
  )
}
