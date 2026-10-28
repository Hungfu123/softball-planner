# Spieler-Ansicht und Base-Coach-Regel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spieler sehen in der App Feld, Schlagreihenfolge, Base Coaches und Bank — sobald die Aufstellung freigegeben ist oder am Spieltag die 7 Uhr vorbei sind; die Coach-Rotation wird durch die Regel „die letzten beiden Aus" ersetzt.

**Architecture:** Das Backend entscheidet, **wer** coacht (neuer Domänendienst, ausgeliefert über den bereits abgesicherten Sammelendpunkt `GET /gamedays/{id}/lineups`) und **ob** die Aufstellung sichtbar ist (eine Lage-Enum am `GameDayResponse`, berechnet mit einsetzbarer `Clock` in `Europe/Berlin`). Das Frontend zeichnet nur: eine Formatierfunktion macht aus der Auskunft einen Satz, den PDF und Spieler-Ansicht gleichlautend benutzen. `CoachRotationPair` und alles, was daran hängt, fällt ersatzlos.

**Tech Stack:** Java 21 / Spring Boot 3.4.3 / Flyway / Testcontainers-PostgreSQL; React 19 / TypeScript / Vite / Tailwind v4 / Vitest / Playwright / jsPDF.

**Spec:** `docs/superpowers/specs/2026-10-28-spieler-ansicht-und-base-coach-design.md`

**Branch:** Dieser Plan setzt auf `feature/aufstellung-freigeben` auf (V73, `AufstellungSichtbarkeit`, `FreigabeLeiste`, `aufstellungsauskunft.ts`). Der Arbeitsbranch wird **von dort** abgezweigt, nicht von `master`.

## Global Constraints

- **Maven immer mit `-s .mvn/local-settings.xml`.** `~/.m2/settings.xml` ist ein Firmen-Nexus und wird nicht angefasst.
- **Kein `git add -A`** — nur gezielt per Pfad stagen.
- **Kein `Co-Authored-By`** in Commits.
- **Keine neue Feldgeometrie.** Es gibt drei (`playmaker/board/geometry.ts`, `planner/FieldView.tsx:12`, `utils/pdfExport.ts:37`); die Spieler-Ansicht benutzt `FieldView`.
- **Neue UI nimmt Tokens** (`surface`/`ink`/`line`/`accent`/`spotlight`/`band`), nicht `bg-cream-50`/`text-navy-900`.
- **Die Zeitzone des Containers wird NICHT gestellt.** Die 7 Uhr werden an einer einzigen Stelle ausdrücklich in `Europe/Berlin` gerechnet.
- **Coach-Satz: rund 28 Zeichen**, eine Zeile, gleichlautend auf PDF und in der App.
- **Die Base-Coach-Prüfung in `GameStaffService.validate` bleibt unverändert** — nur wer nicht schlägt (Bank oder DH-Host) darf Coach sein; der DH-Batter nicht.
- **Vor jedem Commit:** `cd frontend && npm run build` und `cd backend && ./mvnw test -s .mvn/local-settings.xml`.
- **Kein Push, kein Merge nach `master`** — das löst Auto-Deploy aus und gehört dem Betreiber.
- **Keine Vorschau für den Trainer.** Er kann die Spieler-Ansicht nicht öffnen, und das bleibt so (Begründung im Entwurf).
- **Kein Rückblick.** Die Spieler-Ansicht zeigt den nächsten Spieltag und nur den.
- **Keine Benachrichtigung, kein Teilen-Link, keine Auswechslungen** in der Spieler-Ansicht.

## Review Focus

1. **07:00-Grenze bei UTC-Container.** 06:59 und 07:01 Berliner Zeit, je einmal im Sommer (UTC+2) und im Winter (UTC+1) — die Antwort darf nicht an der Containerzone hängen. Test in Task 7.
2. **Scorer am falschen Tag.** Ein Scorer bekommt für einen künftigen, nicht freigegebenen Spieltag eine leere Aufstellung; für den heutigen auch vor 7 Uhr die volle. Test in Task 7.
3. **Zu kurze oder voll benannte Aufstellung.** Weniger als zwei Einträge, oder beide Bases benannt — keine Coach-Zeile, kein `#undefined`, kein Absturz. Tests in Task 1 und Task 3.
4. **Altes Lineup-Set nach dem Rückbau.** Ein vor V74 gespeichertes Set lässt sich anwenden, obwohl die Rotationstabelle weg ist. Test in Task 6.
5. **Netzfehler gegen „steht noch nicht".** Fällt der Abruf aus, sagt die Spieler-Ansicht „nicht erreichbar" und nicht „die Aufstellung steht noch nicht". Test in Task 11.

---

## Dateien

**Neu**
- `backend/.../domain/service/BaseCoachRegel.java` — wer coacht, rein fachlich
- `backend/.../adapter/dto/BaseCoachResponse.java`
- `backend/.../domain/model/AufstellungsLage.java`
- `backend/.../shared/config/ZeitConfig.java` — `Clock`-Bean
- `backend/.../resources/db/migration/V74__drop_coach_rotation.sql`
- `frontend/src/utils/baseCoachSatz.ts` — die eine Formatierung
- `frontend/src/components/dashboard/Aufstellungsansicht.tsx` — die Spieler-Ansicht

**Geändert**
- `AufstellungSichtbarkeit.java`, `GameDayResponse.java`, `GameDayLineupsResponse.java`, `GameDayController.java`, `GameDayService.java`
- `GameStaffService.java` (nur `clearRotationForFilledStaffSlots` raus)
- `FieldView.tsx` (Tokens, Hervorhebung), `FreigabeLeiste.tsx`, `PlayerDashboard.tsx`, `LineupSheet.tsx`, `pdfExport.ts`, `client.ts`, `types/index.ts`

