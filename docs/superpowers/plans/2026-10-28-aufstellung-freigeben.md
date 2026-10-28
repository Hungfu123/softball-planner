# Aufstellung freigeben — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spieler sehen die Aufstellung eines Spieltags erst, wenn der Trainer sie ausdrücklich freigibt — vorher nichts, auch nicht den eigenen Platz. Der Trainer sieht jederzeit, ob freigegeben ist und ob sich seitdem etwas geändert hat.

**Architecture:** Zwei Spalten am Spieltag (`game_days.lineups_released_at` + `lineups_released_hash`, V73) tragen alles. Der Zeitstempel sagt **ob** freigegeben ist, der Fingerabdruck sagt **was** freigegeben wurde — beim Lesen wird er gegen den aktuellen Stand gehalten, und ungleich heißt „seit der Freigabe geändert". So muss **keine einzige Schreibstelle** etwas melden: es gibt rund ein Dutzend Wege, eine Aufstellung zu ändern (Lineup, Staff, Substitutions, Swap, Auto-Aufstellung, Undo, Lineup-Sets, Verfügbarkeits-Kaskade, Import, Live-Scoring), und einen davon zu vergessen wäre ein Fehler, den niemand bemerkt. Ein Vergleich kann nichts vergessen. Die Grenze liegt im Backend: fünf Leseendpunkte fragen eine gemeinsame Stelle (`AufstellungSichtbarkeit`), ob der Anfragende die Aufstellung dieses Spiels sehen darf, und antworten sonst **leer** statt mit 403 — eine leere Liste trägt jeder Aufrufer schon heute, ein Fehler nicht. Die Oberfläche sperrt nichts, sie erklärt nur.

