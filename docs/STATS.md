# Stats / Batting Statistics

Aggregierte Spieler-Statistiken über Saison(s) hinweg. Basiert auf `AtBat`-Records aus Old-Scoring + (optional) `SpielbogenAtBat`. Position-Weighting für Game-Counting.

## Routes
- `/stats` — `StatsPage` mit Saison-Filter, Top-Hitter, Position-Counts
- Dashboard zeigt Season-Stats + Top-Hitter via `BattingStatsTable`

## Backend Files
- `application/StatsService.java` — Position-Counts, Game-Counts gewichtet
- `application/BattingStatsService.java` — AVG, OBP, SLG, OPS, H, PA pro Player
- `domain/service/BattingStatsCalculator.java` — pure Logik (PA, AB, H, BB, K, AVG, OBP, SLG, OPS)
- `adapter/in/web/BattingStatsController.java`
- `domain/port/out/AtBatRepository.java` — `findByPlayerIdAndSeasonId`

## Domain-Regeln
- **Game-Weighting in Stats** (`StatsService`):
  - Field-Position (P/C/1B/2B/3B/SS/LF/CF/RF) = **1.0** Spiel
  - **EH** (Extra Hitter, kein Field) = **0.5** Spiel
  - **DH-Batter** (annotiert via `dhBatterPlayerId`) = **0.5** Spiel
  - `position == null` = 1.0 Spiel (gezählt aber nicht in `positionCounts`)
- **Batting-Stats-Berechnung** (`BattingStatsCalculator`):
  - PA = Plate Appearances (alles inkl. BB, HBP, SAC)
  - AB = At-Bats (PA - BB - HBP - SAC)
  - H = Hits (1B + 2B + 3B + HR)
  - AVG = H / AB
  - OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
  - SLG = Total-Bases / AB (1B=1, 2B=2, 3B=3, HR=4)
  - OPS = OBP + SLG
- **Sacrifice-Behandlung:** SH und SF reduzieren AB (und somit AVG-Schutz). SF zählt für OBP-Nenner.
- **Spielbogen-Quelle:** aktuell trägt Spielbogen NICHT zu globalen Stats bei (separat). Falls Wunsch → AtBatRepository erweitern.

## Frontend Files
- `components/stats/StatsPage.tsx`
- `components/stats/BattingStatsTable.tsx` — AVG/OBP/H/PA + SLG/OPS-Toggle ("Mehr Details")
- `components/stats/GamesStatsTable.tsx` — Game-Counts (mit Position-Aufschlüsselung)
- `components/stats/StatsGlossarySheet.tsx` — Erklärung Abkürzungen
- `hooks/useStats.ts`

## Häufige Fallstricke
- **Top-Hitter zeigt falsche Werte**: meist Cache-Stale oder falsche Filter (Saison/All-Time). Backend-Endpoint prüfen.
- **DH-Batter doppelt gezählt**: passiert wenn DH-Annotation falsch verstanden wird. DH ist KEIN eigener `LineupEntry`, nur `dhBatterPlayerId` auf Field-Player. Field-Player zählt 1.0, DH-Batter 0.5.
- **Game-Total stimmt nicht überein**: Position-Counts summieren mit EH+DH-Weighting (nicht 1.0). Total-Games-Played jedoch zählt jeden Anwesenheits-Tag = 1.0.