**Gelöscht**
- Backend: `CoachRotationPair.java` (+Test), `LineupSetGameRotation.java`, `LineupSetGameRotationEntity.java`, `LineupSetGameRotationResponse.java`, `SetCoachRotationRequest.java`
- Frontend: `utils/coachRotation.ts` (+Test), `utils/aufstellungsauskunft.ts`

---

### Task 1: `BaseCoachRegel` — wer coacht

**Files:**
- Create: `backend/src/main/java/com/softball/domain/service/BaseCoachRegel.java`
- Test: `backend/src/test/java/com/softball/domain/service/BaseCoachRegelTest.java`

**Interfaces:**
- Consumes: `LineupEntry` (`getBattingOrder()`, `getPlayer()`), `GameStaff` (`getRole()`, `getPlayer()`), `StaffRole.BASE_COACH_1ST` / `BASE_COACH_3RD`
- Produces: `record BaseCoachAuskunft(String ersteBase, String dritteBase, List<Integer> startSchlagplaetze)` und `static BaseCoachAuskunft fuer(List<LineupEntry> lineup, List<GameStaff> staff)`

Die Regel: benannte Coaches gewinnen. Für jede **nicht** benannte Base liefert `startSchlagplaetze` einen Schlagplatz, von unten gezählt — zwei unbenannte Bases ergeben die untersten zwei, aufsteigend sortiert; eine ergibt den untersten; keine ergibt eine leere Liste. Hat die Aufstellung weniger Einträge als gebraucht, kommen nur so viele Plätze wie vorhanden.

- [ ] **Step 1: Write the failing tests**

```java
@Test void beideBasesUnbenannt_liefertDieUnterstenZwei() {
    var auskunft = BaseCoachRegel.fuer(lineup(10), List.of());
    assertThat(auskunft.ersteBase()).isNull();
    assertThat(auskunft.dritteBase()).isNull();
    assertThat(auskunft.startSchlagplaetze()).containsExactly(9, 10);
}

@Test void neunerAufstellung_liefertAchtUndNeun() {
    assertThat(BaseCoachRegel.fuer(lineup(9), List.of()).startSchlagplaetze()).containsExactly(8, 9);
}

@Test void eineBaseBenannt_liefertNurDenUntersten() {
    var auskunft = BaseCoachRegel.fuer(lineup(10), List.of(staff(StaffRole.BASE_COACH_1ST, "Jan")));
    assertThat(auskunft.ersteBase()).isEqualTo("Jan");
    assertThat(auskunft.dritteBase()).isNull();
    assertThat(auskunft.startSchlagplaetze()).containsExactly(10);
}

@Test void beideBasesBenannt_keineSchlagplaetze() {
    var auskunft = BaseCoachRegel.fuer(lineup(10), List.of(
        staff(StaffRole.BASE_COACH_1ST, "Jan"), staff(StaffRole.BASE_COACH_3RD, "Mike")));
    assertThat(auskunft.startSchlagplaetze()).isEmpty();
}

@Test void leereAufstellung_liefertNichts() {
    var auskunft = BaseCoachRegel.fuer(List.of(), List.of());
    assertThat(auskunft.ersteBase()).isNull();
    assertThat(auskunft.startSchlagplaetze()).isEmpty();
}

@Test void einEintrag_eineBaseBenannt_liefertGenauEinenPlatz() {
    var auskunft = BaseCoachRegel.fuer(lineup(1), List.of(staff(StaffRole.BASE_COACH_1ST, "Jan")));
    assertThat(auskunft.startSchlagplaetze()).containsExactly(1);
}

@Test void einEintrag_beideUnbenannt_liefertNurDiesenEinen() {
    assertThat(BaseCoachRegel.fuer(lineup(1), List.of()).startSchlagplaetze()).containsExactly(1);
}

@Test void unsortierteEintraege_zaehlenNachBattingOrder() {
    assertThat(BaseCoachRegel.fuer(lineupGemischt(1, 7, 4, 10, 2), List.of()).startSchlagplaetze())
        .containsExactly(7, 10);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BaseCoachRegelTest`
Expected: FAIL — `BaseCoachRegel` existiert nicht.

- [ ] **Step 3: Implement `BaseCoachRegel.fuer(List<LineupEntry>, List<GameStaff>)` in `domain/service/BaseCoachRegel.java`**

Reines Domänenklassen-Idiom des Hauses: `final class`, privater Konstruktor, statische Methode, kein Spring, kein JPA. Das verschachtelte `record BaseCoachAuskunft` liegt in derselben Datei.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BaseCoachRegelTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/BaseCoachRegel.java \
        backend/src/test/java/com/softball/domain/service/BaseCoachRegelTest.java
git commit -m "✨ Wer coacht: die letzten beiden Aus statt Rotationspaar"
```

---

### Task 2: Die Auskunft am Sammelendpunkt

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/BaseCoachResponse.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/GameDayLineupsResponse.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/GameDayController.java` (`getLineups`, ~Zeile 97)
- Modify: `backend/src/main/java/com/softball/application/GameStaffService.java` (neue Lesemethode)
- Modify: `backend/src/main/java/com/softball/application/LineupService.java` (falls `getLineupsForGames` Domänenmodelle braucht)
- Test: `backend/src/test/java/com/softball/integration/BaseCoachAuskunftIntegrationTest.java`

**Interfaces:**
- Consumes: `BaseCoachRegel.fuer(...)` aus Task 1
- Produces: `record BaseCoachResponse(String firstBase, String thirdBase, List<Integer> startSlots)` und `GameDayLineupsResponse(Map lineups, Map staff, Map substitutions, Map<Long, BaseCoachResponse> baseCoaches)`

Der Endpunkt `GET /api/gamedays/{id}/lineups` trägt bereits `@PreAuthorize("isAuthenticated()")` und den Wächter `sichtbarkeit.darfSehen(id)`, der leere Maps zurückgibt. Die vierte Map läuft genauso: gesperrt → leere Map.

- [ ] **Step 1: Write the failing integration test**

