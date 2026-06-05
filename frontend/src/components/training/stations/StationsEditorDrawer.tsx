import { useEffect, useState } from 'react'
import type { StationLevel, StationType, TrainingStation } from '@/types'
import { STATION_META, STATION_TYPE_ORDER } from './stationMeta'
import { DEFAULT_STATIONS } from './deriveStations'
import { XMark, TrashBin, PlusCircle } from '@/icons'

interface Props {
  open: boolean
  stations: TrainingStation[] | null | undefined
  onClose: () => void
  onSave: (stations: TrainingStation[]) => void
}

export function StationsEditorDrawer({ open, stations, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<TrainingStation[]>([])

  useEffect(() => {
    if (!open) return
    const initial = stations && stations.length > 0 ? stations : DEFAULT_STATIONS
    setDraft(initial.map(s => ({ ...s })))
  }, [open, stations])

  if (!open) return null

  const patch = (idx: number, change: Partial<TrainingStation>) =>
    setDraft(prev => prev.map((s, i) => (i === idx ? { ...s, ...change } : s)))
  const remove = (idx: number) => setDraft(prev => prev.filter((_, i) => i !== idx))
  const add = () => setDraft(prev => [...prev, { type: 'TEE' }])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-cream-50 overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300 sticky top-0 bg-cream-50 z-10">
          <h2 className="font-display font-extrabold text-navy-900 uppercase tracking-widest text-sm">Batting-Stationen</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-navy-900 cursor-pointer"><XMark size={20} /></button>
        </div>

        <div className="p-4 space-y-3">
          {draft.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-cream-300 bg-white p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-extrabold text-navy-900 tabular-nums w-6 h-6 rounded-full bg-navy-100 flex items-center justify-center text-xs">{idx + 1}</span>
                <button
                  onClick={() => remove(idx)}
                  className="text-gray-400 hover:text-softball-red-600 cursor-pointer"
                  title="Station entfernen"
                ><TrashBin size={16} /></button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Typ
                  <select
                    value={s.type}
                    onChange={e => patch(idx, { type: e.target.value as StationType })}
                    className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50"
                  >
                    {STATION_TYPE_ORDER.map(t => <option key={t} value={t}>{STATION_META[t].label}</option>)}
                  </select>
                </label>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Level
                  <select
                    value={s.level ?? ''}
                    onChange={e => patch(idx, { level: (e.target.value || null) as StationLevel | null })}
                    className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50"
                  >
                    <option value="">—</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="BEGINNER">Beginner</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Label (optional)
                  <input
                    type="text" placeholder={STATION_META[s.type].label}
                    value={s.label ?? ''}
                    onChange={e => patch(idx, { label: e.target.value || null })}
                    className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50"
                  />
                </label>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  Wahl-Gruppe
                  <input
                    type="number" min={1} placeholder="–"
                    value={s.choiceGroup ?? ''}
                    onChange={e => patch(idx, { choiceGroup: e.target.value ? Number(e.target.value) : null })}
                    className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-sm text-navy-900 bg-cream-50 tabular-nums"
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            onClick={add}
            className="w-full rounded-xl border border-dashed border-navy-300 px-4 py-2.5 text-sm font-bold text-navy-700 hover:bg-navy-50 cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <PlusCircle size={16} /> Station hinzufügen
          </button>
          <p className="text-[11px] text-gray-500 px-1">Gleiche Wahl-Gruppe = "wähle 1"-Alternativen (z.B. Advanced vs. Beginner).</p>
        </div>

        <div className="sticky bottom-0 bg-cream-50 border-t border-cream-300 p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-cream-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-cream-100 cursor-pointer">Abbrechen</button>
          <button onClick={() => onSave(draft)} className="flex-1 rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white hover:bg-navy-800 cursor-pointer">Speichern</button>
        </div>
      </div>
    </div>
  )
}
