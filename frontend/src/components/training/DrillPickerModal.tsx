import { useState } from 'react'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import type { DrillResponse, DrillCategory } from '@/types'

const CATEGORY_LABELS: Partial<Record<DrillCategory, string>> = {
  WARMUP: 'Warmup',
  PARTNER_ROUTINE: 'Partner-Routine',
  THROWING: 'Throwing',
  BASERUNNING: 'Baserunning',
  CONDITIONING: 'Conditioning',
  CATCHER: 'Catcher',
  FIRST_BASE: '1B',
  SECOND_BASE: '2B',
  SS: 'SS',
  THIRD_BASE: '3B',
  OUTFIELD: 'Outfield',
  SITUATIONAL: 'Situational',
  HITTING: 'Hitting',
  FIELDING: 'Fielding',
  DOUBLE_PLAY: 'Double Play',
  BUNT_DEFENSE: 'Bunt Defense',
  RELAY: 'Relay',
}

interface Props {
  drills: DrillResponse[]
  onSelect: (drill: DrillResponse) => void
  onClose: () => void
}

export function DrillPickerModal({ drills, onSelect, onClose }: Props) {
  const [filter, setFilter] = useState<DrillCategory | null>(null)
  const [search, setSearch] = useState('')

  const filtered = drills.filter(d => {
    if (filter && !d.categories.includes(filter)) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const categories = [...new Set(drills.flatMap(d => d.categories))].sort()

  return (
    <ResponsiveSheet open onClose={onClose} title="Drill hinzufügen" maxWidth="lg" nested>
      <div className="px-4 py-3 space-y-2 border-b border-cream-200">
        <input
          type="text"
          placeholder="Drill suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-cream-300 rounded-lg px-3 py-2 text-sm focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none"
          autoFocus
        />
        <div className="flex flex-wrap items-stretch gap-1">
          <button
            onClick={() => setFilter(null)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              !filter ? 'bg-navy-800 text-white' : 'bg-cream-200 text-gray-600 hover:bg-cream-300'
            }`}
          >
            Alle
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat === filter ? null : cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                filter === cat
                  ? 'bg-navy-800 text-white'
                  : 'bg-cream-200 text-gray-600 hover:bg-cream-300'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Keine Drills gefunden</p>
        ) : (
          filtered.map(drill => (
            <div key={drill.id} className="flex items-center border-b border-cream-200">
              <button
                onClick={() => onSelect(drill)}
                className="flex-1 text-left px-4 py-3 hover:bg-navy-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-navy-900">
                    {drill.name}
                    {drill.complexity === 'ADVANCED' && (
                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">ADVANCED</span>
                    )}
                    {drill.complexity === 'BASIC' && (
                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">BASIC</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">mind. {drill.minPlayers}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {drill.categories.map(cat => (
                    <span key={cat} className="text-xs bg-cream-200 text-gray-500 px-1.5 py-0.5 rounded">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                  ))}
                </div>
              </button>
              {drill.pdfPage && (
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(`/drills.pdf?t=${Date.now()}#page=${drill.pdfPage}`, 'drill-handbuch') }}
                  className="self-stretch flex items-center px-3 text-xs text-navy-600 hover:bg-navy-50 hover:underline transition-colors cursor-pointer flex-shrink-0 border-l border-cream-200"
                  title="Im Handbuch nachschlagen"
                >
                  S.{drill.pdfPage} ↗
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </ResponsiveSheet>
  )
}
