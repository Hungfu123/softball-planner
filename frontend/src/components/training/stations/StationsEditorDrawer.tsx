import { useEffect, useState } from 'react'
import type { StationLevel, StationType, TrainingPlanSectionResponse } from '@/types'
import { STATION_META, STATION_TYPE_ORDER } from './stationMeta'
import { XMark } from '@/icons'

interface Props {
  open: boolean
  sections: TrainingPlanSectionResponse[]
  onClose: () => void
  onSave: (sections: TrainingPlanSectionResponse[]) => void
}

export function StationsEditorDrawer({ open, sections, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<TrainingPlanSectionResponse[]>([])

  useEffect(() => {
    if (!open) return
    setDraft(sections.map(s =>
      s.stationType == null && s.sectionType === 'BATTING'
        ? { ...s, stationType: 'LIVE' as StationType }
        : { ...s },
    ))
  }, [open, sections])

  if (!open) return null

  const patch = (idx: number, change: Partial<TrainingPlanSectionResponse>) =>
    setDraft(prev => prev.map((s, i) => (i === idx ? { ...s, ...change } : s)))

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-cream-50 overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300 sticky top-0 bg-cream-50">
          <h2 className="font-display font-extrabold text-navy-900 uppercase tracking-widest text-sm">Stationen bearbeiten</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-navy-900 cursor-pointer"><XMark size={20} /></button>
        </div>

        <div className="p-4 space-y-3">
          {draft.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-cream-300 bg-white p-3 space-y-2.5">
              <div className="font-bold text-navy-900 text-sm">{s.title?.trim() || 'Section'}</div>

              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                Stations-Typ
                <select
                  value={s.stationType ?? ''}
                  onChange={e => patch(idx, { stationType: (e.target.value || null) as StationType | null })}
                  className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50"
                >
                  <option value="">— keine Station —</option>
                  {STATION_TYPE_ORDER.map(t => <option key={t} value={t}>{STATION_META[t].label}</option>)}
                </select>
              </label>

              {s.stationType && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Level
                    <select
                      value={s.stationLevel ?? ''}
                      onChange={e => patch(idx, { stationLevel: (e.target.value || null) as StationLevel | null })}
                      className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50"
                    >
                      <option value="">—</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="BEGINNER">Beginner</option>
                    </select>
                  </label>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Wahl-Gruppe
                    <input
                      type="number" min={1} placeholder="–"
                      value={s.stationChoiceGroup ?? ''}
                      onChange={e => patch(idx, { stationChoiceGroup: e.target.value ? Number(e.target.value) : null })}
                      className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50 tabular-nums"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-cream-50 border-t border-cream-300 p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-cream-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-cream-100 cursor-pointer">Abbrechen</button>
          <button onClick={() => onSave(draft)} className="flex-1 rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white hover:bg-navy-800 cursor-pointer">Speichern</button>
        </div>
      </div>
    </div>
  )
}
