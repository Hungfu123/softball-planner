import { ResponsiveSheet } from '@/components/shared'

interface Props {
  open: boolean
  onClose: () => void
}

interface Entry {
  symbol: string
  label: string
  description: string
}

const SECTIONS: Array<{ title: string; entries: Entry[] }> = [
  {
    title: 'Hits',
    entries: [
      { symbol: '1B', label: 'Single', description: 'Bahn Home → 1B' },
      { symbol: '2B', label: 'Double', description: 'Bahn bis 2B' },
      { symbol: '3B', label: 'Triple', description: 'Bahn bis 3B' },
      { symbol: 'HR', label: 'Homerun', description: 'Komplett ausgemalt + Run' },
    ],
  },
  {
    title: 'Outs',
    entries: [
      { symbol: 'K', label: 'Strikeout', description: '3rd Strike — Out' },
      { symbol: 'F8', label: 'Fly Out', description: 'CF (Position 8) fängt Fly' },
      { symbol: '6-3', label: 'Grounder', description: 'SS wirft zu 1B → Out' },
      { symbol: 'DP', label: 'Double Play', description: '2 Outs gleichzeitig' },
      { symbol: 'E5', label: 'Error', description: 'Position 5 (3B) verkackt — Spieler kommt auf Base' },
      { symbol: 'AO', label: 'Automatisches Out', description: 'Fehlende Spielerin — Out im Inning, kein At-Bat' },
    ],
  },
  {
    title: 'Walk / HBP',
    entries: [
      { symbol: 'BB', label: 'Walk', description: '4 Balls — geht zu 1B' },
      { symbol: 'HP', label: 'Hit by Pitch', description: 'Batter getroffen — geht zu 1B' },
    ],
  },
  {
    title: 'Stealing',
    entries: [
      { symbol: 'SB', label: 'Stolen Base', description: 'Runner stiehlt' },
      { symbol: 'CS', label: 'Caught Stealing', description: 'Runner getaggt → Out' },
    ],
  },
  {
    title: 'Substitution',
    entries: [
      { symbol: '↔', label: 'Auswechslung', description: 'Spieler raus, Ersatz kommt rein' },
    ],
  },
]

export function CheatsheetDrawer({ open, onClose }: Props) {
  return (
    <ResponsiveSheet open={open} onClose={onClose} title="Notation-Cheatsheet" maxWidth="md">
      <div className="p-4 space-y-5">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <h3 className="font-display text-[11px] tracking-widest font-bold text-gray-500 uppercase mb-2">
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.entries.map(e => (
                <div
                  key={e.symbol}
                  className="flex items-center gap-3 bg-cream-50 border border-cream-300 rounded-lg p-2"
                >
                  <span className="font-display text-2xl font-extrabold text-navy-900 w-12 text-center">
                    {e.symbol}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-navy-900">{e.label}</div>
                    <div className="text-xs text-gray-600">{e.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ResponsiveSheet>
  )
}
