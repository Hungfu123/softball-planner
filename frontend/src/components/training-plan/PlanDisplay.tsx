import type { TrainingPlanResponse, TrainingPlanSectionResponse, DrillResponse } from '@/types'
import PlanSection from './PlanSection'
import { ExportDoc, Pencil, TrashBin, ClipboardIcon } from '@/icons'

interface Props {
  plan: TrainingPlanResponse
  trainingDate: string
  drills: DrillResponse[]
  onEdit: () => void
  onDelete: () => void
}

type GroupedBlock = { parallel: boolean; group: number | null; sections: TrainingPlanSectionResponse[] }

function groupSections(sections: TrainingPlanSectionResponse[]): GroupedBlock[] {
  const result: GroupedBlock[] = []
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

// Phasen: Aufwärmen → Drills/Stationen → Batting → Spiel
type Phase = { id: string; label: string; minutes: number; blocks: GroupedBlock[] }

const PHASE_CONFIG: Record<string, { label: string }> = {
  WARMUP:  { label: 'Aufwärmen' },
  STATION: { label: 'Drills in Gruppen' },
  DRILL:   { label: 'Drills zusammen' },
  BATTING: { label: 'Batting' },
  GAME:    { label: 'Spiel' },
}

function getPhaseType(block: GroupedBlock): string {
  if (block.parallel) return 'STATION'
  const sectionType = block.sections[0]?.sectionType ?? 'DRILL'
  if (sectionType === 'DRILL') return 'DRILL'
  return sectionType
}

function buildPhases(grouped: GroupedBlock[]): Phase[] {
  const phases: Phase[] = []
  for (const block of grouped) {
    const type = getPhaseType(block)
    const minutes = block.sections[0]?.durationMinutes ?? 0
    const cfg = PHASE_CONFIG[type] ?? PHASE_CONFIG.DRILL

    // Gleiche Phase zusammenfassen (z.B. mehrere aufeinanderfolgende Station-Blöcke)
    const last = phases[phases.length - 1]
    if (last && last.id === type) {
      last.minutes += minutes
      last.blocks.push(block)
    } else {
      phases.push({ id: type, label: cfg.label, minutes, blocks: [block] })
    }
  }
  return phases
}

function buildShareText(drills: DrillResponse[], grouped: GroupedBlock[], trainingDate: string): string {
  const date = new Date(trainingDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })
  const phases = buildPhases(grouped)
  const lines: string[] = []
  lines.push(`⚾ *Trainingsplan — ${date}*`)
  lines.push('')

  for (const phase of phases) {
    if (phase.id === 'WARMUP') {
      lines.push('*Aufwärmen*')
      lines.push('• Aufwärmroutine')
      lines.push('• Werfen einwerfen (einer geht Schritt nach hinten)')
      lines.push('')
    } else if (phase.id === 'STATION') {
      for (const block of phase.blocks) {
        lines.push('*Drills in Gruppen:*')
        for (const s of block.sections) {
          const drill = s.drillId ? drills.find(d => d.id === s.drillId) : null
          const short = drill?.description?.split('\n')[0] ?? ''
          lines.push(`• ${s.title}`)
          if (short && short.length < 120) lines.push(`  ${short}`)
        }
        lines.push('')
      }
    } else if (phase.id === 'DRILL') {
      lines.push('*Drills zusammen:*')
      for (const block of phase.blocks) {
        const s = block.sections[0]
        const drill = s.drillId ? drills.find(d => d.id === s.drillId) : null
        const short = drill?.description?.split('\n')[0] ?? ''
        lines.push(`• ${s.title}`)
        if (short && short.length < 120) lines.push(`  ${short}`)
      }
      lines.push('')
    } else if (phase.id === 'BATTING') {
      lines.push('*Schlagstationen*')
      lines.push('• Livestation')
      lines.push('• Buntstation')
      lines.push('• Tee Station mit Besen für Hüfte')
      lines.push('• Korken / Whiffleballs')
      lines.push('')
    } else if (phase.id === 'GAME') {
      const s = phase.blocks[0]?.sections[0]
      if (s) lines.push(`*${s.title}*`)
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}


// ─── Phase Header ───

function PhaseHeader({ phase, startMinute }: { phase: Phase; startMinute: number }) {
  const blockCount = phase.blocks.length
  return (
    <div className="flex items-center gap-3">
      <div className="w-1 h-5 rounded-full bg-softball-red-500 flex-shrink-0" />
      <span className="text-sm font-bold uppercase tracking-wider text-navy-800">{phase.label}</span>
      {phase.id === 'STATION' && blockCount > 1 && <span className="text-xs text-gray-400">· {blockCount} Runden</span>}
      <span className="text-xs text-gray-400 font-medium">{phase.minutes} min</span>
      <div className="flex-1 border-t border-gray-200" />
      <span className="text-[11px] text-gray-400">ab Min. {startMinute}</span>
    </div>
  )
}

// ─── Compact Warmup ───

function CompactWarmup({ block, drills }: { block: GroupedBlock; drills: DrillResponse[] }) {
  const section = block.sections[0]
  const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate">{section.title}</span>
        <span className="text-xs text-gray-400">{section.durationMinutes} min</span>
      </div>
      {drill?.pdfPage && (
        <button
          onClick={() => window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch')}
          className="text-xs text-navy-600 hover:underline cursor-pointer whitespace-nowrap flex-shrink-0"
        >
          Handbuch S. {drill.pdfPage} ↗
        </button>
      )}
    </div>
  )
}

// ─── Station Block ───

function StationBlock({ block, drills }: { block: GroupedBlock; drills: DrillResponse[] }) {
  const duration = block.sections[0]?.durationMinutes ?? 0
  const playersPerGroup = block.sections[0]?.playersPerGroup
  const perStation = block.sections.length > 0 ? Math.round(duration / block.sections.length) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 plan-section">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">{block.sections.length} Drills · Gruppen rotieren</span>
        <span className="text-[11px] text-gray-400">{duration} min · {perStation} min/Drill{playersPerGroup ? ` · ${playersPerGroup}/Gruppe` : ''}</span>
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        {block.sections.map((section, si) => {
          const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null
          return (
            <div key={si} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-navy-600 uppercase tracking-wider">Gruppe {String.fromCharCode(65 + si)}</span>
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
}

// ─── Main Component ───

export default function PlanDisplay({ plan, drills, trainingDate, onEdit, onDelete }: Props) {
  const sections = plan.content?.sections ?? []
  const grouped = groupSections(sections)
  const phases = buildPhases(grouped)
  const totalMinutes = phases.reduce((sum, p) => sum + p.minutes, 0)

  let sectionIndex = 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">

        {/* === LEFT: Drill Cards === */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Phases with headers */}
          {(() => {
            let minuteOffset = 0
            return phases.map((phase, pi) => {
              const startMinute = minuteOffset
              minuteOffset += phase.minutes

              return (
                <div key={pi} className={`space-y-2 ${pi > 0 ? 'mt-5' : ''}`}>
                  <PhaseHeader phase={phase} startMinute={startMinute} />

                  {phase.blocks.map((block, bi) => {
                    // Warmup → kompakt
                    if (phase.id === 'WARMUP') {
                      sectionIndex++
                      return <CompactWarmup key={bi} block={block} drills={drills} />
                    }

                    // Stationsblöcke
                    if (block.parallel && block.sections.length >= 2) {
                      sectionIndex += block.sections.length
                      return <StationBlock key={bi} block={block} drills={drills} />
                    }

                    // Einzelne Sections (Batting, Game, einzelne Drills)
                    const idx = sectionIndex
                    sectionIndex++
                    return <PlanSection key={bi} section={block.sections[0]} drills={drills} index={idx} />
                  })}
                </div>
              )
            })
          })()}
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
                  onClick={() => window.open('/drills.pdf?t=' + Date.now(), 'drill-handbuch')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-navy-800 text-white rounded-lg text-xs font-medium hover:bg-navy-700 transition-colors cursor-pointer"
                  title="Drill-Handbuch öffnen"
                >
                  <ExportDoc size={14} /> Handbuch
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


          </div>
        </div>
      </div>
    </div>
  )
}
