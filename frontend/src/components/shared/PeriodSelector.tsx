import type { TrainingPeriodResponse } from '@/types'

interface Props {
  periods: TrainingPeriodResponse[]
  activePeriodId: number | null
  onChange: (periodId: number | null) => void
}

export default function PeriodSelector({ periods, activePeriodId, onChange }: Props) {
  if (periods.length === 0) return null

  return (
    <select
      value={activePeriodId ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:border-navy-600 focus:ring-2 focus:ring-navy-100 outline-none cursor-pointer"
    >
      <option value="">Alle Zeiträume</option>
      {periods.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