Im Stil von `AufstellungFreigabeIntegrationTest` auf dem Branch. Vier Fälle:

```java
@Test void spielerSiehtNachFreigabeDieStartschlagplaetze()   // startSlots == [9, 10]
@Test void benannterCoachSchlaegtDieRegel()                   // firstBase == "Jan", startSlots == [10]
@Test void gesperrterSpieltagLiefertLeereBaseCoachMap()       // baseCoaches.isEmpty()
@Test void trainerSiehtSieAuchVorDerFreigabe()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BaseCoachAuskunftIntegrationTest`
Expected: FAIL — `baseCoaches` fehlt in der Antwort.

- [ ] **Step 3: Implement**

`GameStaffService` bekommt `Map<Long, List<GameStaff>> getStaffModelsForGames(List<Long> gameIds)` neben dem bestehenden DTO-Pendant (`getStaffForGames` baut die Antwort, die Regel braucht das Modell). `GameDayController.getLineups` ruft `BaseCoachRegel.fuer(...)` je Spiel und füllt die vierte Map. Der leere Zweig gibt `Map.of()` als viertes Argument.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=BaseCoachAuskunftIntegrationTest`
Expected: PASS

- [ ] **Step 5: Run the whole backend suite**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS (grün, inkl. `SecurityCoverageTest`, `MethodSecurityCoverageTest`)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/BaseCoachResponse.java \
        backend/src/main/java/com/softball/adapter/dto/GameDayLineupsResponse.java \
        backend/src/main/java/com/softball/adapter/in/web/GameDayController.java \
        backend/src/main/java/com/softball/application/GameStaffService.java \
        backend/src/test/java/com/softball/integration/BaseCoachAuskunftIntegrationTest.java
git commit -m "✨ Base-Coach-Auskunft haengt am Sammelendpunkt und damit an der Lesegrenze"
```

---

### Task 3: Der Satz — eine Funktion für alles

**Files:**
- Create: `frontend/src/utils/baseCoachSatz.ts`
- Test: `frontend/src/utils/baseCoachSatz.test.ts`
- Modify: `frontend/src/types/index.ts` (Typ `BaseCoachAuskunft`)
- Modify: `frontend/src/api/client.ts` (`getGameDayLineups` trägt `baseCoaches`)

**Interfaces:**
- Produces: `interface BaseCoachAuskunft { firstBase: string | null; thirdBase: string | null; startSlots: number[] }` und `export function baseCoachSatz(a: BaseCoachAuskunft | undefined): string | null`

Die Schreibweisen, wörtlich aus dem Entwurf:

| Lage | Satz |
|---|---|
| keine Base benannt | `Coaches: zuletzt aus · #9 #10` |
| 1B benannt | `1B Jan · 3B zuletzt aus · #10` |
| 3B benannt | `3B Mike · 1B zuletzt aus · #10` |
| beide benannt | `1B Jan · 3B Mike` |
| nichts da | `null` |

- [ ] **Step 1: Write the failing tests**

```ts
it('nennt beide Schlagplätze, wenn keine Base benannt ist', () => {
  expect(baseCoachSatz({ firstBase: null, thirdBase: null, startSlots: [9, 10] }))
    .toBe('Coaches: zuletzt aus · #9 #10')
})

it('nennt den Namen und die Regel, wenn nur 1B benannt ist', () => {
  expect(baseCoachSatz({ firstBase: 'Jan', thirdBase: null, startSlots: [10] }))
    .toBe('1B Jan · 3B zuletzt aus · #10')
})

it('nennt den Namen und die Regel, wenn nur 3B benannt ist', () => {
  expect(baseCoachSatz({ firstBase: null, thirdBase: 'Mike', startSlots: [10] }))
    .toBe('3B Mike · 1B zuletzt aus · #10')
})

it('nennt nur die Namen, wenn beide benannt sind', () => {
  expect(baseCoachSatz({ firstBase: 'Jan', thirdBase: 'Mike', startSlots: [] }))
    .toBe('1B Jan · 3B Mike')
})

it('schweigt, wenn nichts da ist', () => {
  expect(baseCoachSatz({ firstBase: null, thirdBase: null, startSlots: [] })).toBeNull()
  expect(baseCoachSatz(undefined)).toBeNull()
})

it('bleibt in einer Zeile', () => {
  const satz = baseCoachSatz({ firstBase: null, thirdBase: null, startSlots: [9, 10] })!
  expect(satz.length).toBeLessThanOrEqual(30)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/baseCoachSatz.test.ts`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 3: Implement `baseCoachSatz` in `frontend/src/utils/baseCoachSatz.ts`**

Der Kommentar über der Funktion hält fest, warum sie allein steht: PDF und Spieler-Ansicht müssen gleichlautend sein, und das garantiert nur eine gemeinsame Funktion.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/baseCoachSatz.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/baseCoachSatz.ts frontend/src/utils/baseCoachSatz.test.ts \
        frontend/src/types/index.ts frontend/src/api/client.ts
git commit -m "✨ Ein Satz fuer Base Coaches, eine Funktion dahinter"
```

---

### Task 4: Der Satz auf beide Aufstellungs-PDFs und ins LineupSheet

**Files:**
- Modify: `frontend/src/utils/pdfExport.ts` — `GameData` (172-187), `drawCoachRotationCompact` (194, fällt weg), `generatePdf` Bank-Zeile (367-378), `generateLineupWithFieldPdf` Coach-Zeilen (455-488)
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx` — `loadGameData` (485-494) reicht `baseCoaches` durch
- Modify: `frontend/src/components/export/LineupSheet.tsx`
- Test: `frontend/src/components/export/LineupSheet.test.tsx` (existiert auf dem Branch)

**Interfaces:**
- Consumes: `baseCoachSatz` und `BaseCoachAuskunft` aus Task 3
- Produces: `GameData.baseCoaches?: BaseCoachAuskunft`

Drei Knöpfe, drei Blätter — der Betreiber druckt je nach Liga alle:

