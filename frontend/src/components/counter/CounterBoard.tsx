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
      <div className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy-100/70">
        {label}
      </div>
      <div className="mt-1.5 flex justify-center gap-1.5" role="img" aria-label={`${label}: ${count} von ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full ring-1 ring-inset ring-white/20 ${i < count ? onClass : 'bg-white/10'}`}
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

function Score({ label, runs, atBat }: ScoreProps) {
  return (
    <div className={`flex-1 rounded-xl py-1 text-center ${atBat ? 'bg-white/10' : 'opacity-40'}`}>
      <div
        className={`font-display text-[10px] font-bold uppercase tracking-[0.18em] ${atBat ? 'text-white' : 'text-navy-100/70'}`}
      >
        {label}
      </div>
      <div className="font-display text-5xl font-extrabold leading-none tabular-nums text-white sm:text-6xl">
        {runs}
      </div>
    </div>
  )
}

export function CounterBoard({ state, backTo, backLabel }: Props) {
  const batting = battingTeam(state)

  return (
    <div className="relative bg-navy-900 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
      <Link
        to={backTo}
        aria-label={backLabel}
        title={backLabel}
        className="absolute left-2 top-[max(0.5rem,env(safe-area-inset-top))] rounded-lg p-2 text-navy-100/70 hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft size={22} />
      </Link>

      <div className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top))]">
        <ShareCounterButton />
      </div>

      <div className="flex items-center pt-6">
        <Score label="Heim" runs={state.home} atBat={batting === 'home'} />
        <div className="w-16 shrink-0 border-x border-white/15 text-center">
          <div className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy-100/70">
            Inning
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 font-display text-3xl font-extrabold leading-none tabular-nums">
            <span aria-hidden className="text-base text-softball-red-400">
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

      <div className="mt-3 flex border-t border-white/15 pt-3">
        <Lamps label="Ball" count={state.balls} total={3} onClass="bg-cream-50" />
        <Lamps label="Strike" count={state.strikes} total={2} onClass="bg-amber-400" />
        <Lamps label="Out" count={state.outs} total={2} onClass="bg-softball-red-400" />
      </div>
    </div>
  )
}
