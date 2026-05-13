import { useEffect, useMemo, useState } from 'react'
import { Copy, Check, MessageCircle } from 'lucide-react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { TrainingPlanContentResponse } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  planContent: TrainingPlanContentResponse | null
  trainingDate: string | null
}

function buildShareText(
  planContent: TrainingPlanContentResponse | null,
  trainingDate: string | null,
): string {
  if (!planContent) return ''
  const lines: string[] = []

  const dateStr = trainingDate
    ? new Date(trainingDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })
    : ''
  lines.push(`⚾ *Trainingsplan${dateStr ? ` — ${dateStr}` : ''}*`)
  lines.push('')

  const pushHeadline = (h: string) => {
    if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('')
    lines.push(h)
  }

  const sections = planContent.sections
  let i = 0
  let warmupPrinted = false
  let drillsPrinted = false

  while (i < sections.length) {
    const s = sections[i]
    if (s.sectionType === 'BREAK') { i++; continue }

    if (s.parallelGroup != null) {
      const group = s.parallelGroup
      const stationDrills: typeof sections = []
      while (i < sections.length && sections[i].parallelGroup === group) {
        stationDrills.push(sections[i])
        i++
      }
      pushHeadline('*Drills in Gruppen:*')
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

export function SharePlanDrawer({ open, onClose, planContent, trainingDate }: Props) {
  const text = useMemo(() => buildShareText(planContent, trainingDate), [planContent, trainingDate])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) setCopied(false)
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
        className={`h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer flex items-center justify-center gap-1.5 ${!text ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <MessageCircle size={16} /> WhatsApp
      </a>
    </div>
  )

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Plan teilen" maxWidth="md" footer={footer}>
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-navy-600">Übersicht für WhatsApp / Telegram</p>

        <div className="bg-white border border-cream-300 rounded-xl p-3 text-sm text-navy-800 whitespace-pre-line max-h-64 overflow-y-auto font-mono leading-relaxed">
          {text || <span className="italic text-navy-500">Kein Plan zum Teilen.</span>}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
