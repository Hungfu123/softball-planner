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
    desc: 'Bester OPS (On-Base + Slugging). Kommt oft auf Base UND haut hart rein.',
    accentBar: 'bg-softball-red-500',
    darkChip: 'bg-softball-red-600/20 border-softball-red-500/30',
    lightChip: 'bg-softball-red-50 border-softball-red-100',
    darkIcon: 'text-softball-red-400',
    lightIcon: 'text-softball-red-600',
  },
  TOP_HITTER: {
    icon: <Award size={12} strokeWidth={2.5} />,
    label: 'Top Hitter',
    desc: 'Beste AVG — Hits ÷ At-Bats. Trifft am zuverlässigsten.',
    accentBar: 'bg-teal-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-teal-300',
    lightIcon: 'text-teal-600',
  },
  POWER: {
    icon: <Flame size={12} strokeWidth={2.5} />,
    label: 'Abrissbirne',
    desc: 'Meiste Total Bases — wie HART er trifft: jeder Hit zählt Bases (HR=4, 3B=3, 2B=2, 1B=1).',
    accentBar: 'bg-amber-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-amber-300',
    lightIcon: 'text-amber-600',
  },
  RBI: {
    icon: <Truck size={12} strokeWidth={2.5} />,
    label: 'Lieferant',
    desc: 'Meiste RBI — bringt Mitspieler per Hit nach Hause.',
    accentBar: 'bg-rose-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-rose-300',
    lightIcon: 'text-rose-600',
  },
  SPEED: {
    icon: <Zap size={12} strokeWidth={2.5} />,
    label: 'Speedster',
    desc: 'Meiste Steals — stealed Bases, während der Pitcher wirft.',
    accentBar: 'bg-sky-400',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-sky-300',
    lightIcon: 'text-sky-600',
  },
  ON_BASE: {
    icon: <Target size={12} strokeWidth={2.5} />,
    label: 'Mr. Reliable',
    desc: 'Beste OBP — wie OFT er auf Base kommt (Hits + Walks + Hit by Pitch).',
    accentBar: 'bg-emerald-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-emerald-300',
    lightIcon: 'text-emerald-600',
  },
  WALK: {
    icon: <Sparkles size={12} strokeWidth={2.5} />,
    label: 'Aura-Farmer',
    desc: 'Meiste Walks — 4 Balls, gratis auf 1B. Pitcher hat zu viel Respekt.',
    accentBar: 'bg-violet-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-violet-300',
    lightIcon: 'text-violet-600',
  },
  HBP: {
    icon: <Shield size={12} strokeWidth={2.5} />,
    label: 'Tank',
    desc: 'Meiste Hit by Pitch — vom Pitch getroffen, gratis auf 1B. Einen fürs Team.',
    accentBar: 'bg-orange-500',
    darkChip: 'bg-white/8 border-white/12',
    lightChip: 'bg-navy-50 border-navy-100',
    darkIcon: 'text-orange-300',
    lightIcon: 'text-orange-600',
  },
  STRIKEOUT: {
    icon: <Fan size={12} strokeWidth={2.5} />,
    label: 'Windmühle',
    desc: 'Meiste Strikeouts — schlägt am öftesten in die Luft statt den Ball zu treffen.',
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
      ? isMvp ? 'text-white font-extrabold' : 'text-white font-bold'
      : isMvp ? 'text-navy-900 font-extrabold' : 'text-navy-900 font-bold'
    const labelCls = isDark ? 'text-white/55' : 'text-gray-500'
    const valueCls = isDark ? 'text-white/70' : 'text-gray-600'

    /*
     * Die Reihenfolge im Blick ist NAME, dann Zahl, dann Etikett — vorher war sie umgekehrt:
     * „TOP HITTER" stand fett, der Mensch dahinter grau und abgeschnitten („Hung, Miriam, …").
     * Eine Auszeichnung beantwortet aber „wer", nicht „wie heisst die Kategorie". Derselbe
     * Aufbau wie beim MVP-Block darueber, damit die neun Karten eine Familie sind.
     */
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
          <div className="min-w-0 flex-1 px-2 py-1.5 sm:px-2.5">
            <div className={`font-display flex items-center gap-1 text-[9px] sm:text-[10px] tracking-widest uppercase leading-none ${labelCls}`}>
              <span className={`shrink-0 ${iconCls}`}>{meta.icon}</span>
              <span className="truncate">{meta.label}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              {/* Mehrere Namen bei Gleichstand duerfen umbrechen statt abzuschneiden: ein
                  halber Name ist keine Auskunft. */}
              <span className={`font-display text-[13px] leading-tight tracking-wide min-w-0 break-words ${nameCls}`}>
                {award.playerName}
              </span>
              <span className={`font-display ml-auto shrink-0 text-[10px] font-bold tracking-widest uppercase tabular-nums ${valueCls}`}>
                {award.displayValue}
              </span>
            </div>
          </div>
        </div>
        {open && (
          <div className={`px-2.5 pb-2 pt-1 text-[9px] leading-snug ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
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
          <div className="relative mt-2 text-[10px] leading-snug text-white/70">
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
        {/* `items-stretch`: Namen duerfen umbrechen, und zwei Karten nebeneinander mit
            unterschiedlicher Hoehe sehen aus wie ein Fehler statt wie ein Paar. */}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 items-stretch">
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