| Knopf | Funktion | Künftig |
|---|---|---|
| **Aufstellung** | `generateLineupWithFieldPdf` | Satz an der Stelle der Rotationsprosa, 7 pt Grau |
| **PDF** | `generatePdf` | neue Zeile direkt unter `Bank: …`, 7 pt Grau, `setTextColor(150,150,150)` |
| **Liste** | `generateSignatureListPdf` | unverändert |

`drawCoachRotationCompact` samt `resolveRotation`-Import verschwindet; `drawCoachRow` schrumpft auf eine Zeile mit `baseCoachSatz(baseCoaches)`. Die Auswechslungs-Anmerkung an der Staff-Zeile (`(X ab N. Inning)`) fällt mit — der Satz kennt keine Wechsel.

- [ ] **Step 1: Write the failing test**

In `LineupSheet.test.tsx`:

```tsx
it('zeigt den Coach-Satz unter der Aufstellung', async () => {
  // gameDay freigegeben, lineups mit 10 Eintraegen, baseCoaches { firstBase: null, thirdBase: null, startSlots: [9, 10] }
  expect(await screen.findByText('Coaches: zuletzt aus · #9 #10')).toBeInTheDocument()
})

it('schweigt, wenn es keine Coaches gibt', async () => {
  expect(screen.queryByText(/zuletzt aus/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/export/LineupSheet.test.tsx`
Expected: FAIL — der Satz steht nicht da.

- [ ] **Step 3: Implement**

`LineupSheet` lädt bereits den Spieltag; es holt zusätzlich `api.getGameDayLineups(id)` und zeigt den Satz unter der Tabelle je Spiel, in derselben gedämpften Größe wie die übrigen Nebenzeilen.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/export/LineupSheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Beide PDFs von Hand ansehen**

Run: Planer öffnen, „Aufstellung" und „PDF" drücken.
Expected: Auf beiden steht der Satz einmal je Spiel, grau, in einer Zeile, ohne Umbruch.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/pdfExport.ts frontend/src/components/planner/GameDayPlanner.tsx \
        frontend/src/components/export/LineupSheet.tsx frontend/src/components/export/LineupSheet.test.tsx
git commit -m "📝 Der Coach-Satz steht auf beiden Aufstellungs-PDFs"
```

---

### Task 5: Rückbau der Rotation im Frontend

**Files:**
- Delete: `frontend/src/utils/coachRotation.ts`, `frontend/src/utils/coachRotation.test.ts`
- Modify: `frontend/src/components/planner/CoachSlots.tsx` (`RotationPicker` und alle `*Rotation*`-Zweige)
- Modify: `frontend/src/components/planner/LineupRow.tsx` (Props 24-25, Hervorhebung 35-39, `CoachBadge` 230-240)
- Modify: `frontend/src/components/planner/LineupEditor.tsx` (Props 40-41, 52, 190-191)
- Modify: `frontend/src/hooks/useLineup.ts`, `frontend/src/api/client.ts` (`setCoachRotation` 418-432), `frontend/src/types/index.ts` (`CoachRotationPair`, vier Felder an `GameResponse`)
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx` (`onSaveRotation`-Verdrahtung), `GameDayPlanner.test.tsx`, `frontend/src/hooks/useLineup.applySet.test.ts`

Die Hervorhebung in `LineupRow` **zieht nicht um, sie fällt weg** — das Startpaar ist immer die untersten zwei, eine Markierung mit konstantem Ziel ist Dekoration. Die Auskunft trägt der Satz aus Task 3.

`CoachSlots` behält die beiden Namensfelder (benannte Coaches) vollständig; nur der Rotations-Auswähler darunter geht.

- [ ] **Step 1: Delete and unwire**

```bash
git rm frontend/src/utils/coachRotation.ts frontend/src/utils/coachRotation.test.ts
```

Dann die Aufrufer entlang der Compilerfehler leeren.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run build`
Expected: PASS — kein `CoachRotationPair` mehr im Baum.

- [ ] **Step 3: Verify no leftovers**

Run: `cd frontend && grep -rn "CoachRotation\|coachRotation\|RotationPicker\|getPairPositions" src/ | grep -v node_modules`
Expected: keine Ausgabe.

- [ ] **Step 4: Run the frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -u frontend/src
git commit -m "🧹 Rotationspaar raus aus dem Planer"
```

---

### Task 6: Rückbau der Rotation im Backend

**Files:**
- Create: `backend/src/main/resources/db/migration/V74__drop_coach_rotation.sql`
- Delete: `domain/model/CoachRotationPair.java`, `domain/model/LineupSetGameRotation.java`, `adapter/out/persistence/entity/LineupSetGameRotationEntity.java`, `adapter/dto/LineupSetGameRotationResponse.java`, `adapter/dto/SetCoachRotationRequest.java`, `test/.../domain/model/CoachRotationPairTest.java`
- Modify: `domain/model/Game.java`, `adapter/out/persistence/entity/GameEntity.java`, `adapter/out/persistence/mapper/GameMapper.java`, `adapter/dto/GameResponse.java`, `application/GameService.java` (`setCoachRotation`), `adapter/in/web/GameController.java` (60-66), `application/GameStaffService.java` (`clearRotationForFilledStaffSlots`, 78+83-97), `application/LineupSetService.java`, `adapter/out/persistence/adapter/GameRepositoryAdapter.java`
- Modify: `test/.../application/LineupSetServiceTest.java`, `test/.../integration/LineupSetIntegrationTest.java`

Die Migration (Reihenfolge: erst die abhängige Tabelle, dann die Spalten):

```sql
DROP TABLE IF EXISTS lineup_set_game_rotation;
ALTER TABLE games DROP COLUMN IF EXISTS first_base_coach_rotation;
ALTER TABLE games DROP COLUMN IF EXISTS third_base_coach_rotation;
ALTER TABLE games DROP COLUMN IF EXISTS first_base_coach_rotation_reversed;
ALTER TABLE games DROP COLUMN IF EXISTS third_base_coach_rotation_reversed;
```

