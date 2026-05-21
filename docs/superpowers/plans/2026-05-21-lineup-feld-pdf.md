# Lineup + Feld PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neuer PDF-Export "Lineup + Feld" — pro Spiel links Lineup-Tabelle, rechts Diamond-Diagramm mit Defense-Positionen und Spielern. 3 Spiele/Seite A4 Portrait.

**Architecture:** Neue Funktion `generateLineupWithFieldPdf` in `frontend/src/utils/pdfExport.ts` neben bestehenden `generatePdf`/`generateScoringPdf`. Hilfsfunktion `drawFieldDiagram` zeichnet Diamond mit jsPDF-Primitiven (kein SVG-Import). Reine Helper-Funktion `getDisplayName` für Kurz-Namen-Logik wird unit-getestet. UI-Anbindung über neuen Button in `GameDayPlanner.tsx` (Mobile + Desktop).

**Tech Stack:** TypeScript, React 19, jsPDF 3.x, jspdf-autotable 5.x, vitest

**Spec:** `docs/superpowers/specs/2026-05-21-lineup-feld-pdf-design.md`

---

## File Structure

- **Modify:** `frontend/src/utils/pdfExport.ts`
  - Add exported helper `getDisplayName(fullName: string): string`
  - Add private helper `drawFieldDiagram(doc, x, y, width, height, lineup, substitutions): void`
  - Add exported function `generateLineupWithFieldPdf(gameDay, games, season): void`
- **Create:** `frontend/src/utils/pdfExport.test.ts`
  - Unit tests für `getDisplayName`
- **Modify:** `frontend/src/components/planner/GameDayPlanner.tsx`
  - Import `generateLineupWithFieldPdf`
  - Add handler `handleExportLineupField`
  - Add Mobile-Button (ToolbarBtn nach Zeile 433)
  - Add Desktop-Button (button nach Zeile 495)

Decomposition: `getDisplayName` ist die einzige reine Logik, die einen Unit-Test rechtfertigt. `drawFieldDiagram` und `generateLineupWithFieldPdf` sind PDF-Rendering — visuell verifizieren, kein Unit-Test (ROI zu gering, gleiche Linie wie restliche PDF-Exporte). Die zwei Funktionen werden in einem Schritt geschrieben, damit `drawFieldDiagram` sofort einen Aufrufer hat und gemeinsam getestet werden kann.

---

## Task 1: `getDisplayName` Helper + Tests

**Files:**
- Modify: `frontend/src/utils/pdfExport.ts` (export new function at top)
- Create: `frontend/src/utils/pdfExport.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/utils/pdfExport.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getDisplayName } from './pdfExport'

describe('getDisplayName', () => {
  it('returns full name when single word', () => {
    expect(getDisplayName('Cher')).toBe('Cher')
  })

  it('returns last name for two-part name', () => {
    expect(getDisplayName('Max Muster')).toBe('Muster')
  })

  it('returns last name for multi-part name', () => {
    expect(getDisplayName('Hans Peter von Müller')).toBe('Müller')
  })

  it('returns initial + last name when last name longer than 12 chars', () => {
    expect(getDisplayName('Max Mustermannlanger')).toBe('M. Mustermannl…')
  })

  it('returns last name unchanged when exactly 12 chars', () => {
    expect(getDisplayName('Max Zwölfzeichn')).toBe('Zwölfzeichn')
  })

  it('truncates very long single name with ellipsis', () => {
    expect(getDisplayName('Sehrlangereinwortnamehier')).toBe('Sehrlangereinw…')
  })

  it('handles empty string', () => {
    expect(getDisplayName('')).toBe('')
  })

  it('handles extra whitespace', () => {
    expect(getDisplayName('  Max   Muster  ')).toBe('Muster')
  })

  it('uses initial of first word when last name exceeds threshold', () => {
    expect(getDisplayName('Theodor Reichenbach-Schwarzheim')).toBe('T. Reichenbach…')
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd frontend && npx vitest run src/utils/pdfExport.test.ts
```

Expected: All 9 tests FAIL with import error or undefined function.

- [ ] **Step 3: Implement `getDisplayName` in `pdfExport.ts`**

Add at top of `frontend/src/utils/pdfExport.ts`, right after the imports (before `export interface GameData`):

