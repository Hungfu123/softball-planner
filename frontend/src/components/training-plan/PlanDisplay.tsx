import type { TrainingPlanResponse, TrainingPlanSectionResponse, DrillResponse } from '@/types'
import PlanSection from './PlanSection'
import { generateTrainingPlanPdf } from '@/utils/trainingPlanPdf'
import { ExportDoc, Pencil, TrashBin, ClipboardIcon } from '@/icons'

interface Props {
  plan: TrainingPlanResponse
  trainingDate: string
  drills: DrillResponse[]
  onEdit: () => void
  onDelete: () => void
}

function groupSections(sections: TrainingPlanSectionResponse[]): { parallel: boolean; group: number | null; sections: TrainingPlanSectionResponse[] }[] {
  const result: { parallel: boolean; group: number | null; sections: TrainingPlanSectionResponse[] }[] = []
  let i = 0
  while (i < sections.length) {
    const section = sections[i]
    if (section.parallelGroup != null) {
      const group = section.parallelGroup
      const parallel: TrainingPlanSectionResponse[] = []
      while (i < sections.length && sections[i].parallelGroup === group) {
        parallel.push(sections[i])
        i++
      }
      result.push({ parallel: true, group, sections: parallel })
    } else {
      result.push({ parallel: false, group: null, sections: [section] })
      i++
    }
  }
  return result
}

function buildTimelineBlocks(grouped: ReturnType<typeof groupSections>) {
  const blocks: { type: string; label: string; minutes: number }[] = []
  for (const g of grouped) {
    const minutes = g.sections[0]?.durationMinutes ?? 0
    const type = g.parallel ? 'DRILL' : (g.sections[0]?.sectionType ?? 'DRILL')
    const label = g.parallel ? `${g.sections.length} Stationen` : (g.sections[0]?.title ?? '')
    blocks.push({ type, label, minutes })
  }
  return blocks
}

function buildShareText(drills: DrillResponse[], grouped: ReturnType<typeof groupSections>, trainingDate: string): string {
  const date = new Date(trainingDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })
  const lines: string[] = []
  lines.push(`⚾ *Trainingsplan — ${date}*`)
  lines.push('')

  for (const g of grouped) {
    if (g.parallel && g.sections.length >= 2) {
      lines.push('*Drillstationen:*')
      for (const s of g.sections) {
        const drill = s.drillId ? drills.find(d => d.id === s.drillId) : null
        const short = drill?.description?.split('\n')[0] ?? ''
        lines.push(`• ${s.title}`)
        if (short && short.length < 120) lines.push(`  ${short}`)
      }
      lines.push('')
    } else {
      const s = g.sections[0]
      if (s.sectionType === 'WARMUP') {
        lines.push('*Aufwärmen*')
        lines.push('• Aufwärmroutine')
        lines.push('• Werfen einwerfen (einer geht Schritt nach hinten)')
        lines.push('')
      } else if (s.sectionType === 'BATTING') {
        lines.push('*Schlagstationen*')
        lines.push('• Livestation')
        lines.push('• Buntstation')
        lines.push('• Tee Station mit Besen für Hüfte')
        lines.push('• Korken / Whiffleballs')
        lines.push('')
      } else if (s.sectionType === 'GAME') {
        lines.push(`*${s.title}*`)
        lines.push('')
      } else {
        const drill = s.drillId ? drills.find(d => d.id === s.drillId) : null
        const short = drill?.description?.split('\n')[0] ?? ''
        lines.push(`• ${s.title}`)
        if (short && short.length < 120) lines.push(`  ${short}`)
      }
    }
  }

  return lines.join('\n').trim()
}