- [ ] **Step 1: Write the failing test**

In `LineupSetIntegrationTest`:

```java
@Test void altesSetLaesstSichOhneRotationsfeldAnwenden() {
    // Set speichern, anwenden, pruefen: Lineup + Staff + Verfuegbare stimmen,
    // und die Antwort traegt kein Rotationsfeld mehr.
}
```

Dazu alle Rotations-Zusicherungen in `LineupSetServiceTest` und `LineupSetIntegrationTest` streichen.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=LineupSetIntegrationTest`
Expected: FAIL (Kompilierfehler, solange die Felder noch da sind)

- [ ] **Step 3: Implement — Migration schreiben, Klassen löschen, Aufrufer leeren**

`GameStaffService.setStaff` verliert die Zeile `clearRotationForFilledStaffSlots(game, saved)` und die Methode; `validate` bleibt Wort für Wort stehen. `GameRepository`/`GameRepositoryAdapter` werden in `GameStaffService` dann unter Umständen nicht mehr gebraucht — ungenutzte Abhängigkeit mit entfernen.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=LineupSetIntegrationTest`
Expected: PASS

- [ ] **Step 5: Verify no leftovers and run the whole suite**

Run: `cd backend && grep -rn "CoachRotation\|coach_rotation\|LineupSetGameRotation" src/ ; ./mvnw test -s .mvn/local-settings.xml`
Expected: keine Treffer außer in V34/V37/V57 (historische Migrationen bleiben stehen); Suite grün.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V74__drop_coach_rotation.sql
git add -u backend/src
git commit -m "🧹 CoachRotationPair faellt ersatzlos, samt Spalten und Set-Tabelle"
```

---

### Task 7: Die Sichtbarkeitsregel — 7 Uhr Berlin, Scorer am Spieltag

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/AufstellungsLage.java`
- Create: `backend/src/main/java/com/softball/shared/config/ZeitConfig.java`
- Modify: `backend/src/main/java/com/softball/shared/security/AufstellungSichtbarkeit.java`
- Modify: `backend/src/main/java/com/softball/adapter/dto/GameDayResponse.java`, `application/GameDayService.java`
- Test: `backend/src/test/java/com/softball/shared/security/AufstellungSichtbarkeitTest.java` (neu), `test/.../integration/AufstellungFreigabeIntegrationTest.java` (vorhanden)

**Interfaces:**
- Produces: `enum AufstellungsLage { GESPERRT, FREIGEGEBEN, HEUTE_VOR_SIEBEN, OFFEN_AB_SIEBEN, OFFEN_VERGANGEN }`; `AufstellungSichtbarkeit.lage(GameDay) : AufstellungsLage`; `GameDayResponse` trägt zusätzlich `AufstellungsLage aufstellungsLage`

Die Konstanten, wörtlich:

```java
private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
private static final LocalTime SCHWELLE = LocalTime.of(7, 0);
```

`ZeitConfig` liefert `Clock.systemUTC()` — die Berliner Zeit entsteht durch die ausdrückliche Umrechnung in der Regel, nicht durch die Zone des Containers. Nichts Historisches bewegt sich.

Die Lage je Spieltag (viewer-unabhängig, deshalb am DTO):

| Bedingung | Lage |
|---|---|
| `lineupsReleasedAt != null` | `FREIGEGEBEN` |
| `date < berlinHeute` | `OFFEN_VERGANGEN` |
| `date == berlinHeute` und Uhrzeit ≥ 07:00 | `OFFEN_AB_SIEBEN` |
| `date == berlinHeute` und Uhrzeit < 07:00 | `HEUTE_VOR_SIEBEN` |
| sonst | `GESPERRT` |

Darf **dieser** Angemeldete sehen: Trainer immer; sonst `FREIGEGEBEN`/`OFFEN_VERGANGEN`/`OFFEN_AB_SIEBEN` immer, `HEUTE_VOR_SIEBEN` nur für Scorer, `GESPERRT` für niemanden. Damit verliert `sieht()` den Scorer-Zweig: `filter()` und `darfSehen` schlagen für einen Scorer künftig den Spieltag nach, für einen Trainer weiterhin nicht.

- [ ] **Step 1: Write the failing unit tests**

```java
@Test void sechsUhrNeunundfuenfzigBerlinImSommer_istNochGesperrt()   // Clock.fixed 2026-07-04T04:59:00Z, date = 2026-07-04 -> HEUTE_VOR_SIEBEN
@Test void siebenUhrEinsBerlinImSommer_istOffen()                    // 2026-07-04T05:01:00Z -> OFFEN_AB_SIEBEN
@Test void sechsUhrNeunundfuenfzigBerlinImWinter_istNochGesperrt()   // 2026-01-10T05:59:00Z -> HEUTE_VOR_SIEBEN
@Test void siebenUhrEinsBerlinImWinter_istOffen()                    // 2026-01-10T06:01:00Z -> OFFEN_AB_SIEBEN
@Test void kurzNachMitternachtBerlin_gehoertSchonZumSpieltag()       // 2026-07-04T22:30:00Z ist in Berlin der 5.7. -> Spieltag 5.7. ist HEUTE_VOR_SIEBEN
@Test void vergangenerSpieltag_istOffenEgalWieSpaet()
@Test void freigegebenSchlaegtAllesAndere()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=AufstellungSichtbarkeitTest`
Expected: FAIL — `lage` existiert nicht, `Clock` wird nicht eingesetzt.

- [ ] **Step 3: Implement**

