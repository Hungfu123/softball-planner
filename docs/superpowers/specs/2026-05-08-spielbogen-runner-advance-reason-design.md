# Spielbogen Runner-Advance-Reason Annotation — Design

## Context

Im RFL-Bogen wird annotiert, **warum** ein Runner von Base X zu Y gelaufen ist — z.B. `BB` an Diamond-Seite zwischen 1B und 2B markiert "Forced Advance via Walk vom nächsten Batter". Aktuell:

- Backend speichert `baseStateAfter` (numerisch: welche slotIds auf welchen Bases) pro AB.
- **Keine semantische Annotation** für jeden Runner-Advance — Reason geht verloren.
- Frontend `HitAdjustSheet` lässt User pro Runner Advance setzen (Tap-Cycle), aber speichert nur die neue Position, nicht den Grund.
- DiamondCell-Renderer zeigt nur Batter's eigene AB-Notation. Vorherige Runner haben nichts auf ihrer Cell stehen.
- User-Beobachtung (Bilder #25, #27): handgeschriebene Bögen zeigen `1B`, `BB`, `HBP` etc. an Runner-Diamond-Seiten. Fehlt im digitalen Bogen.

Ziel: Pro Runner-Advance wird der Grund persistiert UND als kleine Annotation an der entsprechenden Diamond-Seite gerendert.

## Approach

**Per-Advance-Records mit Type-Enum** (analog SpielbogenSubstitution / SpielbogenPositionChange).

Bei jedem `recordAtBat` werden zusätzlich zu `baseStateAfter` die einzelnen Runner-Advances als separate Records gespeichert: pro Advance ein Eintrag mit `(abId, slotId, fromBase, toBase, reason)`. Frontend berechnet die Liste aus dem HitAdjustSheet-Output (oder Default-Logic) und schickt sie mit dem AB-Request.

Reason-Enum:
- `HIT_PUSH` — voluntary advance durch Batter's Hit (z.B. Runner 2B→3B nach Single).
- `BB_FORCE` — Force durch Walk (Batter walkt, Runner auf 1B muss zu 2B; runner 2B muss zu 3B falls 1B besetzt; etc.).
- `HBP_FORCE` — Force durch Hit-By-Pitch (analog BB).
- `FIELDERS_CHOICE` — Runner advance während Batter zur 1B läuft, anderer Runner aus.
- `ERROR` — Advance via Fielder-Error.
- `SAC` — Sacrifice-Bunt/Fly Advance.
- `WP` / `PB` — Wild-Pitch / Passed-Ball Advance (existiert schon als StealingEvent — könnte konvergieren).
- `STEAL` — über `SpielbogenStealingEvent` bereits abgedeckt (NICHT in dieser Tabelle).

**Verworfen:**
- **Inline-JSON auf AtBat-Row** — bricht normalisierung; query-unfreundlich für Renderer.
- **Compute-on-render aus baseStateBefore/After + AB-Result** — Reason-Disambiguation nicht möglich (BB-Force vs. voluntary).
- **Stealing-Tabelle wiederverwenden** — Semantik anders; Stealing ist eigenständige Aktion, Advance ist Side-Effect eines AB.

## Components

### Backend

**Migration `V27__create_spielbogen_runner_advance.sql`:**
```sql
CREATE TABLE spielbogen_runner_advance (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    at_bat_id BIGINT NOT NULL REFERENCES spielbogen_at_bat(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    from_base SMALLINT NOT NULL,
    to_base SMALLINT NOT NULL,
    reason VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT runner_advance_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT runner_advance_base_check CHECK (
        from_base BETWEEN 0 AND 3 AND to_base BETWEEN 1 AND 4 AND to_base > from_base
    )
);

CREATE INDEX idx_runner_advance_bogen_side ON spielbogen_runner_advance(bogen_id, side);
CREATE INDEX idx_runner_advance_atbat ON spielbogen_runner_advance(at_bat_id);
CREATE INDEX idx_runner_advance_slot ON spielbogen_runner_advance(slot_id);
```

`from_base=0` = Batter's Box (für Batter's eigene Reach via Hit). `to_base=4` = Home/Score.