**Tech Stack:** Spring Boot 3.4.3, Flyway, Spring Security (Method Security), JPA; React 19, TypeScript, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-27-aufstellung-teilen-design.md`, Abschnitt „Freigabe"

## Global Constraints

- **Deutsch** in Beschriftungen, Fehlermeldungen und Testnamen.
- **Scoring bleibt unangetastet.** Wer live scort, liest die Aufstellung weiter — die Grenze lässt `hasRole('ADMIN')` **und** `@scoring.darfSchreiben` durch. Ein Spieler mit Scorer-Recht darf scoren, ohne dass jemand freigegeben hat.
- **Leer statt 403.** Vor der Freigabe liefern die Leseendpunkte für Spieler eine leere Liste. Kein Fehler-Toast, kein kaputter Bildschirm.
- **Die Zusage ist keine Aufstellung.** `availablePlayers` bleibt sichtbar — „bin ich dabei" ist eine andere Frage als „wo stehe ich".
- Schema-Änderungen nur per neuer `V{n}__*.sql`; `ddl-auto=validate`.
- Commits mit Gitmoji, **ohne `Co-Authored-By`**. Stagen **nur per Pfad**.
- Vor jedem Commit: `cd backend && ./mvnw test -s .mvn/local-settings.xml` (Docker muss laufen) bzw. `cd frontend && npm run build`.

## Review Focus

1. **Der Scorer vor der Freigabe** — ein Spieler mit Scorer-Recht öffnet das Live-Scoring eines nicht freigegebenen Spieltags und muss die Aufstellung sehen, sonst ist der Spielbogen leer. → Task 3.
2. **Freigegeben, dann geändert** — die Änderung ist für Spieler sofort sichtbar, die Freigabe bleibt stehen, und der Trainer bekommt den Haken „seit der Freigabe geändert". Niemand MUSS erneut drücken. → Task 2.
3. **Spieltag ohne Aufstellung, aber freigegeben** — die Freigabe darf an einem leeren Spieltag nichts kaputtmachen; der Spieler liest „noch keine Aufstellung", nicht „nicht freigegeben". → Task 4.
4. **Spieler ohne verknüpften Account-Spieler** (`playerId == null`) — die Sichtbarkeitsprüfung darf nicht mit einer NullPointerException enden. → Task 3.
5. **`/gamedays/{id}/stats`** trägt Positionen je Spiel und Spieler — das **ist** die Aufstellung in anderer Form. Wird leicht übersehen, weil der Name nach Statistik klingt. → Task 3.
6. **Der Spiele-Log unter `/teams/spiele`** lädt für jedes vergangene Spiel die Aufstellung und ist für Spieler offen. Er darf durch diese Änderung nicht leer werden. → Task 3.

---

## Dateien

| Datei | Verantwortung |
|---|---|
| `backend/.../db/migration/V73__gameday_lineups_released.sql` *(neu)* | `game_days.lineups_released_at TIMESTAMP NULL` + `lineups_released_hash VARCHAR(64) NULL`. |
| `backend/.../domain/service/AufstellungsFingerabdruck.java` *(neu)* | Aus Aufstellung, Staff und Auswechslungen eine Zeichenkette, die sich bei jeder Änderung ändert. |
| `backend/.../entity/GameDayEntity.java`, `domain/model/GameDay.java`, `mapper/GameDayMapper.java` *(geändert)* | Das Feld durch die Schichten. |
| `backend/.../adapter/dto/GameDayResponse.java` *(geändert)* | `lineupsReleasedAt` nach außen. |
| `backend/.../application/GameDayService.java` *(geändert)* | `setLineupsReleased(id, boolean)`. |
| `backend/.../adapter/in/web/GameDayController.java` *(geändert)* | `PUT /gamedays/{id}/lineups/release`. |
| `backend/.../shared/security/AufstellungSichtbarkeit.java` *(neu)* | Die eine Stelle, die „darf der das sehen" beantwortet. |
| `backend/.../adapter/in/web/GameController.java`, `GameDayController.java` *(geändert)* | Fünf Leseendpunkte fragen sie. |
| `frontend/src/components/dashboard/PlayerDashboard.tsx` *(geändert)* | Erklärt die Sperre, statt eine leere Liste misszudeuten. |
| `frontend/src/components/planner/GameDayPlanner.tsx` *(geändert)* | Statuszeile mit Schalter unter dem Titel, drei Zustände. |
| `frontend/src/components/dashboard/HeroNextGameDay.tsx` *(geändert)* | Derselbe Hinweis am nächsten Spieltag der Werkbank — damit man das Vergessen nicht erst merkt, wenn jemand fragt. |
| `frontend/src/api/client.ts`, `types/index.ts` *(geändert)* | `releaseLineups`, `lineupsReleasedAt`. |

---

### Task 1: Die zwei Felder und der Fingerabdruck

**Files:**
- Create: `backend/src/main/resources/db/migration/V73__gameday_lineups_released.sql`, `backend/src/main/java/com/softball/domain/service/AufstellungsFingerabdruck.java`
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/GameDayEntity.java`, `backend/src/main/java/com/softball/domain/model/GameDay.java`, `backend/src/main/java/com/softball/adapter/out/persistence/mapper/GameDayMapper.java`, `backend/src/main/java/com/softball/adapter/dto/GameDayResponse.java`
- Test: `backend/src/test/java/com/softball/domain/service/AufstellungsFingerabdruckTest.java`, `backend/src/test/java/com/softball/integration/AufstellungFreigabeIntegrationTest.java`

**Interfaces:**
- Produces:
  ```java
  // Reine Domaene, kein Spring: gleiche Aufstellung → gleiche Zeichenkette, egal in welcher Reihenfolge sie kommt.
  public final class AufstellungsFingerabdruck {
      public static String von(List<LineupEntry> lineup, List<GameStaff> staff, List<Substitution> subs)
  }
  // GameDay
  LocalDateTime getLineupsReleasedAt() / setLineupsReleasedAt(LocalDateTime)
  String getLineupsReleasedHash() / setLineupsReleasedHash(String)
  // GameDayResponse
  lineupsReleasedAt: ISO-String oder null
  lineupsChangedSinceRelease: boolean   // false, solange nichts freigegeben ist
  ```

**Warum ein Fingerabdruck und kein zweiter Zeitstempel:** Ein `lineups_changed_at` müsste von jeder Schreibstelle gesetzt werden — Lineup, Staff, Substitutions, Swap, Auto-Aufstellung, Undo, Lineup-Sets, Verfügbarkeits-Kaskade, Import, Live-Scoring. Eine davon zu vergessen ergibt einen Haken, der stillschweigend falsch steht. Der Vergleich kann nichts vergessen, und er fängt auch das Löschen.

