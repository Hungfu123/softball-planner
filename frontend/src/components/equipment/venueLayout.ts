// Geteilte Geometrie des Heimspieltag-Geländes — genutzt von der Screen-Karte
// (VenueMap.tsx) UND vom PDF-Export (utils/aufbauPdf.ts). Eine Quelle → Karte und
// Druck bleiben identisch.

/** Auswählbare Lagerorte = Zonen des Lageplans. */
export const LOCATION_SUGGESTIONS = ['Garage', 'Halle', 'Flur', 'Spint', 'Geräteraum', 'Schrank']

/** Klickbare Lager-Zone — Name = kanonischer Lagerort (muss zu storageLocation passen). */
export interface VenueZone {
  name: string
  short?: string
  x: number; y: number; w: number; h: number
  /** Label-Anker (sonst Zellmitte). */
  lx?: number; ly?: number
  fs?: number
  /** Verschachtelt (kleiner, dünnere Linie, oben gezeichnet). */
  inner?: boolean
  /** Label um 90° gedreht (für hohe schmale Räume). */
  vertical?: boolean
}

export const VIEWBOX = { w: 400, h: 270 }
export const ROTATION = { deg: -7, cx: 200, cy: 110 }

// Zusammenhängender Grundriss (ungedreht), Kanten geteilt = verbunden.
// Flur (Rand-Streifen oben) · links Geräteraum mit Spint+Schrank DRIN · Halle darunter ·
// Garage separat rechts. Komplex wird per ROTATION leicht gedreht (Luftbild-Feel).
export const VENUE_ZONES: VenueZone[] = [
  { name: 'Geräteraum', x: 10, y: 40, w: 126, h: 58, lx: 68, ly: 72, fs: 5.5 },
  { name: 'Flur', x: 136, y: 40, w: 246, h: 28, lx: 214, ly: 54, fs: 11 },
  { name: 'Halle', x: 136, y: 68, w: 160, h: 108, lx: 216, ly: 124, fs: 13 },
  { name: 'Garage', x: 328, y: 68, w: 54, h: 108, lx: 355, ly: 124, fs: 9 },
  { name: 'Spint', x: 46, y: 42, w: 26, h: 15, lx: 59, ly: 50, fs: 4.5, inner: true },
  { name: 'Schrank', x: 107, y: 62, w: 16, h: 34, lx: 115, ly: 79, fs: 4.5, inner: true, vertical: true },
]

/** Baum-Cluster als Randreihen [cx, cy, r]. */
export const TREES: [number, number, number][] = [
  [70, 246, 5], [104, 250, 5], [138, 248, 5], [172, 250, 5], [206, 248, 5],
  [360, 158, 5], [372, 178, 5], [358, 198, 5],
]

/** Mittelpunkt einer Zone (Label-Anker, sonst Rechteck-Mitte). */
export function zoneCenter(z: VenueZone): { x: number; y: number } {
  return { x: z.lx ?? z.x + z.w / 2, y: z.ly ?? z.y + z.h / 2 }
}
