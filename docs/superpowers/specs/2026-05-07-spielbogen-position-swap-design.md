# Spielbogen Position-Swap — Design

## Context

Im laufenden Softball-Spiel tauschen Spieler ihre Defensive-Positionen ohne Spieler-Wechsel — z.B. Pitcher↔Catcher, oder Ringtausch unter mehreren Fieldern. Aktuell:

- `SpielbogenSlotService.updateSlot()` mutiert `position` in-place ohne History.
- Substitution-Flow trackt nur Player-Wechsel (kein Position-Tracking).
- Spielbogen-PDF zeigt nur aktuelle Position — vergangene Wechsel verloren.
- Keine atomare Multi-Slot-Update (Race bei Ringtausch).

User-Bedarf: Position-Wechsel kommt "paar mal" pro Spiel vor und soll im RFL-Bogen rekonstruierbar sein (Inning-getrackt + Display).

Ziel: Feature analog zu `SpielbogenSubstitution`, das Position-Wechsel pro Slot+Inning persistiert und im Sheet/PDF darstellt.

## Approach

**Per-slot Position-Change-Records mit Group-ID** (Mischung aus Substitution-Pattern + Atomic-Grouping).

Jeder Slot-Position-Wechsel wird als eigene Row gespeichert. Multi-Slot-Swaps (Tausch P↔C, Ringtausch) werden via gemeinsame `groupId` (UUID) zusammengefasst und in einer Transaktion gespeichert. Frontend gruppiert Display per `groupId`.

**Warum nicht JSON-Array oder Join-Tabelle:** Flache Schema spiegelt Substitution exakt → minimaler Mental-Overhead, identische Adapter/Mapper/Repo-Struktur. Group-ID gibt atomare Semantik ohne Schema-Komplexität.

**Verworfen:**
- `JSON column with array of changes`: bricht Onion-Pattern, harder to query.
- `Single-record per swap with two slot FKs`: limitiert auf 2 Slots, kein Ringtausch.

## Components

### Backend

**Migration `V26__create_spielbogen_position_change.sql`:**
```sql
CREATE TABLE spielbogen_position_change (
  id BIGSERIAL PRIMARY KEY,
  bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
  slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
  side VARCHAR(10) NOT NULL,
  inning INT NOT NULL,
  group_id VARCHAR(36) NOT NULL,
  old_position VARCHAR(8),
  new_position VARCHAR(8),
  created_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_spielbogen_poschg_bogen_side ON spielbogen_position_change(bogen_id, side);
CREATE INDEX idx_spielbogen_poschg_group ON spielbogen_position_change(group_id);
```

**Domain Layer:**
- `domain/model/SpielbogenPositionChange.java` — Felder analog `SpielbogenSubstitution`, plus `groupId: String`, `oldPosition: String`, `newPosition: String` (statt playerInName/Out).
- `domain/port/out/SpielbogenPositionChangeRepository.java` — Interface mit `findByBogenId`, `findByGroupId`, `save`, `deleteByGroupId`.

**Adapter Layer (mirror Substitution):**
- `adapter/out/persistence/entity/SpielbogenPositionChangeEntity.java`
- `adapter/out/persistence/repository/SpringSpielbogenPositionChangeRepository.java`
- `adapter/out/persistence/mapper/SpielbogenPositionChangeMapper.java`
- `adapter/out/persistence/adapter/SpielbogenPositionChangeRepositoryAdapter.java`
- `adapter/dto/SpielbogenPositionChangeResponse.java`
- `adapter/dto/SpielbogenRecordPositionSwapRequest.java` — `{ side, inning, changes: List<SwapEntry> }` mit `SwapEntry { slotId, newPosition }`.

**Application Service:**
Neue Methode in `SpielbogenScoringService`:
```java
@Transactional
public List<SpielbogenPositionChange> recordPositionSwap(
    Long bogenId, BogenSide side, Integer inning,
    List<SwapEntry> changes
)
```
Validierung:
- Bogen ist LIVE, alle Slots gehören zu Bogen+Side.
- `newPosition` in `VALID_POSITIONS` (existing set in `SpielbogenSlotService`) oder null.
- Mindestens 1 Change.
- Kein Duplikat-Field-Position über alle Slots der Side nach Anwendung (außer EH oder null).
- Inning ≥ 1.

Logik: 1 UUID groupId generieren. Für jeden Change: alte Position aus Slot lesen, Slot aktualisieren, Change-Record speichern. Alles in 1 Transaktion.

**Controller:**
```
POST /api/spielbogen/{id}/position-swaps
Body: SpielbogenRecordPositionSwapRequest
Response: List<SpielbogenPositionChangeResponse>
```

**BogenSheetResponse Erweiterung:**
- Feld `positionChanges: List<SpielbogenPositionChangeResponse>` hinzufügen.
- `SpielbogenSheetService` lädt + füllt.

### Frontend

**Types** (`frontend/src/types/index.ts`):
- `SpielbogenPositionChangeResponse { id, bogenId, slotId, side, inning, groupId, oldPosition, newPosition, createdAt }`
- `SpielbogenRecordPositionSwapRequest { side, inning, changes: SwapEntry[] }`
- `SwapEntry { slotId, newPosition }`
- `BogenSheetResponse.positionChanges` ergänzen.

**API Client** (`frontend/src/api/client.ts`):
- `recordSpielbogenPositionSwap(bogenId, req): Promise<SpielbogenPositionChangeResponse[]>`

**Hook** (`frontend/src/hooks/useSpielbogenScoring.ts`):
- `recordPositionSwap(req)` — calls API, reloads sheet.