`AufstellungSichtbarkeit` bekommt die `Clock` als vierte Konstruktorabhängigkeit, `lage(GameDay)` als öffentliche Methode und eine private `darfSehen(GameDay)`, die Rolle und Lage zusammenbringt. Die Klassendoku wird nachgeführt: aus „Scorer sehen immer" wird „Scorer sehen am Spieltag", mit der Begründung aus dem Entwurf (Zweig 3 trägt ihn an allen anderen Tagen).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=AufstellungSichtbarkeitTest`
Expected: PASS

- [ ] **Step 5: Extend the integration test**

In `AufstellungFreigabeIntegrationTest` zwei Fälle ergänzen:

```java
@Test void scorerSiehtKuenftigenNichtFreigegebenenSpieltagNicht()
@Test void scorerSiehtDenHeutigenSpieltagAuchVorSieben()
```

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=AufstellungFreigabeIntegrationTest`
Expected: PASS

- [ ] **Step 6: Run the whole suite and commit**

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml
git add backend/src/main/java/com/softball/domain/model/AufstellungsLage.java \
        backend/src/main/java/com/softball/shared/config/ZeitConfig.java \
        backend/src/test/java/com/softball/shared/security/AufstellungSichtbarkeitTest.java
git add -u backend/src
git commit -m "⏰ Ab 7 Uhr Berliner Zeit sehen alle die Aufstellung — der Scorer ab Mitternacht"
```

---

### Task 8: Die Leiste beantwortet eine Frage

**Files:**
- Modify: `frontend/src/components/planner/FreigabeLeiste.tsx`
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx` (Aufruf ~Zeile 724)
- Modify: `frontend/src/types/index.ts` (`aufstellungsLage` am `GameDayResponse`)
- Test: `frontend/src/components/planner/FreigabeLeiste.test.tsx` (existiert auf dem Branch)

**Interfaces:**
- Consumes: `AufstellungsLage` aus Task 7
- Produces: `FreigabeLeiste({ lage, freigegebenSeit, seitdemGeaendert, hatAufstellung, umschalten })`

Die sieben Lagen, wörtlich:

| Lage | Punkt | Zeile | Knopf |
|---|---|---|---|
| `GESPERRT`, nichts aufgestellt | grau | Noch nichts aufgestellt | Freigeben (gesperrt) |
| `GESPERRT`, aufgestellt | amber | Noch nicht für Spieler freigegeben | Freigeben |
| `FREIGEGEBEN`, künftig | accent | Für Spieler sichtbar · Sa 09:12 | zurücknehmen |
| `FREIGEGEBEN`, seitdem geändert | amber | Seit der Freigabe geändert · Sa 09:12 | Erneut freigeben · zurücknehmen |
| `HEUTE_VOR_SIEBEN` | grau | Ab 7 Uhr für alle sichtbar | Früher freigeben |
| `OFFEN_AB_SIEBEN` | accent | Für alle sichtbar · seit 7 Uhr | — |
| `OFFEN_VERGANGEN` | accent | Für alle sichtbar · Spieltag vorbei | — |

Punktfarben: `accent = sichtbar`, `amber = du könntest etwas tun`, `grau = nichts zu tun`. Vor 7 Uhr ist grau richtig — Nichtstun wird von selbst sichtbar, Amber wäre eine Warnfarbe ohne Anlass.

Fällt der Knopf „zurücknehmen" in einer Lage weg, muss der Text im `ConfirmModal` („Die Aufstellung verschwindet dann wieder aus der Spieler-Ansicht") nicht nach — er steht nur noch dort, wo er stimmt. Fällt diese Kopplung je, muss er mit.

- [ ] **Step 1: Write the failing tests**

```tsx
it.each([
  ['GESPERRT ohne Aufstellung', { lage: 'GESPERRT', hatAufstellung: false }, 'Noch nichts aufgestellt'],
  ['GESPERRT mit Aufstellung', { lage: 'GESPERRT', hatAufstellung: true }, 'Noch nicht für Spieler freigegeben'],
  ['vor 7 Uhr', { lage: 'HEUTE_VOR_SIEBEN', hatAufstellung: true }, 'Ab 7 Uhr für alle sichtbar'],
  ['ab 7 Uhr', { lage: 'OFFEN_AB_SIEBEN', hatAufstellung: true }, 'Für alle sichtbar · seit 7 Uhr'],
  ['vorbei', { lage: 'OFFEN_VERGANGEN', hatAufstellung: true }, 'Für alle sichtbar · Spieltag vorbei'],
])('%s zeigt die passende Zeile', (_, props, erwartet) => { ... })

it('zeigt vor 7 Uhr keinen amberfarbenen Punkt', () => { ... })
it('bietet ab 7 Uhr keinen Knopf mehr an', () => {
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('bietet vor 7 Uhr "Früher freigeben" an', () => { ... })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/planner/FreigabeLeiste.test.tsx`
Expected: FAIL — `lage` wird nicht gelesen.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/planner/FreigabeLeiste.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/planner/FreigabeLeiste.tsx frontend/src/components/planner/FreigabeLeiste.test.tsx \
        frontend/src/components/planner/GameDayPlanner.tsx frontend/src/types/index.ts
