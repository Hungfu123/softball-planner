# Aufbau-Heimspieltag PDF-Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Querformat-PDF des Aufbau-Heimspieltags — annotierter Lageplan (Karte breit) + Lagerort-Kärtchen mit Leader-Linien, „Weitere Orte" als Block unten.

**Architecture:** Zonen-Geometrie aus `VenueMap` in ein geteiltes Modul `venueLayout.ts` extrahieren (DRY). Neuer jsPDF-Util `aufbauPdf.ts` zeichnet Karte vektoriell (gleiche Zonen) + Kärtchen + Linien. Reine Helper (Gruppierung/Format) sind unit-getestet. Button auf `EquipmentCatalogPage`.

**Tech Stack:** React 19 / TS, jsPDF (vorhanden), vitest.

## Global Constraints

- Frontend `@/`-Alias. Tailwind v4 (Bracket-Werte codebase-konform). Nur `@/icons` (kein lucide für neue Icons; vorhandene lucide-Imports ok). German UI.
- PDF: jsPDF `new jsPDF({ unit:'mm', format:'a4', orientation:'landscape' })`, helvetica (wie bestehende Utils). Farben als RGB (navy ~ #1e293b → 30,41,59; cream ~ #f3efe4; softball-red ~ #c0392b).
- DRY/YAGNI: Karte + PDF teilen `venueLayout.ts`. Keine Notiz-Felder im Übermaß — Notiz nur falls vorhanden, als `! …`.
- gitmoji-Commits, KEIN `Co-Authored-By`. Pre-commit: `npm run lint` + `npm run build` grün; neue Unit-Tests `npx vitest run` grün.
- Sandbox: bei bwrap-loopback-Fehler Bash mit dangerouslyDisableSandbox.

## File Structure

- Create `frontend/src/components/equipment/venueLayout.ts` — geteilte Geometrie + `LOCATION_SUGGESTIONS`, `VENUE_ZONES`, `TREES`, Laufbahn/Eingänge.
- Modify `frontend/src/components/equipment/VenueMap.tsx` — Konstanten aus `venueLayout` importieren statt lokal.
- Modify `frontend/src/components/equipment/EquipmentItemForm.tsx` — `LOCATION_SUGGESTIONS` aus `venueLayout` re-exportieren/importieren (keine Zyklen).
- Create `frontend/src/utils/aufbauPdf.ts` — `generateAufbauPdf(items)` + Helper `partitionByLocation`, `formatItemLine`.
- Create `frontend/src/utils/aufbauPdf.test.ts` — Unit-Tests der Helper + Smoke.
- Modify `frontend/src/components/equipment/EquipmentCatalogPage.tsx` — „PDF"-Button.

---

### Task 1: Geometrie extrahieren (`venueLayout.ts`) + VenueMap/Form umstellen

**Files:**
- Create: `frontend/src/components/equipment/venueLayout.ts`
- Modify: `frontend/src/components/equipment/VenueMap.tsx`
- Modify: `frontend/src/components/equipment/EquipmentItemForm.tsx`
- Modify: `frontend/src/components/equipment/EquipmentCatalogPage.tsx` (Import-Pfad von `LOCATION_SUGGESTIONS`, falls geändert)

**Interfaces:**
- Produces: `venueLayout.ts` exportiert:
  - `LOCATION_SUGGESTIONS: string[]` (= `['Garage','Halle','Flur','Spint','Geräteraum','Schrank']`)
  - `interface VenueZone { name: string; short?: string; x: number; y: number; w: number; h: number; lx?: number; ly?: number; fs?: number; inner?: boolean; vertical?: boolean }`
  - `VENUE_ZONES: VenueZone[]` (die aktuelle ZONES-Liste aus VenueMap, unverändert)
  - `VIEWBOX = { w: 400, h: 270 }`, `ROTATION = { deg: -7, cx: 200, cy: 110 }`
  - `zoneCenter(z: VenueZone): { x: number; y: number }` (Mittelpunkt, ggf. via lx/ly).

- [ ] **Step 1: `venueLayout.ts` schreiben** — verschiebe die aktuellen Konstanten `LOCATION_SUGGESTIONS`, `ZONES` (→ `VENUE_ZONES`), `TREES` und die Zone-Interface-Definition aus `VenueMap.tsx` hierher (1:1, gleiche Werte). Ergänze `VIEWBOX`, `ROTATION`, und:
```ts
export function zoneCenter(z: VenueZone) {
  return { x: z.lx ?? z.x + z.w / 2, y: z.ly ?? z.y + z.h / 2 }
}
```
(Geometrie-Werte exakt aus dem aktuellen `VenueMap.tsx` übernehmen — nicht neu erfinden.)

- [ ] **Step 2: `VenueMap.tsx` umstellen** — lokale `ZONES`/`TREES`/`LOCATION_SUGGESTIONS`/Interface entfernen, stattdessen `import { VENUE_ZONES as ZONES, TREES } from './venueLayout'` (Alias, damit der restliche JSX-Code unverändert bleibt). `Zone`-Interface-Verwendung auf `VenueZone` umstellen falls nötig.

- [ ] **Step 3: `EquipmentItemForm.tsx`** — `LOCATION_SUGGESTIONS` aus `./venueLayout` importieren statt lokal definieren; den lokalen `export const LOCATION_SUGGESTIONS` ENTFERNEN und durch `export { LOCATION_SUGGESTIONS } from './venueLayout'` ersetzen (Re-Export, damit `EquipmentCatalogPage`'s Import `from './EquipmentItemForm'` weiter funktioniert). KEINE zyklischen Importe (venueLayout importiert nichts aus diesen Dateien).

- [ ] **Step 4: Lint + Build** — `cd frontend && npm run lint && npm run build` → 0 ESLint-Fehler, tsc/vite PASS. Visuell unverändert (reines Refactor).

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/equipment/venueLayout.ts frontend/src/components/equipment/VenueMap.tsx frontend/src/components/equipment/EquipmentItemForm.tsx
git commit -m "♻️ FE: Lageplan-Geometrie in venueLayout.ts extrahiert (geteilt für Karte + PDF)"
```

---

### Task 2: PDF-Helper + Generator (`aufbauPdf.ts`) mit Tests

**Files:**
- Create: `frontend/src/utils/aufbauPdf.ts`
- Test: `frontend/src/utils/aufbauPdf.test.ts`

**Interfaces:**
- Consumes: `EquipmentItem` (`@/types` — {id,name,quantity,storageLocation,notes}); `LOCATION_SUGGESTIONS`, `VENUE_ZONES`, `zoneCenter`, `VIEWBOX`, `ROTATION` (Task 1); `jsPDF`.
- Produces:
  - `formatItemLine(item: EquipmentItem): string` → `"Name"` bzw. `"Name ×N"` (N>1).
  - `interface LocGroup { name: string; items: EquipmentItem[] }`
  - `partitionByLocation(items: EquipmentItem[]): { mapGroups: LocGroup[]; otherGroups: LocGroup[] }`
    — gruppiert nach `storageLocation?.trim() || 'Ohne Ort'`; Gruppe ∈ `LOCATION_SUGGESTIONS` → `mapGroups`, sonst `otherGroups`. Beide alphabetisch (de) sortiert.
  - `generateAufbauPdf(items: EquipmentItem[]): void` — baut & `doc.save('aufbau-heimspieltag.pdf')`.

- [ ] **Step 1: Failing-Tests schreiben** — `frontend/src/utils/aufbauPdf.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatItemLine, partitionByLocation } from './aufbauPdf'
import type { EquipmentItem } from '@/types'

const mk = (p: Partial<EquipmentItem>): EquipmentItem =>
  ({ id: 1, name: 'X', quantity: 1, storageLocation: null, notes: null, ...p })

describe('formatItemLine', () => {
  it('ohne Menge bei 1', () => expect(formatItemLine(mk({ name: 'Bases', quantity: 1 }))).toBe('Bases'))
  it('mit ×N bei >1', () => expect(formatItemLine(mk({ name: 'Bänke', quantity: 5 }))).toBe('Bänke ×5'))
})

describe('partitionByLocation', () => {
  it('trennt Lageplan-Orte von anderen, null→Ohne Ort', () => {
    const items = [
      mk({ id: 1, name: 'Backstop', storageLocation: 'Garage' }),
      mk({ id: 2, name: 'Bier', storageLocation: 'bei Hung' }),
      mk({ id: 3, name: 'Wasser', storageLocation: null }),
    ]
    const { mapGroups, otherGroups } = partitionByLocation(items)
    expect(mapGroups.map(g => g.name)).toEqual(['Garage'])
    expect(otherGroups.map(g => g.name).sort()).toEqual(['Ohne Ort', 'bei Hung'].sort())
  })
})
```

- [ ] **Step 2: Test laufen — muss fehlschlagen** — `cd frontend && npx vitest run src/utils/aufbauPdf.test.ts` → FAIL (Modul/Funktionen fehlen).

- [ ] **Step 3: `aufbauPdf.ts` implementieren** — Helper + Generator. Vollständiger Startcode (Layout-Koordinaten beim Bauen visuell feinjustieren):
```ts
import { jsPDF } from 'jspdf'
import type { EquipmentItem } from '@/types'
import { LOCATION_SUGGESTIONS, VENUE_ZONES, zoneCenter, VIEWBOX, ROTATION } from '@/components/equipment/venueLayout'

export function formatItemLine(i: EquipmentItem): string {
  return i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name
}

export interface LocGroup { name: string; items: EquipmentItem[] }

export function partitionByLocation(items: EquipmentItem[]): { mapGroups: LocGroup[]; otherGroups: LocGroup[] } {
  const map = new Map<string, EquipmentItem[]>()
  for (const i of items) {
    const key = i.storageLocation?.trim() || 'Ohne Ort'
    ;(map.get(key) ?? map.set(key, []).get(key)!).push(i)
  }
  const all = [...map.entries()].map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return {
    mapGroups: all.filter(g => LOCATION_SUGGESTIONS.includes(g.name)),
    otherGroups: all.filter(g => !LOCATION_SUGGESTIONS.includes(g.name)),
  }
}

// RGB-Helfer
const NAVY: [number, number, number] = [30, 41, 59]
const NAVY_LIGHT: [number, number, number] = [124, 138, 160]
const RED: [number, number, number] = [192, 57, 43]
const GREY: [number, number, number] = [120, 120, 120]
const GROUND: [number, number, number] = [234, 238, 222]

// Punkt im (gedrehten) Karten-Koordinatensystem → mm auf der Seite.
function project(x: number, y: number, ox: number, oy: number, scale: number): { x: number; y: number } {
  const rad = (ROTATION.deg * Math.PI) / 180
  const dx = x - ROTATION.cx, dy = y - ROTATION.cy
  const rx = ROTATION.cx + dx * Math.cos(rad) - dy * Math.sin(rad)
  const ry = ROTATION.cy + dx * Math.sin(rad) + dy * Math.cos(rad)
  return { x: ox + rx * scale, y: oy + ry * scale }
}

export function generateAufbauPdf(items: EquipmentItem[]): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const W = 297, H = 210, margin = 12
  // Kopf
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...NAVY)
  doc.text('Aufbau Heimspieltag', margin, 16)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GREY)
  doc.text('Lageplan & Material', margin, 22)
  doc.setDrawColor(...RED); doc.setLineWidth(0.6); doc.line(margin, 25, W - margin, 25)

  const { mapGroups, otherGroups } = partitionByLocation(items)

  // Karten-Bereich links (~65%)
  const mapX = margin, mapY = 30, mapW = (W - 2 * margin) * 0.63, mapH = 120
  const scale = Math.min(mapW / VIEWBOX.w, mapH / VIEWBOX.h)
  const ground = project // alias
  // Boden
  doc.setFillColor(...GROUND); doc.rect(mapX, mapY, VIEWBOX.w * scale, VIEWBOX.h * scale, 'F')
  // Zonen
  doc.setLineWidth(0.5)
  for (const z of VENUE_ZONES) {
    // Rechteck als 4 projizierte Ecken (gedreht) zeichnen
    const p1 = project(z.x, z.y, mapX, mapY, scale)
    const p2 = project(z.x + z.w, z.y, mapX, mapY, scale)
    const p3 = project(z.x + z.w, z.y + z.h, mapX, mapY, scale)
    const p4 = project(z.x, z.y + z.h, mapX, mapY, scale)
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...(z.inner ? NAVY_LIGHT : NAVY))
    doc.lines([[p2.x - p1.x, p2.y - p1.y], [p3.x - p2.x, p3.y - p2.y], [p4.x - p3.x, p4.y - p3.y], [p1.x - p4.x, p1.y - p4.y]], p1.x, p1.y, [1, 1], 'FD', true)
    // Label
    const c = zoneCenter(z); const pc = project(c.x, c.y, mapX, mapY, scale)
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize((z.fs ?? 8) * scale * 2.6)
    doc.text(z.short ?? z.name, pc.x, pc.y, { align: 'center', baseline: 'middle' })
  }

  // Kärtchen rechts (~32%) + Leader-Linien
  const cardX = mapX + VIEWBOX.w * scale + 8
  const cardW = W - margin - cardX
  let cy = mapY
  doc.setFontSize(9)
  for (const g of mapGroups) {
    const lines = g.items.flatMap(it => {
      const out = [`•  ${formatItemLine(it)}`]
      if (it.notes?.trim()) out.push(`   ! ${it.notes.trim()}`)
      return out
    })
    const cardH = 7 + lines.length * 4.6 + 3
    // Karte-Box
    doc.setFillColor(243, 239, 228); doc.setDrawColor(...NAVY); doc.setLineWidth(0.3)
    doc.rect(cardX, cy, cardW, cardH, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY); doc.setFontSize(9)
    doc.text(g.name.toUpperCase(), cardX + 3, cy + 5)
    // Leader-Linie zum Gebäude
    const zone = VENUE_ZONES.find(z => z.name === g.name)
    if (zone) {
      const c = zoneCenter(zone); const pc = project(c.x, c.y, mapX, mapY, scale)
      doc.setDrawColor(...NAVY_LIGHT); doc.setLineWidth(0.3)
      doc.line(cardX, cy + 4, pc.x, pc.y)
    }
    // Items
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    let ly = cy + 10
    for (const ln of lines) {
      doc.setTextColor(...(ln.trimStart().startsWith('!') ? GREY : NAVY))
      doc.setFont('helvetica', ln.trimStart().startsWith('!') ? 'italic' : 'normal')
      doc.text(ln, cardX + 3, ly); ly += 4.6
    }
    cy += cardH + 4
  }

  // „Weitere Orte" unten
  if (otherGroups.length) {
    let oy = mapY + mapH + 12
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...NAVY)
    doc.text('Weitere Orte', margin, oy); oy += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...NAVY)
    for (const g of otherGroups) {
      const line = `${g.name}:  ${g.items.map(formatItemLine).join(',  ')}`
      const wrapped = doc.splitTextToSize(line, W - 2 * margin)
      doc.text(wrapped, margin, oy); oy += wrapped.length * 4.6 + 2
    }
  }

  doc.save('aufbau-heimspieltag.pdf')
}
```

- [ ] **Step 4: Test laufen — muss bestehen** — `npx vitest run src/utils/aufbauPdf.test.ts` → PASS (Helper-Tests). (jsPDF wird in den Helper-Tests nicht aufgerufen.)

- [ ] **Step 5: Smoke-Test ergänzen** — in `aufbauPdf.test.ts`:
```ts
import { generateAufbauPdf } from './aufbauPdf'
describe('generateAufbauPdf', () => {
  it('läuft ohne Exception', () => {
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}
    expect(() => generateAufbauPdf([
      { id: 1, name: 'Backstop', quantity: 1, storageLocation: 'Garage', notes: null },
      { id: 2, name: 'Bier', quantity: 2, storageLocation: 'bei Hung', notes: 'kalt stellen' },
    ])).not.toThrow()
    HTMLAnchorElement.prototype.click = orig
  })
})
```
Run: `npx vitest run src/utils/aufbauPdf.test.ts` → PASS. Falls jsPDF im jsdom an `save()` scheitert, stattdessen `doc.output('blob')` testbar machen oder den Smoke-Test als `it.skip` markieren + Kommentar.

- [ ] **Step 6: Commit**
```bash
git add frontend/src/utils/aufbauPdf.ts frontend/src/utils/aufbauPdf.test.ts
git commit -m "✨ FE: aufbauPdf — Querformat-Lageplan + Lagerort-Kärtchen mit Leader-Linien + Weitere-Orte-Block"
```

---

### Task 3: „PDF"-Button auf der Aufbau-Seite

**Files:**
- Modify: `frontend/src/components/equipment/EquipmentCatalogPage.tsx`

**Interfaces:**
- Consumes: `generateAufbauPdf` (Task 2), `items` (vorhandener Hook-State), `ExportDoc`-Icon aus `@/icons`.

- [ ] **Step 1: Button einbauen** — Import `import { generateAufbauPdf } from '@/utils/aufbauPdf'` + `ExportDoc` zum `@/icons`-Import ergänzen. Im Header-`<div className="flex items-center justify-between gap-2">` (neben H1) rechts einen Button, nur wenn `items.length > 0`:
```tsx
{items.length > 0 && (
  <button onClick={() => generateAufbauPdf(items)}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-navy-700 hover:text-navy-900 hover:bg-cream-100 cursor-pointer transition-colors">
    <ExportDoc size={14} /> PDF
  </button>
)}
```
(Falls der Header-`<div>` schon den Lagerort-Toggle o.ä. enthält — Button daneben einreihen; H1 links, Aktionen rechts.)

- [ ] **Step 2: Lint + Build** — `npm run lint && npm run build` → 0 Fehler, PASS.

- [ ] **Step 3: Manuell verifizieren** — App lokal (vite), `/orga/aufbau`, ein paar Sachen mit Lagerort anlegen → „PDF" → öffnet/lädt `aufbau-heimspieltag.pdf`; Karte breit links, Kärtchen rechts mit Linien zu den Gebäuden, „Weitere Orte" unten. Koordinaten/Spacing bei Bedarf in `aufbauPdf.ts` feinjustieren.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/components/equipment/EquipmentCatalogPage.tsx
git commit -m "✨ FE: PDF-Button auf Aufbau-Heimspieltag"
```

