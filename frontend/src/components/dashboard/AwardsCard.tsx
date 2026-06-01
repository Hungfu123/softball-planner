import { Medal } from 'lucide-react'
import type { AwardResponse } from '@/types'
import { AwardBadges } from './AwardBadges'

interface Props {
  awards: AwardResponse[]
  title?: string
  /** kleine Zusatzinfo rechts (z.B. Datum oder Scope) */
  subtitle?: string | null
}

/** Helle Editorial-Karte für Auszeichnungen (Spieltag oder Saison). Rendert nichts ohne Awards. */
export function AwardsCard({ awards, title = 'Auszeichnungen', subtitle }: Props) {
  if (awards.length === 0) return null
  return (
    <div className="bg-cream-50 border border-cream-300 rounded-2xl p-3.5 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="inline-flex items-center gap-1.5">
          <Medal size={15} className="text-softball-red-600 shrink-0" strokeWidth={2.2} />
          <span className="font-display text-[11px] sm:text-xs font-extrabold tracking-widest uppercase text-navy-900">
            {title}
          </span>
        </div>
        {subtitle && (
          <span className="font-display text-[10px] font-bold tracking-widest uppercase text-gray-400">
            {subtitle}
          </span>
        )}
      </div>
      <AwardBadges awards={awards} tone="light" layout="grid" />
    </div>
  )
}
