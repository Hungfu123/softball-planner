# Live-Scoring: ERROR-Flow

**Status:** Draft
**Datum:** 2026-05-08
**Scope:** Frontend + Backend
**Owner:** Hung

## Problem

Live-Scoring kennt aktuell keinen Reached-on-Error (ROE). Wenn der Batter durch einen Defense-Fehler an 1B kommt, muss der Scorer das fehlerhaft als Hit oder Out erfassen → Stats verfälscht.

Spielbogen-Pfad hat Error-Tracking inkl. `errorPosition` (E1–E9). Live-Scoring soll eine schlanke Variante davon bekommen, die zur Speed-First-UX passt.

## Nicht-Ziele

- Wild Pitch / Passed Ball als eigene Buttons. Voluntary Advance auf WP/PB läuft über bestehenden Steal-Tap (akzeptierte SB-Stats-Inflation). Forced Dead-Ball-Advance läuft über bestehenden Overthrow-Button.
- Fielder-Position-Picker (E1–E9) im Live-Scoring. Nicht in 1-Sekunden-Tap-Flow integrierbar. Spielbogen bleibt analytische Quelle für E-Position-Tracking.
- Earned/Unearned-Run-Logik. Wir tracken keine Pitcher-Stats für eigenes Team.

## UI-Änderung

### Button-Layout

Reihe 2 wird von 2-col auf 3-col erweitert:

```
Reihe 1 (72px):  [ TREFFER ] [ STRIKEOUT ] [ AUS ]
Reihe 2 (60px):  [  WALK  ] [  HBP   ] [ ERROR ]
```

`ERROR`-Button:
- Farbe: `amber-700` (zwischen HBP-amber und neutral, klar als Defense-Fehler erkennbar)
- Label: `ERROR`
- Subtitle: `Reached on Error` (wie HBP-Subtitle-Pattern)

### Flow nach ERROR-Tap

1. AB-Eintrag mit Result `REACHED_ON_ERROR` direkt persistiert (kein Sub-Picker, kein Confirm-Dialog).
2. Backend setzt Batter auf 1B, advanced forced Runners (1B → 2B wenn 1B besetzt war, 2B → 3B wenn forced, 3B → Home wenn forced).
3. Optional: Flash-Animation analog zu Walk/HBP, Label `REACHED ON ERROR`.
4. Falls Runner anders gelaufen sind: User korrigiert via Steal-Tap (für Extra-Advance) oder Korrektur-Sheet.

### Korrektur-Sheet

`CorrectionSheet` zeigt ROE als editierbaren AB-Eintrag analog zu allen anderen Results. Edit erlaubt Result-Wechsel (z.B. ROE → SINGLE) plus manuelle BaseState-Korrektur.

## Datenmodell

### Frontend (`types/index.ts`)

```ts
export type AtBatResult =
  | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN'
  | 'WALK' | 'HIT_BY_PITCH'
  | 'STRIKEOUT' | 'OUT'
  | 'REACHED_ON_ERROR'   // neu
```

`AT_BAT_RESULT_LABELS` + Eintrag `REACHED_ON_ERROR: 'Reached on Error'`.

### Backend (Java)

`AtBatResult` Domain-Enum + `REACHED_ON_ERROR`. JPA-Mapping (Persistence-Adapter) entsprechend erweitern.

### Stats

`PlayerBattingStatsResponse` + Feld `reachedOnError: number`.

| Stat | Verhalten bei ROE |
|------|-------------------|
| Plate Appearances | +1 |
| At-Bats | +1 |
| Hits | +0 |
| Outs | +0 |
| Reached On Error | +1 |
| Total Bases | +0 |
| Batting Average | sinkt (AB++, Hits=) |
| OBP | sinkt (PA++, Hits+BB+HBP=) |

`BattingStatsCalculator` (`domain/service/`) muss `REACHED_ON_ERROR` korrekt buckets. `BattingStats` Domain-Model + Feld `reachedOnError`. `BattingStatsService` (Application) DTO-Mapping + `PlayerBattingStatsResponse.reachedOnError`.

## API-Änderungen

### `RecordAtBatRequest`

Keine neuen Felder. `result: 'REACHED_ON_ERROR'` reicht. Backend leitet Default-BaseState ab (Batter→1B, forced Runners +1).

### Auto-Advance-Logik

`GameScoringService` (`application/`) muss bei `REACHED_ON_ERROR` analoge Forced-Advance-Logik wie bei `WALK` / `HIT_BY_PITCH` ausführen:

- Batter immer auf 1B
- 1B-Runner → 2B wenn 1B besetzt war
- 2B-Runner → 3B wenn 2B besetzt + 1B zwingend besetzt
- 3B-Runner → Home wenn alle Bases zwangsweise belegt (Bases Loaded)

Identisch zu Walk-Logik. Wiederverwenden.

## Architektur-Auswirkungen

- **Domain-Layer:** `AtBatResult` Domain-Enum + `REACHED_ON_ERROR`. `BattingStatsCalculator` + Branch. `BattingStats` + Feld.
- **Application-Layer:** `GameScoringService` (Forced-Advance bei ROE) + `BattingStatsService` (DTO-Mapping).
- **Adapter-Layer:**
  - `AtBatMapper` / `AtBatEntity` JPA-Enum-Mapping
  - `PlayerBattingStatsResponse` + Feld
  - Frontend: `ActionButtons.tsx` (neuer Button), `ScoringPage.tsx` (Flash-Animation analog Walk-Flash), `types/index.ts` (Enum + Label), Stats-Display wo `reachedOnError` Sinn ergibt (Player-Stats-Page)

## Tests

- Backend: `GameScoringServiceTest` — neuer Test `recordReachedOnError_advancesForcedRunners`. Bases-Loaded → Run scored, Batter→1B.
- Backend: `BattingStatsCalculatorTest` — ROE bumped PA + AB + ROE-Counter, kein Hit/Out.
- Frontend: `ActionButtons` Snapshot-/Behavior-Test für neuen Button.
- Frontend: `CorrectionSheet` Edit eines ROE-Eintrags.

## Migration

Keine DB-Migration nötig wenn `at_bat_result` als VARCHAR persistiert wird. Falls als ENUM-Column → Liquibase/Flyway-Migration für neuen Wert hinzufügen.

## Offene Punkte

Keine. Spec ready für Implementierungs-Plan.
