import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { TrainingPlanSectionResponse, DrillResponse } from '@/types'
import { ChevronDown } from '@/icons'

/** Rendert Text mit automatischer Formatierung */
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-2" />

        const sectionMatch = trimmed.match(/^(Phase \d+|Teil \d+|Variante \d+|Station \d+)\s*[—–-]\s*(.+)$/)
        if (sectionMatch) {
          const [title, ...rest] = sectionMatch[2].split(':')
          return (
            <div key={i} className="mt-2">
              <p className="font-semibold text-gray-800">{sectionMatch[1]} — {title.trim()}</p>
              {rest.length > 0 && <p className="pl-1">{rest.join(':').trim()}</p>}
            </div>
          )
        }

        const labelMatch = trimmed.match(/^(Wichtig|Ablauf|Grundposition|Fokus|Regel|Stretch je nach Wurf|Signale des Base-Coach|Grundtechnik[^:]*)[:\s](.+)$/)
        if (labelMatch) {
          return (
            <div key={i} className="mt-2">
              <p className="font-semibold text-gray-800">{labelMatch[1]}</p>
              <p className="pl-1">{labelMatch[2].trim()}</p>
            </div>
          )
        }

        if (/^[\d]+\.\s/.test(trimmed)) {
          return <p key={i} className="pl-4">{trimmed}</p>
        }
        if (trimmed.startsWith('- ')) {
          return <p key={i} className="pl-4">{trimmed}</p>
        }
        return <p key={i}>{trimmed}</p>
      })}
    </>
  )
}

/** Erste sinnvolle Zeile als Teaser, max maxChars */
function descPreview(text: string, maxChars = 130): string {
  const firstLine = text.split('\n').map(l => l.trim()).find(l => l.length > 0) ?? ''
  if (firstLine.length <= maxChars) return firstLine
  return firstLine.slice(0, maxChars).replace(/\s+\S*$/, '') + '…'
}

function MiniHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mt-3 first:mt-0 mb-1">
      <span className="w-0.5 h-4 bg-softball-red-600 rounded-full" />
      <span className="text-[14px] font-bold text-navy-900">{children}</span>
    </div>
  )
}

const BATTING_STATIONS = [
  { label: 'Live', desc: 'Pitcher tosst, Batter schlägt' },
  { label: 'Bunt', desc: 'Bunttechnik & Ballplatzierung' },
  { label: 'Tee', desc: 'Tee Station (Besen für Hüfte)' },
  { label: 'Korken', desc: 'Korken / Whiffleballs' },
]

interface Props {
  section: TrainingPlanSectionResponse
  drills: DrillResponse[]
  index: number
}

