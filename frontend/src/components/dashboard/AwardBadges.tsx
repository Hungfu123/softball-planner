import type { ReactNode } from 'react'
import { Trophy, Flame, Wind, Target } from 'lucide-react'
import type { AwardResponse, AwardType } from '@/types'

interface Props {
  awards: AwardResponse[]
  tone?: 'dark' | 'light'
}

interface AwardMeta {
  icon: ReactNode
  label: string
  /** Tailwind classes for the left accent bar — color per award type */
  accentBar: string
  /** Chip background + text for dark tone */
  darkChip: string
  /** Chip background + text for light tone */
  lightChip: string
  /** Icon color class */
  darkIcon: string
  lightIcon: string
}

const AWARD_META: Record<AwardType, AwardMeta> = {
  MVP: {
    icon: <Trophy size={11} strokeWidth={2.5} />,
    label: 'MVP',
    accentBar: 'bg-softball-red-500',
    darkChip: 'bg-softball-red-600/20 border-softball-red-500/30',
    lightChip: 'bg-softball-red-50 border-softball-red-200',
    darkIcon: 'text-softball-red-300',
    lightIcon: 'text-softball-red-600',
  },
  POWER: {
    icon: <Flame size={11} strokeWidth={2.5} />,
    label: 'Power',
    accentBar: 'bg-amber-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-200',
    darkIcon: 'text-amber-300',
    lightIcon: 'text-amber-600',
  },
  SPEED: {
    icon: <Wind size={11} strokeWidth={2.5} />,
    label: 'Speed',
    accentBar: 'bg-sky-400',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-200',
    darkIcon: 'text-sky-300',
    lightIcon: 'text-sky-600',
  },
  ON_BASE: {
    icon: <Target size={11} strokeWidth={2.5} />,
    label: 'On-Base',
    accentBar: 'bg-emerald-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-200',
    darkIcon: 'text-emerald-300',
    lightIcon: 'text-emerald-600',
  },
}

export function AwardBadges({ awards, tone = 'dark' }: Props) {
  if (awards.length === 0) return null

  const isDark = tone === 'dark'

  return (
    <div className="flex flex-wrap gap-1.5">
      {awards.map((award) => {
        const meta = AWARD_META[award.type]
        const isMvp = award.type === 'MVP'
        const chipCls = isDark ? meta.darkChip : meta.lightChip
        const iconCls = isDark ? meta.darkIcon : meta.lightIcon
        const nameCls = isDark
          ? isMvp ? 'text-white font-extrabold' : 'text-white/90 font-bold'
          : isMvp ? 'text-navy-900 font-extrabold' : 'text-navy-800 font-bold'
        const valueCls = isDark ? 'text-white/50' : 'text-navy-500'

        return (
          <div
            key={award.type}
            className={`flex items-stretch rounded-lg border overflow-hidden ${chipCls}`}
          >
            {/* Left accent bar — color-coded per award type */}
            <div className={`w-[3px] shrink-0 ${meta.accentBar}`} />

            <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5">
              <span className={`shrink-0 ${iconCls}`}>{meta.icon}</span>
              <div className="min-w-0">
                <div className={`font-display text-[10px] sm:text-[11px] tracking-wide uppercase leading-none truncate ${nameCls}`}>
                  {meta.label}
                  <span className={`font-normal ${isDark ? 'text-white/55' : 'text-navy-500'}`}> · {award.playerName}</span>
                </div>
                <div className={`font-display text-[9px] sm:text-[10px] tracking-widest uppercase leading-tight mt-0.5 ${valueCls}`}>
                  {award.displayValue}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
