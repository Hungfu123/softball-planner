import { useState, type ReactNode } from 'react'
import { Trophy, Flame, Zap, Target, Truck, Award, Shield, Fan, Sparkles } from 'lucide-react'
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
  /** Anfänger-Erklärung — erscheint beim Antippen des Badges. */
  desc: string
  accentBar: string
  darkChip: string
  lightChip: string
  darkIcon: string
  lightIcon: string
}

const AWARD_META: Record<AwardType, AwardMeta> = {
  MVP: {
    icon: <Trophy size={12} strokeWidth={2.5} />,
    label: 'MVP',
    desc: 'Wertvollster Spieler — bester OPS: On-Base-Quote + Schlagstärke zusammengerechnet. Kommt also oft auf Base UND schlägt kraftvoll.',
    accentBar: 'bg-softball-red-500',
    darkChip: 'bg-softball-red-600/20 border-softball-red-500/30',
    lightChip: 'bg-softball-red-50 border-softball-red-100',
    darkIcon: 'text-softball-red-400',
    lightIcon: 'text-softball-red-600',
  },
  TOP_HITTER: {
    icon: <Award size={12} strokeWidth={2.5} />,
    label: 'Top Hitter',
    desc: 'Höchste Trefferquote (AVG) — Treffer geteilt durch Schlagversuche.',
    accentBar: 'bg-teal-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-teal-300',
    lightIcon: 'text-teal-600',
  },
  POWER: {
    icon: <Flame size={12} strokeWidth={2.5} />,
    label: 'Slugger',
    desc: 'Meiste Total Bases — Summe aller erreichten Bases durch Treffer (Single=1, Double=2, Triple=3, Homerun=4). Misst die Schlagkraft.',
    accentBar: 'bg-amber-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-amber-300',
    lightIcon: 'text-amber-600',
  },
  RBI: {
    icon: <Truck size={12} strokeWidth={2.5} />,
    label: 'Lieferant',
    desc: 'Meiste Runs Batted In (RBI) — Mitspieler, die er mit seinen Treffern nach Hause gebracht hat.',
    accentBar: 'bg-rose-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-rose-300',
    lightIcon: 'text-rose-600',
  },
  SPEED: {
    icon: <Zap size={12} strokeWidth={2.5} />,
    label: 'Speedster',
    desc: 'Meiste Stolen Bases — Bases, die er zwischen den Würfen geklaut hat.',
    accentBar: 'bg-sky-400',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-sky-300',
    lightIcon: 'text-sky-600',
  },
  ON_BASE: {
    icon: <Target size={12} strokeWidth={2.5} />,
    label: 'Base-Flatrate',
    desc: 'Höchste On-Base-Quote (OBP) — wie oft er auf eine Base kommt, inklusive Walks und Hit-by-Pitch.',
    accentBar: 'bg-emerald-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-emerald-300',
    lightIcon: 'text-emerald-600',
  },
  WALK: {
    icon: <Sparkles size={12} strokeWidth={2.5} />,
    label: 'Aura-Farmer',
    desc: 'Meiste Walks — viermal Ball, der Batter darf gratis auf die 1. Base. Der Pitcher hat zu viel Respekt.',
    accentBar: 'bg-violet-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-violet-300',
    lightIcon: 'text-violet-600',
  },
  HBP: {
    icon: <Shield size={12} strokeWidth={2.5} />,
    label: 'Tank',
    desc: 'Am häufigsten vom Pitch getroffen (Hit by Pitch) — darf dafür gratis auf die 1. Base. Einen fürs Team mitgenommen.',
    accentBar: 'bg-orange-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-orange-300',
    lightIcon: 'text-orange-600',
  },
  STRIKEOUT: {
    icon: <Fan size={12} strokeWidth={2.5} />,
    label: 'Windmühle',
    desc: 'Meiste Strikeouts — dreimal Strike und der Batter ist out. Gag-Titel: schlägt am häufigsten in die Luft, statt den Ball zu treffen.',
    accentBar: 'bg-zinc-400',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-zinc-300',
    lightIcon: 'text-zinc-500',
  },
}

export function AwardBadges({ awards, tone = 'dark', layout = 'wrap' }: Props) {
  const [openType, setOpenType] = useState<AwardType | null>(null)
  if (awards.length === 0) return null

  const isDark = tone === 'dark'
  const toggle = (t: AwardType) => setOpenType(prev => (prev === t ? null : t))

  const badge = (award: AwardResponse) => {
    const meta = AWARD_META[award.type]
    const isMvp = award.type === 'MVP'
    const open = openType === award.type
    const chipCls = isDark ? meta.darkChip : meta.lightChip
    const iconCls = isDark ? meta.darkIcon : meta.lightIcon
    const nameCls = isDark
      ? isMvp ? 'text-white font-extrabold' : 'text-white/90 font-bold'
      : isMvp ? 'text-navy-900 font-extrabold' : 'text-navy-800 font-bold'
    const valueCls = isDark ? 'text-white/50' : 'text-gray-500'

    return (
      <button
        key={award.type}
        type="button"
        onClick={() => toggle(award.type)}
        aria-expanded={open}
        className={`text-left w-full flex flex-col rounded-lg border overflow-hidden cursor-pointer transition-colors ${chipCls}`}
      >
        <div className="flex items-stretch w-full">
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
        {open && (
          <div className={`px-2.5 pb-2 pt-1 text-[10px] leading-snug ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            {meta.desc}
          </div>
        )}
      </button>
    )
  }

  // MVP als dunkler "Trophy"-Hero — klarer Fokuspunkt über den dezenten Neben-Titeln.
  const mvpHero = (award: AwardResponse) => {
    const open = openType === 'MVP'
    return (
      <button
        type="button"
        onClick={() => toggle('MVP')}
        aria-expanded={open}
        className="text-left w-full relative overflow-hidden rounded-xl bg-navy-900 px-3.5 py-3 shadow-md shadow-navy-900/20 cursor-pointer"
      >
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
        {open && (
          <div className="relative mt-2 text-[11px] leading-snug text-white/70">
            {AWARD_META.MVP.desc}
          </div>
        )}
      </button>
    )
  }

  const hint = (
    <p className={`text-[9px] tracking-wide ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
      Tipp: Auszeichnung antippen für Erklärung
    </p>
  )

  if (layout === 'grid') {
    const mvp = awards.find(a => a.type === 'MVP')
    const rest = awards.filter(a => a.type !== 'MVP')
    return (
      <div className="flex flex-col gap-2">
        {mvp && mvpHero(mvp)}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 items-start">
            {rest.map(badge)}
          </div>
        )}
        {hint}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5 items-start">{awards.map(badge)}</div>
      {hint}
    </div>
  )
}
