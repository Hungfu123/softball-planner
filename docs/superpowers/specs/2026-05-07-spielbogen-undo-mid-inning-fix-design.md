# Spielbogen Undo Mid-Inning Fix — Design

## Context

**Bug:** Wenn auf der aktuellen Seite **nur ein Stealing-Event** (z.B. CS) aufgenommen wurde — aber noch keine AB — und User "Undo" klickt, wird stattdessen die letzte AB der **vorherigen Side/Inning** rückgängig gemacht. Der Bogen springt zurück in die andere Inning-Hälfte.

**Root Cause** (`SpielbogenPage.tsx:251`):
```ts
const lastAtBat = allAtBats.length > 0
  ? allAtBats.reduce((a, b) => a.sequence > b.sequence ? a : b)
  : null
```
- `lastAtBat` = AB mit max sequence über **beide Sides**.
- Stealing-Events haben **keine** sequence (eigene Tabelle).
- `LastAtBatPreview` ruft `onUndo(lastAtBat.side)` auf.
- Bei AWAY-mid-inning mit 1 stealing-out, `lastAtBat` = HOME's letzte AB (vorheriges Inning, war 3rd-Out → trigger Auto-Switch).
- Backend `undoLast(side=HOME)` → löscht HOME 3rd-Out → reverten Side+Inning zur HOME-Hälfte.

**User-Erfahrung:** "Seitenwechsel zurück, undo hat eine fremde Inning-Hälfte verändert."

**Zusatz-Bedarf:** Stealing-Events sind aktuell nicht via Undo-Button rückgängig machbar. User muss Stealing löschen via separatem Drawer/Edit. Konsistente Undo-Erfahrung wäre besser.

## Approach

**Latest-Event-aware Undo: berücksichtige AB UND Stealing-Events, scope auf currentSide+currentInning.**

1. Frontend bestimmt "letzte Aktion auf aktueller Side+Inning" durch Vergleich der **chronologisch jüngsten** AB (createdAt) UND Stealing-Event (createdAt).
2. Bei Klick auf Undo:
   - Wenn letzte Aktion = Stealing → `deleteStealingEvent(eventId)` API call.
   - Wenn letzte Aktion = AB → `undoLastSpielbogenAtBat(currentSide)` API call.
   - Wenn nichts auf currentSide+inning vorhanden → Button disabled.
3. Backend `undoLast` validiert: passed-`side` muss = `bogen.currentSide`. Sonst 400-Fehler. Schützt gegen abenteuerliche Frontend-Calls.

Auto-Switch-Revert-Logik bleibt erhalten — sie ist korrekt für den Fall "User undoes 3rd-Out direkt nach Switch". Mit Frontend-Fix kommt dieser Fall nur noch zustande, wenn currentSide tatsächlich der Side der 3rd-Out-AB ist (heißt: User klickt vor frontend-reload — aber nach Auto-Switch ist currentSide neu, also `undoneSide=HOME, currentSide=AWAY` würde Backend-Validierung treffen).

**Anpassung Auto-Switch-Revert:** Wenn `findLatestForSide(currentSide)` keine AB findet (Side hat noch nichts gemacht im aktuellen Inning), Backend muss erlauben dass User auf das **vorige Inning derselben Side** ausweicht. → ALTE 3rd-Out-AB undo bleibt möglich. Aber: nur wenn der vorhergehende Switch automatisch passierte. Indikator: aktuelle Side hat 0 ABs UND 0 Stealings im aktuellen Inning. Dann findet Backend ältere AB derselben Side via `findLatestForSide(side)`, deren Inning < currentInning ist. Logik wie bisher revert.

**Verworfen:**
- **Backend ignoriert side-Param, undoes absolute-latest AB**: löst Stealing-Bug nicht (latest AB ist immer noch fremde 3rd-Out AB).
- **Undo-Button immer disabled bei Stealing-Last**: User-unfreundlich, Stealing-Undo ist legitim.
- **Stealing-Events bekommen sequence-Field**: invasiv, betrifft Schema + Renderer + alle Tests.

## Components

### Backend

