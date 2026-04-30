import type { SpielbogenResponse } from '@/types'

interface Props {
  meta: SpielbogenResponse
  outs: number
  currentSlotName: string | null
  currentSlotPosition: string | null
  currentBattingOrder: number | null
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const

function romanInning(n: number): string {
  return ROMAN[n] ?? String(n)
}

function OutDots({ outs }: { outs: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${i < outs
            ? 'bg-softball-red-500 shadow-[0_0_6px_rgba(230,57,70,0.6)]'
            : 'bg-white/20 border border-white/30'
          }`}
        />
      ))}
    </span>
  )
}

export function BogenScoreboard({ meta, outs, currentSlotName, currentSlotPosition, currentBattingOrder }: Props) {
  const inningStr = romanInning(meta.currentInning)

  return (
    <div className="bg-navy-900 text-white">
      {/* Live-State strip */}
      <div className="px-4 py-2 flex items-center justify-between border-b-[3px] border-softball-red-600">
        <div className="flex items-center gap-2">
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-white/70">Inning</span>
          <span className="font-display text-2xl font-extrabold leading-none">{inningStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-white/70">Outs</span>
          <OutDots outs={outs} />
        </div>
      </div>

      {/* Score-Band */}
      <div className="bg-cream-50 px-4 py-2.5 border-b border-cream-300">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[11px] text-navy-700 uppercase font-bold tracking-widest truncate max-w-[80px]">
              {meta.homeTeamName}
            </span>
            <span className="font-display text-4xl font-black text-navy-800 tabular-nums leading-none">
              {meta.homeRuns}
            </span>
          </div>
          <span className="font-display text-2xl text-gray-300">—</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-black text-softball-red-600 tabular-nums leading-none">
              {meta.awayRuns}
            </span>
            <span className="font-display text-[11px] text-softball-red-700 uppercase font-bold tracking-widest truncate max-w-[80px]">
              {meta.awayTeamName}
            </span>
          </div>
        </div>
      </div>

      {/* Current batter chip */}
      {currentSlotName && (
        <div className="px-3 py-2 bg-navy-900">
          <div className="flex items-center gap-2 bg-navy-700/60 rounded-lg px-3 py-1.5">
            {currentBattingOrder != null && (
              <span className="font-display text-xl bg-navy-800 text-white font-extrabold tabular-nums w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                {currentBattingOrder}
              </span>
            )}
            <span className="font-display font-extrabold text-lg text-white uppercase tracking-wider truncate flex-1 min-w-0">
              {currentSlotName}
            </span>
            {currentSlotPosition && (
              <span className="font-display text-xs text-navy-300 uppercase font-bold shrink-0">{currentSlotPosition}</span>
            )}
            <span className="font-display shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-softball-red-300 border border-softball-red-800/50 px-2 py-0.5 rounded-full">
              <span className="relative flex w-1.5 h-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-softball-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-softball-red-500" />
              </span>
              am Schlag
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
