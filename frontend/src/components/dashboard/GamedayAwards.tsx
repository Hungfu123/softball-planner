import { useEffect, useState } from 'react'
import { Medal } from 'lucide-react'
import type { AwardResponse } from '@/types'
import { getGameDayAwards } from '@/api/client'
import { AwardBadges } from './AwardBadges'

interface Props {
  gameDayId: number
  date?: string
}

function fmtShort(dateStr?: string) {
  if (!dateStr) return null
  if (dateStr === new Date().toISOString().slice(0, 10)) return 'Heute'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })
}

/**
 * Auszeichnungen des (letzten) Spieltags als eigene helle Editorial-Karte —
 * bewusst aus dem dunklen Hero ausgelagert. Lädt still; rendert nichts ohne Awards.
 */
export function GamedayAwards({ gameDayId, date }: Props) {
  const [awards, setAwards] = useState<AwardResponse[]>([])
  useEffect(() => {
    let cancelled = false
    getGameDayAwards(gameDayId)
      .then(a => { if (!cancelled) setAwards(a) })
      .catch(() => { /* silent — nice-to-have */ })
    return () => { cancelled = true }
  }, [gameDayId])

  if (awards.length === 0) return null

  return (
    <div className="bg-cream-50 border border-cream-300 rounded-2xl p-3.5 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="inline-flex items-center gap-1.5">
          <Medal size={15} className="text-softball-red-600 shrink-0" strokeWidth={2.2} />
          <span className="font-display text-[11px] sm:text-xs font-extrabold tracking-widest uppercase text-navy-900">
            Auszeichnungen
          </span>
        </div>
        {fmtShort(date) && (
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-400">
            {fmtShort(date)}
          </span>
        )}
      </div>
      <AwardBadges awards={awards} tone="light" layout="grid" />
    </div>
  )
}
