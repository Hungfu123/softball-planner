import { useMemo, useState } from 'react'
import { Drawer } from 'vaul'
import { Calendar, Check } from 'lucide-react'

type Training = { id: number; date: string; cancelled?: boolean }

type Props = {
  open: boolean
  onClose: () => void
  trainings: Training[]
  selectedId: number | null
  onSelect: (id: number) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function TrainingPickerDrawer({ open, onClose, trainings, selectedId, onSelect }: Props) {
  const [mountedNowMs] = useState(() => Date.now())
  const grouped = useMemo(() => {
    const cutoff = mountedNowMs - 12 * 60 * 60 * 1000
    const sorted = [...trainings].sort((a, b) => b.date.localeCompare(a.date))
    const upcoming: Training[] = []
    const past: Training[] = []
    for (const t of sorted) {
      if (new Date(t.date).getTime() >= cutoff) upcoming.push(t)
      else past.push(t)
    }
    return { upcoming: upcoming.reverse(), past }
  }, [trainings, mountedNowMs])

  const handleSelect = (id: number) => {
    onSelect(id)
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[85vh] h-fit overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Training auswählen</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div
            className="px-4 py-4 space-y-4 max-w-2xl mx-auto w-full"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="text-navy-700" size={20} />
              <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
                Trainings
              </h2>
            </div>

            {trainings.length === 0 ? (
              <p className="text-sm text-navy-500 italic">Keine Trainings vorhanden.</p>
            ) : (
              <div className="space-y-4">
                {grouped.upcoming.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">Anstehend &amp; heute</h3>
                    <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
                      {grouped.upcoming.map(t => (
                        <TrainingRow key={t.id} training={t} selected={t.id === selectedId} onSelect={handleSelect} />
                      ))}
                    </div>
                  </section>
                )}

                {grouped.past.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-navy-500 mb-2">Vergangen</h3>
                    <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
                      {grouped.past.map(t => (
                        <TrainingRow key={t.id} training={t} selected={t.id === selectedId} onSelect={handleSelect} muted />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function TrainingRow({ training, selected, onSelect, muted = false }: { training: Training; selected: boolean; onSelect: (id: number) => void; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(training.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-cream-200 last:border-b-0 cursor-pointer hover:bg-cream-50 active:bg-cream-100 transition-colors text-left ${selected ? 'bg-navy-50' : ''}`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${selected ? 'bg-navy-800' : muted ? 'bg-cream-400' : 'bg-navy-400'}`}
      />
      <span className={`flex-1 text-sm tabular-nums ${selected ? 'text-navy-900 font-bold' : muted ? 'text-navy-500' : 'text-navy-800'}`}>
        {formatDate(training.date)}
        {training.cancelled && <span className="ml-2 text-[10px] uppercase tracking-wider text-softball-red-600 font-bold">Abgesagt</span>}
      </span>
      {selected && <Check size={16} className="text-navy-700" />}
    </button>
  )
}