export default function PlanSection({ section, drills }: Props) {
  const [open, setOpen] = useState(false)
  const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null

  const hasKeyInfo = section.rotationPlan || section.groupSetup
  const hasEquipment = drill && drill.equipment.length > 0
  const hasDescription = !!drill?.description
  const isBatting = section.sectionType === 'BATTING'

  // Dedup: skip drill.rotation if identical to top-level section.rotationPlan
  const drillRotationDistinct = drill?.rotation && drill.rotation.trim() !== (section.rotationPlan ?? '').trim()
    ? drill.rotation : null
  // Dedup: strip lines from setupNotes that just repeat equipment list
  const equipmentLine = drill && drill.equipment.length > 0 ? drill.equipment.join(', ').toLowerCase() : null
  const cleanedSetupNotes = section.setupNotes
    ? section.setupNotes
        .split('\n')
        .filter(line => {
          const t = line.trim()
          if (!t) return false
          const m = t.match(/^equipment[:\s]+(.+)$/i)
          if (m && equipmentLine && m[1].toLowerCase().trim() === equipmentLine) return false
          return true
        })
        .join('\n')
        .trim()
    : ''

  const hasCoaching = !!(cleanedSetupNotes || section.tips || section.rounds || section.userNotes || section.adaptationNotes || drillRotationDistinct || drill?.variants)
  const hasExpandable = (hasDescription || hasCoaching) && !isBatting
  const preview = drill?.description ? descPreview(drill.description) : null

  return (
    <div className={`bg-cream-50 rounded-xl border border-cream-300 overflow-hidden plan-section transition-shadow ${
      open ? 'shadow-md shadow-navy-900/[0.06]' : ''
    }`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-gray-900">{section.title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-gray-600 tabular-nums">{section.durationMinutes ?? '?'} min</span>
            {section.playersPerGroup && (
              <span className="text-xs text-gray-500">· {section.playersPerGroup} pro Gruppe</span>
            )}
          </div>
        </div>
        {drill?.pdfPage && (
          <button
            onClick={() => window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch')}
            className="text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline whitespace-nowrap print-ref cursor-pointer"
            title="Drill im Handbuch öffnen"
          >
            S.{drill.pdfPage} ↗
          </button>
        )}
      </div>

      {/* BATTING: Stations grid */}
      {isBatting && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500 mb-2">Je nach Equipment / Spieleranzahl</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BATTING_STATIONS.map((station, i) => (
              <div key={i} className="bg-cream-100 rounded-lg px-3 py-2 border border-cream-200">
                <p className="text-sm font-semibold text-gray-900">{station.label}</p>
                <p className="text-xs text-gray-500">{station.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Always-visible meta: Rotation / Gruppen / Equipment */}
      {(hasKeyInfo || hasEquipment) && (
        <div className="px-4 pb-2 space-y-1 text-sm">
          {section.rotationPlan && (
            <p className="leading-relaxed">
              <span className="font-bold text-navy-900 mr-1.5">Rotation:</span>
              <span className="text-gray-700">{section.rotationPlan}</span>
            </p>
          )}
          {section.groupSetup && (
            <p className="leading-relaxed">
              <span className="font-bold text-navy-900 mr-1.5">Gruppen:</span>
              <span className="text-gray-700">{section.groupSetup}</span>
            </p>
          )}
          {hasEquipment && (
            <p className="leading-relaxed text-xs">
              <span className="font-semibold text-gray-600 mr-1.5">Equipment:</span>
              <span className="text-gray-500">{drill!.equipment.join(', ')}</span>
            </p>
          )}
        </div>
      )}

      {/* Teaser — entices expand */}
      {hasExpandable && preview && !open && (
        <div className="px-4 pb-2">
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 italic">{preview}</p>
        </div>
      )}

      {/* Expanded content */}
      {hasExpandable && (
        <>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="expand"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden border-t border-cream-200"
              >
                <div data-print-expand className="px-4 py-3 text-sm text-gray-800 leading-relaxed bg-cream-100/50">
                  {hasDescription && (
                    <div>
                      <MiniHeader>Beschreibung</MiniHeader>
                      <div className="space-y-0.5 text-gray-800">
                        <FormattedText text={drill!.description!} />
                      </div>
                    </div>
                  )}
                  {drillRotationDistinct && (
                    <div>
                      <MiniHeader>Handbuch-Rotation</MiniHeader>
                      <p className="text-sm text-gray-700 leading-relaxed">{drillRotationDistinct}</p>
                    </div>
                  )}
                  {drill?.variants && (
                    <div>
                      <MiniHeader>Varianten</MiniHeader>
                      <p className="text-sm text-gray-700 leading-relaxed">{drill.variants}</p>
                    </div>
                  )}
                  {cleanedSetupNotes && (
                    <div>
                      <MiniHeader>Aufbau</MiniHeader>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{cleanedSetupNotes}</p>
                    </div>
                  )}
                  {section.tips && (
                    <div>
                      <MiniHeader>Tipps</MiniHeader>
                      <p className="text-sm text-gray-700 leading-relaxed">{section.tips}</p>
                    </div>
                  )}
                  {section.rounds && (
                    <div>
                      <MiniHeader>Runden</MiniHeader>
                      <p className="text-sm text-gray-700 leading-relaxed">{section.rounds}</p>
                    </div>
                  )}
                  {section.adaptationNotes && (
                    <div>
                      <MiniHeader>Anpassung</MiniHeader>
                      <p className="text-sm text-gray-700 leading-relaxed">{section.adaptationNotes}</p>
                    </div>
                  )}
                  {section.userNotes && (
                    <div className="mt-3 bg-yellow-50 border-l-2 border-yellow-500 p-2.5 rounded-r">
                      <p className="text-[13px] font-bold text-yellow-800 mb-0.5">Notiz</p>
                      <p className="text-sm text-yellow-900 leading-relaxed">{section.userNotes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setOpen(!open)}
            className={`w-full px-4 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer border-t transition-colors no-print ${
              open
                ? 'border-cream-200 text-gray-500 hover:text-navy-900 bg-cream-100'
                : 'border-cream-200 text-navy-700 hover:bg-navy-50 hover:text-navy-900'
            }`}
            aria-expanded={open}
          >
            <span className="text-sm font-semibold">
              {open ? 'Zuklappen' : 'Beschreibung & Coaching'}
            </span>
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </>
      )}
    </div>
  )
}
