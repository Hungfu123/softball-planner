# Design: Runs Scored (R) als Batting-Stat pro Spieler

**Datum:** 2026-06-22
**Status:** Approved (Design)
**Scope:** Backend (Domain + Application + DTO) + Frontend (Stats-Tabelle + PDF)

## Ziel

Neue Batting-Statistik **R (Runs Scored)** = wie oft ein Spieler selbst Home gekreuzt hat.
Abzugrenzen von **RBI** (Läufe durch eigenen Schlag *ermöglicht*) und **HR**. R zählt:

- Runner der durch einen Schlag (Hit/HR/Walk-forced/Error) Home kreuzt
- **Steal of Home** und Kaskaden-Scoring (Double-Steal, bei dem ein Runner Home kommt)
- Batter selbst bei HR / Inside-Park-HR

## Datenlage (Analyse: geht es?)

**Quelle:** Legacy `AtBat` (geschrieben von der ScoringPage) + `BaseRunningEvent` (Steals) —
exakt die Quelle, die `BattingStatsCalculator` schon nutzt. Spielbogen-Scoring ist NICHT betroffen.

**R wird nicht gespeichert**, ist aber ableitbar:

- `AtBat.baseStateAfter : BaseState(first, second, third)` hält **Player-IDs** der Runner nach dem Schlag.
- `AtBat.runsScored : Integer` = Anzahl Runs in diesem Schlag (autoritativ, fürs Team-Score).
- Es existiert bereits eine **chronologische Replay-Engine** (`GameScoringService.computeStealRuns` /
  `applyStealingEvent`), die Base-States rekonstruiert und Steal-of-Home + Kaskaden auflöst.

**Verdikt: machbar.**
- **Steals → exakt:** Die Cascade-Logik kennt den scorenden Runner (Steal-of-Home = der Runner selbst;
  Kaskade = `state.third()` wird Home gedrückt).
- **Batting-Runs → near-exakt:** per-AtBat-Diff `stateBefore` vs `baseStateAfter`, gedeckelt auf `runsScored`.
  Mehrdeutigkeit nur in seltenen Plays mit gleichzeitigem Out + Score (Force-Out an Home) — gelöst per
  dokumentierter Heuristik (führender Runner scort zuerst).

## Architektur (Ansatz B — DRY, saubere Schichtung)

### Problem heute
Die Steal-Cascade-Logik (`applyStealingEvent`, `computeStealRuns`, record `StealApplication`) liegt in
`GameScoringService` (**Application-Layer**) — eigentlich reine Domain-Logik (milder Schicht-Smell).
Sie kennt aktuell nur die *Anzahl* Runs, nicht *wer* gescort hat.

### Lösung
Neuer Pure-Domain-Service **`BaseRunningReplay`** (`domain/service/`), der die Cascade-Logik aufnimmt und
den Replay um **Runner-Identität** erweitert.

```
domain/service/BaseRunningReplay.java   (NEU, pure, kein Spring/JPA/I/O)
  record ReplayResult(int totalStealRuns, Map<Long,Integer> runsByPlayerId)
  ReplayResult replay(List<AtBat> atBats, List<BaseRunningEvent> steals)
  // intern: StealApplication mit scorerId; per-AtBat Batting-Run-Attribution
```

**Konsumenten:**
1. `GameScoringService.computeStealRuns(...)` → delegiert an `BaseRunningReplay.replay(...).totalStealRuns()`.
   **Verhalten unverändert** (identische Cascade-Logik, nur verschoben).
2. `BattingStatsCalculator.calculateForPlayers(players, atBats, steals)` → ruft `BaseRunningReplay` intern,
   setzt `runs` pro Spieler aus `runsByPlayerId`.

`applyStealingEvent` + `StealApplication` werden aus `GameScoringService` **entfernt** und nach
`BaseRunningReplay` gezogen. `GameScoringService.getScoreboard` nutzt `applyStealingEvent` aktuell auch für
die Base-State-Anzeige (Zeile ~383) → der Domain-Service exponiert die Einzelschritt-Methode
`applyStealingEvent(BaseState, BaseRunningEvent) : StealApplication` öffentlich, damit getScoreboard sie
weiter nutzen kann.

### Algorithmus `BaseRunningReplay.replay`

Timeline = AtBats + Steals, sortiert nach `createdAt` (AtBat vor Steal bei Gleichstand) — identisch zur
heutigen `computeStealRuns`.

State-Variable `BaseState state`, plus `int prevInning`. Pro Timeline-Element:

**AtBat `ab`:**
1. **Inning-Reset:** wenn `ab.inning > prevInning` → `stateBefore = BaseState.empty()` (gestrandete Runner
   des Vor-Innings scoren NICHT). Sonst `stateBefore = state` (laufender Replay-State).
   *Dies ist die kritische Korrektheits-Subtilität:* der Replay resynct `state = ab.baseStateAfter` an jedem
   AtBat, daher muss der Inning-Wechsel explizit auf leer gesetzt werden, sonst gelten Vor-Inning-Runner als
   "verschwunden = gescort".
2. **Batting-Run-Attribution** (siehe unten) mit `stateBefore`, `ab.baseStateAfter`, `ab.runsScored`, `ab.batter`, `ab.result`.
3. `state = ab.baseStateAfter` (oder empty). `prevInning = ab.inning`.

**Steal-Event `e`:**
- `StealApplication app = applyStealingEvent(state, e)`; `state = app.state()`.
- `totalStealRuns += app.runs()`; wenn `app.scorerId() != null` → `runsByPlayerId[scorerId]++`.

### Batting-Run-Attribution (Heuristik)

Pro AtBat:
- **Universe** potenzieller Scorer = Runner in `stateBefore` (1B/2B/3B) **+** Batter, falls `result.reachedBase()`
  (HR/Inside-Park: Batter zählt mit).
