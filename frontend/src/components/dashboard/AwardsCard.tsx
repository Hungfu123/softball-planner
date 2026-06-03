import { Medal } from 'lucide-react'
import type { AwardResponse } from '@/types'
import { AwardBadges } from './AwardBadges'

interface Props {
  awards: AwardResponse[]
  title?: string
  /** Zusatzinfo unter dem Titel (z.B. Zeitraum + enthaltene Ligen). Bricht um. */
  subtitle?: string | null
}

/** Helle Editorial-Karte für Auszeichnungen (Spieltag oder Saison). Rendert nichts ohne Awards. */
export function AwardsCard({ awards, title = 'Auszeichnungen', subtitle }: Props) {
  if (awards.length === 0) return null
  return (
    <div className="bg-cream-50 border border-cream-300 rounded-2xl p-3.5 sm:p-4 shadow-sm">
      <div className="mb-2.5">
        <div className="inline-flex items-center gap-1.5">
          <Medal size={15} className="text-softball-red-600 shrink-0" strokeWidth={2.2} />
          <span className="font-display text-[11px] sm:text-xs font-extrabold tracking-widest uppercase text-navy-900">
            {title}
          </span>
        </div>
        {subtitle && (
          <div className="mt-1 text-[11px] font-medium text-gray-500 leading-snug">
            {subtitle}
          </div>
        )}
      </div>
      <AwardBadges awards={awards} tone="light" layout="grid" />
    </div>
  )
}