**Die Zeichenkette** besteht je Spiel aus `battingOrder:playerId:position:dhBatterId`, dazu `rolle:playerId` je Staff-Eintrag und `inning:raus:rein` je Auswechslung, jede Gruppe **sortiert** zusammengesetzt. Sortiert, weil die Datenbank keine Reihenfolge zusichert und eine umsortierte Antwort sonst als Änderung gälte. Gespeichert wird ein SHA-256 in Hex (64 Zeichen) — die Zeichenkette selbst kann lang werden und niemand liest sie.

- [ ] **Step 1: Write the failing tests**

```java
// AufstellungsFingerabdruckTest — reine Einheit, kein Spring
@Test void gleicheAufstellungGleicherAbdruck() { /* zwei Listen, verschiedene Reihenfolge → gleich */ }
@Test void andererSchlagplatzAndererAbdruck() { /* battingOrder 3↔4 getauscht → ungleich */ }
@Test void anderePositionAndererAbdruck() { }
@Test void einEntfernterEintragAendertDenAbdruck() { }
@Test void einGeaenderterCoachAendertDenAbdruck() { }
@Test void eineGeaenderteAuswechslungAendertDenAbdruck() { }
@Test void leereAufstellungGibtEinenStabilenAbdruck() { /* nicht null, nicht leer */ }

// AufstellungFreigabeIntegrationTest
@Test
void spieltagKommtNichtFreigegebenAufDieWelt() throws Exception {
    mockMvc.perform(get("/api/gamedays/" + id).with(ADMIN))
        .andExpect(jsonPath("$.lineupsReleasedAt").doesNotExist())
        .andExpect(jsonPath("$.lineupsChangedSinceRelease").value(false));
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='AufstellungsFingerabdruckTest,AufstellungFreigabeIntegrationTest'`
Expected: FAIL — Klasse und Felder gibt es nicht.

- [ ] **Step 3: Migration, Felder und Fingerabdruck schreiben**

```sql
ALTER TABLE game_days ADD COLUMN lineups_released_at TIMESTAMP;
ALTER TABLE game_days ADD COLUMN lineups_released_hash VARCHAR(64);
```