**Neue Domain-Service-Methode** `SpielbogenScoringService.deleteLastStealingForSide(bogenId, side)`:
```java
@Transactional
public void deleteLastStealingForSide(Long bogenId, BogenSide side) {
    requireLive(bogenId);
    SpielbogenStealingEvent latest = stealingRepo.findLatestForBogenIdAndSide(bogenId, side)
        .orElseThrow(() -> new BusinessValidationException("Kein Stealing-Event zum Rückgängigmachen"));
    stealingRepo.deleteById(latest.getId());
    log.info("Spielbogen {} Stealing-Undo: Event id={} side={} gelöscht", bogenId, latest.getId(), side);
}
```

**Neue Repo-Port-Methode** `SpielbogenStealingRepository.findLatestForBogenIdAndSide(Long, BogenSide): Optional<SpielbogenStealingEvent>`. Adapter implementiert via `SpringSpielbogenStealingRepository.findFirstByBogen_IdAndSideOrderByIdDesc(Long, String)`.

**Neuer Controller-Endpoint:**
```
POST /api/spielbogen/{id}/at-bats/last-stealing/undo?side={HOME|AWAY}
→ 204 No Content
```

(Endpoint-Naming könnte besser sein. Alternative: `DELETE /api/spielbogen/{id}/stealing/last?side=HOME`. Wähle `DELETE` für REST-Klarheit.)

**Validation-Update in `undoLast`:** Neue Vorprüfung:
```java
if (side != bogen.getCurrentSide()) {
    SpielbogenAtBat latestSide = atBatRepo.findLatestForSide(bogenId, side).orElse(null);
    if (latestSide == null || !latestSide.getInning().equals(bogen.getCurrentInning() - 1)) {
        throw new BusinessValidationException("Undo nur für aktuelle Side oder direkten Auto-Switch-Vorgänger erlaubt");
    }
}
```
Schützt vor falscher Side-Übergabe vom Frontend.

### Frontend

**Hook-Funktion** in `useSpielbogenScoring.ts`:
```ts
const undoLastStealing = useCallback(async (side: BogenSide) => {
  await api.deleteLastSpielbogenStealing(bogenId, side)
  await reload()
}, [bogenId, reload])
```

**API-Client** in `client.ts`:
```ts
export async function deleteLastSpielbogenStealing(bogenId: number, side: BogenSide): Promise<void> {
  await request<void>(`/spielbogen/${bogenId}/stealing/last?side=${side}`, { method: 'DELETE' })
}
```

**SpielbogenPage.tsx Undo-Logic:**
```ts
// Latest action on current side + current inning (AB or Stealing)
const currentSideAtBatsInInning = atBats.filter(ab => ab.side === currentSide && ab.inning === meta.currentInning)
const currentSideStealingsInInning = sheet.stealingEvents.filter(s => s.side === currentSide && s.inning === meta.currentInning)
const latestAB = currentSideAtBatsInInning.reduce<SpielbogenAtBatResponse | null>(
  (max, ab) => !max || new Date(ab.createdAt) > new Date(max.createdAt) ? ab : max, null)
const latestStealing = currentSideStealingsInInning.reduce<SpielbogenStealingResponse | null>(
  (max, s) => !max || new Date(s.createdAt) > new Date(max.createdAt) ? s : max, null)

const latestAction: { type: 'AB' | 'STEALING'; side: BogenSide } | null =
  latestAB && latestStealing
    ? (new Date(latestAB.createdAt) > new Date(latestStealing.createdAt)
        ? { type: 'AB', side: currentSide }
        : { type: 'STEALING', side: currentSide })
    : latestAB
      ? { type: 'AB', side: currentSide }
      : latestStealing
        ? { type: 'STEALING', side: currentSide }
        : null
```

Edge-Case: keine Action auf currentSide+inning → User möchte vermutlich vorigen Switch-Trigger undo. Fallback: **wenn nichts auf currentSide+currentInning → erlaubt undo der letzten AB beider Sides (Auto-Switch-Revert-Pfad)**. Damit klappt der existierende Use-Case "Undo direkt nach 3rd-Out".

```ts
const undoTarget: 'AB_CURRENT' | 'STEALING_CURRENT' | 'AB_PREVIOUS' | null = ...
// PreviousAB = global lastAtBat falls currentSide+inning leer
```