export default function PlanDisplay({ plan, drills, trainingDate, onEdit, onDelete }: Props) {
  const sections = plan.content?.sections ?? []
  const grouped = groupSections(sections)
  const timelineBlocks = buildTimelineBlocks(grouped)
  const totalMinutes = timelineBlocks.reduce((sum, b) => sum + b.minutes, 0)

  let sectionIndex = 0
  let cumulative = 0

  return (
    <div className="space-y-4">
      {/* Desktop: Sidebar Layout / Mobile: Stacked */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">

        {/* === LEFT: Drill Cards === */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Mobile: Handbuch-Link oben */}
          <button
            onClick={() => window.open('/drills.pdf?t=' + Date.now(), 'drill-handbuch')}
            className="lg:hidden w-full bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:border-navy-300 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">PDF</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-gray-900">Drill-Handbuch</p>
              <p className="text-[10px] text-gray-400">Alle Drills mit Zeichnungen</p>
            </div>
          </button>
          {grouped.map((group, gi) => {
            const blockMinutes = group.sections[0]?.durationMinutes ?? 0
            cumulative += blockMinutes

            if (group.parallel && group.sections.length >= 2) {
              sectionIndex += group.sections.length
              const duration = group.sections[0]?.durationMinutes ?? 0
              const playersPerGroup = group.sections[0]?.playersPerGroup
              const rotationPlan = group.sections[0]?.rotationPlan

              return (
                <div key={gi} className="bg-white rounded-xl border border-gray-200 p-4 plan-section">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-navy-800 text-white">
                      Stationsbetrieb · {group.sections.length} Stationen
                    </span>
                    <span className="text-xs text-gray-400">{duration} min</span>
                    {playersPerGroup && <span className="text-xs text-gray-400">· {playersPerGroup}/Gruppe</span>}
                  </div>

                  {/* Rotation */}
                  {rotationPlan && (
                    <p className="text-xs text-navy-700 mb-3 bg-navy-50 rounded-lg px-3 py-2">
                      <span className="font-semibold">↻</span> {rotationPlan}
                    </p>
                  )}

                  {/* Station cards */}
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    {group.sections.map((section, si) => {
                      const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null
                      return (
                        <div key={si} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-bold text-navy-600 uppercase tracking-wider">Station {String.fromCharCode(65 + si)}</span>
                            {drill?.pdfPage && (
                              <button
                                onClick={() => window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch')}
                                className="text-xs text-navy-600 hover:underline cursor-pointer"
                              >
                                S. {drill.pdfPage} ↗
                              </button>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
                          {section.playersPerGroup && <span className="text-xs text-gray-400">{section.playersPerGroup} Spieler</span>}
                          {drill?.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{drill.description.split('\n')[0]}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            } else {
              const idx = sectionIndex
              sectionIndex++
              return <PlanSection key={gi} section={group.sections[0]} drills={drills} index={idx} />
            }
          })}
        </div>

        {/* === RIGHT: Sticky Sidebar === */}
        <div className="lg:w-72 lg:flex-shrink-0">
          <div className="lg:sticky lg:top-20 space-y-3">

            {/* Focus + Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Schwerpunkt</p>
              <h3 className="text-lg font-bold text-gray-900">{plan.focus}</h3>
              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                <span>{plan.playerCount} Spieler</span>
                <span>{plan.durationMinutes} min</span>
              </div>
              {totalMinutes > 0 && totalMinutes !== plan.durationMinutes && (
                <p className="text-xs text-navy-600 mt-1">{totalMinutes} min verplant</p>
              )}

              {/* Action buttons */}
              <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100 no-print">
                <button
                  onClick={() => generateTrainingPlanPdf(plan, drills, trainingDate)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-navy-800 text-white rounded-lg text-xs font-medium hover:bg-navy-700 transition-colors cursor-pointer"
                  title="Als PDF speichern"
                >
                  <ExportDoc size={14} /> PDF
                </button>
                <button
                  onClick={onEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors cursor-pointer"
                  title="Anpassen"
                >
                  <Pencil size={14} /> Anpassen
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg text-gray-400 hover:text-softball-red-600 hover:border-softball-red-600 transition-colors cursor-pointer"
                  title="Löschen"
                >
                  <TrashBin size={14} />
                </button>
              </div>
            </div>

            {/* Überblick — WhatsApp-ready + Copy */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 no-print">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Überblick</h4>
                <button
                  onClick={() => {
                    const text = buildShareText(drills, grouped, trainingDate)
                    navigator.clipboard.writeText(text)
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-navy-600 border border-navy-200 rounded hover:bg-navy-800 hover:text-white hover:border-navy-800 transition-colors cursor-pointer"
                >
                  <ClipboardIcon size={12} /> Kopieren
                </button>
              </div>
              <div className="text-xs text-gray-600 space-y-1.5 whitespace-pre-line">
                {buildShareText(drills, grouped, trainingDate).split('\n').map((line, i) => {
                  if (!line.trim()) return <div key={i} className="h-1" />
                  if (line.startsWith('⚾')) return <p key={i} className="font-bold text-gray-900">{line}</p>
                  if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className="font-semibold text-gray-800 mt-1">{line.replace(/\*/g, '')}</p>
                  if (line.startsWith('  •') || line.startsWith('•')) return <p key={i} className="pl-2">{line}</p>
                  if (line.startsWith('  _')) return <p key={i} className="pl-2 text-gray-400 italic">{line.replace(/_/g, '')}</p>
                  return <p key={i}>{line}</p>
                })}
              </div>
            </div>

            {/* Group Hint */}
            {plan.content?.groupDistributionHint && (
              <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-800 leading-relaxed">
                <h4 className="font-semibold mb-1">Gruppenaufteilung</h4>
                <p>{plan.content.groupDistributionHint}</p>
              </div>
            )}


            {/* Drill-Handbuch Link */}
            <button
              onClick={() => window.open('/drills.pdf?t=' + Date.now(), 'drill-handbuch')}
              className="w-full bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:border-navy-300 transition-colors cursor-pointer no-print"
            >
              <div className="w-9 h-9 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">PDF</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-gray-900">Drill-Handbuch</p>
                <p className="text-[10px] text-gray-400">Alle Drills mit Zeichnungen & Erklärungen</p>
              </div>
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