- **Geblieben** = Player-IDs, die in `baseStateAfter` noch auf einer Base stehen.
- **Verschwunden** = Universe − Geblieben. Diese haben entweder gescort ODER wurden ausgespielt (Force/DP).
- **`scoredCount = ab.runsScored`** (autoritativ).
- **Priorität** (führender Runner zuerst): `3B-Runner, 2B-Runner, 1B-Runner, Batter`. Die ersten
  `scoredCount` aus "Verschwunden" in dieser Reihenfolge → `runsByPlayerId[id]++`.
- HR/Inside-Park: alle Verschwundenen = Scorer, `scoredCount` == Universe-Größe → Heuristik greift exakt.

**Begründung der Priorität:** Bei einem Play, in dem gleichzeitig ein Runner gescort UND einer ausgespielt
wurde (z.B. Force-Out 2. Base, Runner von 3B scort), bevorzugt die Priorität den heimnächsten Runner als
Scorer — die in der Praxis fast immer korrekte Annahme. Das Modell speichert nicht, *welcher* Runner
ausgespielt wurde, daher ist exakte Auflösung dieses Randfalls nicht möglich; `runsScored` garantiert aber
die korrekte *Gesamtzahl* pro Spiel.

### Bekannte Grenzen (dokumentiert, kein Blocker)
- Force-Out-an-Home gleichzeitig mit Score eines anderen Runners: Attribution per Priorität (selten, Gesamt-R korrekt).
- Pinch-/Courtesy-Runner: R wird der Player-ID gutgeschrieben, die in `baseStateAfter` auf der Base steht.
  Korrekt, sofern Substitutionen den Base-State auf die neue Player-ID umschreiben (bestehendes Verhalten).

## Datenmodell-Änderungen

- `BattingStats` (record): neues Feld `int runs` (nach `homeRuns` einsortieren, vor `walks`? — Position:
  direkt nach `homeRuns`, da semantisch verwandt). **Keine DB-Migration** (abgeleitet).
- `PlayerBattingStatsResponse` (DTO): neues Feld `int runs` + im `from(...)`-Mapping.

## Frontend

- `PlayerBattingStatsResponse` Type (`types/index.ts`): `runs: number`.
- `BattingStatsTable.tsx`: neue sortierbare Spalte **"R"** (Tooltip: "Runs Scored — selbst Home gekreuzt").
  Platzierung neben HR/RBI. `SortKey`-Union um `'runs'` erweitern.
- `statsPdf.ts`: R-Spalte ergänzen.

## Testing

R-**Korrektheit** wird per Backend-Unit-Tests abgesichert (die ganze Heuristik/Replay-Logik). Neue
**E2E** sind bewusst schlank: nur **UI-Durchstich** (R-Spalte rendert + Sortierung).

### Backend-Unit-Tests — Korrektheit (Kern)
`BaseRunningReplayTest` (neu, pure Domain, kein Docker):
- HR mit Bases loaded → 4 R auf 4 Spieler (Batter + 3 Runner).
- Single, Runner von 3B scort → 1 R auf den 3B-Runner, Batter 0.
- Steal of Home → 1 R auf den Runner.
- Double-Steal-Kaskade (1B+2B+3B, 1B klaut) → 1 R auf 3B-Runner (Home gedrückt).
- Force-Out 3. Out an Home (`runsScored=0`) → 0 R trotz verschwundenem Runner.
- Inning-Grenze: gestrandeter Runner im Vor-Inning → 0 R (stateBefore-Reset).
- DH-Batter scort → R auf DH-Batter-Player-ID.
- **Score-Konsistenz:** Σ(runsByPlayer) + totalStealRuns == bestehender Team-Score für Sample-Spiele.

`BattingStatsCalculator`-Tests: bestehende um `runs`-Assertions erweitern.

### E2E — UI-Durchstich (neu, schlank)
Neuer Playwright-Test (`e2e/scoring/scoring-stats.spec.ts` erweitern oder Sibling), Pattern wie bestehende
Stats-Tests (`seedAtBat` + Navigation):
1. Seed AtBats mit bekannten R (z.B. HR bases-loaded → 4 R verteilt; Single mit Runner-3B-Score).
2. Navigiere zu `/stats?scope=game&game=<gameId>`.
3. Assert: Spalten-Header **"R"** sichtbar.
4. Assert: R-Zellenwert eines bekannten Spielers stimmt.
5. Klick auf R-Header → Assert: Zeilen nach R absteigend sortiert.

### Pflicht-Läufe vor Commit (Ansatz B fasst `GameScoringService` an)
```
docker compose up -d db
cd frontend && npm run test:e2e     # 43 bestehende = Refactor-Safety-Net + neuer R-UI-Test
cd backend && ./mvnw test -s .mvn/local-settings.xml   # inkl. BaseRunningReplayTest
cd frontend && npm run build        # tsc + vite
```
Die 43 bestehenden E2E sind das eigentliche Sicherheitsnetz für den Cascade-Verschiebe-Schritt.

## Risiken & Mitigation
- **Live-Scoring-Regression** durch Verschieben der Cascade-Logik → Logik wird *verschoben, nicht geändert*;
  E2E-Suite + bestehende GameScoringService-Tests fangen Abweichungen.
- **Score-Drift** (R-Summe ≠ Team-Score) → beide aus derselben `BaseRunningReplay`-Quelle; Test:
  Σ batting-runsByPlayer + totalStealRuns == bestehender `computeLiveScoreUs`.

## Nicht im Scope (YAGNI)
- R im Spielbogen-System.
- Explizite R-Erfassung in der Scoring-UI.
- R für Gegner-Teams.
