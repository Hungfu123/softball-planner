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
  /** Normalisierte Feld-Position 0..1 (links→rechts / oben→unten). */
  x: number
  y: number
}

/**
 * Standard-Set mit festen Start-Positionen (Lageplan). Live oben rechts, Bunt in der Ecke,
 * Korken drüber, Tee unten angereiht, Hütchen + Tee(Besen) = Wahl-Paar. Per Drag verschiebbar.
 */
export const DEFAULT_STATIONS: TrainingStation[] = [
  { type: 'LIVE', x: 0.95, y: 0.05 },
  { type: 'TEE', x: 0.45, y: 0.92 },
  { type: 'BUNT', x: 0.05, y: 0.95 },
  { type: 'KORKEN', x: 0.05, y: 0.5 },
  { type: 'HUETCHEN', x: 0.08, y: 0.08, choiceGroup: 1 },
  { type: 'TEE', label: 'Tee (Besen)', x: 0.34, y: 0.1, choiceGroup: 1 },
]

/** Fallback-Position für Stationen ohne gesetzte Koordinaten (z.B. frisch hinzugefügt). */
function fallbackPos(i: number): { x: number; y: number } {
  return { x: 0.2 + (i % 3) * 0.3, y: 0.25 + Math.floor(i / 3) * 0.32 }
}

/** Macht aus der gespeicherten Stationen-Liste die Diagramm-Form (inkl. Position). */
export function toDiagramStations(stations: TrainingStation[]): Station[] {
  return stations.map((s, i) => {
    const fb = fallbackPos(i)
    return {
      rotation: i + 1,
      label: s.label?.trim() || STATION_META[s.type].label,
      type: s.type,
      level: s.level ?? null,
      choiceGroup: s.choiceGroup ?? null,
      x: s.x ?? fb.x,
      y: s.y ?? fb.y,
    }
  })
}

/** Liefert die anzuzeigenden Stationen: gespeicherte, sonst Default-Set. */
export function resolveStations(stations: TrainingStation[] | null | undefined): Station[] {
  const list = stations && stations.length > 0 ? stations : DEFAULT_STATIONS
  return toDiagramStations(list)
}