```ts
/**
 * Returns a short display name suitable for the field diagram.
 * - Single-word name: returned as-is (truncated at 14 chars)
 * - Multi-word name: last name (truncated at 14 chars)
 * - Last name > 12 chars: `Initial. LastName` with last name truncated to keep total ≤ 14 chars
 */
export function getDisplayName(fullName: string): string {
  const MAX = 14
  const trimmed = fullName.trim()
  if (trimmed === '') return ''
  const parts = trimmed.split(/\s+/)
  const last = parts[parts.length - 1]

  // single word
  if (parts.length === 1) {
    return last.length > MAX ? last.slice(0, MAX - 1) + '…' : last
  }

  // multi-word with short last name
  if (last.length <= 12) {
    return last.length > MAX ? last.slice(0, MAX - 1) + '…' : last
  }

  // long last name — use initial + last, truncate last
  const prefix = parts[0][0] + '. '
  const remaining = MAX - prefix.length // = 11
  return prefix + last.slice(0, remaining - 1) + '…'
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd frontend && npx vitest run src/utils/pdfExport.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/pdfExport.ts frontend/src/utils/pdfExport.test.ts
git commit -m "✨ pdfExport: getDisplayName Helper für Feld-Diagram"
```

---

## Task 2: `drawFieldDiagram` Helper + `generateLineupWithFieldPdf`

**Files:**
- Modify: `frontend/src/utils/pdfExport.ts` (add helper + new export at end of file)

Diese beiden Funktionen sind gekoppelt — `drawFieldDiagram` hat ohne `generateLineupWithFieldPdf` keinen Aufrufer. Daher in einem Task zusammen schreiben und manuell visuell verifizieren.

- [ ] **Step 1: Add `FIELD_COORDS` constant**

In `frontend/src/utils/pdfExport.ts`, direkt nach `getDisplayName` einfügen:

```ts
/** Position-Koordinaten in viewBox 100×95 (übernommen aus FieldView.tsx). */
const FIELD_COORDS: Record<string, { x: number; y: number }> = {
  CF: { x: 50, y: 8 },
  LF: { x: 14, y: 18 },
  RF: { x: 86, y: 18 },
  SS: { x: 33, y: 28 },
  '2B': { x: 67, y: 28 },
  '3B': { x: 16, y: 58 },
  '1B': { x: 84, y: 58 },
  P:  { x: 50, y: 52 },
  C:  { x: 50, y: 82 },
}

const FIELD_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']
```

- [ ] **Step 2: Add `drawFieldDiagram` helper**

Direkt nach den Konstanten aus Step 1 einfügen:

