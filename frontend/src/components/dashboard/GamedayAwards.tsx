import { useEffect, useState } from 'react'
import type { AwardResponse } from '@/types'
import { getGameDayAwards } from '@/api/client'
import { AwardsCard } from './AwardsCard'

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
 * Auszeichnungen des (letzten) Spieltags als eigene helle Karte.
 * Lädt still; rendert nichts ohne Awards.
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

  return <AwardsCard awards={awards} subtitle={fmtShort(date)} />
}
