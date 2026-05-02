import type { SpielbogenSlotResponse } from '@/types'

interface Props {
  currentSlot: SpielbogenSlotResponse | null
  upcomingSlots: SpielbogenSlotResponse[]
  /** Während Auto-Switch / Reload: Card dimmen um Flicker bei Side-Wechsel zu verhindern. */
  pending?: boolean
}

export function BatterCard({ currentSlot, upcomingSlots, pending }: Props) {
  if (!currentSlot) return null
  return (
    <div className={`px-3 py-2 bg-cream-100 border-t border-cream-300 transition-opacity duration-200 ${pending ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="px-1 py-1 space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="font-display shrink-0 text-xl bg-navy-900 text-white font-extrabold tabular-nums w-10 h-10 rounded-lg flex items-center justify-center">
            {currentSlot.battingOrder ?? '?'}
          </span>
          <span className="font-display font-extrabold text-xl sm:text-2xl text-gray-900 uppercase tracking-wider truncate flex-1 min-w-0">
            {currentSlot.name}
          </span>
          <span className="font-display shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-softball-red-700 bg-softball-red-50 border border-softball-red-100 px-2 py-1 rounded-full">
            <span className="relative flex w-1.5 h-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-softball-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-softball-red-500" />
            </span>
            <span className="hidden sm:inline">am Schlag</span>
          </span>
        </div>
        {upcomingSlots.length > 0 && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-cream-200">
            <span className="font-display text-[9px] tracking-widest uppercase text-gray-500 font-bold shrink-0">Nächste</span>
            <div className="flex items-center gap-2 flex-wrap text-[11px] min-w-0">
              {upcomingSlots.map((s, i) => {
                const isUp = i === 0
                return (
                  <span key={`${s.id}-${i}`} className={`inline-flex items-center gap-1 ${isUp ? '' : 'opacity-60'}`}>
                    {isUp && <span className="text-softball-red-600 font-black">▸</span>}
                    <span className="font-display font-bold text-navy-700 tabular-nums">{s.battingOrder}</span>
                    <span className={`font-medium ${isUp ? 'text-softball-red-700 font-bold' : 'text-gray-700'}`}>{s.name}</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
