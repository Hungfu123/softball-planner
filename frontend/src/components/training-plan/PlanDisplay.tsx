import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { TrainingPlanResponse, TrainingPlanSectionResponse, DrillResponse, InfieldPosition } from '@/types'
import { INFIELD_POSITION_LABELS } from '@/types'
import PlanSection from './PlanSection'
import { ExportDoc, Pencil, TrashBin, ClipboardIcon, XMark, SendIcon, ChevronDown } from '@/icons'

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

// Focus-Code (z.B. "INFIELD_DEFENSE") → readable ("Infield Defense")
function formatFocus(focus: string): string {
  return focus
    .toLowerCase()
    .split(/[_\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Phasen: Aufwärmen → Drills/Stationen → Batting → Spiel
type Phase = { id: string; label: string; minutes: number; blocks: GroupedBlock[] }

const PHASE_CONFIG: Record<string, { label: string }> = {
  WARMUP:  { label: 'Aufwärmen' },
  STATION: { label: 'Drills in Gruppen' },
  DRILL:   { label: 'Drills zusammen' },
  BATTING: { label: 'Batting' },
  GAME:    { label: 'Spiel' },
  BREAK:   { label: 'Pause' },
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
    // BREAK-Phasen nie zusammenfassen — jede Pause ist eigenständig
    const last = phases[phases.length - 1]
    if (last && last.id === type && type !== 'BREAK') {
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
    // Pausen nicht in den Überblick aufnehmen
    if (phase.id === 'BREAK') continue
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

function PhaseHeader({ phase }: { phase: Phase }) {
  return (
    <div className="flex items-center gap-3 pb-1.5 border-b border-cream-200">
      <span className="w-1 h-5 bg-softball-red-600 rounded-full shrink-0" />
      <span className="font-display text-[12px] sm:text-[13px] font-extrabold tracking-widest uppercase text-navy-900">{phase.label}</span>
      <div className="flex-1" />
      <span className="font-display text-[10px] tracking-widest uppercase text-gray-400 font-bold">{phase.minutes} min</span>
    </div>
  )
}

// ─── Compact Warmup ───

function CompactWarmup({ block, drills }: { block: GroupedBlock; drills: DrillResponse[] }) {
  const section = block.sections[0]
  const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null
  return (
    <div className="bg-cream-50 rounded-xl border border-cream-300 px-4 py-3 flex items-center justify-between gap-3">
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

// ─── Compact Break ───

function CompactBreak({ block }: { block: GroupedBlock }) {
  const section = block.sections[0]
  return (
    <div className="bg-cream-100 rounded-xl border border-cream-300 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Pause</span>
        <span className="text-xs text-gray-400">{section.durationMinutes} min</span>
      </div>
      {section.setupNotes && (
        <p className="text-xs text-gray-500 mt-1">{section.setupNotes}</p>
      )}
    </div>
  )
}

// ─── Station Card (single station within block) ───

function StationCard({ section, drill, letter, groupSizeText }: {
  section: TrainingPlanSectionResponse
  drill: DrillResponse | null | undefined
  letter: string
  groupSizeText: string
}) {
  const [open, setOpen] = useState(false)
  const hasDescription = !!drill?.description
  const hasExtra = !!(section.tips || section.setupNotes || drill?.rotation)
  const hasExpand = hasDescription || hasExtra
  const previewLine = drill?.description?.split('\n').map(l => l.trim()).find(l => l.length > 0) ?? ''

  return (
    <div className={`bg-cream-100 rounded-lg border border-cream-200 overflow-hidden transition-shadow ${
      open ? 'shadow-md shadow-navy-900/[0.06]' : ''
    }`}>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold text-navy-700">Gruppe {letter}</span>
          {drill?.pdfPage && (
            <button
              onClick={() => window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch')}
              className="text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline cursor-pointer"
            >
              S.{drill.pdfPage} ↗
            </button>
          )}
        </div>
        <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
        <span className="text-xs text-gray-500">{groupSizeText} Spieler</span>
        {!open && previewLine && (
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 italic">{previewLine}</p>
        )}
      </div>

      {hasExpand && (
        <>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="card-expand"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden border-t border-cream-200 bg-cream-50"
              >
                <div data-print-expand className="px-3 py-2.5 text-sm text-gray-800 leading-relaxed space-y-2.5">
                  {hasDescription && drill?.description && (
                    <div>
                      <p className="text-[13px] font-bold text-navy-900 mb-0.5">Beschreibung</p>
                      <p className="whitespace-pre-line text-gray-800">{drill.description}</p>
                    </div>
                  )}
                  {drill?.rotation && (
                    <div>
                      <p className="text-[13px] font-bold text-navy-900 mb-0.5">Rotation</p>
                      <p className="text-gray-700">{drill.rotation}</p>
                    </div>
                  )}
                  {section.setupNotes && (
                    <div>
                      <p className="text-[13px] font-bold text-navy-900 mb-0.5">Aufbau</p>
                      <p className="text-gray-700">{section.setupNotes}</p>
                    </div>
                  )}
                  {section.tips && (
                    <div>
                      <p className="text-[13px] font-bold text-navy-900 mb-0.5">Tipps</p>
                      <p className="text-gray-700">{section.tips}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setOpen(!open)}
            className={`w-full px-3 py-2 flex items-center justify-center gap-1 cursor-pointer border-t transition-colors no-print ${
              open
                ? 'border-cream-200 text-gray-500 hover:text-navy-900 bg-cream-100'
                : 'border-cream-200 text-navy-700 hover:bg-navy-50'
            }`}
            aria-expanded={open}
          >
            <span className="text-xs font-semibold">
              {open ? 'Zuklappen' : 'Beschreibung'}
            </span>
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </>
      )}
    </div>
  )
}

// ─── Station Block ───

function StationBlock({ block, drills, playerCount }: { block: GroupedBlock; drills: DrillResponse[]; playerCount: number }) {
  const numStations = block.sections.length
  const duration = block.sections[0]?.durationMinutes ?? 0
  const perStation = numStations > 0 ? Math.round(duration / numStations) : 0
  const minPerGroup = Math.floor(playerCount / numStations)
  const maxPerGroup = Math.ceil(playerCount / numStations)
  const groupSizeText = minPerGroup === maxPerGroup ? `${minPerGroup}` : `${minPerGroup}-${maxPerGroup}`

  return (
    <div className="bg-cream-50 rounded-xl border border-cream-300 p-4 plan-section">
      <div className="flex items-center justify-end mb-3">
        <span className="font-display text-[10px] tracking-widest uppercase text-gray-400 font-bold">{perStation} min/Drill · {groupSizeText}/Gruppe</span>
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        {block.sections.map((section, si) => {
          const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null
          return (
            <StationCard
              key={si}
              section={section}
              drill={drill}
              letter={String.fromCharCode(65 + si)}
              groupSizeText={groupSizeText}
            />
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
  const generatedText = useMemo(() => buildShareText(drills, grouped, trainingDate), [drills, grouped, trainingDate])
  const [copied, setCopied] = useState(false)
  const [showOverview, setShowOverview] = useState(false)

  let sectionIndex = 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">

        {/* === Mobile: Focus + Actions oben === */}
        <div className="lg:hidden">
          <div className="bg-cream-50 rounded-xl border border-cream-300 p-4">
            <p className="font-display text-[10px] text-gray-500 uppercase tracking-widest font-bold">Schwerpunkt</p>
            <h3 className="font-display text-base font-extrabold text-navy-900 tracking-wide">
              {formatFocus(plan.focus)}
              {plan.infieldPositions && plan.infieldPositions.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-navy-800 text-white">
                  {plan.infieldPositions.map((p: InfieldPosition) => INFIELD_POSITION_LABELS[p]).join(', ')}
                </span>
              )}
            </h3>
            <div className="font-display flex gap-3 mt-1 text-[11px] text-gray-500 tracking-wide font-bold">
              <span>{plan.playerCount} Spieler</span>
              <span>·</span>
              <span>{plan.durationMinutes} min</span>
            </div>
            <div className="flex gap-1.5 mt-3 pt-3 border-t border-cream-200 no-print">
              <button
                onClick={onEdit}
                className="font-display flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-navy-900 text-white rounded-lg text-[11px] font-bold tracking-widest uppercase hover:bg-navy-800 shadow-sm shadow-navy-900/15 cursor-pointer"
              >
                <Pencil size={14} /> Anpassen
              </button>
              <button
                onClick={() => setShowOverview(true)}
                className="font-display flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cream-50 border border-cream-300 rounded-lg text-[11px] font-extrabold tracking-widest uppercase text-navy-700 hover:bg-white hover:border-navy-500 hover:text-navy-900 cursor-pointer"
                title="Übersicht teilen — für WhatsApp / Telegram"
              >
                <SendIcon size={13} /> Teilen
              </button>
              <button
                onClick={() => window.open('/drills.pdf?t=' + Date.now(), 'drill-handbuch')}
                className="flex items-center justify-center px-3 py-2 border border-cream-300 rounded-lg text-navy-700 hover:bg-cream-100 hover:border-navy-400 hover:text-navy-900 cursor-pointer"
                aria-label="Drill-Handbuch"
                title="Drill-Handbuch"
              >
                <ExportDoc size={14} />
              </button>
              <button
                onClick={onDelete}
                className="flex items-center justify-center px-3 py-2 border border-cream-300 rounded-lg text-gray-400 hover:text-softball-red-600 hover:border-softball-red-400 cursor-pointer"
                aria-label="Löschen"
                title="Löschen"
              >
                <TrashBin size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* === LEFT: Drill Cards === */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Phases with headers */}
          {phases.map((phase, pi) => {
              // BREAK: kompakte Karte ohne Phase-Header
              if (phase.id === 'BREAK') {
                sectionIndex++
                return (
                  <div key={pi} className={`space-y-2 ${pi > 0 ? 'mt-5' : ''}`}>
                    <CompactBreak block={phase.blocks[0]} />
                  </div>
                )
              }

              return (
                <div key={pi} className={`space-y-2 ${pi > 0 ? 'mt-5' : ''}`}>
                  <PhaseHeader phase={phase} />

                  {phase.blocks.map((block, bi) => {
                    // Warmup → kompakt
                    if (phase.id === 'WARMUP') {
                      sectionIndex++
                      return <CompactWarmup key={bi} block={block} drills={drills} />
                    }

                    // Stationsblöcke
                    if (block.parallel && block.sections.length >= 2) {
                      sectionIndex += block.sections.length
                      return <StationBlock key={bi} block={block} drills={drills} playerCount={plan.playerCount} />
                    }

                    // Einzelne Sections (Batting, Game, einzelne Drills)
                    const idx = sectionIndex
                    sectionIndex++
                    return <PlanSection key={bi} section={block.sections[0]} drills={drills} index={idx} />
                  })}
                </div>
              )
            })}
        </div>

        {/* === RIGHT: Sticky Sidebar (Desktop only — Mobile hat Focus+Buttons oben) === */}
        <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
          <div className="lg:sticky lg:top-20 space-y-3">

            {/* Focus + Actions */}
            <div className="bg-cream-50 rounded-xl border border-cream-300 p-4">
              <p className="font-display text-[10px] text-gray-500 uppercase tracking-widest font-bold">Schwerpunkt</p>
              <h3 className="font-display text-lg font-extrabold text-navy-900 tracking-wide">
                {formatFocus(plan.focus)}
                {plan.infieldPositions && plan.infieldPositions.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-navy-800 text-white">
                    {plan.infieldPositions.map((p: InfieldPosition) => INFIELD_POSITION_LABELS[p]).join(', ')}
                  </span>
                )}
              </h3>
              <div className="font-display flex gap-3 mt-1 text-[11px] text-gray-500 tracking-wide font-bold">
                <span>{plan.playerCount} Spieler</span>
                <span>·</span>
                <span>{plan.durationMinutes} min</span>
              </div>
              {totalMinutes > 0 && totalMinutes !== plan.durationMinutes && (
                <p className="font-display text-[10px] text-softball-red-700 mt-1 tracking-widest uppercase font-bold">{totalMinutes} min verplant</p>
              )}

              {/* Action buttons */}
              <div className="flex gap-1.5 mt-3 pt-3 border-t border-cream-200 no-print">
                <button
                  onClick={onEdit}
                  className="font-display flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-navy-900 text-white rounded-lg text-[11px] font-bold tracking-widest uppercase hover:bg-navy-800 shadow-sm shadow-navy-900/15 transition-colors cursor-pointer"
                  title="Anpassen"
                >
                  <Pencil size={14} /> Anpassen
                </button>
                <button
                  onClick={() => setShowOverview(true)}
                  className="font-display flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cream-50 border border-cream-300 rounded-lg text-[11px] font-extrabold tracking-widest uppercase text-navy-700 hover:bg-white hover:border-navy-500 hover:text-navy-900 transition-colors cursor-pointer"
                  title="Übersicht teilen — für WhatsApp / Telegram"
                >
                  <SendIcon size={13} /> Teilen
                </button>
                <button
                  onClick={() => window.open('/drills.pdf?t=' + Date.now(), 'drill-handbuch')}
                  className="flex items-center justify-center px-3 py-2 border border-cream-300 rounded-lg text-navy-700 hover:bg-cream-100 hover:border-navy-400 hover:text-navy-900 transition-colors cursor-pointer"
                  title="Drill-Handbuch öffnen"
                  aria-label="Drill-Handbuch"
                >
                  <ExportDoc size={14} />
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center justify-center px-3 py-2 border border-cream-300 rounded-lg text-gray-400 hover:text-softball-red-600 hover:border-softball-red-400 transition-colors cursor-pointer"
                  title="Löschen"
                  aria-label="Löschen"
                >
                  <TrashBin size={14} />
                </button>
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

      {/* === Mobile-Only: Gruppenaufteilung am Ende === */}
      {plan.content?.groupDistributionHint && (
        <div className="lg:hidden mt-4 bg-yellow-50 rounded-xl p-3 text-xs text-yellow-800 leading-relaxed">
          <h4 className="font-display font-extrabold tracking-widest uppercase text-[11px] mb-1">Gruppenaufteilung</h4>
          <p>{plan.content.groupDistributionHint}</p>
        </div>
      )}

      {/* === Überblick-Modal (WhatsApp-Text) === */}
      {showOverview && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 no-print"
          onClick={() => setShowOverview(false)}
        >
          <div
            className="bg-cream-50 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl border border-cream-300 max-h-[85vh] flex flex-col animate-[slideUp_200ms_ease]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200">
              <h4 className="font-display text-[13px] font-extrabold tracking-widest uppercase text-navy-900">Übersicht für WhatsApp</h4>
              <button
                onClick={() => setShowOverview(false)}
                className="p-1 text-gray-400 hover:text-navy-900 cursor-pointer"
                aria-label="Schließen"
              >
                <XMark size={18} />
              </button>
            </div>
            <div className="px-4 py-3 overflow-y-auto flex-1">
              <div className="text-sm text-gray-700 space-y-1.5 whitespace-pre-line">
                {generatedText.split('\n').map((line, i) => {
                  if (!line.trim()) return <div key={i} className="h-1" />
                  if (line.startsWith('⚾')) return <p key={i} className="font-bold text-gray-900">{line}</p>
                  if (line.startsWith('*') && line.endsWith('*')) return <p key={i} className="font-semibold text-gray-800 mt-2">{line.replace(/\*/g, '')}</p>
                  if (line.startsWith('  •') || line.startsWith('•')) return <p key={i} className="pl-2">{line}</p>
                  return <p key={i}>{line}</p>
                })}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-cream-200 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedText)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="font-display flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-softball-red-600 text-white rounded-lg text-[12px] font-extrabold tracking-widest uppercase hover:bg-softball-red-700 shadow-sm shadow-softball-red-600/25 cursor-pointer"
              >
                <ClipboardIcon size={14} /> {copied ? 'Kopiert!' : 'Kopieren'}
              </button>
              <button
                onClick={() => setShowOverview(false)}
                className="font-display px-4 py-2.5 text-[12px] font-bold tracking-widest uppercase text-gray-500 hover:text-navy-900 cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