**Domain:**
- `domain/model/SpielbogenRunnerAdvance.java` — Felder: id, bogen, atBat, slot, side, inning, fromBase, toBase, reason (enum), createdAt.
- `domain/model/RunnerAdvanceReason.java` — Enum (HIT_PUSH, BB_FORCE, HBP_FORCE, FIELDERS_CHOICE, ERROR, SAC, WP, PB).
- `domain/port/out/SpielbogenRunnerAdvanceRepository.java` — Methods: `findByBogenId`, `findByAtBatId`, `save`, `saveAll`, `deleteByAtBatId`.

**Adapter Layer (mirror SpielbogenSubstitution):**
- Entity, Mapper, Spring-Repo, Adapter.

**DTO-Erweiterungen:**
- `SpielbogenRecordAtBatRequest` (existing) bekommt neues Feld `runnerAdvances: List<RunnerAdvanceEntry>` mit `RunnerAdvanceEntry { slotId, fromBase, toBase, reason }`. Optional (kann leer sein).
- `SpielbogenAtBatResponse` bekommt `runnerAdvances: List<SpielbogenRunnerAdvanceResponse>`.
- `SpielbogenRunnerAdvanceResponse` — neue DTO.

**Service `recordAtBat`:**
- Nimmt zusätzlich `runnerAdvances` Liste entgegen.
- Persistiert AB → dann RunnerAdvance-Records via `runnerAdvanceRepo.saveAll()`.
- Validation:
  - Jede Entry: slotId existiert, gehört zu bogen+side.
  - fromBase < toBase, beide in 0..4.
  - reason ∈ enum.
- `undoLast` cascadiert via FK ON DELETE CASCADE → Records werden mitgelöscht.

**Default-Advance-Logic-Endpoint** (optional, V1 in scope):
Frontend kann `POST /api/spielbogen/{id}/compute-default-advances` schicken mit `{batterAB, baseStateBefore}` → Backend liefert default `runnerAdvances` zurück (Force-Logic). Pro:
- 1B (HIT): forced advance: 1B-runner → 2B (HIT_PUSH falls 1B besetzt). Andere stehen.
- 2B: 1B-runner → 3B oder Home (HIT_PUSH), 2B-runner → Home (HIT_PUSH), 3B-runner → Home (HIT_PUSH).
- 3B: alle Runner → Home.
- HR: alle Runner → Home + Batter → Home.
- BB/HBP: forced via FORCE-Logic. 1B-runner → 2B (BB_FORCE / HBP_FORCE) wenn 1B besetzt; 2B-runner → 3B nur wenn 1B+2B besetzt; 3B → Home nur wenn alle Bases besetzt.
- Out: keine default-Advances.

V1: **Frontend macht Default-Logic clientseitig** (keine neue Backend-Endpoint). Konsistent mit aktueller HitAdjustSheet-Tap-Logik. Backend nur speichert was Frontend sendet.

### Frontend

**Types** (`frontend/src/types/index.ts`):
```ts
export type RunnerAdvanceReason = 'HIT_PUSH' | 'BB_FORCE' | 'HBP_FORCE' | 'FIELDERS_CHOICE' | 'ERROR' | 'SAC' | 'WP' | 'PB'

export interface RunnerAdvanceEntry {
  slotId: number
  fromBase: number
  toBase: number
  reason: RunnerAdvanceReason
}

export interface SpielbogenRunnerAdvanceResponse extends RunnerAdvanceEntry {
  id: number
  atBatId: number
  side: BogenSide
  inning: number
  createdAt: string
}
```

`SpielbogenAtBatResponse` bekommt `runnerAdvances?: SpielbogenRunnerAdvanceResponse[]`.
`SpielbogenRecordAtBatRequest` bekommt `runnerAdvances?: RunnerAdvanceEntry[]`.

