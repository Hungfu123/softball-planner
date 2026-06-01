import type { ReactNode } from 'react'
import {
  Sun,
  CloudSun,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Cloud,
} from 'lucide-react'
import type { WeatherResponse } from '@/types'

interface Props {
  weather: WeatherResponse | null
}

function wmoIcon(code: number): ReactNode {
  const cls = 'shrink-0'
  if (code === 0) return <Sun size={13} className={cls} />
  if (code >= 1 && code <= 3) return <CloudSun size={13} className={cls} />
  if (code === 45 || code === 48) return <CloudFog size={13} className={cls} />
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={13} className={cls} />
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow size={13} className={cls} />
  if (code >= 95 && code <= 99) return <CloudLightning size={13} className={cls} />
  return <Cloud size={13} className={cls} />
}

export function WeatherPill({ weather }: Props) {
  if (!weather) return null

  const showRain = weather.precipitationProbabilityPct >= 20

  return (
    <div className="text-[10px] sm:text-xs text-white/65 inline-flex items-center gap-1.5">
      {wmoIcon(weather.wmoCode)}
      <span className="font-display font-bold text-white/80">
        {weather.tempMin}–{weather.tempMax}°
      </span>
      {showRain && (
        <>
          <span className="text-white/35">·</span>
          <span className="inline-flex items-center gap-0.5">
            <CloudRain size={11} className="shrink-0" />
            {weather.precipitationProbabilityPct}%
          </span>
        </>
      )}
    </div>
  )
}
