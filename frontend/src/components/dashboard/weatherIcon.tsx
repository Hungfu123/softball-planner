import { Sun, CloudSun, CloudFog, CloudRain, CloudSnow, CloudLightning, Cloud } from 'lucide-react'

/** WMO-Weather-Code → lucide-Icon-Element (size parametrisierbar). */
export function weatherIcon(code: number, size: number, className: string) {
  if (code === 0) return <Sun size={size} className={className} />
  if (code <= 3) return <CloudSun size={size} className={className} />
  if (code === 45 || code === 48) return <CloudFog size={size} className={className} />
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} className={className} />
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow size={size} className={className} />
  if (code >= 95) return <CloudLightning size={size} className={className} />
  return <Cloud size={size} className={className} />
}
