import type { CreateSpielbogenRequest, SetLineupRequest } from '@/types'

interface Props {
  meta: Partial<CreateSpielbogenRequest>
  homeLineup: SetLineupRequest['slots']
  awayLineup: SetLineupRequest['slots']
}

export function WizardStepReview({ meta, homeLineup, awayLineup }: Props) {
  const filteredHome = homeLineup.filter(s => s.name.trim())
  const filteredAway = awayLineup.filter(s => s.name.trim())

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-2">Spiel-Daten</h3>
        <div className="bg-cream-50 border border-cream-300 rounded-lg p-3 space-y-1 text-sm">
          <div><span className="text-gray-500">Datum:</span> {meta.date}</div>
          {meta.location && <div><span className="text-gray-500">Ort:</span> {meta.location}</div>}
          <div><span className="text-gray-500">Heim:</span> <span className="font-bold text-navy-900">{meta.homeTeamName}</span></div>
          <div><span className="text-gray-500">Gast:</span> <span className="font-bold text-navy-900">{meta.awayTeamName}</span></div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-2">
          Heim-Lineup ({filteredHome.length} Spieler)
        </h3>
        <ol className="bg-cream-50 border border-cream-300 rounded-lg p-3 text-sm space-y-1">
          {filteredHome.map((s) => (
            <li key={s.slot} className="flex justify-between">
              <span><span className="text-gray-500">{s.battingOrder}.</span> {s.name}</span>
              {s.position && <span className="text-gray-500">{s.position}</span>}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-2">
          Gast-Lineup ({filteredAway.length} Spieler)
        </h3>
        <ol className="bg-cream-50 border border-cream-300 rounded-lg p-3 text-sm space-y-1">
          {filteredAway.map((s) => (
            <li key={s.slot} className="flex justify-between">
              <span><span className="text-gray-500">{s.battingOrder}.</span> {s.name}</span>
              {s.position && <span className="text-gray-500">{s.position}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