Die Tabelle heißt `game_days` (`V1__initial_schema.sql:24`). Keine Vorbelegung: **bestehende Spieltage sind damit nicht freigegeben.** Das ist Absicht — die Alternative hieße, alle Altdaten stillschweigend zu veröffentlichen. (Vergangene Spieltage bleiben trotzdem lesbar, siehe Task 3.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='AufstellungsFingerabdruckTest,AufstellungFreigabeIntegrationTest'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V73__gameday_lineups_released.sql backend/src/main/java/com/softball/domain/service/AufstellungsFingerabdruck.java backend/src/main/java/com/softball/adapter/out/persistence/entity/GameDayEntity.java backend/src/main/java/com/softball/domain/model/GameDay.java backend/src/main/java/com/softball/adapter/out/persistence/mapper/GameDayMapper.java backend/src/main/java/com/softball/adapter/dto/GameDayResponse.java backend/src/test/java/com/softball/domain/service/AufstellungsFingerabdruckTest.java backend/src/test/java/com/softball/integration/AufstellungFreigabeIntegrationTest.java
git commit -m "✨ Ein Spieltag weiss, ob seine Aufstellung steht — und ob sie sich seitdem bewegt hat"
```

---

### Task 2: Der Schalter

**Files:**
- Modify: `backend/src/main/java/com/softball/application/GameDayService.java`, `backend/src/main/java/com/softball/adapter/in/web/GameDayController.java`
- Create: `backend/src/main/java/com/softball/adapter/dto/LineupReleaseRequest.java`
- Test: `backend/src/test/java/com/softball/integration/AufstellungFreigabeIntegrationTest.java` (erweitern)

**Interfaces:**
- Consumes: `GameDay#setLineupsReleasedAt` (Task 1).
- Produces:
  ```java
  public record LineupReleaseRequest(@NotNull Boolean released) {}
  // GameDayService
  public GameDay setLineupsReleased(Long gameDayId, boolean released)
  //   true  → lineupsReleasedAt = now(), lineupsReleasedHash = Fingerabdruck des aktuellen Standes
  //   false → beide null
  public boolean istSeitDerFreigabeGeaendert(GameDay gameDay)
  //   false, solange lineupsReleasedAt null ist; sonst Fingerabdruck != lineupsReleasedHash
  // GameDayController, Klassenregel hasRole('ADMIN') gilt — KEIN eigenes @PreAuthorize
  @PutMapping("/gamedays/{id}/lineups/release")
  public GameDayResponse releaseLineups(@PathVariable Long id, @RequestBody @Valid LineupReleaseRequest request)
  ```

**Kein Eintrag in `MethodSecurityCoverageTest#ERLAUBT`** — der Endpunkt lockert nichts, er erbt `hasRole('ADMIN')` von der Klasse.

- [ ] **Step 1: Write the failing tests**

```java
@Test
void adminGibtFreiUndNimmtZurueck() throws Exception {
    mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(ADMIN).with(csrf())
            .contentType(APPLICATION_JSON).content("{\"released\":true}"))
        .andExpect(jsonPath("$.lineupsReleasedAt").isNotEmpty());

    mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(ADMIN).with(csrf())
            .contentType(APPLICATION_JSON).content("{\"released\":false}"))
        .andExpect(jsonPath("$.lineupsReleasedAt").doesNotExist());
}

@Test
void einSpielerDarfNichtFreigeben() throws Exception {
    mockMvc.perform(put("/api/gamedays/" + id + "/lineups/release").with(SPIELER).with(csrf())
            .contentType(APPLICATION_JSON).content("{\"released\":true}"))
        .andExpect(status().isForbidden());
}

// Review Focus 2
@Test
void eineAenderungNachDerFreigabeNimmtSieNichtZurueck() throws Exception {
    // freigeben → Lineup per PUT /games/{id}/lineup aendern
    // → lineupsReleasedAt steht unveraendert, aber lineupsChangedSinceRelease == true
}

@Test
void erneutFreigebenSetztDenHakenZurueck() throws Exception {
    // nach der Aenderung nochmal release=true → lineupsChangedSinceRelease == false
}

@Test
void ohneFreigabeGibtEsKeinGeaendert() throws Exception {
    // nie freigegeben, Lineup geaendert → lineupsChangedSinceRelease == false (nicht true)
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=AufstellungFreigabeIntegrationTest`
Expected: FAIL — 404/405, Endpunkt fehlt.

- [ ] **Step 3: Service und Endpunkt schreiben**

`setLineupsReleased` protokolliert auf INFO (Zustandsänderung, Konvention des Repos). `GameDayResponse.from(...)` braucht den berechneten Wert — ihn im Mapper aus dem Nichts zu ziehen geht nicht, also reicht der Controller ihn durch, so wie er heute schon andere abgeleitete Felder reicht.

**Für Spieler ändert „geändert" nichts.** Sie sehen weiter den Live-Stand. Der Haken ist eine Auskunft für den Trainer — „der Stand, den ich freigegeben habe, ist nicht mehr der, der dasteht" — und **Erneut freigeben** setzt ihn zurück und sonst nichts. Eine Änderung, die die Aufstellung für alle wieder verschwinden ließe, wäre am Samstagmorgen genau das Falsche.

- [ ] **Step 4: Run the guard tests too**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='AufstellungFreigabeIntegrationTest,SecurityCoverageTest,MethodSecurityCoverageTest,CurrentUserArchitectureTest'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/application/GameDayService.java backend/src/main/java/com/softball/adapter/in/web/GameDayController.java backend/src/main/java/com/softball/adapter/dto/LineupReleaseRequest.java backend/src/test/java/com/softball/integration/AufstellungFreigabeIntegrationTest.java
git commit -m "✨ Freigeben und zuruecknehmen, derselbe Schalter"
```

---

### Task 3: Die Lesegrenze

**Files:**
- Create: `backend/src/main/java/com/softball/shared/security/AufstellungSichtbarkeit.java`
- Modify: `backend/src/main/java/com/softball/adapter/in/web/GameController.java` (`getLineup`, `getStaff`, `getSubstitutions`), `backend/src/main/java/com/softball/adapter/in/web/GameDayController.java` (`getLineups`, `getStats`)
- Test: `backend/src/test/java/com/softball/integration/SpielerLeserechteIntegrationTest.java` (erweitern)

**Interfaces:**
- Consumes: `GameDay#getLineupsReleasedAt` (Task 1), `ScoringPermission` (Bean `scoring`), `CurrentUser`.
- Produces:
  ```java
  @Component  // KEIN @RequestScope — liest CurrentUser, laeuft nur in Anfragen
  public class AufstellungSichtbarkeit {
      public boolean darfSehen(Long gameDayId)
      public boolean darfSehenFuerSpiel(Long gameId)
  }
  ```

**Die Regel an einer Stelle:** sehen darf, wer Admin ist, **oder** Scorer-Recht hat, **oder** dessen Spieltag freigegeben ist (`lineupsReleasedAt != null`), **oder** dessen Spieltag in der Vergangenheit liegt (`date < heute`).

**Warum der letzte Zweig:** „noch nicht sehen" heißt *bevor sie steht*, nicht *nie wieder*. Ohne ihn verlören Spieler rückwirkend den Spiele-Log unter `/teams/spiele` — der lädt für jedes vergangene Spiel die Schlagreihenfolge, und niemand wird hundert alte Spieltage nachträglich freigeben. Ein gespieltes Spiel ist Geschichte, keine Planung. (Meine Festlegung, nicht abgesprochen — sie ist die vorsichtigere: sie nimmt niemandem etwas weg, was er heute hat.) Die Endpunkte fragen und geben sonst `List.of()` zurück — **leer, nicht 403**: `PlayerDashboard` trägt den leeren Fall schon, einen Fehler trüge es nicht, und ein 403 im Netzwerk-Protokoll verrät ohnehin, dass es etwas zu sehen gäbe.

Die fünf Endpunkte bleiben auf `isAuthenticated()` und bleiben in `ERLAUBT` stehen — wie `PlayerController#getTrainingMonths` prüfen sie selbst, **was** sie herausgeben. Die Kommentare dort sind auf die neue Regel zu aktualisieren.

- [ ] **Step 1: Write the failing tests**

```java
// Review Focus 5 — der Name klingt nach Statistik, der Inhalt ist die Aufstellung
@Test
void vorDerFreigabeSiehtEinSpielerWederAufstellungNochPositionen() throws Exception {
    mockMvc.perform(get("/api/games/" + gameId + "/lineup").with(SPIELER)).andExpect(jsonPath("$").isEmpty());
    mockMvc.perform(get("/api/games/" + gameId + "/staff").with(SPIELER)).andExpect(jsonPath("$").isEmpty());
    mockMvc.perform(get("/api/games/" + gameId + "/substitutions").with(SPIELER)).andExpect(jsonPath("$").isEmpty());
    mockMvc.perform(get("/api/gamedays/" + gameDayId + "/lineups").with(SPIELER)).andExpect(jsonPath("$.lineups").isEmpty());
    mockMvc.perform(get("/api/gamedays/" + gameDayId + "/stats").with(SPIELER)).andExpect(jsonPath("$").isEmpty());
}

@Test
void nachDerFreigabeSiehtErAlles() throws Exception { /* freigeben, dann dieselben fuenf → nicht leer */ }

@Test
void derAdminSiehtVorherSchon() throws Exception { /* dieselben fuenf mit ADMIN → nicht leer */ }

// Review Focus 1 — der wichtigste Fall dieses Plans
@Test
void einScorerSiehtDieAufstellungAuchOhneFreigabe() throws Exception {
    // Spieler-Account mit mayScore → /games/{id}/lineup liefert die Eintraege
}

// Review Focus 4
@Test
void einAccountOhneVerknuepftenSpielerFaelltNichtUm() throws Exception {
    // playerId == null → leere Liste, kein 500
}

// Review Focus 6
@Test
void einVergangenerSpieltagBleibtFuerSpielerLesbar() throws Exception {
    // Spieltag mit date = gestern, nie freigegeben → /games/{id}/lineup liefert die Eintraege
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielerLeserechteIntegrationTest`
Expected: FAIL — der Spieler bekommt heute alles.

- [ ] **Step 3: `AufstellungSichtbarkeit` schreiben und an fünf Stellen fragen**

- [ ] **Step 4: Run the whole backend suite**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS — besonders alles, was Scoring heißt.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/shared/security/AufstellungSichtbarkeit.java backend/src/main/java/com/softball/adapter/in/web/GameController.java backend/src/main/java/com/softball/adapter/in/web/GameDayController.java backend/src/test/java/com/softball/integration/SpielerLeserechteIntegrationTest.java
git commit -m "🔒 Die Aufstellung ist zu, bis sie steht"
```

---

### Task 4: Was der Spieler stattdessen liest

**Files:**
- Modify: `frontend/src/types/index.ts` (`GameDayResponse.lineupsReleasedAt?: string | null`), `frontend/src/components/dashboard/PlayerDashboard.tsx`, `frontend/src/components/export/LineupSheet.tsx`
- Test: `frontend/src/components/dashboard/PlayerDashboard.test.tsx` (erweitern)

**Interfaces:**
- Consumes: `lineupsReleasedAt` aus `GET /api/gamedays/{id}` (Task 1).

**Der Unterschied, auf den es ankommt:** „noch keine Aufstellung" und „noch nicht freigegeben" sind zwei verschiedene Sätze. Heute kennt die Seite nur den ersten, und ab Task 3 wäre er bei jedem gesperrten Spieltag gelogen.

- **Nicht freigegeben:** die Karte „Lineup" zeigt **„Die Aufstellung steht noch nicht. Sobald sie steht, findest du sie hier."** — in `text-white/65`, kein Rot, keine Zahl, kein Datum. Die Spiel-Umschalter darüber verschwinden; drei Knöpfe, die alle dasselbe sagen, sind Lärm.
- **Karte „Bin ich dabei?":** der obere Teil (Zusage aus `availablePlayers`) **bleibt**. Nur die Zeilen je Spiel („Position SS · Schlagplatz 4") weichen demselben Satz.
- **Freigegeben, aber leer:** bleibt beim heutigen „Für dieses Spiel gibt es noch keine Aufstellung."
- **Derselbe Satz im Aufstellungsbogen.** `/gameday/:id/export` (`components/export/LineupSheet.tsx`) liegt nur hinter `RequireAuth` und würde einem Spieler vor der Freigabe stumm leere Zeilen zeigen. Er bekommt dieselbe Zeile — eine Seite, die leere Kästchen druckt, ist schlimmer als eine, die sagt, warum sie leer ist.

- [ ] **Step 1: Write the failing test**

```tsx
it('sagt vor der Freigabe, dass die Aufstellung noch nicht steht', async () => {
  // gameDay ohne lineupsReleasedAt, Lineup-Antworten leer
  expect(await screen.findByText(/Die Aufstellung steht noch nicht/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Spiel 2' })).not.toBeInTheDocument()
})

it('zeigt die Zusage auch vor der Freigabe', async () => {
  expect(await screen.findByText('Du bist dabei')).toBeInTheDocument()
})

// Review Focus 3
it('unterscheidet freigegeben-aber-leer von nicht-freigegeben', async () => {
  // lineupsReleasedAt gesetzt, Lineup leer → 'Für dieses Spiel gibt es noch keine Aufstellung.'
  expect(screen.queryByText(/steht noch nicht/)).not.toBeInTheDocument()
})

it('zeigt nach der Freigabe die volle Liste wie bisher', async () => { /* Bestandsverhalten */ })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/dashboard/PlayerDashboard.test.tsx`
Expected: FAIL — der Satz steht nirgends.

- [ ] **Step 3: Beide Karten auf `lineupsReleasedAt` umstellen**

- [ ] **Step 4: Run tests and build**

Run: `cd frontend && npx vitest run src/components/dashboard && npm run build`
Expected: PASS, Build grün.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/components/dashboard/PlayerDashboard.tsx frontend/src/components/dashboard/PlayerDashboard.test.tsx frontend/src/components/export/LineupSheet.tsx
git commit -m "✨ „Steht noch nicht\" statt „gibt es nicht\""
```

---

### Task 5: Der Schalter im Planer

**Files:**
- Modify: `frontend/src/api/client.ts` (`releaseLineups`), `frontend/src/components/planner/GameDayPlanner.tsx`
- Create: `frontend/src/components/planner/FreigabeLeiste.tsx`
- Test: `frontend/src/components/planner/FreigabeLeiste.test.tsx`

**Interfaces:**
- Consumes: `PUT /api/gamedays/{id}/lineups/release` (Task 2).
- Produces:
  ```ts
  export const releaseLineups = (id: number, released: boolean) => request<GameDayResponse>(...)   // client.ts
  export function FreigabeLeiste(props: {
    freigegebenSeit: string | null
    seitdemGeaendert: boolean
    hatAufstellung: boolean
    umschalten: (released: boolean) => Promise<void>
  }): JSX.Element
  ```

**Warum eine Zeile und kein Werkzeug-Knopf:** Der Werkzeugstreifen trägt Handlungen, die man beiläufig auslöst (ein PDF, eine Liste). Die Freigabe ist ein **Zustand des Spieltags** — sie muss ablesbar sein, ohne dass man sie anfasst. Sie gehört deshalb als eigene Zeile direkt unter den Titel, über die Knopfreihen, volle Breite:

```
○  Noch nicht für Spieler freigegeben            [ Freigeben ]
●  Für Spieler freigegeben · Sa 09:12            [ zurücknehmen ]
◐  Seit der Freigabe geändert · Sa 09:12         [ Erneut freigeben ]  [ zurücknehmen ]
```

- **Freigeben ist ein Klick**, ohne Rückfrage: es ist der gewollte Normalfall und jederzeit umkehrbar.
- **Zurücknehmen fragt nach** (`ConfirmModal`, Hausregel für Überraschendes): „Die Aufstellung verschwindet dann wieder aus der Spieler-Ansicht."
- **Der dritte Zustand sagt, was er ist, und verspricht nichts.** „Seit der Freigabe geändert" — **nicht** „nicht freigegeben", denn die Spieler sehen die Änderung ja. Es ist ein Haken für dich, keine Sperre für sie. „Erneut freigeben" setzt ihn zurück und ändert für Spieler nichts; der Knopf heißt deshalb nicht „Veröffentlichen".
- **Der Punkt ist amber, solange eine Aufstellung dasteht und nicht freigegeben ist** — und ebenso im dritten Zustand — dieselbe Sprache wie die amber-Markierung bei „Anwesend" unter neun Spielern. Ohne Aufstellung bleibt die Zeile grau und der Knopf aus: einen leeren Spieltag freizugeben wäre eine Zusage über nichts.
- Nach dem Umschalten eine Rückmeldung über den vorhandenen `toast`.

- [ ] **Step 1: Write the failing test**

```tsx
it('nennt den Zustand und bietet genau eine Handlung an', () => {
  render(<FreigabeLeiste freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung umschalten={fn} />)
  expect(screen.getByText(/Noch nicht für Spieler freigegeben/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Freigeben' })).toBeEnabled()
})

it('zeigt nach der Freigabe, seit wann', () => {
  render(<FreigabeLeiste freigegebenSeit="2026-10-31T09:12:00" seitdemGeaendert={false} hatAufstellung umschalten={fn} />)
  expect(screen.getByText(/Für Spieler freigegeben/)).toBeInTheDocument()
  expect(screen.getByText(/09:12/)).toBeInTheDocument()
})

it('meldet eine Aenderung nach der Freigabe — ohne zu behaupten, es sei zu', () => {
  render(<FreigabeLeiste freigegebenSeit="2026-10-31T09:12:00" seitdemGeaendert hatAufstellung umschalten={fn} />)
  expect(screen.getByText(/Seit der Freigabe geändert/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Erneut freigeben' })).toBeEnabled()
  expect(screen.queryByText(/Noch nicht für Spieler freigegeben/)).not.toBeInTheDocument()
})

it('fragt vor dem Zuruecknehmen nach', async () => {
  // Klick auf „zurücknehmen" → ConfirmModal, umschalten noch NICHT gerufen
  expect(fn).not.toHaveBeenCalled()
})

it('gibt einen leeren Spieltag nicht frei', () => {
  render(<FreigabeLeiste freigegebenSeit={null} seitdemGeaendert={false} hatAufstellung={false} umschalten={fn} />)
  expect(screen.getByRole('button', { name: 'Freigeben' })).toBeDisabled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/planner/FreigabeLeiste.test.tsx`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Leiste bauen und im Planer unter dem Titel einhängen**

`hatAufstellung` = mindestens ein Spiel mit `lineupEntryCount > 0` (steht schon in `GameResponse`, kein zusätzlicher Abruf).

- [ ] **Step 4: Run tests and build**

Run: `cd frontend && npx vitest run src/components/planner && npm run build`
Expected: PASS, Build grün.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/components/planner/FreigabeLeiste.tsx frontend/src/components/planner/FreigabeLeiste.test.tsx frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ Eine Zeile sagt, ob der Spieltag steht"
```

---

### Task 6: Damit man es merkt, ohne im Planer zu sein

**Files:**
- Modify: `frontend/src/components/dashboard/HeroNextGameDay.tsx`
- Test: `frontend/src/components/dashboard/HeroNextGameDay.test.tsx` (vorhanden, erweitern)

**Interfaces:**
- Consumes: `lineupsReleasedAt`, `lineupsChangedSinceRelease` aus dem bereits geladenen `GameDayResponse` — **kein zusätzlicher Abruf**.

**Das Problem, das das löst:** Die Leiste aus Task 5 sieht nur, wer den Planer offen hat. Wer eine Aufstellung baut und dann weiterklickt, merkt das Vergessen erst, wenn jemand fragt, wo die Aufstellung bleibt.

**Die Anzeige** ist eine Zeile am nächsten Spieltag der Werkbank, in derselben Sprache wie die Leiste: amber Punkt, „Aufstellung noch nicht freigegeben" bzw. „Seit der Freigabe geändert". Sie ist ein **Link in den Planer**, nicht selbst ein Schalter — freigeben tut man dort, wo man die Aufstellung auch sieht.

**Nur unter drei Bedingungen**, sonst ist es Genörgel: der Betrachter ist Admin, es gibt überhaupt eine Aufstellung (`lineupEntryCount > 0` in mindestens einem Spiel), und es ist nicht freigegeben oder seit der Freigabe geändert. **Nicht** auf der Startseite `/`: die Spieltag-Kachel hat kein Höhenbudget mehr (bei 393×760 fehlen heute schon rund 20 Pixel), und eine Zeile dort kostet das Versprechen „kein Scrollen".

- [ ] **Step 1: Write the failing test**

```tsx
it('erinnert den Admin an die fehlende Freigabe', () => {
  // Spieltag mit Aufstellung, lineupsReleasedAt null, Rolle ADMIN
  expect(screen.getByText(/noch nicht freigegeben/i)).toBeInTheDocument()
})

it('schweigt ohne Aufstellung', () => {
  // lineupEntryCount 0 in allen Spielen → keine Zeile
})

it('schweigt nach der Freigabe', () => { })

it('meldet sich wieder, wenn sich danach etwas geaendert hat', () => {
  // lineupsChangedSinceRelease → Zeile da
})

it('zeigt einem Spieler nichts davon', () => {
  // Rolle PLAYER → keine Zeile
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/dashboard/HeroNextGameDay.test.tsx`
Expected: FAIL — die Zeile gibt es nicht.

- [ ] **Step 3: Zeile einbauen**

- [ ] **Step 4: Run tests and build**

Run: `cd frontend && npx vitest run src/components/dashboard && npm run build`
Expected: PASS, Build grün.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/HeroNextGameDay.tsx frontend/src/components/dashboard/HeroNextGameDay.test.tsx
git commit -m "✨ Die Werkbank erinnert an die fehlende Freigabe"
```

---

## Abschluss

- [ ] `cd backend && ./mvnw test -s .mvn/local-settings.xml`
- [ ] `cd frontend && npm run lint && npm run build && npx vitest run`
- [ ] `cd frontend && npm run test:e2e` — **Pflicht**, weil Task 3 Endpunkte anfasst, die das Live-Scoring liest (`env_e2e_stale_backend` beachten: kein altes Backend auf :8080).
- [ ] `CLAUDE.md`: unter „Key domain rules" die Freigabe aufnehmen — Zeitstempel **und Fingerabdruck** am Spieltag, fünf Leseendpunkte, **Scorer ausgenommen**, **Vergangenes bleibt lesbar**, leer statt 403, Zusage ist nicht Aufstellung, „geändert" ist ein Haken für den Trainer und keine Sperre, Altdaten bewusst nicht freigegeben.
- [ ] Danach erst `docs/superpowers/plans/2026-10-28-aufstellung-teilen.md` — die Vorschau-Seite erbt die Regel und braucht nur noch den Satz „Die Aufstellung steht noch nicht."
