import type { Station } from './deriveStations'
import { STATION_META } from './stationMeta'

interface Props {
  stations: Station[]
  size?: 'mini' | 'full'
}

/** Auto-Layout: 2 Spalten, in Reihenfolge gefüllt; choiceGroup-Paare gerahmt. */
export function StationsDiagram({ stations, size = 'mini' }: Props) {
  if (stations.length === 0) return null
  const full = size === 'full'

  const choiceCounts = new Map<number, number>()
  for (const s of stations) {
    if (s.choiceGroup != null) choiceCounts.set(s.choiceGroup, (choiceCounts.get(s.choiceGroup) ?? 0) + 1)
  }

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${full ? 'p-6' : 'p-3'}`}
      style={{
        background:
          'radial-gradient(120% 90% at 15% 0%, #16305c 0%, transparent 55%), linear-gradient(135deg,#13284a,#0d1b34)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30"
           style={{ borderLeft: '3px solid rgba(244,236,216,.4)', borderBottom: '3px solid rgba(244,236,216,.4)', margin: full ? 16 : 8 }} />
      <div className={`relative grid grid-cols-1 sm:grid-cols-2 ${full ? 'gap-4' : 'gap-2'}`}>
        {stations.map(st => {
          const meta = STATION_META[st.type]
          const Icon = meta.Icon
          const inChoice = st.choiceGroup != null && (choiceCounts.get(st.choiceGroup) ?? 0) > 1
          return (
            <div
              key={st.rotation}
              className={`flex items-center gap-2 rounded-lg ${full ? 'px-3 py-2.5' : 'px-2 py-1.5'} ${
                inChoice ? 'border border-dashed border-amber-400/70' : ''
              }`}
              style={{ background: 'rgba(244,236,216,.06)' }}
            >
              <span
                className={`flex items-center justify-center rounded-full text-cream-50 font-bold tabular-nums ${
                  full ? 'w-9 h-9 text-base' : 'w-7 h-7 text-xs'
                }`}
                style={{ background: meta.accent ? '#e23b32' : '#234a86', border: '2px solid #f4ecd8' }}
              >
                {st.rotation}
              </span>
              <Icon size={full ? 20 : 16} className={meta.accent ? 'text-softball-red-300' : 'text-cream-100'} />
              <div className="min-w-0">
                <div className={`font-bold text-cream-50 truncate ${full ? 'text-sm' : 'text-xs'}`}>{st.label}</div>
                <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] uppercase tracking-wider text-cream-300">
                  <span>{meta.label}</span>
                  {st.level && (
                    <span className={st.level === 'ADVANCED' ? 'text-softball-red-300' : 'text-amber-300'}>
                      · {st.level === 'ADVANCED' ? 'Advanced' : 'Beginner'}
                    </span>
                  )}
                  {inChoice && <span className="text-amber-300">· wähle 1</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
