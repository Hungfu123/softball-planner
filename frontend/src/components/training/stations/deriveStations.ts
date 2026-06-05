import type { StationLevel, StationType, TrainingStation } from '@/types'
import { STATION_META } from './stationMeta'

export interface Station {
  /** 1-basierte Rotationsnummer (Reihenfolge im Set). */
  rotation: number
  label: string
  type: StationType
  level: StationLevel | null
  /** Stationen mit gleicher choiceGroup = "WÄHLE 1"-Alternativen. */
  choiceGroup: number | null
}

/** Standard-Set: immer dabei, bis der Coach es anpasst. Station 5/6 = Wahl-Paar (Advanced/Beginner). */
export const DEFAULT_STATIONS: TrainingStation[] = [
  { type: 'LIVE' },
  { type: 'TEE' },
  { type: 'BUNT' },
  { type: 'KORKEN' },
  { type: 'HUETCHEN', level: 'ADVANCED', choiceGroup: 1 },
  { type: 'TEE', level: 'BEGINNER', choiceGroup: 1 },
]

/** Macht aus der gespeicherten Stationen-Liste die Diagramm-Form. */
export function toDiagramStations(stations: TrainingStation[]): Station[] {
  return stations.map((s, i) => ({
    rotation: i + 1,
    label: s.label?.trim() || STATION_META[s.type].label,
    type: s.type,
    level: s.level ?? null,
    choiceGroup: s.choiceGroup ?? null,
  }))
}

/** Liefert die anzuzeigenden Stationen: gespeicherte, sonst Default-Set. */
export function resolveStations(stations: TrainingStation[] | null | undefined): Station[] {
  const list = stations && stations.length > 0 ? stations : DEFAULT_STATIONS
  return toDiagramStations(list)
}
