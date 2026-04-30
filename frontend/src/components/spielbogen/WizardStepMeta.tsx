import type { CreateSpielbogenRequest } from '@/types'

interface Props {
  meta: Partial<CreateSpielbogenRequest>
  onChange: (meta: Partial<CreateSpielbogenRequest>) => void
}

export function WizardStepMeta({ meta, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-1 block">Datum *</label>
        <input
          type="date"
          value={meta.date ?? ''}
          onChange={(e) => onChange({ ...meta, date: e.target.value })}
          className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
        />
      </div>

      <div>
        <label className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-1 block">Ort</label>
        <input
          type="text"
          value={meta.location ?? ''}
          placeholder="z.B. Krefeld"
          onChange={(e) => onChange({ ...meta, location: e.target.value })}
          className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
        />
      </div>

      <div>
        <label className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-1 block">Heim-Team *</label>
        <input
          type="text"
          value={meta.homeTeamName ?? ''}
          placeholder="z.B. Wuppertal Hilbillies"
          onChange={(e) => onChange({ ...meta, homeTeamName: e.target.value })}
          className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
        />
      </div>

      <div>
        <label className="font-display text-[10px] tracking-widest font-bold text-gray-500 uppercase mb-1 block">Gast-Team *</label>
        <input
          type="text"
          value={meta.awayTeamName ?? ''}
          placeholder="z.B. Cologne Cardinals"
          onChange={(e) => onChange({ ...meta, awayTeamName: e.target.value })}
          className="w-full bg-cream-50 border border-cream-300 rounded-lg px-3 py-2 text-sm font-medium text-navy-900 focus:border-navy-600 outline-none"
        />
      </div>
    </div>
  )
}