```ts
function drawFieldDiagram(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  lineup: LineupEntryResponse[],
  substitutions: SubstitutionResponse[],
): void {
  // Diamond in quadratische Sub-Box zeichnen, damit nicht verzerrt.
  // viewBox-Aspect = 100/95. Sub-Box ist quadratisch s × s.
  const s = Math.min(width, height * (100 / 95))
  const subX = x + (width - s) / 2
  const subY = y

  const px = (vbX: number) => subX + (vbX / 100) * s
  const py = (vbY: number) => subY + (vbY / 95) * s * (95 / 100) // = subY + (vbY/100)*s, gleicher Scale

  // --- Baselines (Polygon Home → 1B → 2B → 3B → Home) ---
  doc.setDrawColor(200, 46, 46) // softball-red-500
  doc.setLineWidth(0.5)
  const home = [px(50), py(70)]
  const first = [px(72), py(50)]
  const second = [px(50), py(30)]
  const third = [px(28), py(50)]
  doc.line(home[0], home[1], first[0], first[1])
  doc.line(first[0], first[1], second[0], second[1])
  doc.line(second[0], second[1], third[0], third[1])
  doc.line(third[0], third[1], home[0], home[1])

  // --- Bases (4 kleine Diamonds, mittels doc.lines) ---
  doc.setFillColor(200, 46, 46)
  doc.setDrawColor(160, 30, 30) // softball-red-700
  doc.setLineWidth(0.2)
  const baseSize = (3 / 100) * s
  const drawRotatedBase = (cx: number, cy: number) => {
    const half = baseSize / 2
    // 4-Punkt Diamond via doc.lines (relative Deltas, geschlossen, fill+stroke).
    // Start: west (cx-half, cy). Pfad: west → north → east → south → close.
    doc.lines(
      [
        [half, -half],  // west → north
        [half,  half],  // north → east
        [-half, half],  // east → south
        [-half, -half], // south → west (close)
      ],
      cx - half, cy,
      [1, 1],
      'FD',
      true,
    )
  }
  drawRotatedBase(home[0], home[1])
  drawRotatedBase(first[0], first[1])
  drawRotatedBase(second[0], second[1])
  drawRotatedBase(third[0], third[1])

  // --- Player-Slots ---
  // Build maps from lineup
  const fielderByPos = new Map<string, LineupEntryResponse>()
  for (const e of lineup) {
    if (e.position && FIELD_POSITIONS.includes(e.position)) {
      fielderByPos.set(e.position, e)
    }
  }
  // Subs grouped by playerOut.id, sorted by inning ascending
  const subsByPlayerOut = new Map<number, SubstitutionResponse[]>()
  for (const sub of substitutions) {
    const arr = subsByPlayerOut.get(sub.playerOut.id) ?? []
    arr.push(sub)
    subsByPlayerOut.set(sub.playerOut.id, arr)
  }
  for (const arr of subsByPlayerOut.values()) arr.sort((a, b) => a.inning - b.inning)

  // Font-Sizes: skaliert auf s (78 mm Standard → 100% Skala)
  // pos-label 5pt, player 6.5pt, sub 4.5pt
  for (const pos of FIELD_POSITIONS) {
    const coord = FIELD_COORDS[pos]
    const cx = px(coord.x)
    const cy = py(coord.y)
    const entry = fielderByPos.get(pos)

    // Position-Label (rot, klein, oberhalb des Players)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5)
    doc.setTextColor(200, 46, 46)
    const posLabelY = entry ? cy - (s * 0.035) : cy - (s * 0.01)
    doc.text(pos, cx, posLabelY, { align: 'center' })

    if (entry) {
      // Player-Name (navy bold, unter Position)
      const displayName = getDisplayName(entry.player.name)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(30, 41, 59)
      doc.text(displayName, cx, cy + (s * 0.014), { align: 'center' })

      // Sub-Annotation (erste Sub für diesen Player), italic mini
      const subs = subsByPlayerOut.get(entry.player.id)
      if (subs && subs.length > 0) {
        const sub = subs[0]
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(4.5)
        doc.setTextColor(100, 116, 139) // navy-500-ish
        doc.text(
          `→ ${getDisplayName(sub.playerIn.name)} (${sub.inning + 1}.)`,
          cx,
          cy + (s * 0.045),
          { align: 'center' },
        )
      }
    } else {
      // Leerer Slot — grauer Punkt
      doc.setFillColor(209, 213, 219) // gray-300
      doc.circle(cx, cy + (s * 0.02), s * 0.012, 'F')
    }
  }

  // Reset text color für nachfolgende Renders
  doc.setTextColor(0, 0, 0)
}
```

- [ ] **Step 3: Add `generateLineupWithFieldPdf` function**

Am Ende von `frontend/src/utils/pdfExport.ts` (nach `generateScoringPdf`) einfügen:

```ts
export function generateLineupWithFieldPdf(
  gameDay: GameDayResponse,
  games: GameData[],
  season: Season | null,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10
  const lineupWidth = 105
  const gap = 7
  const fieldWidth = 78
  const fieldHeight = 78
  const contentRowHeight = 78
  const fieldX = margin + lineupWidth + gap

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    })

  const headerTitle =
    `${gameDay.label || 'Spieltag'} - ${formatDate(gameDay.date)}` +
    (gameDay.location ? ` @ ${gameDay.location}` : '')

  const drawPageHeader = (y: number) => {
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(headerTitle, pageWidth / 2, y, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  }

  let y = 12
  drawPageHeader(y)
  y += 8

  for (let gi = 0; gi < games.length; gi++) {
    const { game, lineup, staff, substitutions } = games[gi]

    // Page-Break nach jeweils 3 Games
    if (gi > 0 && gi % 3 === 0) {
      doc.addPage()
      y = 12
      drawPageHeader(y)
      y += 8
    }

    // --- Game-Header ---
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    let gameTitle = `Spiel ${game.gameNumber}`
    if (game.opponentTeam) gameTitle += ` vs ${game.opponentTeam.name}`
    doc.text(gameTitle, margin, y)
    doc.setDrawColor(30, 41, 59)
    doc.setLineWidth(0.4)
    doc.line(margin, y + 1, pageWidth - margin, y + 1)
    doc.setTextColor(0, 0, 0)
    y += 4

    // --- Staff-Line ---
    if (staff.length > 0) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      const subInIds = new Map(substitutions.map(s => [s.playerIn.id, s]))
      const staffText = staff.map(s => {
        const roleLabel = s.role === 'BASE_COACH_1ST' ? '1B Coach' : '3B Coach'
        const sub = subInIds.get(s.player.id)
        if (sub) return `${roleLabel}: ${s.player.name} (${sub.playerOut.name} ab ${sub.inning + 1}. Inning)`
        return `${roleLabel}: ${s.player.name}`
      }).join('  ·  ')
      doc.text(staffText, margin, y)
      doc.setTextColor(0, 0, 0)
      y += 3
    }

    const contentTopY = y

    // --- Lineup-Tabelle links ---
    if (lineup.length === 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(150, 150, 150)
      doc.text('Kein Lineup', margin, y + 4)
      doc.setTextColor(0, 0, 0)
    } else {
      const sorted = [...lineup].sort((a, b) => a.battingOrder - b.battingOrder)
      const subsByPlayerOut = new Map<number, SubstitutionResponse[]>()
      for (const sub of substitutions) {
        const arr = subsByPlayerOut.get(sub.playerOut.id) ?? []
        arr.push(sub)
        subsByPlayerOut.set(sub.playerOut.id, arr)
      }

      const rows = sorted.map(entry => {
        let name = entry.player.name
        if (entry.dhBatterPlayer) name += ` (DH: ${entry.dhBatterPlayer.name})`
        const subs = subsByPlayerOut.get(entry.player.id)
        if (subs) {
          for (const sub of subs.sort((a, b) => a.inning - b.inning)) {
            name += `  (${sub.playerIn.name} ab ${sub.inning + 1}. Inning)`
          }
        }
        return [String(entry.battingOrder), name, entry.position ?? '']
      })

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: pageWidth - (margin + lineupWidth) },
        head: [],
        body: rows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.2 },
        columnStyles: {
          0: { cellWidth: 8, halign: 'right', textColor: [150, 150, 150], font: 'courier' },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 14, halign: 'right', font: 'courier', fontStyle: 'bold' },
        },
      })
    }

    // --- Feld-Diagram rechts ---
    drawFieldDiagram(doc, fieldX, contentTopY, fieldWidth, fieldHeight, lineup, substitutions)

    // y nach Content-Row weitersetzen
    y = contentTopY + contentRowHeight

    // --- Bench-Line ---
    const gameUsedIds = new Set<number>()
    for (const e of lineup) {
      gameUsedIds.add(e.player.id)
      if (e.dhBatterPlayer) gameUsedIds.add(e.dhBatterPlayer.id)
    }
    for (const s of staff) gameUsedIds.add(s.player.id)
    for (const sub of substitutions) gameUsedIds.add(sub.playerIn.id)
    const bench = gameDay.availablePlayers.filter(p => !gameUsedIds.has(p.id))
    if (bench.length > 0) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text(`Bank: ${bench.map(p => p.name).join(', ')}`, margin, y)
      doc.setTextColor(0, 0, 0)
    }
    y += 3

    // --- Inter-Block-Separator (außer nach letztem Spiel auf Seite / letztem Spiel) ---
    const isLastOnPage = (gi + 1) % 3 === 0 || gi === games.length - 1
    if (!isLastOnPage) {
      doc.setDrawColor(229, 224, 207) // cream-300
      doc.setLineWidth(0.2)
      doc.line(margin, y, pageWidth - margin, y)
      y += 3
    }
  }

  // --- Filename + PDF-Properties ---
  const parts = ['Lineup-Feld']
  if (gameDay.location) parts.push(gameDay.location)
  if (season) parts.push(`${season.name}_${season.year}`)
  doc.setProperties({ title: parts.join('_') })
  doc.save(parts.join('_') + '.pdf')
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npm run build
```

Expected: Build succeeds, no TypeScript errors. (Production-Build dauert ~10-20 s.)

- [ ] **Step 5: Run existing tests to ensure nothing broke**

```bash
cd frontend && npx vitest run
```

