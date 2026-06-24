import { jsPDF } from 'jspdf'
import type { EquipmentItem } from '@/types'
import { LOCATION_SUGGESTIONS, VENUE_ZONES, TREES, zoneCenter, VIEWBOX, ROTATION } from '@/components/equipment/venueLayout'

export function formatItemLine(i: EquipmentItem): string {
  return i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name
}

export interface LocGroup { name: string; items: EquipmentItem[] }

/** Items nach Lagerort gruppieren; Lageplan-Zonen → mapGroups, Rest → otherGroups. */
export function partitionByLocation(items: EquipmentItem[]): { mapGroups: LocGroup[]; otherGroups: LocGroup[] } {
  const map = new Map<string, EquipmentItem[]>()
  for (const i of items) {
    const key = i.storageLocation?.trim() || 'Ohne Ort'
    const arr = map.get(key) ?? []
    arr.push(i)
    map.set(key, arr)
  }
  const all: LocGroup[] = [...map.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return {
    mapGroups: all.filter(g => LOCATION_SUGGESTIONS.includes(g.name)),
    otherGroups: all.filter(g => !LOCATION_SUGGESTIONS.includes(g.name)),
  }
}

type RGB = [number, number, number]
const NAVY: RGB = [30, 41, 59]
const NAVY_LIGHT: RGB = [124, 138, 160]
const RED: RGB = [192, 57, 43]
const GREY: RGB = [120, 120, 120]
const GROUND: RGB = [231, 238, 221]
const CARD_BG: RGB = [243, 239, 228]

/** Punkt im (gedrehten) Karten-Koordinatensystem → mm auf der Seite. */
function project(x: number, y: number, ox: number, oy: number, scale: number): { x: number; y: number } {
  const rad = (ROTATION.deg * Math.PI) / 180
  const dx = x - ROTATION.cx, dy = y - ROTATION.cy
  const rx = ROTATION.cx + dx * Math.cos(rad) - dy * Math.sin(rad)
  const ry = ROTATION.cy + dx * Math.sin(rad) + dy * Math.cos(rad)
  return { x: ox + rx * scale, y: oy + ry * scale }
}

export function generateAufbauPdf(items: EquipmentItem[]): void {
  buildAufbauDoc(items).save('aufbau-heimspieltag.pdf')
}

/** Baut das PDF-Dokument (ohne Speichern) — getrennt für Tests/Vorschau. */
export function buildAufbauDoc(items: EquipmentItem[]): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const W = 297, margin = 12
  const { mapGroups, otherGroups } = partitionByLocation(items)

  // Kopf
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...NAVY)
  doc.text('Aufbau Heimspieltag', margin, 16)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GREY)
  doc.text('Lageplan & Material', margin, 21.5)
  doc.setDrawColor(...RED); doc.setLineWidth(0.6); doc.line(margin, 25, W - margin, 25)

  // Karte links (~63%)
  const mapX = margin, mapY = 30
  const mapW = (W - 2 * margin) * 0.63
  const scale = mapW / VIEWBOX.w
  const mapPxH = VIEWBOX.h * scale

  doc.setFillColor(...GROUND); doc.rect(mapX, mapY, VIEWBOX.w * scale, mapPxH, 'F')
  // Bäume
  doc.setFillColor(155, 181, 150)
  for (const [cx, cy, r] of TREES) doc.circle(mapX + cx * scale, mapY + cy * scale, r * scale, 'F')
  // Laufbahn (zwei Bögen, Süden)
  doc.setDrawColor(...RED); doc.setLineWidth(0.7)
  trackArc(doc, mapX, mapY, scale)

  // Zonen
  for (const z of VENUE_ZONES) {
    const p1 = project(z.x, z.y, mapX, mapY, scale)
    const p2 = project(z.x + z.w, z.y, mapX, mapY, scale)
    const p3 = project(z.x + z.w, z.y + z.h, mapX, mapY, scale)
    const p4 = project(z.x, z.y + z.h, mapX, mapY, scale)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...(z.inner ? NAVY_LIGHT : NAVY))
    doc.setLineWidth(z.inner ? 0.3 : 0.5)
    doc.lines(
      [[p2.x - p1.x, p2.y - p1.y], [p3.x - p2.x, p3.y - p2.y], [p4.x - p3.x, p4.y - p3.y]],
      p1.x, p1.y, [1, 1], 'FD', true,
    )
    const c = zoneCenter(z); const pc = project(c.x, c.y, mapX, mapY, scale)
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold')
    doc.setFontSize(Math.max(5, (z.fs ?? 8) * scale * 2.4))
    doc.text(z.short ?? z.name, pc.x, pc.y, { align: 'center', baseline: 'middle' })
  }

  // Lagerort-Kärtchen rechts (~33%) + Leader-Linien
  const cardX = mapX + VIEWBOX.w * scale + 8
  const cardW = W - margin - cardX
  let cy = mapY
  let gi = 0
  for (const g of mapGroups) {
    const lines: { text: string; note: boolean }[] = []
    for (const it of g.items) {
      lines.push({ text: `•  ${formatItemLine(it)}`, note: false })
      if (it.notes?.trim()) lines.push({ text: `    ! ${it.notes.trim()}`, note: true })
    }
    const cardH = 8 + lines.length * 4.4 + 2
    doc.setFillColor(...CARD_BG); doc.setDrawColor(...NAVY); doc.setLineWidth(0.3)
    doc.rect(cardX, cy, cardW, cardH, 'FD')
    // Leader-Linie zum Gebäude
    const zone = VENUE_ZONES.find(z => z.name === g.name)
    if (zone) {
      // Orthogonale Leader-Linie: horizontal vom Kärtchen, dann vertikal hoch/runter
      // an die NÄCHSTE Raum-Kante (oben oder unten), nicht aufs Wort.
      const sy = cy + 5
      const cxz = zoneCenter(zone).x
      // an die OBERE Raum-Kante, einheitlich SENKRECHT von oben (wie Garage):
      // Kärtchen → Kanal über dem Gebäude → senkrecht runter in die Kante.
      const tgt = project(cxz, zone.y, mapX, mapY, scale)
      // Kanäle weit oben im leeren Bereich (gestaffelt), damit sie die Zeichnung nicht kreuzen
      const chY = mapY + 3 + gi * 3
      const busX = cardX - 5       // schmale Spalte zwischen Karte und Kärtchen
      doc.setDrawColor(...NAVY_LIGHT); doc.setLineWidth(0.3)
      doc.line(cardX, sy, busX, sy)        // raus aus dem Kärtchen
      doc.line(busX, sy, busX, chY)        // hoch/runter zur Kanalhöhe
      doc.line(busX, chY, tgt.x, chY)      // horizontal über das Gebäude
      doc.line(tgt.x, chY, tgt.x, tgt.y)   // senkrecht runter in die obere Kante
      doc.setFillColor(...NAVY); doc.circle(tgt.x, tgt.y, 0.8, 'F')
    }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY); doc.setFontSize(9)
    doc.text(g.name.toUpperCase(), cardX + 3, cy + 5.5)
    let ly = cy + 11
    doc.setFontSize(8)
    for (const ln of lines) {
      doc.setTextColor(...(ln.note ? GREY : NAVY))
      doc.setFont('helvetica', ln.note ? 'italic' : 'normal')
      doc.text(ln.text, cardX + 3, ly); ly += 4.4
    }
    cy += cardH + 4
    gi++
  }

  // „Weitere Orte" unten
  if (otherGroups.length) {
    let oy = mapY + mapPxH + 12
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...NAVY)
    doc.text('Weitere Orte', margin, oy); oy += 6
    doc.setFontSize(9)
    for (const g of otherGroups) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY)
      doc.text(`${g.name}:`, margin, oy)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const list = g.items.map(formatItemLine).join(',  ')
      const wrapped = doc.splitTextToSize(list, W - 2 * margin - 40)
      doc.text(wrapped, margin + 38, oy)
      oy += Math.max(wrapped.length * 4.4, 4.4) + 2
    }
  }

  return doc
}

// Laufbahn-Bögen (Süden), grob wie auf der Screen-Karte.
function trackArc(doc: jsPDF, ox: number, oy: number, scale: number): void {
  const pt = (x: number, y: number) => [ox + x * scale, oy + y * scale] as [number, number]
  const a = pt(96, 250), m1 = pt(250, 206), b = pt(392, 244)
  const a2 = pt(100, 263), m2 = pt(250, 222), b2 = pt(392, 257)
  drawQuad(doc, a, m1, b)
  drawQuad(doc, a2, m2, b2)
}
function drawQuad(doc: jsPDF, a: [number, number], c: [number, number], b: [number, number]): void {
  // quadratische Bézier in Segmente
  const seg = 16
  let prev = a
  for (let i = 1; i <= seg; i++) {
    const t = i / seg, u = 1 - t
    const x = u * u * a[0] + 2 * u * t * c[0] + t * t * b[0]
    const y = u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]
    doc.line(prev[0], prev[1], x, y)
    prev = [x, y]
  }
}
