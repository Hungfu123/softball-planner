import type { ReactNode } from 'react'
import { Trophy, Flame, Wind, Target, Footprints, Hammer } from 'lucide-react'
import type { AwardResponse, AwardType } from '@/types'

interface Props {
  awards: AwardResponse[]
  tone?: 'dark' | 'light'
  /** 'wrap' = frei umbrechende Reihe (kompakt). 'grid' = MVP oben voll + Rest im 2×2-Raster. */
  layout?: 'wrap' | 'grid'
}

interface AwardMeta {
  icon: ReactNode
  label: string
  accentBar: string
  darkChip: string
  lightChip: string
  darkIcon: string
  lightIcon: string
}

const AWARD_META: Record<AwardType, AwardMeta> = {
  MVP: {
    icon: <Trophy size={11} strokeWidth={2.5} />,
    label: 'MVP',
    accentBar: 'bg-softball-red-500',
    darkChip: 'bg-softball-red-600/20 border-softball-red-500/30',
    lightChip: 'bg-softball-red-50 border-softball-red-100',
    darkIcon: 'text-softball-red-400',
    lightIcon: 'text-softball-red-600',
  },
  POWER: {
    icon: <Flame size={11} strokeWidth={2.5} />,
    label: 'Slugger',
    accentBar: 'bg-amber-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-amber-300',
    lightIcon: 'text-amber-600',
  },
  RBI: {
    icon: <Hammer size={11} strokeWidth={2.5} />,
    label: 'RBI-König',
    accentBar: 'bg-rose-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-rose-300',
    lightIcon: 'text-rose-600',
  },
  SPEED: {
    icon: <Wind size={11} strokeWidth={2.5} />,
    label: 'Speedster',
    accentBar: 'bg-sky-400',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-sky-300',
    lightIcon: 'text-sky-600',
  },
  ON_BASE: {
    icon: <Target size={11} strokeWidth={2.5} />,
    label: 'Table-Setter',
    accentBar: 'bg-emerald-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-emerald-300',
    lightIcon: 'text-emerald-600',
  },
  WALK: {
    icon: <Footprints size={11} strokeWidth={2.5} />,
    label: 'Walk-König',
    accentBar: 'bg-violet-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-violet-300',
    lightIcon: 'text-violet-600',
  },
}

export function AwardBadges({ awards, tone = 'dark', layout = 'wrap' }: Props) {
  if (awards.length === 0) return null

  const isDark = tone === 'dark'

  const badge = (award: AwardResponse) => {
    const meta = AWARD_META[award.type]
    const isMvp = award.type === 'MVP'
    const chipCls = isDark ? meta.darkChip : meta.lightChip
    const iconCls = isDark ? meta.darkIcon : meta.lightIcon
    const nameCls = isDark
      ? isMvp ? 'text-white font-extrabold' : 'text-white/90 font-bold'
      : isMvp ? 'text-navy-900 font-extrabold' : 'text-navy-800 font-bold'
    const valueCls = isDark ? 'text-white/50' : 'text-gray-500'

    return (
      <div
        key={award.type}
        className={`flex items-stretch rounded-lg border overflow-hidden ${chipCls}`}
      >
        <div className={`w-[3px] shrink-0 ${meta.accentBar}`} />
        <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 min-w-0">
          <span className={`shrink-0 ${iconCls}`}>{meta.icon}</span>
          <div className="min-w-0">
            <div className={`font-display text-[10px] sm:text-[11px] tracking-wide uppercase leading-none truncate ${nameCls}`}>
              {meta.label}
              <span className={`font-normal ${isDark ? 'text-white/55' : 'text-gray-500'}`}> · {award.playerName}</span>
            </div>
            <div className={`font-display text-[9px] sm:text-[10px] tracking-widest uppercase leading-tight mt-0.5 ${valueCls}`}>
              {award.displayValue}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // MVP als dunkler "Trophy"-Hero — klarer Fokuspunkt über den dezenten Neben-Titeln.
  const mvpHero = (award: AwardResponse) => (
    <div className="relative overflow-hidden rounded-xl bg-navy-900 px-3.5 py-3 shadow-md shadow-navy-900/20">
      <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-softball-red-600/30 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-softball-red-600/20 border border-softball-red-500/30 flex items-center justify-center shrink-0 text-softball-red-400">
          <Trophy size={18} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[9px] tracking-[0.25em] uppercase font-bold text-softball-red-400">MVP</div>
          <div className="font-display text-lg font-extrabold leading-tight truncate text-white">{award.playerName}</div>
        </div>
        <div className="font-display text-[11px] font-extrabold tracking-widest uppercase text-white/70 shrink-0">
          {award.displayValue}
        </div>
      </div>
    </div>
  )

  if (layout === 'grid') {
    const mvp = awards.find(a => a.type === 'MVP')
    const rest = awards.filter(a => a.type !== 'MVP')
    return (
      <div className="flex flex-col gap-2">
        {mvp && mvpHero(mvp)}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {rest.map(badge)}
          </div>
        )}
      </div>
    )
  }

  return <div className="flex flex-wrap gap-1.5">{awards.map(badge)}</div>
}