Expected: Alle bestehenden Tests PASS, plus die 9 neuen `getDisplayName`-Tests.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/pdfExport.ts
git commit -m "✨ pdfExport: generateLineupWithFieldPdf + drawFieldDiagram"
```

---

## Task 3: UI-Button in GameDayPlanner

**Files:**
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx`

- [ ] **Step 1: Import erweitern**

In `frontend/src/components/planner/GameDayPlanner.tsx`, Zeile 25 ersetzen:

```ts
import { generatePdf, generateScoringPdf } from '@/utils/pdfExport'
```

durch:

```ts
import { generatePdf, generateScoringPdf, generateLineupWithFieldPdf } from '@/utils/pdfExport'
```

- [ ] **Step 2: Handler hinzufügen**

Nach `handleExportScoring` (endet ~Zeile 234), neuen Handler einfügen:

```ts
  const handleExportLineupField = async () => {
    if (!gameDay) return
    try {
      const gameData = await loadGameData()
      if (gameData) generateLineupWithFieldPdf(gameDay, gameData, season)
    } catch (e: unknown) {
      toast.show((e as Error).message, 'error')
    }
  }
```

- [ ] **Step 3: Mobile-Button hinzufügen**

Im Mobile-Toolbar-Strip (Zeile 424-433), neuen `ToolbarBtn` zwischen "Scoring" und "PDF" einfügen. Vorher:

```tsx
              <ToolbarBtn
                icon={<ClipboardIcon size={16} />}
                label="Scoring"
                onClick={handleExportScoring}
              />
              <ToolbarBtn
                icon={<ExportDoc size={16} />}
                label="PDF"
                onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
              />
```

Nachher (neuer Button zwischen den beiden bestehenden):

```tsx
              <ToolbarBtn
                icon={<ClipboardIcon size={16} />}
                label="Scoring"
                onClick={handleExportScoring}
              />
              <ToolbarBtn
                icon={<ExportDoc size={16} />}
                label="Lineup + Feld"
                onClick={handleExportLineupField}
              />
              <ToolbarBtn
                icon={<ExportDoc size={16} />}
                label="PDF"
                onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
              />
```

- [ ] **Step 4: Desktop-Button hinzufügen**

Im Desktop-Toolbar-Strip (Zeile 480-495), neuen `<button>` zwischen "Scoring" und "PDF" einfügen. Vorher:

```tsx
              <button
                onClick={handleExportScoring}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Scoring-Sheet drucken"
              >
                <ClipboardIcon size={14} />
                <span>Scoring</span>
              </button>
              <button
                onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Als PDF exportieren"
              >
                <ExportDoc size={14} />
                <span>PDF</span>
              </button>
```

Nachher (neuer Button zwischen Scoring und PDF):

```tsx
              <button
                onClick={handleExportScoring}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Scoring-Sheet drucken"
              >
                <ClipboardIcon size={14} />
                <span>Scoring</span>
              </button>
              <button
                onClick={handleExportLineupField}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Lineup + Feld als PDF exportieren"
              >
                <ExportDoc size={14} />
                <span>Lineup + Feld</span>
              </button>
              <button
                onClick={() => lineup.hasChanges ? setShowExportConfirm(true) : handleExportPdf()}
                className="font-display px-2.5 py-1.5 text-[11px] font-bold tracking-widest uppercase text-gray-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
                title="Als PDF exportieren"
              >
                <ExportDoc size={14} />
                <span>PDF</span>
              </button>
```

- [ ] **Step 5: Build + Lint**

```bash
cd frontend && npm run lint && npm run build
```

Expected: Beide grün.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ GameDayPlanner: Button 'Lineup + Feld' für neuen PDF-Export"
```

---

## Task 4: Visuelle Manual-Verifikation

**Files:** keine — User testet im Browser

- [ ] **Step 1: Dev-Stack starten**

In drei Terminals:

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
cd frontend && npx vite
```

- [ ] **Step 2: Test-Szenarien im Browser durchgehen**

Browser auf `http://localhost:5173`. Login mit `admin / Deadsox123!`. Auf einen Spieltag mit mindestens einem Spiel navigieren.

Folgende Szenarien testen, jedes Mal `Lineup + Feld`-Button klicken und PDF prüfen:

| Szenario | Erwartung |
|----------|-----------|
| Spieltag mit 1 Spiel, normalem 9-er-Lineup | 1 Seite, Lineup links, Diamond rechts mit allen 9 Positionen befüllt |
| Spieltag mit 4 Spielen | Seite 1: Spiele 1-3, Seite 2: Spiel 4. Page-Header wiederholt |
| Spiel mit DH | Lineup-Tabelle zeigt `Max Muster (DH: Tom Tomato)`, Feld zeigt nur Max Muster auf Position |
| Spiel mit EH (`position='EH'`) | Lineup-Tabelle zeigt EH-Zeile, Feld ignoriert EH |
| Spiel mit Substitution (Inning 3) | Lineup-Tabelle zeigt `(SubName ab 4. Inning)`, Feld zeigt `→ SubName (4.)` italic mini |
| Spiel mit Substitution für Coach | Staff-Line zeigt Sub-Info |
| Spiel mit sehr langem Spielernamen | Feld zeigt Initial + Nachname (z.B. `M. Mustermannl…`), Lineup-Tabelle bricht ggf. um |
| Spiel ohne Lineup | "Kein Lineup" Text links, Feld zeigt 9 graue Punkte |
| Spiel mit Lineup-Entry ohne Position | Lineup zeigt Zeile mit leerer Position-Spalte, Feld zeigt diesen Spieler nicht |

- [ ] **Step 3: User-Approval**

User testet die generierten PDFs. Wenn etwas optisch nicht stimmt (z.B. Field zu klein, Text überlappt, Sub-Annotation unleserlich) → Issue notieren und in Folge-Task fixen.

Wenn alle Szenarien passen → Done.

- [ ] **Step 4 (optional): Cleanup-Commit**

Falls bei visueller Prüfung kleine Anpassungen nötig waren (Font-Größen, Padding), separater Commit:

```bash
git add frontend/src/utils/pdfExport.ts
git commit -m "🎨 Lineup-Feld-PDF: Layout-Feinschliff nach visueller Prüfung"
```

---

## Self-Review-Notizen (vor Übergabe)

**Spec-Coverage:**
- ✓ Neuer Export-Slot → Task 3 (Button hinzufügen)
- ✓ Button-Label "Lineup + Feld" → Task 3 Step 3/4
- ✓ 3 Spiele/Seite Portrait → Task 2 Step 3 (`if (gi > 0 && gi % 3 === 0)`)
- ✓ Lineup links + Feld rechts → Task 2 Step 3 (Layout-Maße)
- ✓ Nur 9 Defense-Positionen auf Feld, EH/DH nur in Tabelle → Task 2 Step 2 (`FIELD_POSITIONS`-Filter)
- ✓ Position + Spielername auf Feld → Task 2 Step 2 (pos-label + displayName)
- ✓ Substitutions als Mini-Annotation `→ ... (N.)`, max 1 → Task 2 Step 2 (`subs[0]`)
- ✓ Substitutions in Lineup-Tabelle als `(Name ab N. Inning)` → Task 2 Step 3 (rows-Build)
- ✓ Bench-Line unter Block → Task 2 Step 3
- ✓ Inter-Block-Separator → Task 2 Step 3 (`isLastOnPage`-Check)
- ✓ Filename + Properties → Task 2 Step 3
- ✓ Edge-Cases (kein Lineup, EH, DH, lange Namen, Coach-Sub) → Task 4 Step 2 (Manual-Verifikation)

**Type-Konsistenz:**
- `LineupEntryResponse`, `SubstitutionResponse`, `GameDayResponse`, `Season`, `GameData` — alle aus `@/types` bzw. bestehend in `pdfExport.ts` (Zeile 3 + 5-10). ✓
- `getDisplayName` Signatur: `(fullName: string) => string` — konsistent in Task 1 und Aufruf in Task 2 Step 2. ✓
- `drawFieldDiagram` Signatur: `(doc, x, y, width, height, lineup, substitutions)` — konsistent zwischen Definition (Task 2 Step 2) und Aufruf (Task 2 Step 3). ✓
- `generateLineupWithFieldPdf` Signatur: `(gameDay, games, season)` — identisch zu `generatePdf` Signatur. ✓

**Placeholder-Scan:** Keine TBDs, jeder Code-Block ist vollständig.

**Type-Imports prüfen:** `jsPDF`, `autoTable`, alle Types werden in `pdfExport.ts` bereits importiert (siehe Zeile 1-3). Keine neuen Imports nötig.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-21-lineup-feld-pdf.md`.**
