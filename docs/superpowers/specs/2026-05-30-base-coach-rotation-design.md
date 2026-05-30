# Base-Coach-Rotation aus Lineup (Halbe-Lineup-Split)

**Status:** Design
**Datum:** 2026-05-30

## Problem

Bei den Dead Sox sind nicht immer genug Spieler dabei, um beide Base Coaches (1B + 3B) als dedizierte Bench-Coaches zu besetzen.

- **11 Spieler:** Ein Bench-Coach vorhanden (entweder 1B oder 3B, je nach Wahl beim Hinzufügen). Der andere Base muss aus dem Lineup rotieren.
- **10 Spieler:** Beide Bases müssen aus dem Lineup rotieren.

Aktuell gibt es keine Unterstützung dafür. User muss sich Rotation selbst merken und am Spielfeld improvisieren. Das soll explizit konfigurierbar und auf dem Aufstellungs-PDF lesbar dokumentiert sein.

## Goals

1. Konfigurierbares Coach-Rotations-Paar pro Spiel (1B + 3B separat).
2. Faire 50/50-Aufteilung zwischen den zwei Rotation-Spielern.
3. Mindestens 4 Schlagmänner Warmup-Phase vor eigenem Schlag (durch Schema natürlich erfüllt).
4. PDF-Darstellung gut lesbar auch beim Coaching im Feld.
5. UI-Darstellung in der App passt für Mobile + Desktop.

## Non-Goals

- Spielbogen-Workflow wird nicht angepasst (anderer Use-Case, eigenes Coach-Modell).
- Inning-basierte Wechsel-Logik (zu komplex, bringt keinen Mehrwert über Schema B).
- Live-Tracking während des Spiels (statische Setup-Info ist genug).

## Approach: Halbe-Lineup-Split (Schema B)

Jeder Coach übernimmt **die Lineup-Hälfte, in der der andere Coach schlägt**. Wechsel passiert beim Schlagmann unmittelbar nach dem eigenen Schlag.

**Beispiel Paar Pos 5 + 10:**