**Default-Logic Helper** (`frontend/src/utils/runnerAdvanceDefaults.ts`):
```ts
export function computeDefaultAdvances(
  abResult: AtBatResult,
  baseStateBefore: BogenBaseState,
  baseStateAfter: BogenBaseState
): RunnerAdvanceEntry[]
```
Pure function. Berechnet Force-Logik basierend auf AB-Result + diff zwischen before/after States. Liefert RunnerAdvanceEntry-Liste.

Beispiel: BB + 1B besetzt → 1B-runner forced → 2B (BB_FORCE).
Beispiel: 1B-Hit + Runner auf 2B → wenn baseStateAfter zeigt Runner-2B noch auf 2B → kein Advance. Wenn auf 3B → HIT_PUSH.

**HitAdjustSheet-Update** (`HitAdjustSheet.tsx`):
- Tap-Cycle pro Runner setzt `toBase` direkt.
- Beim Save: ruft `computeDefaultAdvances()` als Basis, dann adjusted basierend auf User-Tap-Cycle.
- Sendet `runnerAdvances` mit dem AB-Request.

**BB/HBP-Auto-Force** (`SpielbogenPage.tsx` recordAtBat-Path für Walk/HBP):
- Bei BB/HBP: aufrufen `computeDefaultAdvances()` automatisch, ohne User-Interaktion (Force ist eindeutig). Sendet runnerAdvances mit Walk/HBP-AB-Record.

