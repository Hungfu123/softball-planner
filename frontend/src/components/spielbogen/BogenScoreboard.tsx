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
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full border-2 transition-colors ${
            i < outs ? 'bg-softball-red-500 border-softball-red-500' : 'border-gray-400 bg-transparent'
          }`}
        />
      ))}
    </div>
  )
}

export function BogenScoreboard({ meta, outs, currentSlotName, currentSlotPosition, currentBattingOrder }: Props) {
  const inningStr = romanInning(meta.currentInning)
  const outsLabel = outs === 1 ? '1 Out' : `${outs} Outs`

  return (
    <div className="bg-navy-800 text-white px-4 py-3">
      {/* Teams + Score */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-sm font-extrabold uppercase tracking-widest truncate max-w-[38%]">
          {meta.homeTeamName}
        </span>
        <div className="flex items-center gap-2 font-display text-2xl font-extrabold tabular-nums">
          <span>{meta.homeRuns}</span>
          <span className="text-navy-400 text-lg">:</span>
          <span>{meta.awayRuns}</span>
        </div>
        <span className="font-display text-sm font-extrabold uppercase tracking-widest truncate max-w-[38%] text-right">
          {meta.awayTeamName}
        </span>
      </div>

      {/* Inning + Outs */}
      <div className="flex items-center justify-center gap-3 text-xs text-navy-200">
        <span className="font-display font-bold tracking-wide uppercase">
          Inning {inningStr}
        </span>
        <span>·</span>
        <OutDots outs={outs} />
        <span className="font-body">{outsLabel}</span>
      </div>

      {/* Current batter */}
      {currentSlotName && (
        <div className="mt-2 flex items-center justify-center gap-2 bg-navy-700/60 rounded-lg px-3 py-1.5">
          {currentBattingOrder != null && (
            <span className="font-display text-xs font-bold text-navy-300">#{currentBattingOrder}</span>
          )}
          <span className="font-body text-sm font-semibold text-white truncate">{currentSlotName}</span>
          {currentSlotPosition && (
            <span className="font-display text-xs text-navy-300 uppercase font-bold">{currentSlotPosition}</span>
          )}
          <span className="text-xs text-navy-400">⌃ am Schlag</span>
        </div>
      )}
    </div>
  )
}