---

## Self-Review

**Spec-Coverage:** Querformat ✓ (T2 orientation:landscape); Karte breit ~65% ✓ (mapW 0.63); Kärtchen + Leader-Linien ✓ (T2); Weitere-Orte-Block unten ✓ (T2); Name ×Menge + Notiz markiert ✓ (formatItemLine + `! notes`); geteilte Geometrie ✓ (T1 venueLayout); Button ✓ (T3); Tests ✓ (T2 Helper + Smoke).

**Placeholder-Scan:** Kein TBD/TODO; voller Code je Step. Koordinaten-Feinschliff in T3 Step 3 ist visuelles Tuning, kein Platzhalter (Startwerte gegeben).

**Typ-Konsistenz:** `venueLayout` Exports (LOCATION_SUGGESTIONS, VENUE_ZONES, zoneCenter, VIEWBOX, ROTATION) in T1 definiert, in T2 genutzt. `partitionByLocation`/`formatItemLine`/`generateAufbauPdf`-Signaturen in T2 = Aufrufe in Tests/Button. `EquipmentItem` Felder (quantity:number, storageLocation:string|null, notes:string|null) konsistent.

**Annahme:** jsPDF unterstützt `orientation:'landscape'` + `lines(..., 'FD', true)` (geschlossenes Polygon). Falls `lines` zickt, Zonen alternativ als 4 `doc.line()`-Segmente + separates `triangle/rect` zeichnen — in T3 beim Tuning klären.
