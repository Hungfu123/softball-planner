import { useState } from 'react'
import type { TrainingPlanSectionResponse, DrillResponse } from '@/types'

/** Rendert Text mit automatischer Formatierung */
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-2" />

        // "Phase 1 — Titel", "Teil 1 — Titel", "Variante 1 — Titel", "Station 1 — Titel"
        const sectionMatch = trimmed.match(/^(Phase \d+|Teil \d+|Variante \d+|Station \d+)\s*[—–-]\s*(.+)$/)
        if (sectionMatch) {
          // Titel und Beschreibung trennen am Doppelpunkt
          const [title, ...rest] = sectionMatch[2].split(':')
          return (
            <div key={i} className="mt-2">
              <p className="font-semibold text-gray-800">{sectionMatch[1]} — {title.trim()}</p>
              {rest.length > 0 && <p className="pl-1">{rest.join(':').trim()}</p>}
            </div>
          )
        }

        // "Wichtig:", "Ablauf:", "Grundposition:", etc. — Label als eigene Zeile
        const labelMatch = trimmed.match(/^(Wichtig|Ablauf|Grundposition|Fokus|Regel|Stretch je nach Wurf|Signale des Base-Coach|Grundtechnik[^:]*)[:\s](.+)$/)
        if (labelMatch) {
          return (
            <div key={i} className="mt-2">
              <p className="font-semibold text-gray-800">{labelMatch[1]}</p>
              <p className="pl-1">{labelMatch[2].trim()}</p>
            </div>
          )
        }

        // Nummerierte Liste "1. ..."
        if (/^[\d]+\.\s/.test(trimmed)) {
          return <p key={i} className="pl-4">{trimmed}</p>
        }

        // Aufzählung "- ..."
        if (trimmed.startsWith('- ')) {
          return <p key={i} className="pl-4">{trimmed}</p>
        }

        return <p key={i}>{trimmed}</p>
      })}
    </>
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

export default function PlanSection({ section, drills, index: _index }: Props) {
  const [descOpen, setDescOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)
  const drill = section.drillId ? drills.find(d => d.id === section.drillId) : null
  const hasKeyInfo = section.rotationPlan || section.groupSetup || section.adaptationNotes
  const hasExtraCoaching = section.setupNotes || section.tips || section.rounds || section.userNotes

  return (
    <div className="relative">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden plan-section">
        {/* Header */}
        <div className="px-4 py-3 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-600 font-medium">{section.durationMinutes ?? '?'} min</span>
              {section.playersPerGroup && (
                <span className="text-xs text-gray-400">· {section.playersPerGroup} Spieler/Gruppe</span>
              )}
            </div>
          </div>
          {drill?.pdfPage && (
            <button
              onClick={() => window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch')}
              className="text-xs text-navy-600 hover:text-navy-800 whitespace-nowrap print-ref hover:underline cursor-pointer"
            >
              Handbuch S. {drill.pdfPage} ↗
            </button>
          )}
        </div>

        {/* Batting: Stationen direkt sichtbar */}
        {section.sectionType === 'BATTING' && (
          <div className="px-4 pb-3">
            <p className="text-xs text-gray-400 mb-2">Je nach Equipment und Spieleranzahl auswählen:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BATTING_STATIONS.map((station, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-900">{station.label}</p>
                  <p className="text-[10px] text-gray-400">{station.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key info always visible */}
        {hasKeyInfo && (
          <div className="px-4 pb-2 space-y-1 text-xs text-gray-500">
            {section.rotationPlan && <p><span className="font-medium text-gray-600">Rotation:</span> {section.rotationPlan}</p>}
            {section.groupSetup && <p><span className="font-medium text-gray-600">Gruppen:</span> {section.groupSetup}</p>}
            {section.adaptationNotes && <p><span className="font-medium text-gray-600">Anpassung:</span> {section.adaptationNotes}</p>}
          </div>
        )}

        {/* Equipment */}
        {drill && drill.equipment.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-300">Equipment: {drill.equipment.join(', ')}</p>
          </div>
        )}

        {/* Drill description — collapsed by default */}
        {drill?.description && section.sectionType !== 'BATTING' && (
          <>
            <button
              onClick={() => setDescOpen(!descOpen)}
              className="w-full px-4 py-1.5 text-left text-xs text-navy-600 hover:bg-navy-50/50 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className={`transition-transform text-[10px] ${descOpen ? 'rotate-90' : ''}`}>▸</span>
              Drill-Beschreibung
            </button>
            {descOpen && (
              <div className="px-4 pb-3 text-sm text-gray-600 leading-relaxed space-y-0.5 border-t border-gray-50 pt-2">
                <FormattedText text={drill.description} />
                {drill.rotation && <p className="text-xs text-gray-400 mt-2"><span className="font-medium text-gray-500">Handbuch-Rotation:</span> {drill.rotation}</p>}
                {drill.variants && <p className="text-xs text-gray-400"><span className="font-medium text-gray-500">Varianten:</span> {drill.variants}</p>}
              </div>
            )}
          </>
        )}

        {/* Extra coaching — collapsed */}
        {hasExtraCoaching && (
          <>
            <button
              onClick={() => setCoachOpen(!coachOpen)}
              className="w-full px-4 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className={`transition-transform text-[10px] ${coachOpen ? 'rotate-90' : ''}`}>▸</span>
              Weitere Details
            </button>
            {coachOpen && (
              <div data-print-expand className="px-4 pb-3 space-y-1.5 text-xs text-gray-500 border-t border-gray-50 pt-2">
                {section.setupNotes && <p><span className="font-medium text-gray-600">Aufbau:</span> {section.setupNotes}</p>}
                {section.tips && <p><span className="font-medium text-gray-600">Tipps:</span> {section.tips}</p>}
                {section.rounds && <p><span className="font-medium text-gray-600">Runden:</span> {section.rounds}</p>}
                {section.userNotes && <p className="bg-yellow-50 p-2 rounded-lg text-yellow-800"><span className="font-medium">Notiz:</span> {section.userNotes}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
