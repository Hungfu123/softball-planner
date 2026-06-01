import { Droplets } from 'lucide-react'
import type { WeatherHourSlot } from '@/types'
import { weatherIcon } from './weatherIcon'

interface Props {
  hours: WeatherHourSlot[]
  location?: string | null
}

/** Stündlicher Tagesablauf (Wetter-Detail-Sheet). Eine Zeile pro Stunde im Spieltag-Fenster. */
export function WeatherDayBreakdown({ hours, location }: Props) {
  if (hours.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Kein stündlicher Verlauf verfügbar.</p>
  }
  return (
    <div>
      {location && (
        <div className="font-display text-[11px] tracking-widest uppercase font-bold text-gray-500 mb-3">
          {location}
        </div>
      )}
      <div className="divide-y divide-cream-200">
        {hours.map(h => (
          <div key={h.hour} className="flex items-center gap-3 py-2">
            <div className="font-display font-extrabold text-navy-900 w-12 shrink-0 tabular-nums">
              {String(h.hour).padStart(2, '0')}:00
            </div>
            {weatherIcon(h.wmoCode, 20, 'text-navy-700 shrink-0')}
            <div className="font-display text-xl font-extrabold text-navy-900 flex-1">
              {h.temp}°
            </div>
            <div className={`text-sm font-bold inline-flex items-center gap-1 tabular-nums ${
              h.precipitationProbabilityPct >= 50 ? 'text-softball-red-600' : 'text-gray-500'
            }`}>
              <Droplets size={13} className="shrink-0" />{h.precipitationProbabilityPct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
