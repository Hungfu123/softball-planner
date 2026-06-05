import type { StationLevel, StationType, TrainingPlanSectionResponse } from '@/types'

export interface Station {
  /** 1-basierte Rotationsnummer (Reihenfolge der Stationen). */
  rotation: number
  label: string
  type: StationType
  level: StationLevel | null
  parallelGroup: number | null
  /** Stationen mit gleicher choiceGroup = "WÄHLE 1"-Alternativen. */
  choiceGroup: number | null
}

/** Leitet aus Plan-Sections die Stationen ab: jede Section mit gesetztem stationType wird eine Station. */
export function deriveStations(sections: TrainingPlanSectionResponse[]): Station[] {
  const result: Station[] = []
  for (const s of sections) {
    if (!s.stationType) continue
    result.push({
      rotation: result.length + 1,
      label: s.title?.trim() || 'Station',
      type: s.stationType,
      level: s.stationLevel ?? null,
      parallelGroup: s.parallelGroup ?? null,
      choiceGroup: s.stationChoiceGroup ?? null,
    })
  }
  return result
}
