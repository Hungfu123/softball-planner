# Lineup + Feld PDF — Design

**Datum:** 2026-05-21
**Topic:** Neuer PDF-Export "Lineup + Feld" — Lineup-Tabelle links, Feld-Diagramm rechts daneben

## Ziel

Zusätzlicher PDF-Export neben den bestehenden zwei (`PDF`, `Scoring`). Pro Spiel zeigt das Blatt links die Lineup-Tabelle (Batting-Order, Name, Position) und rechts daneben ein Diamond-Diagramm mit den 9 Defense-Positionen und den dort spielenden Spielern. Manager und Spieler sehen auf einen Blick: Wer schlägt in welcher Reihenfolge, wer steht wo im Feld.

## Scope-Entscheidungen (aus Brainstorm)

- **Slot:** Zusätzlicher Button neben "PDF" und "Scoring" — bestehende Exports bleiben unverändert.
- **Button-Label:** `Lineup + Feld`.
- **Seiten-Layout:** A4 Portrait, **3 Spiele pro Seite** (wie bestehender Lineup-PDF). Pro Spiel: Lineup-Tabelle links, Feld rechts daneben.
- **Feld-Inhalt:** **Nur 9 Defense-Positionen.** EH und DH-Batter erscheinen ausschließlich in der Lineup-Tabelle links (EH als `position='EH'`-Zeile, DH-Batter als Annotation `(DH: Name)` am Fielder).
- **Spieler-Label auf Feld:** Position klein darüber + Spielername darunter (gleiches Schema wie `FieldView.tsx`).
- **Substitutions auf Feld:** Sub-Spieler als Mini-Annotation `→ Nachname (3.)` unter dem Start-Spieler. Max 1 Sub-Annotation auf Feld; bei >1 Sub für gleiche Position nur die erste auf Feld, Rest steht in Lineup-Tabelle links.

## Architektur

### Neue Funktion in `frontend/src/utils/pdfExport.ts`

```ts
export function generateLineupWithFieldPdf(
  gameDay: GameDayResponse,
  games: GameData[],
  season: Season | null
)
```

Signatur identisch zu `generatePdf` / `generateScoringPdf` (Symmetrie). Liegt in derselben Datei — geteilte Helpers (Header-Rendering, Date-Format, Bench-Logik).

### Hilfsfunktion `drawFieldDiagram`

```ts
function drawFieldDiagram(
  doc: jsPDF,
  x: number,           // top-left mm
  y: number,
  width: number,       // Box-Breite mm
  height: number,      // Box-Höhe mm
  lineup: LineupEntryResponse[],
  substitutions: SubstitutionResponse[]
): void
```

Zeichnet das Diamond + 9 Spieler-Slots in eine Box. Verwendet jsPDF-Primitiven (`line`, `rect`, `circle`, `text`) — **kein** SVG-Import, **kein** Canvas. Koordinaten aus `FieldView.tsx` (`FIELD_COORDS` mit viewBox 100×95) werden proportional in die Box skaliert. Damit der Diamond nicht verzerrt: das Diagram wird in eine quadratische Sub-Box gezeichnet (`s = min(width, height * 100/95)`); die Sub-Box wird horizontal zentriert innerhalb der gegebenen `width × height` platziert. Mapping: `mmX = subBoxX + (vbX / 100) * s`, `mmY = y + (vbY / 95) * (s * 95/100)`.

### Aufruf-Site `GameDayPlanner.tsx`

Neuer Handler analog zu `handleExportPdf`:

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

Neuer Button im Export-Block (gleiche Stelle wo bestehende PDF-Buttons sitzen). `loadGameData` wird unverändert wiederverwendet.

## Layout-Maße (A4 Portrait 210×297 mm)

```
Margin links/rechts:  10 mm
Margin oben:          12 mm
Page-Header:           6 mm hoch (Spieltag-Label + Datum + Location)

Pro Spiel-Block:      90 mm hoch
  ├─ Game-Header       6 mm  (Spiel-Nr + Opponent, navy underline 0.4 mm)
  ├─ Staff-Line        3 mm  (1B/3B Coach, optional)
  ├─ Content-Row      78 mm
  │   ├─ Lineup-Table 105 mm breit × 78 mm  (margin 10 → x=10)
  │   ├─ Gap            7 mm
  │   └─ Field-Box     78 mm × 78 mm (Diamond, quadratisch, x=122)
  └─ Bench-Line        3 mm  (Bank: A, B, C ...)

Inter-Block-Gap:       3 mm  (dünne cream-300 horizontale Linie)

Vertikal-Budget:
  Header (12+6) + 3 × 90 + 2 × 3  =  294 mm   (passt in 297, Margin unten ~3 mm)
```