git commit -m "🎨 Die Freigabe-Leiste sagt, ob die Spieler es sehen — und warum"
```

---

### Task 9: Zwei Uhren im Browser fallen

**Files:**
- Delete: `frontend/src/utils/aufstellungsauskunft.ts`
- Modify: `frontend/src/components/dashboard/PlayerDashboard.tsx` (`heute()` 26-28, `useNaechsterSpieltag`, `BinIchDabei`, `LineupLesen`)
- Modify: `frontend/src/components/dashboard/HeroNextGameDay.tsx` (Variante `today`)
- Modify: `frontend/src/components/export/LineupSheet.tsx`
- Test: `frontend/src/components/dashboard/PlayerDashboard.test.tsx` (existiert auf dem Branch)

`stehtNochNicht` rechnete das **UTC**-Datum im Browser gegen ein Backend in der Containerzone. `heute()` im `PlayerDashboard` macht denselben Fehler nochmal: daran hängt, welcher Spieltag angezeigt wird (`date >= heute()`) und ob der Kopf „heute" sagt — im Sommer steht der Spieltag bis 2 Uhr nachts noch als kommender da. Beide fallen; die Antwort kommt aus `aufstellungsLage`.

Die Ersetzung je Stelle:

| Heute | Künftig |
|---|---|
| `stehtNochNicht(gameDay)` | `lage === 'GESPERRT' \|\| lage === 'HEUTE_VOR_SIEBEN'` |
| `gameDay.date >= heute()` (Auswahl des Spieltags) | `lage !== 'OFFEN_VERGANGEN'` |
| `naechster.date === heute()` (Kopf-Variante) | `lage === 'HEUTE_VOR_SIEBEN' \|\| lage === 'OFFEN_AB_SIEBEN'` |

Die Leersätze, beide Karten aus derselben Quelle:

| Spieltag | Spiel | Satz |
|---|---|---|
| gesperrt | egal | `Die Aufstellung steht noch nicht. Sobald sie steht, findest du sie hier.` |
| offen | leer | `Für dieses Spiel gibt es noch keine Aufstellung. Sobald der Trainer sie macht, steht sie hier.` |
| offen | gefüllt | kein Satz |

- [ ] **Step 1: Write the failing tests**

```tsx
it('sagt vor 7 Uhr am Spieltag, dass die Aufstellung noch nicht steht', () => { /* lage HEUTE_VOR_SIEBEN */ })
it('sagt bei offenem Spieltag und leerem Spiel den anderen Satz', () => { /* lage OFFEN_AB_SIEBEN, Spiel 2 leer */ })
it('sagt bei Netzfehler weder das eine noch das andere', () => {
  expect(screen.getByText(/nicht erreichbar/)).toBeInTheDocument()
  expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
})
it('„Bin ich dabei?" und die Lineup-Karte sagen denselben Satz', () => { ... })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/dashboard/PlayerDashboard.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

```bash
git rm frontend/src/utils/aufstellungsauskunft.ts
```