- Mike (Pos 5) coacht Schlagmänner 6 – 10 (Tristan schlägt in dieser Hälfte bei #10)
- Tristan (Pos 10) coacht Schlagmänner 1 – 5 (Mike schlägt in dieser Hälfte bei #5)

**Warmup-Eigenschaft (automatisch erfüllt):**

Vor jedem eigenen Schlag hat jeder Coach **4 Schlagmänner Vorlaufzeit** im Dugout (Partner coacht). Die letzten **2 Schlagmänner vor dem eigenen Schlag** werden im PDF/UI als expliziter Warmup-Bereich angezeigt.

- Mike's Warmup: Schlag #3–#4 (vor seinem Schlag bei #5)
- Tristan's Warmup: Schlag #8–#9 (vor seinem Schlag bei #10)

**Regel:** Jeder Coach coacht den Block, der **die Position des anderen Coaches enthält** und **die eigene Position ausschließt**.

**Verallgemeinerung — 3 wählbare Paare:**

| Paar | Pos X (lower) coacht | Pos Y (higher) coacht | Warmup X (vor #X) | Warmup Y (vor #Y) |
|---|---|---|---|---|
| 3 + 8 | Pos 3 coacht 4–8 | Pos 8 coacht 9, 10, 1, 2, 3 (Wrap) | #1–#2 | #6–#7 |
| 4 + 9 | Pos 4 coacht 5–9 | Pos 9 coacht 10, 1, 2, 3, 4 (Wrap) | #2–#3 | #7–#8 |
| 5 + 10 | Pos 5 coacht 6–10 | Pos 10 coacht 1–5 | #3–#4 | #8–#9 |

**Empfohlenes Default-Paar: 5 + 10** (einziges Paar ohne Wrap-Around, mathematisch sauber).

## Backend

### Data Model

**Neues Enum:** `CoachRotationPair`

```java
public enum CoachRotationPair {
    POS_3_8,
    POS_4_9,
    POS_5_10;

    // Block-Mapping: Position X+Y → wer coacht welche Schlag-Range
    // Block A = höhere Position coacht "vorderen" Lineup-Teil (vor eigenem Schlag)
    // Block B = niedrigere Position coacht "hinteren" Lineup-Teil
    public int getHigherPosition() { ... }  // 8, 9, oder 10
    public int getLowerPosition() { ... }   // 3, 4, oder 5
    public IntRange getHigherCoachRange() { ... }  // bei 5+10: 1-5
    public IntRange getLowerCoachRange() { ... }   // bei 5+10: 6-10
    public IntRange getHigherWarmup() { ... }     // 2-Schlagmann-Warmup vor eigenem Schlag
    public IntRange getLowerWarmup() { ... }
}
```

**Game-Entity erweitern:**

```java
@Enumerated(EnumType.STRING)
@Column(name = "first_base_coach_rotation", nullable = true)
private CoachRotationPair firstBaseCoachRotation;

@Enumerated(EnumType.STRING)
@Column(name = "third_base_coach_rotation", nullable = true)
private CoachRotationPair thirdBaseCoachRotation;
```

**Domain `Game` (POJO) parallele Felder + Getter/Setter.**

### Migration

`V34__add_base_coach_rotation.sql`:

```sql
ALTER TABLE games ADD COLUMN first_base_coach_rotation VARCHAR(20);
ALTER TABLE games ADD COLUMN third_base_coach_rotation VARCHAR(20);
```

Nullable, kein Default. Bestehende Games bleiben `NULL` für beide Felder.

### API

**Neue Endpoint:** `PUT /api/games/{id}/coach-rotation`

Request:
```json
{
  "firstBaseCoachRotation": "POS_4_9" | null,
  "thirdBaseCoachRotation": "POS_5_10" | null
}
```

Response: `GameResponse` mit neuen Feldern.

**`GameResponse` Record erweitern:**

```java
public record GameResponse(
    Long id,
    Integer gameNumber,
    LeagueTeamResponse opponentTeam,
    Integer scoreUs,
    Integer scoreThem,
    Long gameDayId,
    int lineupEntryCount,
    Instant endedAt,
    String battingSide,
    long atBatCount,
    CoachRotationPair firstBaseCoachRotation,   // NEU
    CoachRotationPair thirdBaseCoachRotation    // NEU
) { ... }
```

### Service-Logik

**`GameService.setCoachRotation(Long gameId, CoachRotationPair firstBase, CoachRotationPair thirdBase)`:**

- Validiert: Wenn GameStaff `BASE_COACH_1ST` belegt → `firstBaseCoachRotation` wird auf null gesetzt (Cleanup, fester Coach übernimmt).
- Selbe Cleanup-Regel für 3B.
- Speichert.

**Bestehende `addStaff(...)` / `setStaff(...)` Methoden erweitern:**

- Wenn ein Coach-Staff-Eintrag hinzugefügt wird → entsprechendes Rotation-Feld auf null setzen.
- Wenn ein Coach-Staff-Eintrag entfernt wird → Rotation-Feld bleibt unverändert (kann später gesetzt werden via PUT).

### Validation

- Kein Hard-Error im Backend.
- PDF-Render: wenn Coach-Slot leer UND Rotation null → fallback auf Default (`POS_4_9` für 1B, `POS_5_10` für 3B).
- Frontend zeigt Default-Paar visuell vorausgewählt (als aktive Pill), aber persistiert erst beim ersten expliziten User-Click.

## Frontend

### CoachSlots Erweiterung

**Wo:** `frontend/src/components/planner/CoachSlots.tsx`.

**Conditional-Logic:** Wenn Coach-Slot leer ist (`coach1st === ''` bzw `coach3rd === ''`), Rotation-Picker erscheint **direkt darunter**.

### Layout (App, Compact-Variant)

```
1B COACH
[— nicht besetzt —]

↳ ROTATION AUS LINEUP
[Pos 4+9] [Pos 3+8] [Pos 5+10]   ← Pills

┌─ AKTIV · POS 4+9 ─────────────────┐
│ ┌────────────┬────────────┐       │
│ │ SCHLAG 5-9 │ SCHLAG 10-4│       │
│ │ Mitchi     │ Vivi       │       │
│ │ Pos 4      │ Pos 9      │       │
│ └────────────┴────────────┘       │
│ Warmup: Mitchi #2-3, Vivi #7-8    │
└───────────────────────────────────┘
```

**Pills (gleiche Pattern wie `ScopeChip` aus StatsPage):**

```tsx
className={`font-display px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px]
  font-bold tracking-widest uppercase rounded-full transition-colors
  min-h-[36px] whitespace-nowrap flex items-center justify-center
  ${active
    ? 'bg-navy-900 text-white shadow-sm'
    : 'bg-cream-100 text-gray-600 hover:bg-cream-200 hover:text-navy-900 border border-cream-300'}`}
```

**Pills-Container:** `flex flex-wrap gap-1.5 sm:gap-2 mt-1.5`

**2-Block-Split:** 2-col Grid, linker Block `bg-softball-red-50`, rechter Block `bg-cream-100 border-l-2 border-navy-900`.

**Warmup-Line:** `font-display text-[10px] text-gray-500 italic mt-2`.

### Auto-Save

- Beim Pill-Click → API-Call (selbes Pattern wie Coach-Select).
- Beim ersten Anzeigen wenn Coach-Slot leer + Rotation null → Default vorausgewählt (sichtbar als aktive Pill, kein Auto-Save bis User explizit klickt — verhindert ungewollte Persist bei nicht-bestätigter Anzeige).

### Edge-Cases

- **Lineup < 10 Einträge:** Pills disabled (`opacity-50 pointer-events-none`), Hinweis-Box: "Lineup mit 10 Spielern nötig".
- **Backup-Pos im Lineup leer:** Player-Name zeigt "—" im 2-Block, kein Crash.
- **Pos 8 = Pitcher + User wählt 3+8:** Soft-Warning-Chip `bg-amber-100 text-amber-800 text-[9px]`: "⚠ Pitcher als Coach".

### Responsivität

Compact-Variant funktioniert in allen Container-Breiten (Mobile ~360px, lg ~226px, xl ~296px). Kein Container-Query nötig.

### Icons

Alle Icons aus `frontend/src/icons/index.tsx` (wrapped lucide-react, kein neues Library):

- **`StarIcon`** (existiert) — Recommendation-Marker im Picker
- **`AlertTriangle`** (existiert) — Warnings (Pitcher als Coach, Lineup < 10)
- **`CoachFlagIcon`** (NEU, wrap `Flag` from lucide-react) — Coach-Badge im Lineup-Editor

Neuer Icon-Export hinzufügen:
```tsx
import { Flag } from 'lucide-react'
export const CoachFlagIcon = (p: IconProps) => <Flag size={p.size ?? 14} className={p.className} />
```

### Lineup-Editor Coach-Badge-Integration

Neben jedem Lineup-Eintrag der ein Coach ist, kleines Pill-Badge anzeigen:

```tsx
{isCoachPosition && (
  <span className="inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5
    text-[9px] font-bold tracking-widest uppercase rounded-full
    bg-softball-red-100 text-softball-red-700">
    <CoachFlagIcon size={9} />
    {baseLabel /* "1B" | "3B" */}
  </span>
)}
```

**Logik:** Für jeden Lineup-Eintrag prüfen ob `entry.battingOrder` in `firstBaseCoachRotation` oder `thirdBaseCoachRotation` Paar ist → Badge anzeigen.

Falls Spieler beide Rollen hat (z.B. gleicher Spieler in beiden Paaren) → 2 Badges hintereinander.

### Recommendation-Logik

Beim Picker-Anzeigen: System empfiehlt das beste Paar basierend auf aktuellem Lineup.

**Scoring:**

```typescript
function scoreRotationPair(pair: CoachRotationPair, lineup: LineupEntry[]): number {
  let score = 100
  const positions = getPairPositions(pair)  // z.B. [3, 8] für POS_3_8

  for (const pos of positions) {
    const entry = lineup.find(e => e.battingOrder === pos)
    if (!entry) { score -= 40; continue }  // Lineup unvollständig

    // Wenn Position der Pitcher ist
    if (entry.position === 'P') score -= 50

    // Wenn Position Cleanup-Hitter (Pos 4 ist klassisch Cleanup)
    if (entry.battingOrder === 4) score -= 30
  }

  // Wrap-Around Paar leicht abgewertet (3+8, 4+9)
  if (pair !== 'POS_5_10') score -= 5

  return score
}
```

**Empfehlung-Markierung:**

```tsx
{recommendedPair === pair && (
  <span className="inline-flex items-center gap-0.5 ml-1">
    <StarIcon size={10} className="text-amber-500 fill-amber-500" />
    <span className="text-[8px] text-amber-700 font-bold">Empfohlen</span>
  </span>
)}
```

Tooltip beim Hover: "Empfohlen weil: Pos 8 ist kein Pitcher, Pos 5 + 10 sind moderate Hitter, keine Wrap-Logik."

Edge-Cases:
- Tie zwischen Paaren → 5+10 als Tiebreaker (Default)
- Alle Paare niedriger Score (z.B. <40) → 5+10 + Warning "Lineup hat keine ideale Coach-Konstellation"

## PDF

### Wo

- **`generatePdf`** (basic Lineup, `frontend/src/utils/pdfExport.ts`): Rotation-Block inline in Staff-Section (Content-Breite 100mm).
- **`generateLineupWithFieldPdf`** (Aufstellungs-PDF mit Feld): Rotation-Block **oberhalb** des Lineup+Field-Blocks, **volle Page-Breite (190mm)** für maximale Lesbarkeit im Feld-Einsatz.
- **`generateScoringPdf`** (Scoring-Sheet): Rotation-Block in Header (volle Breite).

### Layout (PDF, identisch zur App-Compact-Variant)

```
3B-COACH ROTATION · POS 5 + 10
═════════════════════════════════════════════════
┌──────────────────────────┬──────────────────────────┐
│  SCHLAG 1 – 5            │  SCHLAG 6 – 10           │
│                          │                          │
│  TRISTAN (Pos 10)        │  MIKE (Pos 5)            │
└──────────────────────────┴──────────────────────────┘
Warmup: Mike #3-4 · Tristan #8-9
═════════════════════════════════════════════════
```

### jsPDF Code-Pattern

```typescript
function drawCoachRotationBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  pair: CoachRotationPair,
  lineup: LineupEntryResponse[],
  baseLabel: '1B' | '3B',
): number {
  const { higher, lower } = resolveRotation(pair, lineup)

  // Eyebrow
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(200, 46, 46)  // softball-red-600
  doc.setCharSpace(1.2)
  doc.text(`${baseLabel}-COACH ROTATION · POS ${pair.replace('POS_', '').replace('_', ' + ')}`, x, y)
  doc.setCharSpace(0)
  y += 4

  // 2-Block: linker Block (rot-getönt) + rechter Block (cream)
  const half = w / 2
  const blockH = 16

  doc.setFillColor(252, 234, 234)  // softball-red-50
  doc.rect(x, y, half, blockH, 'F')

  doc.setFillColor(248, 244, 232)  // cream-100
  doc.rect(x + half, y, half, blockH, 'F')

  doc.setDrawColor(30, 41, 59)  // navy
  doc.setLineWidth(0.4)
  doc.line(x + half, y, x + half, y + blockH)

  // Linker Block-Header (rot) — höhere Position coacht "vorderen" Lineup-Teil
  doc.setFontSize(7)
  doc.setTextColor(160, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.5)
  doc.text(`SCHLAG ${higher.range}`, x + 2, y + 4)
  doc.setCharSpace(0)
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(higher.name, x + 2, y + 10)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`Pos ${higher.pos}`, x + 2, y + 14)

  // Rechter Block-Header (navy-grau) — niedrigere Position coacht "hinteren" Lineup-Teil
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.5)
  doc.text(`SCHLAG ${lower.range}`, x + half + 2, y + 4)
  doc.setCharSpace(0)
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(lower.name, x + half + 2, y + 10)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`Pos ${lower.pos}`, x + half + 2, y + 14)

  y += blockH + 3

  // Warmup-Line
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 120, 120)
  doc.text(`Warmup: ${higher.name} ${higher.warmup}, ${lower.name} ${lower.warmup}`, x, y)
  y += 4

  return y
}
```

### Resolve-Funktion

```typescript
function resolveRotation(pair: CoachRotationPair, lineup: LineupEntryResponse[]) {
  // Jeder Coach coacht den Block der die Position des anderen enthält.
  // Warmup = letzte 2 Schlagmänner vor eigenem Schlag.
  const config = {
    POS_3_8:  { lower: 3, higher: 8, lowerRange: '4–8',  higherRange: '9–10, 1–3', lowerWarmup: '#1–#2', higherWarmup: '#6–#7' },
    POS_4_9:  { lower: 4, higher: 9, lowerRange: '5–9',  higherRange: '10, 1–4',   lowerWarmup: '#2–#3', higherWarmup: '#7–#8' },
    POS_5_10: { lower: 5, higher: 10, lowerRange: '6–10', higherRange: '1–5',      lowerWarmup: '#3–#4', higherWarmup: '#8–#9' },
  }[pair]

  const higherEntry = lineup.find(e => e.battingOrder === config.higher)
  const lowerEntry  = lineup.find(e => e.battingOrder === config.lower)

  return {
    // "higher" = Spieler mit höherer Lineup-Position
    higher: { name: higherEntry?.player.name ?? '—', pos: config.higher, range: config.higherRange, warmup: config.higherWarmup },
    // "lower" = Spieler mit niedrigerer Lineup-Position
    lower:  { name: lowerEntry?.player.name ?? '—',  pos: config.lower,  range: config.lowerRange,  warmup: config.lowerWarmup },
  }
}
```

### Layout-Constraints im PDF

- `generatePdf`: Coach-Section ~22mm tall pro Rotation → bei 2 Rotationen (10er-Modus) ~45mm pro Game → max 2 Games/Page möglich.
- `generateLineupWithFieldPdf`: Rotation-Block oberhalb des Lineup+Field (~22mm), volle Breite 190mm.
- `generateScoringPdf`: Header-Bereich, volle Breite.

## Tests

### Backend Unit-Tests

- `CoachRotationPairTest`:
  - `getHigherCoachRange` für jedes Paar
  - `getLowerCoachRange` für jedes Paar
  - `getHigherWarmup` / `getLowerWarmup`
  - Wrap-Around-Ranges sind korrekt (Paar 3+8 und 4+9)

- `GameServiceTest`:
  - `setCoachRotation_storesValues`
  - `setCoachRotation_clearsOnStaffSet`
  - `addStaff_clearsRotation`
  - `getGame_returnsRotationFields`

### Backend Integration-Tests

- `GameIntegrationTest.coachRotation_persists` — PUT + GET roundtrip
- `GameIntegrationTest.staffOverridesRotation` — Setzen von Staff löscht Rotation
- Migration läuft sauber — neue Spalten existieren, NULL erlaubt

### Frontend Vitest

- `CoachSlots.test.tsx`:
  - Picker erscheint nur wenn Coach-Slot leer
  - Pill-Click triggert API-Call
  - Disabled wenn Lineup < 10
  - 2-Block zeigt korrekte Spieler-Namen
  - Warmup-Line zeigt korrekte Ranges
  - Recommendation-Star markiert das beste Paar
- `LineupEditor.test.tsx`:
  - Coach-Badge erscheint neben Pos der im Rotation-Paar ist
  - Bei 2 Rollen für selben Spieler → 2 Badges
- `coachRotationScoring.test.ts` (neue Util-Datei):
  - Score-Berechnung — Pitcher auf Pos im Paar → niedriger
  - Score-Berechnung — Cleanup-Hitter auf Pos 4 → niedriger
  - Tiebreaker — bei gleichem Score 5+10 gewinnt
  - Edge: alle Paare schlecht → 5+10 + Warning
- `pdfExport.test.ts`:
  - `resolveRotation` für alle 3 Paare
  - Wrap-Around-Ranges sind korrekt
  - `drawCoachRotationBox` rendert Header + Blocks (Spy-based)

### E2E (Playwright, optional)

- Game-Setup → Coach-Slot leer → Rotation wählen → Aufstellungs-PDF exportieren → verifiziere PDF enthält "ROTATION"

## Risiken & Trade-offs

| Risiko | Mitigation |
|---|---|
| GameResponse Record-Order-Change könnte Frontend brechen | Frontend deserialisiert by-name via Jackson → keine Position-Abhängigkeit |
| `@Enumerated(EnumType.STRING)` speichert Enum-Name | Umbenennung später erfordert Migration — Enum-Namen sind stabil gewählt |
| Lineup < 10 → Rotation nicht sinnvoll | UI disabled mit Hint, PDF rendert "—" für leere Backup-Position |
| Spielbogen-Workflow unberührt | Feature gilt nur für Legacy-ScoringPage-Games via `Game.coachRotation` |

## Open Questions

Keine.

## Decision Log

- **Schema B (Halbe-Lineup-Split) gewählt** statt Primary+Backup oder Inning-Alternation: fair (50/50), eingebautes 4-Schlagmänner-Warmup, kontinuierliche Coach-Segments, einfach zu kommunizieren.
- **3 fest definierte Paare** (3+8, 4+9, 5+10) statt frei wählbare Positionen: alle 5 Plätze auseinander → vermeidet Batter/On-Deck-Overlap, Default-Auswahl reicht für 95% der Fälle.
- **PDF Full-Breite in `generateLineupWithFieldPdf` Header** statt in Lineup-Col: 190mm vs 70mm → maximale Lesbarkeit im Feld-Einsatz.
- **App Compact-Variant ohne 10-Cell-Strip**: Strip war redundant zur 2-Block-Info, drei Visualisierungen für gleiche Info überfrachtet.
- **Default-Paar 5+10**: einziges Paar ohne Wrap-Around, mathematisch sauberer Split.
- **Custom-Icons via `src/icons/index.tsx`** statt Unicode-Emojis: konsistent mit existing Codebase (CLAUDE.md no-icon-library Convention).
- **Recommendation-Engine basiert auf Lineup-Positionen-Profile** (Pitcher, Cleanup-Hitter): hilft User ohne ihn zu zwingen — manuelles Override jederzeit möglich.