Undo-Handler:
```ts
const handleUndo = async () => {
  if (!undoTarget) return
  if (undoTarget === 'STEALING_CURRENT') await undoLastStealing(currentSide)
  else if (undoTarget === 'AB_CURRENT') await undoLast(currentSide)
  else if (undoTarget === 'AB_PREVIOUS') await undoLast(globalLastAtBat.side)
  toast.show('Letzte Aktion rückgängig', 'success')
}
```

`LastAtBatPreview` Prop `onUndo` ändert von `(side: BogenSide) => Promise<void>` zu `() => Promise<void>` (Page weiß bereits welche Aktion). Disabled-State via Prop `disabled: boolean`.

### Tests

**Backend (Service):**
- `deleteLastStealingForSide_basicCase` — happy path: stealing existiert, wird gelöscht.
- `deleteLastStealingForSide_noEvent_throws` — keine stealing für side.
- `undoLast_wrongSide_throws` — passed side ≠ current und nicht auto-switch-Vorgänger.
- Existing `undoLast` tests müssen weiter funktionieren.

**Frontend (Smoke):**
- `SpielbogenPage` undo-button-disabled wenn weder AB noch Stealing auf currentSide+inning UND globalLastAtBat null.

## Out of Scope (V1)

- **Multi-Step-Undo** (Z.B. CTRL+Z mehrfach für mehrere Undo's): jede Undo-Aktion separat, kein History-Stack.
- **Undo nach `correctLastAtBat`** (Korrektur): bleibt wie aktuell, undo löscht trotzdem die korrigierte AB.
- **Stealing-Undo bei Auto-Switch-Revert**: wenn ein Stealing-Event 3rd-Out triggerte, aktueller Pfad löscht zwar das Event, aber Auto-Switch-Revert greift NICHT (nur AB-Outs reverten Side+Inning). Manuell via `setCurrentSide` Endpoint nachbessern. Edge-Case selten.
- **History-Visualisierung** (welche Aktionen kamen zuletzt): kein Drawer mit Liste. Nur Single-Action-Undo via existing `LastAtBatPreview`.

## File Inventory

**Modifiziert (Backend):**
- `backend/src/main/java/com/softball/domain/port/out/SpielbogenStealingRepository.java` — neue Methode `findLatestForBogenIdAndSide`.
- `backend/src/main/java/com/softball/adapter/out/persistence/adapter/SpielbogenStealingRepositoryAdapter.java` — Adapter-Impl.
- `backend/src/main/java/com/softball/adapter/out/persistence/repository/SpringSpielbogenStealingRepository.java` — JPA-Method.
- `backend/src/main/java/com/softball/application/SpielbogenScoringService.java` — `deleteLastStealingForSide` + Validation in `undoLast`.
- `backend/src/main/java/com/softball/adapter/in/web/SpielbogenController.java` — DELETE-Endpoint.
- `backend/src/test/java/com/softball/application/SpielbogenScoringServiceTest.java` — Test-Cases.

**Modifiziert (Frontend):**
- `frontend/src/api/client.ts` — `deleteLastSpielbogenStealing` Function.
- `frontend/src/hooks/useSpielbogenScoring.ts` — `undoLastStealing` Hook + return.
- `frontend/src/components/spielbogen/SpielbogenPage.tsx` — `latestAction`-Logic + `handleUndo`-Handler. Undo-Button-Disabled-State.
- `frontend/src/components/spielbogen/LastAtBatPreview.tsx` — `onUndo: () => Promise<void>` (Side-Param raus), `disabled`-Prop hinzu.

## Verification

**Backend:**
1. `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielbogenScoringServiceTest` — neue Tests grün, existing grün.

**Frontend:**
2. `cd frontend && npm run build` — TypeScript clean.
3. `npm run lint` — keine neuen Errors.

**E2E (manuell):**
1. Spielbogen LIVE öffnen, beide Sides Lineup haben.
2. AWAY-Side: 3 Outs accumulieren bis Auto-Switch zu HOME.
3. HOME-Side: 1 Stealing-Event (CS) recordieren. AB-Counter bleibt 0, aber Out-Counter zeigt 1.
4. Klick Undo → erwartet: **Stealing-Event** wird gelöscht, KEIN Side-Switch zurück zu AWAY.
5. Erneut Undo bei leerer HOME-Side+Inning → erwartet: undoes AWAY's 3rd-Out, side-revert zu AWAY.
6. AB recorden, dann Undo → erwartet: AB gelöscht, gleicher Side+Inning bleibt.