**UI: `PositionSwapDrawer.tsx`** (neu, mirror SubstitutionDrawer-Pattern):
- Props: `open`, `onClose`, `side`, `slots`, `currentInning`, `onSubmit`.
- Liste aller Slots der Side mit aktueller Position.
- Pro Slot: Dropdown für neue Position (= 'unverändert' / VALID_POSITIONS).
- Submit-Validierung: ≥1 changed, keine Duplikate (außer EH/null).
- Ring-Tausch funktioniert da User für jeden Slot einzeln neue Pos wählen kann.

**Page-Integration** (`SpielbogenPage.tsx`):
- State `showPositionSwapModal`.
- Handler `handlePositionSwapSubmit` → ruft Hook auf, schließt Modal, Toast.
- Wire in Drawer/Modal-Block.

**Action-Button** (`BogenActionButtons.tsx`):
- MEHR-Menu neuer Eintrag "Positionen tauschen" → `onPositionSwap` Prop.

**Sheet/PDF-Display** (`utils/bogenSheetRenderer.ts` + `spielbogenPdfExport.ts`):
- RFL-Konvention: Position-Nummer (1-9) statt Abkürzung, vertikal gestapelt. Original oben, Wechsel darunter.
- Mapping P=1, C=2, 1B=3, 2B=4, 3B=5, SS=6, LF=7, CF=8, RF=9. Helper-Funktion `positionToNumber()` in renderer.
- PDF: Original-Pos in Top-Slot der Pos-Cell. Bei Position-Change: neue Pos auf Sub-Linie 1 (45% rowH). Bei 2. Wechsel: Sub-Linie 2 (75% rowH).
- Inning wird intern getrackt (data integrity, audit) aber NICHT im Sheet gerendert — RFL-Konvention zeigt nur from→to vertikal.
- Web-Sheet: identisch zur PDF-Notation in Pos-Spalte.

### Tests

**Backend:**
- `SpielbogenScoringServiceTest`: recordPositionSwap basic 2-slot, 3-way ring, validation errors (bogen not LIVE, invalid position, duplicate field-pos, empty list).
- Integration test `PositionSwapIntegrationTest`: full POST → DB-state assert (slot positions updated + change-records exist mit gleichem groupId).

**Frontend:**
- Smoke-Test PositionSwapDrawer: Submit-Disabled wenn keine Änderung. Validierung Duplikat-Position zeigt Fehler.

## Out of Scope (V1)

- Undo/Korrektur einzelner Position-Changes (User kann Slot direkt via existing UpdateSlot editieren).
- Web-Sheet visuelle Position-History (nur PDF first).
- Multi-Inning-Bulk-Edit.
- Auto-Substitution: kein Auto-Switch wenn Position auf 'P' gesetzt (Pitcher-Change ist anderes Konzept).

## File Inventory

**Neu:**
- `backend/src/main/resources/db/migration/V26__create_spielbogen_position_change.sql`
- `backend/src/main/java/com/softball/domain/model/SpielbogenPositionChange.java`
- `backend/src/main/java/com/softball/domain/port/out/SpielbogenPositionChangeRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/SpielbogenPositionChangeEntity.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenPositionChangeRepository.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/mapper/SpielbogenPositionChangeMapper.java`
- `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenPositionChangeRepositoryAdapter.java`
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenPositionChangeResponse.java`
- `backend/src/main/java/com/softball/adapter/dto/SpielbogenRecordPositionSwapRequest.java`
- `backend/src/test/java/com/softball/integration/PositionSwapIntegrationTest.java`
- `frontend/src/components/spielbogen/PositionSwapDrawer.tsx`

**Modifiziert:**
- `backend/src/main/java/com/softball/application/SpielbogenScoringService.java` — recordPositionSwap-Methode + Repo-Injection
- `backend/src/main/java/com/softball/application/SpielbogenSheetService.java` — Load + Embed positionChanges in Response
- `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java` — neuer POST-Endpoint
- `backend/src/main/java/com/softball/adapter/dto/BogenSheetResponse.java` — positionChanges Field
- `backend/src/test/java/com/softball/service/SpielbogenScoringServiceTest.java` — Test-Cases
- `frontend/src/types/index.ts` — Types
- `frontend/src/api/client.ts` — API-Function
- `frontend/src/hooks/useSpielbogenScoring.ts` — recordPositionSwap
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — State + Handler + Drawer-Mount
- `frontend/src/components/spielbogen/BogenActionButtons.tsx` — MEHR-Menu-Entry
- `frontend/src/utils/spielbogenPdfExport.ts` — Pos-Cell-Sub-Linien mit Position-History befüllen
- `frontend/src/utils/bogenSheetRenderer.ts` — `computePositionHistoryPerSlot()` helper

## Verification

**Backend:**
1. `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest` — alle neuen Test-Cases grün.
2. `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=PositionSwapIntegrationTest` — Integration grün.
3. Lokal: `docker compose up -d db && ./mvnw spring-boot:run -s .mvn/local-settings.xml` — V26-Migration läuft fehlerfrei.

**Frontend:**
1. `cd frontend && npm run build` — TypeScript clean.
2. `npm run lint` — keine neuen Errors.

**E2E (manuell):**
1. Frische Spielbogen anlegen, lineup mit P/C/SS/3B aufstellen.
2. MEHR-Menu → "Positionen tauschen" → P↔C swappen, Inning 3, Save.
3. PDF-Export: Pos-Cell für P-Slot zeigt "1" oben + "2" auf Sub-Linie 1. C-Slot "2" oben + "1" Sub-Linie 1. Nach DB-Reload Slot-Positions persistiert.
4. Ring-Tausch P→C, C→SS, SS→P im Inning 5 — alle drei Records mit gleicher groupId, alle Slot-Positions aktualisiert, PDF zeigt vertikale Stapel.
5. Validierung: Versuche 2 Slots auf gleiche Position → 400 Error mit deutscher Message.
