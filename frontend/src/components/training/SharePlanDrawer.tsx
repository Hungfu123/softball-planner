import { useEffect, useMemo, useState } from 'react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { TrainingPlanContentResponse, SectionGroup, PlanKind } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  planContent: TrainingPlanContentResponse | null
  trainingDate: string | null
  planKind?: PlanKind
}

type ShareGroup = 'ALL' | 'MAIN' | 'BEGINNER'

const GROUP_LABEL: Record<ShareGroup, string> = {
  ALL: '',
  MAIN: 'Hauptgruppe',
  BEGINNER: 'Anfänger',
}

function buildShareText(
  planContent: TrainingPlanContentResponse | null,
  trainingDate: string | null,
  group: ShareGroup = 'ALL',
  planKind: PlanKind = 'MAIN',
): string {
  if (!planContent) return ''
  const lines: string[] = []

  const dateStr = trainingDate
    ? new Date(trainingDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })
    : ''
  const kindSuffix = planKind === 'BEGINNER' ? ' — Anfänger' : ''
  const groupSuffix = group !== 'ALL' ? ` — ${GROUP_LABEL[group]} (Gruppe)` : ''
  lines.push(`⚾ *Trainingsplan${dateStr ? ` — ${dateStr}` : ''}${kindSuffix}${groupSuffix}*`)
  lines.push('')

  const pushHeadline = (h: string) => {
    if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('')
    lines.push(h)
  }

  // Filter sections by group: ALL = pass-through; MAIN/BEGINNER = include shared (ALL) + own group
  const filteredSections = group === 'ALL'
    ? planContent.sections
    : planContent.sections.filter(s => {
        const g: SectionGroup = s.group ?? 'ALL'
        return g === 'ALL' || g === group
      })

  let i = 0
  let warmupPrinted = false
  let drillsPrinted = false
  let battingPrinted = false

  while (i < filteredSections.length) {
    const s = filteredSections[i]
    if (s.sectionType === 'BREAK') { i++; continue }

    if (s.parallelGroup != null) {
      const pGroup = s.parallelGroup
      const stationDrills: typeof filteredSections = []
      while (i < filteredSections.length && filteredSections[i].parallelGroup === pGroup) {
        stationDrills.push(filteredSections[i])
        i++
      }
      const isBattingGroup = stationDrills.some(d => d.sectionType === 'BATTING')
      if (isBattingGroup) {
        if (!battingPrinted) {
          pushHeadline('*Batting Stationen:*')
          battingPrinted = true
        }
      } else {
        pushHeadline('*Drills in Gruppen:*')
      }
      for (const sd of stationDrills) {
        lines.push(`• ${sd.title ?? '—'}`)
      }
      continue
    }

    if (s.sectionType === 'WARMUP') {
      if (!warmupPrinted) {
        pushHeadline('*Aufwärmen*')
        warmupPrinted = true
      }
      lines.push(`• ${s.title ?? '—'}`)
    } else if (s.sectionType === 'BATTING') {
      if (!battingPrinted) {
        pushHeadline('*Batting Stationen:*')
        battingPrinted = true
      }
      lines.push(`• ${s.title ?? '—'}`)
    } else if (s.sectionType === 'DRILL') {
      if (!drillsPrinted) {
        pushHeadline('*Drills zusammen:*')
        drillsPrinted = true
      }
      lines.push(`• ${s.title ?? '—'}`)
    } else if (s.sectionType === 'GAME' || s.sectionType === 'SCRIMMAGE') {
      pushHeadline(`*${s.title ?? 'Spiel'}*`)
    } else {
      lines.push(`• ${s.title ?? '—'}`)
    }
    i++
  }

  if (planContent.overallNotes) {
    pushHeadline('*Notizen:*')
    lines.push(planContent.overallNotes)
  }

  return lines.join('\n').trim()
}

export function SharePlanDrawer({ open, onClose, planContent, trainingDate, planKind = 'MAIN' }: Props) {
  const hasDualGroup = useMemo(
    () => planContent?.sections.some(s => s.group === 'BEGINNER') ?? false,
    [planContent],
  )

  const [activeTab, setActiveTab] = useState<'MAIN' | 'BEGINNER'>('MAIN')

  const text = useMemo(
    () => buildShareText(planContent, trainingDate, hasDualGroup ? activeTab : 'ALL', planKind),
    [planContent, trainingDate, hasDualGroup, activeTab, planKind],
  )

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setActiveTab('MAIN')
    }
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(text)}`

  // Style copy/whatsapp buttons match the active group color
  const activeAccent = hasDualGroup && activeTab === 'BEGINNER'
    ? { whatsapp: 'bg-amber-600 hover:bg-amber-700' }
    : { whatsapp: 'bg-emerald-600 hover:bg-emerald-700' }

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={copy}
        disabled={!text}
        className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {copied ? <><Check size={16} /> Kopiert</> : <><Copy size={16} /> Kopieren</>}
      </button>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener"
        className={`h-11 rounded-lg ${activeAccent.whatsapp} text-white font-bold cursor-pointer flex items-center justify-center gap-1.5 ${!text ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <MessageCircle size={16} /> WhatsApp
      </a>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Plan teilen" maxWidth="md" footer={footer}>
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-navy-600">Übersicht für WhatsApp / Telegram</p>

        {hasDualGroup && (
          <div className="flex gap-1 p-1 bg-cream-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('MAIN')}
              className={`flex-1 px-3 py-1.5 rounded font-display text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer ${
                activeTab === 'MAIN' ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-100'
              }`}
            >
              Hauptgruppe
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BEGINNER')}
              className={`flex-1 px-3 py-1.5 rounded font-display text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer ${
                activeTab === 'BEGINNER' ? 'bg-amber-600 text-white' : 'text-amber-800 hover:bg-amber-100'
              }`}
            >
              Anfänger
            </button>
          </div>
        )}

        <div className={`bg-white border rounded-xl p-3 text-sm text-navy-800 whitespace-pre-line max-h-64 overflow-y-auto font-mono leading-relaxed ${
          hasDualGroup && activeTab === 'BEGINNER' ? 'border-amber-300' : 'border-cream-300'
        }`}>
          {text || <span className="italic text-navy-500">Kein Plan zum Teilen.</span>}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