Der Text `NOCH_NICHT_FREIGEGEBEN` zieht als Konstante in die neue Ansicht um (Task 11) bzw. ins `PlayerDashboard`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/dashboard/`
Expected: PASS

- [ ] **Step 5: Verify no leftovers**

Run: `cd frontend && grep -rn "stehtNochNicht\|toISOString().slice(0, 10)" src/components/dashboard/ src/components/export/`
Expected: keine Ausgabe.

- [ ] **Step 6: Commit**

```bash
git add -u frontend/src
git commit -m "🔧 Das Datum kommt aus dem Backend, nicht aus zwei Browser-Uhren"
```

---

### Task 10: `FieldView` — Tokens, nur zum Lesen, mit Hervorhebung

**Files:**
- Modify: `frontend/src/components/planner/FieldView.tsx`
- Test: `frontend/src/components/planner/FieldView.test.tsx` (neu)

**Interfaces:**
- Produces: `FieldView({ entries, onPositionClick?, hervorgehobenerSpielerId?: number })`

Drei Dinge:

1. **Tokens statt Palette.** `text-navy-900` → `text-ink`, `bg-cream-50` → `bg-surface-sunken`, `border-cream-300` → `border-line`, `text-gray-400` → `text-ink-faint`, `hover:bg-cream-200` → `hover:bg-surface-raised`. Die SVG-Linien (`var(--color-navy-900)`, `var(--color-softball-red-500)`) auf die entsprechenden Token-Variablen. `text-softball-red-600` an den Positionskürzeln bleibt — Rot ist dort Markierung, kein Signal.
2. **Zum Lesen, nicht zum Fassen.** Ohne `onPositionClick` rendert die Komponente bereits `div` statt `button`; zusätzlich fallen dort `title`, Cursor und Hover-Klassen weg, und der Zähler `9/9` samt „offen"-Hinweis erscheint nur mit `onPositionClick`.
3. **Hervorhebung.** `hervorgehobenerSpielerId` färbt genau einen Marker in `amber-400` — dieselbe Farbe, die die Liste für die eigene Zeile benutzt. Zeile und Punkt gehören sichtbar zusammen.

- [ ] **Step 1: Write the failing tests**

```tsx
it('zeichnet ohne onPositionClick keine Schaltflächen', () => {
  render(<FieldView entries={neun()} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('hebt genau einen Spieler hervor', () => { /* genau ein Element mit der Amber-Klasse */ })
it('zeigt den Zähler nur in der Werkbank', () => {
  render(<FieldView entries={neun()} />)
  expect(screen.queryByText('9/9')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/planner/FieldView.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/planner/FieldView.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify contrast on the planner**

Run: `cd frontend && npx playwright test e2e/theme/kontrast.spec.ts`
Expected: PASS — `/gameday/1` misst das Feld in beiden Themes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/planner/FieldView.tsx frontend/src/components/planner/FieldView.test.tsx
git commit -m "🎨 Das Feld auf Tokens, und es laesst sich auch nur lesen"
```

---

### Task 11: Die Spieler-Ansicht

**Files:**
- Create: `frontend/src/components/dashboard/Aufstellungsansicht.tsx`
- Test: `frontend/src/components/dashboard/Aufstellungsansicht.test.tsx`
- Modify: `frontend/src/components/dashboard/PlayerDashboard.tsx` (`LineupLesen` 151-215 wird ersetzt, `useAufstellungen` 62-78 wird zu einem Abruf)

**Interfaces:**
- Consumes: `FieldView` (Task 10), `baseCoachSatz` (Task 3), `GameDayLineupsResponse` mit `baseCoaches` (Task 2), `AufstellungsLage` (Task 7)
- Produces:
  ```ts
  Aufstellungsansicht({
    spieltag: GameDayResponse,
    daten: GameDayLineupsResponse | null | undefined,  // null = nicht erreichbar, undefined = lädt
    lage: AufstellungsLage,
    playerId: number | null,
  })
  ```

Vier Dinge, sonst nichts: **das Feld**, **die Schlagreihenfolge**, **die Base Coaches**, **die Bank**. Keine Auswechslungen, keine Knöpfe außer dem Umschalter.

Entscheidungen, die nicht offen sind:

- **Ein Abruf statt N.** `useAufstellungen` rief `getLineup` je Spiel; künftig holt ein `api.getGameDayLineups(spieltag.id)` Aufstellungen, Staff, Auswechslungen und Base-Coach-Auskunft in einem. Fällt er aus, lautet die Zeile „nicht erreichbar" — nicht „steht noch nicht".
- **Der Umschalter nennt den Gegner.** Heute steht dort `Spiel 1`; mit Feld, Coaches und Bank wird diese Karte die Hauptsache, und eine Aufstellung ohne Gegner darüber ist unvollständig. Entweder am Knopf oder als Zeile über dem Feld.
- **Die eigene Zeile und der eigene Punkt sind beide amber.** `bg-amber-400/15 border-amber-400/50` an der Zeile bleibt wie heute; `hervorgehobenerSpielerId` trägt dieselbe Antwort aufs Feld. Wer nicht aufgestellt ist, bekommt keine Hervorhebung und keinen Hinweis — die Bank nennt ihn, das genügt.
- **Die Bank ist eine Zeile**, Namen durch `·` getrennt, gedämpft, unter dem Feld. Keine Karten, keine Aufzählung.
- **Der Coach-Satz steht unter dem Feld**, in einer Zeile, aus `baseCoachSatz`. Das Feld selbst zeichnet keine Coaches: neun Punkte sind neun Verteidiger.
- **„Bin ich dabei?" behält seine Zeile je Spiel**, trotz Doppelung — sie beantwortet „wo spiele ich" ohne einen Handgriff, die Ansicht darunter „wie steht das Team".

- [ ] **Step 1: Write the failing tests**

```tsx
it('zeigt Feld, Schlagreihenfolge, Coach-Satz und Bank', async () => { ... })
it('hebt die eigene Zeile und den eigenen Punkt hervor', async () => { ... })
it('nennt den Gegner des gewählten Spiels', async () => {
  expect(await screen.findByText(/Fireballs/)).toBeInTheDocument()
})
it('schaltet zwischen zwei Spielen um', async () => { ... })
it('zeigt keine Coach-Zeile, wenn es keine Coaches gibt', async () => { ... })
it('zeigt keine Bank-Zeile, wenn die Bank leer ist', async () => { ... })
it('sagt bei Netzfehler „nicht erreichbar"', async () => { ... })
it('zeigt bei gesperrtem Spieltag nur den erklärenden Satz', async () => {
  expect(screen.queryByRole('button', { name: /Spiel/ })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/dashboard/Aufstellungsansicht.test.tsx`
Expected: FAIL — Komponente existiert nicht.

- [ ] **Step 3: Implement**

Die Karte benutzt `KARTE`/`UEBERSCHRIFT` aus `PlayerDashboard`, damit sie neben „Bin ich dabei?" sitzt wie die bisherige Liste. Die Bank sind die Zugesagten minus alle, die in diesem Spiel aufgestellt sind oder als Coach benannt — dieselbe Rechnung, die `generateLineupWithFieldPdf` für seine Bank-Zeile macht.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/dashboard/`
Expected: PASS

- [ ] **Step 5: Look at it on a phone-sized viewport**

Run: Dev-Server, `/spielbetrieb` als Spieler, 393 × 760, beide Themes.
Expected: Ein Spiel, Feld lesbar ohne Zoom, Coach-Satz in einer Zeile, Bank in einer Zeile. Dass die Karte unter der Falte liegt, ist richtig — sie ist das, was aufmacht, wer mehr wissen will.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/dashboard/Aufstellungsansicht.tsx \
        frontend/src/components/dashboard/Aufstellungsansicht.test.tsx \
        frontend/src/components/dashboard/PlayerDashboard.tsx
git commit -m "✨ Spieler sehen Feld, Schlagreihenfolge, Coaches und Bank"
```

---

### Task 12: Alles zusammen

**Files:** keine neuen — Abschluss.

- [ ] **Step 1: Full backend suite**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS

- [ ] **Step 2: Full frontend build and unit suite**

Run: `cd frontend && npm run lint && npm run build && npx vitest run`
Expected: PASS

- [ ] **Step 3: E2E**

Run: `docker compose up -d db && cd frontend && npm run test:e2e`
Expected: PASS. Scoring-Pfade sind nicht angefasst worden; schlägt dort etwas an, ist es eine Regression und kein Flake — nachgehen, nicht wiederholen.

- [ ] **Step 4: Contrast in both themes**

Run: `cd frontend && npx playwright test e2e/theme/kontrast.spec.ts e2e/theme/hover.spec.ts`
Expected: PASS.

**Grenze, die im Bericht stehen muss:** `kontrast.spec.ts` meldet sich mit einem Superadmin an, und `/spielbetrieb` zeigt dem die Werkbank. Die neue Spieler-Ansicht wird von dieser Prüfung **nicht** gemessen. Gemessen wird nur `FieldView`, über `/gameday/1`. Der Rest der neuen Oberfläche hält die Tokens durch Bauweise, nicht durch Messung — wer das ändern will, braucht eine Spieler-Anmeldung in `e2e/helpers/auth.ts`, und das ist ein eigenes Vorhaben.

- [ ] **Step 5: Production build smoke test**

Run: `cd backend && ./mvnw package -s .mvn/local-settings.xml -DskipTests && java -jar target/lineup-planner-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod`
Expected: startet, V74 läuft durch, `ddl-auto=validate` beschwert sich nicht.

- [ ] **Step 6: Report**

Branch ist fertig, nicht gemergt und nicht gepusht. `superpowers:finishing-a-development-branch` entscheidet, was weiter passiert — der Merge nach `master` löst Auto-Deploy aus und gehört dem Betreiber.