**Page-Break-Logik:** Nach jedem 3. Spiel `addPage()`, Page-Header wiederholen (Pattern aus `generatePdf` und `generateScoringPdf`).

## Field-Box — Rendering im Detail

### Geometrie (aus `FieldView.tsx`)

Baselines-Diamond (Polygon): Home (50,70) → 1B (72,50) → 2B (50,30) → 3B (28,50) → Home.

Bases: 4 Quadrate ~3×3 viewBox-units, um 45° gedreht, an den Diamond-Ecken.

Position-Koordinaten:
```
CF (50, 8)   LF (14, 18)   RF (86, 18)
SS (33, 28)  2B (67, 28)
3B (16, 58)  P (50, 52)   1B (84, 58)
              C (50, 82)
```

### Aesthetic

| Element | Stil |
|---------|------|
| Baselines | `setDrawColor(200, 46, 46)` (softball-red-500), lineWidth 0.5 mm |
| Bases | Filled softball-red-500, stroke red-700 0.3 mm, rotiert 45° |
| Position-Label | Helvetica Bold 5 pt, softball-red-600 (200, 46, 46) |
| Spielername | Helvetica Bold 6.5 pt, navy-900 (30, 41, 59), Nachname only (oder „Initial. Nachname" falls Nachname > 12 chars) |
| Sub-Annotation | Helvetica Italic 4.5 pt, navy-500, Format `→ T. Tom (3.)` |
| Leerer Slot | Grauer Punkt r=1 mm, gray-300 |

### Spieler-Name-Logik

```
fullName = entry.player.name
parts = fullName.trim().split(/\s+/)
displayName =
  parts.length === 1
    ? parts[0]                                  // nur ein Wort
    : parts[parts.length - 1].length <= 12
      ? parts[parts.length - 1]                 // Nachname
      : parts[0][0] + '. ' + parts[parts.length - 1]  // M. Mustermann
if (displayName.length > 14) displayName = displayName.slice(0, 13) + '…'
```

### Sub-Annotation

Für jede Position, die einen `playerOut`-Eintrag in `substitutions` hat:
- Subs werden nach `inning` ascending sortiert
- Erste Sub (lowest inning): unter Spielername als italic Mini-Text
- Format: `→ {displayName(playerIn)} ({inning+1}.)` — verwendet identische `displayName`-Logik wie der Start-Spieler (Nachname / Initial+Nachname / Truncate)
- Weitere Subs: NICHT auf Feld — komplette Sub-Historie steht in Lineup-Tabelle links

## Lineup-Tabelle (links) — Rendering

**Identisch zu `generatePdf`-Tabelle**, aber `contentWidth = 105 mm` und linksbündig bei `margin = 10 mm`:

| Col | Inhalt | Stil |
|-----|--------|------|
| 0 | Order# (1, 2, ...) | Courier 9pt, halign right, gray-400, width 8 mm |
| 1 | Name (+ DH-Annotation + Sub-Annotationen) | Helvetica Bold 9pt, width auto |
| 2 | Position (P, C, SS, 1B, ..., EH) | Courier Bold 9pt, halign right, width 14 mm |

`autoTable` mit `theme: 'plain'`, `fontSize: 9`, `cellPadding: 1.2`.

DH-Annotation am Name: `(DH: Name)`.
Sub-Annotation am Name: `(SubName ab {inning+1}. Inning)` (eine pro Sub, sortiert nach inning).

## Bench-Line

Identisch zu bestehender Logik: Spieler aus `gameDay.availablePlayers`, die nicht in Lineup-Entries, nicht in DH-Slots, nicht in Staff, nicht in Sub-Ins enthalten sind.

Render unter dem Content-Row (also unter beiden — Lineup-Tabelle UND Feld-Box):
```
Bank: A, B, C    [7pt gray italic]
```

## Inter-Block Separator

Zwischen je zwei Spiel-Blocks: horizontale Linie über volle Content-Breite (`pageWidth - 2 * margin`), `setDrawColor(229, 224, 207)` (cream-300), lineWidth 0.2 mm. Visueller Rhythm ohne Gewicht. Kein Separator vor dem ersten Block oder nach dem letzten.

## Page-Header

Identisch zu bestehender Logik:
```
{gameDay.label || 'Spieltag'} - {formatDate(gameDay.date)} @ {gameDay.location}
```
Helvetica Bold 13pt, centered, navy-900. Auf jeder Seite wiederholt nach `addPage()`.

## Filename + PDF-Properties

```ts
const parts = ['Lineup-Feld']
if (gameDay.location) parts.push(gameDay.location)
if (season) parts.push(`${season.name}_${season.year}`)
doc.setProperties({ title: parts.join('_') })
doc.save(parts.join('_') + '.pdf')
```

## Edge-Cases

| Case | Verhalten |
|------|-----------|
| Spiel ohne Lineup-Entries | Lineup-Bereich: italic gray-Hinweis "Kein Lineup". Feld-Box: leere Position-Slots (graue Punkte). Keine Crash. |
| Lineup-Entry mit `position === null` | Erscheint in Lineup-Tabelle mit leerer Position-Spalte. Erscheint NICHT im Feld. |
| Lineup-Entry mit `position === 'EH'` | Erscheint in Lineup-Tabelle mit `EH` in Position-Spalte. Erscheint NICHT im Feld. |
| Lineup-Entry mit `position` = Defense-Pos, aber kein Player für diese Position | Slot auf Feld bleibt leer (grauer Punkt) — sollte nicht vorkommen, da `position` immer zu einem Spieler gehört. |
| 2+ Subs für gleiche Defense-Position | Nur erste Sub auf Feld als Annotation; vollständige Historie steht in Lineup-Tabelle links. |
| <3 Spiele am Spieltag | Vertikalraum bleibt unten leer. Field-Box-Größe unverändert (kein Auto-Stretch). Konsistente Optik mit Multi-Spieltagen. |
| >3 Spiele | Page-Break nach Spiel 3, 6, ... — Page-Header wiederholt. |
| Sehr lange Player-Namen | Lineup-Tabelle: `autoTable` bricht um. Feld: Trunkierung per `displayName`-Logik (max 14 Zeichen, Initial+Nachname-Fallback). |
| Spielername ohne Whitespace | Wird unverändert übernommen, bei >14 Zeichen mit `…` getrunken. |
| Coach-Substitution (Staff-Player wird gewechselt) | Staff-Line zeigt wie bisher `(SubName ab N. Inning)` — gleiche Logik wie `generatePdf`. |

## Code-Wiederverwendung

`generateLineupWithFieldPdf` teilt mit `generatePdf`:
- Page-Header-Rendering (Title + Date + Location, Wiederholen auf neuer Seite)
- `formatDate`
- Bench-Berechnung (`gameUsedIds` Set)
- DH-/Sub-Annotation am Spielernamen in der Lineup-Tabelle

Gemeinsame Helper werden im Refactor optional aus den Funktionen extrahiert — nicht zwingend für diesen Spec. Wenn die Funktion fast komplett dupliziert, kann nachträglich refaktoriert werden. **YAGNI:** erst nach Implementierung entscheiden, ob extraktion sinnvoll ist.

## Testing

- **Manuell:** `npm run build` muss bauen. PDF-Export wird über UI getriggert, visuell geprüft mit verschiedenen Lineup-Szenarien:
  - Spieltag mit 1 / 2 / 3 / 4+ Spielen
  - Spiel ohne Lineup
  - Spiel mit DH
  - Spiel mit EH (`position='EH'`)
  - Spiel mit Substitutions (1 Sub, 2 Subs, Sub mit Coach)
  - Sehr langer Spielername
- **TypeScript:** `npm run build` validiert.
- Kein Unit-Test zwingend — PDF-Render ist visuell, ROI auf E2E-Test gering. Bestehende `pdfExport.ts` hat auch keine Tests.

## Out of Scope

- Liga-Tabelle / Standings im PDF
- Stats-Anzeige im PDF
- Mehrere Spieltage in einem PDF
- Konfigurierbare Layouts (1 vs 2 vs 3 Spiele/Seite)
- Custom-Field-Layouts (z.B. Slowpitch mit 10 Fielders) — App hat aktuell nur 9-Positionen-Modell
- Refactor der bestehenden `generatePdf` / `generateScoringPdf` — bleibt unverändert
- Backend-Änderung — rein Frontend-Feature

## Akzeptanzkriterien

1. Im `GameDayPlanner` neuer Button `Lineup + Feld` neben den bestehenden PDF-Buttons.
2. Click → PDF download mit Filename `Lineup-Feld_<Location>_<Season>_<Year>.pdf`.
3. Jedes Spiel zeigt links die Lineup-Tabelle (Order, Name, Position) und rechts ein Softball-Diamond mit 9 Defense-Spielern.
4. EH/DH erscheinen nur in der Lineup-Tabelle, nicht im Feld.
5. Substitutions erscheinen als `(SubName ab N. Inning)` in Lineup-Tabelle und als `→ Kurzname (N.)`-Annotation am Feld (max 1 pro Position).
6. 3 Spiele pro A4-Seite, Page-Break automatisch.
7. Bench-Liste unter jedem Spiel-Block.
8. `npm run build` bleibt grün.