**Sheet-Renderer** (`utils/bogenSheetRenderer.ts`):
- Neue Cell-Notation-Felder: `advanceLabels: { side: 'home-1b' | '1b-2b' | '2b-3b' | '3b-home'; label: string }[]`.
- Renderer mappt jeden RunnerAdvance auf den **Runner's eigene Cell** (nicht Batter's).
  - Beispiel: Batter macht 1B mit Runner-X auf 2B. Runner-X advanced 2B→3B mit reason=HIT_PUSH. Annotation `1B` (Batter's-Hit-Type) auf Runner-X's Cell, an Diamond-Seite zwischen 2B und 3B.
- Reason-zu-Label-Mapping:
  - HIT_PUSH → Batter's AB-result-label (1B/2B/3B/HR) — kontextuell, brauche AB-Outcome
  - BB_FORCE → "BB"
  - HBP_FORCE → "HBP"
  - FIELDERS_CHOICE → "FC"
  - ERROR → "E"
  - SAC → "SAC"
  - WP → "WP"
  - PB → "PB"

**DiamondCell-Render** (`DiamondCell.tsx` + PDF):
- Neuer SVG-Element-Loop für `advanceLabels`. Position der Labels:
  - `home-1b`: zwischen Home (30,50) und 1B (55,28) → midpoint (~42,39)
  - `1b-2b`: zwischen 1B (55,28) und 2B (30,6) → midpoint (~42,17)
  - `2b-3b`: zwischen 2B (30,6) und 3B (5,28) → midpoint (~17,17)
  - `3b-home`: zwischen 3B (5,28) und Home (30,50) → midpoint (~17,39)
- Font-Size klein (~4-5pt SVG, ~2.5pt PDF).
- Color: schwarz (matches CS/OUT consistency) oder reason-spezifisch.

### Tests

**Backend:**
- Service-Test: `recordAtBat_withRunnerAdvances_persistsAll`.
- Service-Test: `recordAtBat_invalidAdvance_throws` (z.B. fromBase >= toBase).
- Cascade-Test: `undoLast_deletesRunnerAdvances` (FK CASCADE).
- Integration: full POST mit runnerAdvances → DB-state assert.

**Frontend:**
- Unit-Tests für `computeDefaultAdvances`:
  - 1B + leere Bases → keine Advances (außer Batter's eigene Reach falls getrackt).
  - 1B + Runner auf 2B + advances zu 3B → HIT_PUSH 2→3.
  - BB + Runner auf 1B → BB_FORCE 1→2.
  - BB + Bases loaded → 3 BB_FORCE-Advances + Score (3→4 mit BB_FORCE).
  - 2B + Runner auf 1B + 3B → 2B-Hit-Push 1→2 oder 1→3 je nach decision; 3B-Runner Home.

## Out of Scope (V1)

- **Backend Default-Advance-Compute-Endpoint**: Frontend macht es lokal.
- **Auto-correction** wenn HitAdjustSheet User-Override widerspricht Force-Logic (z.B. User entfernt BB-Force-Advance manuell): keep User-decision, kein Hard-Block.
- **Migration vorhandener AtBats**: V27 fügt nur Tabelle hinzu. Existing ABs haben 0 RunnerAdvance-Records → Sheet rendert nur neue Annotations für ABs nach V27. Kein Backfill.
- **Stealing/WP/PB-Konvergenz**: bleiben als separate `SpielbogenStealingEvent`-Records. Nur AB-induzierte Advances werden in `runner_advance` gespeichert.

## File Inventory

**Neu (Backend):**
- `backend/src/main/resources/db/migration/V27__create_spielbogen_runner_advance.sql`
- `backend/src/main/java/com/softball/domain/model/SpielbogenRunnerAdvance.java`
- `backend/src/main/java/com/softball/domain/model/RunnerAdvanceReason.java`
- `backend/src/main/java/com/softball/domain/port/out/SpielbogenRunnerAdvanceRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenRunnerAdvanceEntity.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenRunnerAdvanceRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenRunnerAdvanceMapper.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenRunnerAdvanceRepositoryAdapter.java`
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenRunnerAdvanceResponse.java`

**Modifiziert (Backend):**
- `backend/src/main/java/com/softball/application/SpielbogenScoringService.java` — Inject + persistiere Advances + cascade-clean on undo.
- `backend/src/main/java/com/softball/application/SpielbogenSheetService.java` — Lade + embed `runnerAdvances` per AB.
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenRecordAtBatRequest.java` — `runnerAdvances` Field.
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenAtBatResponse.java` — `runnerAdvances` Field.
- `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java` — Pass-through advances param.
- Tests entsprechend.

**Neu (Frontend):**
- `frontend/src/utils/runnerAdvanceDefaults.ts` + Tests.

**Modifiziert (Frontend):**
- `frontend/src/types/index.ts`
- `frontend/src/api/client.ts` (recordAtBat sendet runnerAdvances)
- `frontend/src/hooks/useSpielbogenScoring.ts` (recordAtBat-Param erweitert)
- `frontend/src/components/spielbogen/HitAdjustSheet.tsx` (Tap-Cycle setzt advance-reason)
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` (BB/HBP auto-force)
- `frontend/src/utils/bogenSheetRenderer.ts` (computeAdvanceLabels per Cell)
- `frontend/src/components/spielbogen/DiamondCell.tsx` (Render advance-labels an Diamond-Seiten)
- `frontend/src/utils/spielbogenPdfExport.ts` (PDF: gleiche Annotations)

## Verification

**Backend:**
1. `cd backend && ./mvnw test -s .mvn/local-settings.xml` — alle Tests grün.

**Frontend:**
2. `cd frontend && npm run build && npm run lint` — clean.

**E2E (manuell):**
1. Bogen LIVE, Lineup mit ≥3 Spielern.
2. Batter-1: Walk (BB) → kein Runner → kein Advance-Record.
3. Batter-2: Walk → Runner-1 forced → 2B (BB_FORCE). Annotation "BB" auf Runner-1's Cell, Diamond-Seite 1B-2B.
4. Batter-3: 1B Single. HitAdjustSheet öffnet, User pushed Runner-2 zu 3B. Save.
5. Sheet/PDF: Runner-2's Cell zeigt "1B" zwischen 2B und 3B (Reason HIT_PUSH, label vom Batter's hit).
6. 3B Triple: alle Runner Home. Annotation "3B" auf jedem Runner's Diamond-Seite home-bound.
7. Validation: invalide fromBase=2, toBase=2 → Backend 400.
