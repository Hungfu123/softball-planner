import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveSheet } from '@/components/shared/ResponsiveSheet'
import { Badge } from '@/components/shared/Badge'

type Training = { id: number; date: string; cancelled?: boolean }

type Props = {
  open: boolean
  onClose: () => void
  trainings: Training[]
  selectedId: number | null
  onSelect: (id: number) => void
  /** trainingId → Anzahl unbekannter WhatsApp-Wähler */
  unknownVoterCounts?: Map<number, number>
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function todayLocalISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Tab = 'upcoming' | 'past'

export function TrainingPickerDrawer({ open, onClose, trainings, selectedId, onSelect, unknownVoterCounts }: Props) {
  const [todayStr] = useState(() => todayLocalISO())
  const [tab, setTab] = useState<Tab>('upcoming')
  const activeRef = useRef<HTMLDivElement>(null)

  const grouped = useMemo(() => {
    const sorted = [...trainings].sort((a, b) => b.date.localeCompare(a.date))
    const upcoming: Training[] = []
    const past: Training[] = []
    for (const t of sorted) {
      if (t.date >= todayStr) upcoming.push(t)
      else past.push(t)
    }
    return { upcoming: upcoming.reverse(), past }
  }, [trainings, todayStr])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      activeRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
    }, 50)
    return () => clearTimeout(timer)
  }, [open, selectedId])

  const handleSelect = (id: number) => {
    onSelect(id)
    onClose()
  }

  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Trainings" maxWidth="md">
      <div className="px-4 py-4 space-y-4">
        {trainings.length === 0 ? (
          <p className="text-sm text-navy-500 italic">Keine Trainings vorhanden.</p>
        ) : (
          <div className="space-y-3">
            <div className="inline-flex bg-cream-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setTab('upcoming')}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold cursor-pointer transition-colors ${tab === 'upcoming' ? 'bg-navy-700 text-white' : 'text-navy-700'}`}
              >
                Anstehend ({grouped.upcoming.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('past')}
                className={`px-3 py-1.5 text-xs rounded-md font-semibold cursor-pointer transition-colors ${tab === 'past' ? 'bg-navy-700 text-white' : 'text-navy-700'}`}
              >
                Vergangen ({grouped.past.length})
              </button>
            </div>

            {tab === 'upcoming' && (
              grouped.upcoming.length > 0 ? (
                <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
                  {grouped.upcoming.map(t => (
                    <TrainingRow key={t.id} training={t} selected={t.id === selectedId} onSelect={handleSelect} unknownVoterCount={unknownVoterCounts?.get(t.id) ?? 0} ref={t.id === selectedId ? activeRef : undefined} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy-400 italic">Keine anstehenden Trainings.</p>
              )
            )}

            {tab === 'past' && (
              grouped.past.length > 0 ? (
                <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
                  {grouped.past.map(t => (
                    <TrainingRow key={t.id} training={t} selected={t.id === selectedId} onSelect={handleSelect} unknownVoterCount={unknownVoterCounts?.get(t.id) ?? 0} muted ref={t.id === selectedId ? activeRef : undefined} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy-400 italic">Noch keine vergangenen Trainings.</p>
              )
            )}
          </div>
        )}
      </div>
    </ResponsiveSheet>
  )
}

function TrainingRow({ training, selected, onSelect, unknownVoterCount = 0, muted = false, ref }: { training: Training; selected: boolean; onSelect: (id: number) => void; unknownVoterCount?: number; muted?: boolean; ref?: React.Ref<HTMLDivElement> }) {
  const navigate = useNavigate()

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(training.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(training.id)
        }
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 cursor-pointer hover:bg-cream-50 active:bg-cream-100 transition-colors text-left ${selected ? 'bg-navy-50' : ''}`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${selected ? 'bg-navy-800' : muted ? 'bg-cream-400' : 'bg-navy-400'}`}
      />
      <span className={`flex-1 text-sm tabular-nums ${selected ? 'text-navy-900 font-bold' : muted ? 'text-navy-500' : 'text-navy-800'}`}>
        {formatDate(training.date)}
        {training.cancelled && <span className="ml-2 text-[10px] uppercase tracking-wider text-softball-red-600 font-bold">Abgesagt</span>}
      </span>
      {unknownVoterCount > 0 && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); navigate('/players?tab=whatsapp') }}
          title="Unbekannte WhatsApp-Wähler zuordnen"
          className="cursor-pointer"
        >
          <Badge color="red" size="sm">⚠️ {unknownVoterCount} unbekannte Wähler</Badge>
        </button>
      )}
      {selected && <Check size={16} className="text-navy-700" />}
    </div>
  )
}
