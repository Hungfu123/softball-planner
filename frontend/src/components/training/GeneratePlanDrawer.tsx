import { useState, useEffect } from 'react'
import { Drawer } from 'vaul'
import { Sparkles } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  defaultPlayerCount: number
  onGenerate: (data: { playerCount: number; focus: string; durationMinutes: number }) => Promise<void>
}

const FOCUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Allgemein', label: 'Allgemein' },
  { value: 'Defense', label: 'Defense' },
  { value: 'Offense / Batting', label: 'Offense / Batting' },
  { value: 'Pitching', label: 'Pitching' },
  { value: 'Baserunning', label: 'Baserunning' },
  { value: 'Fielding', label: 'Fielding' },
]

export function GeneratePlanDrawer({ open, onClose, defaultPlayerCount, onGenerate }: Props) {
  const [playerCount, setPlayerCount] = useState(defaultPlayerCount)
  const [focus, setFocus] = useState('Allgemein')
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setPlayerCount(defaultPlayerCount || 10)
      setFocus('Allgemein')
      setDurationMinutes(120)
    }
  }, [open, defaultPlayerCount])

  const durationPresets = [90, 120, 180]

  const submit = async () => {
    setSubmitting(true)
    try {
      await onGenerate({ playerCount, focus, durationMinutes })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-2xl max-h-[85vh] overflow-y-auto focus:outline-none">
          <Drawer.Title className="sr-only">Plan neu generieren</Drawer.Title>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
          <div
            className="px-4 py-4 space-y-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="text-softball-red-600" size={22} />
              <h2 className="font-display text-lg font-extrabold text-navy-900 uppercase tracking-wide">
                Plan neu generieren
              </h2>
            </div>
            <p className="text-xs text-navy-600">Bestehender Plan wird ersetzt.</p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Fokus</label>
                <select
                  value={focus}
                  onChange={e => setFocus(e.target.value)}
                  className="w-full px-3 py-2 border border-cream-300 rounded-md text-sm text-navy-900 bg-white focus:border-navy-400 focus:outline-none"
                >
                  {FOCUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Dauer</label>
                <div className="flex gap-1.5 mb-1.5">
                  {durationPresets.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDurationMinutes(p)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer tabular-nums ${durationMinutes === p ? 'bg-navy-800 text-white' : 'bg-cream-200 text-navy-700 hover:bg-cream-300'}`}
                    >
                      {p} min
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={30}
                  max={240}
                  step={5}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-cream-300 rounded-md text-sm text-navy-900 bg-white focus:border-navy-400 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-navy-500 block mb-1">Spieler</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={playerCount}
                  onChange={e => setPlayerCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-cream-300 rounded-md text-sm text-navy-900 bg-white focus:border-navy-400 focus:outline-none tabular-nums"
                />
                <p className="text-[10px] text-navy-500 mt-1">Vorbelegt mit Anwesenden für dieses Training</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="h-11 rounded-lg border border-cream-300 text-navy-700 font-medium hover:bg-cream-100 cursor-pointer disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={submit}
                disabled={submitting || playerCount < 1 || durationMinutes < 30}
                className="h-11 rounded-lg bg-softball-red-600 hover:bg-softball-red-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? 'Generiere…' : (<><Sparkles size={16} /> Generieren</>)}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
