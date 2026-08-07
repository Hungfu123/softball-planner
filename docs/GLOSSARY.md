# Glossar — Softball Lineup Planner

Begriffe die im Code, in `CLAUDE.md` und den Feature-Docs vorkommen. Zweiteilung: **Softball allgemein** (Sportregeln) und **projektspezifisch** (Domain-Model, Konventionen dieser App). Domain-Model-Klassen in `backend/src/main/java/com/softball/domain/model/`.

---

## Softball allgemein

| Begriff | Bedeutung |
|---------|-----------|
| **Inning** | Spielabschnitt. Jede Hälfte spielt eine Seite im Angriff bis 3 Outs. |
| **At-Bat (AB)** | Ein Schlagdurchgang eines Batters. Model `AtBat` / `SpielbogenAtBat`. |
| **Out** | Ausscheiden eines Angreifers. 3 Outs → Seitenwechsel. |
| **K (Strikeout)** | Batter schlägt aus = 1 Out. |
| **DP / TP** | Double Play (2 Outs in einer Aktion) / Triple Play (3 Outs). `OutType`. |
| **Force-Out** | Out durch Ballkontrolle an der Base, zu der ein Runner gezwungen ist zu laufen. |
| **RBI** | Run Batted In — Run der durch die Aktion des Batters erzielt wurde. |
| **Steal (SB / CS)** | Stolen Base (geglückter Base-Klau) / Caught Stealing (dabei out). `StealingEventType`. |
| **WP / PB** | Wild Pitch / Passed Ball — Runner rückt durch Fehler von Pitcher/Catcher vor. |
| **HBP** | Hit By Pitch — Batter vom Wurf getroffen, geht auf 1. Base. |
| **Walk (BB)** | Base on Balls — Batter geht nach 4 Balls frei auf 1. Base. |
| **Walkoff** | Spielentscheidender Run der Heimmannschaft in der letzten Inning-Hälfte → Spielende sofort. |
| **AVG / OBP / SLG / OPS** | Batting-Average / On-Base % / Slugging % / OPS (=OBP+SLG). Berechnet in `BattingStatsCalculator`. Siehe `docs/STATS.md`. |
| **Field Positions** | Feldpositionen (Pitcher, Catcher, Infield, Outfield). `Position` / `InfieldPosition`. |

## DH / EH — Lineup-Rollen (⚠️ App-Besonderheit)

| Begriff | Bedeutung |
|---------|-----------|
| **DH (Designated Hitter)** | Schlägt für einen Feldspieler. **Im normalen Lineup KEIN eigener Eintrag** — nur Annotation `dhBatterPlayerId` auf dem `LineupEntry` des Feldspielers. Im **Spielbogen** dagegen eigener `SpielbogenSlot` mit `position='DH'`. Max 1 DH/Spiel. Zählt als 0.5 Game. |
| **DH-Host** | Der Feldspieler, der sein Schlagrecht an einen DH abgegeben hat (schlägt also nicht). **Darf** Base Coach sein. |
| **DH-Batter** | Der Bank-Spieler, der für den DH-Host schlägt. Schlägt, **darf NICHT** coachen. Stats: 0.5 Game. |
| **EH (Extra Hitter)** | Zusätzlicher Batter ohne Feldposition. Darf im Lineup mehrfach vorkommen (anders als Feldpositionen, die unique sind). Zählt als 0.5 Game im Position-Weighting. |
| **Position-Weighting** | Für Stats: Feldposition = 1.0 Game, EH = 0.5, DH-Batter = 0.5, `position=null` = 1.0 (gezählt, aber nicht in `positionCounts`). |

## Spielbogen & RFL-Scoring

| Begriff | Bedeutung |
|---------|-----------|
| **Spielbogen** | Neuer Live-Scoring-Pfad + kompletter RFL-Bogen mit PDF-Export (`SpielbogenPage`, Route `/spielbogen/:id`). Model `Spielbogen`. Siehe `docs/SPIELBOGEN.md`. |
| **RFL** | **Ruhr-Fun-Liga** — die deutsche Liga, deren Scoresheet-Konvention der Spielbogen abbildet. |
| **Legacy Scoring** | Alter Game-basierter Scoring-Pfad (`ScoringPage` / `GameScoringService` / `useScoring`), parallel zum Spielbogen. Siehe `docs/SCORING-LEGACY.md`. |
| **Auto-Switch** | Automatischer Seitenwechsel bei Outs ≥ 3 (`maybeAutoSwitchSide`). HOME 3.Out → AWAY (gleiche Inning); AWAY 3.Out → HOME, inning+1. |
| **Force-Out-3rd-Out-Regel** | Softball-Spezialregel: fällt ein Force-Out als 3. Out, zählt ein gleichzeitig erzielter Run **nicht** (Inning endet vorher). UI: Amber-Warnung + Checkbox. |
| **Out-Counting-Gewichte** | Fürs Inning-Ende: DP=2, TP=3, K=1, OUT=1, Error=0 (`countWeightedOutsInInning`). |
| **BogenSide** | Aktive Seite im Spielbogen (HOME/AWAY). `BogenSide`. |
| **BogenStatus** | Status eines Spielbogens (z.B. laufend/abgeschlossen). `BogenStatus`. |
| **BaseState / BogenBaseState** | Belegung der Bases (Runner-Zustand). |

### RFL-Sheet-Notation (DiamondCell / PDF)

| Symbol | Bedeutung |
|--------|-----------|
| **Diamond filled** (blau) | Player hat gescort. **Outline only** = nicht gescort (on base oder out). |
| **Wrap-Around-Slash** (Diagonale) | Player schlug 2×+ im selben Inning (`abCount >= 2 && !filled`). |
| **Out-Index** (römisch, oben-links) | "I/II/III" einzelne Outs, "I-II" DP, "I-III" TP, "I·III" Multi-Event mit Steal-3rd-Out. |
| **Inning-End-Marker** (kleine Diagonale unten-rechts) | Markiert wo das 3. Out fiel — Hilfe für Wrap-Around-Reihenfolge. |
| **RBI-Dots** (rote Punkte oben-rechts) | Anzahl RBIs, max 3 angezeigt. |
| **×N Advance-Annotation** | `×N` = Batting-Order-Nr des Hitters, der den Runner auf diese Base vorbrachte (nur wenn Treiber ≠ Runner). `AdvanceLabel.hitter`. |
| **Stealing-Arrows** | Gestrichelte Pfeile zwischen Bases. Rot=SB, Dunkelrot=CS/OUT_ON_PLAY, Orange=WP/PB. |

## Lineup, GameDay, Season

| Begriff | Bedeutung |
|---------|-----------|
| **Season** | Saison. `SeasonService` legt ownTeam "Dead Sox" automatisch an. |
| **GameDay** | Spieltag, bündelt mehrere `Game`s + `availablePlayers`. Siehe `docs/GAMEDAY.md`. |
| **Game** | Einzelspiel mit Lineup, Staff, Gegner, Score. |
| **LineupEntry** | Ein Batting-Order-Eintrag eines Spielers in einem Game (mit Position + optional DH-Annotation). Max 10/Game, Batting-Order sequenziell 1..N. |
| **LineupSet** | Wiederverwendbare Lineup-Vorlage (`LineupSet` / `LineupSetEntry`). |
| **Swap** | Atomarer Tausch von Lineup + Staff + Gegner + Score zwischen zwei Games **desselben** GameDays (`POST /api/games/{id1}/swap/{id2}`). |
| **Cascade (Availability)** | Entfernt man einen Spieler aus `availablePlayers`, wird er aus allen Games des GameDays bereinigt (Lineups, DH, Staff, Batting-Order-Renumber, Cars). **Destruktiv** — siehe `docs/GAMEDAY.md`. |
| **Staff / GameStaff** | Nicht-spielende Rollen pro Game (z.B. Base Coach). `StaffRole`. |
| **Base Coach** | Coaching-Rolle an 1./3. Base. Regel: Batting-Spieler ≠ Base Coach (außer DH-Host). |
| **Availability** | Wer an einem GameDay verfügbar ist (`AvailabilityService`). |

## Liga & Standings

| Begriff | Bedeutung |
|---------|-----------|
| **ownTeam** | Das eigene Team ("Dead Sox", **hardcoded** in `SeasonService`). Kann nie gelöscht werden, taucht nie in `LeagueResult` auf. Single-Team-App. |
| **LeagueTeam** | Ein Liga-Team (Gegner). `LeagueTeam`. |
| **LeagueResult** | Ergebnis eines Spiels **zwischen zwei Nicht-ownTeams** (für die Tabelle). |
| **Standings** | Tabelle, berechnet aus zwei Quellen: eigene `Game`-Zeilen (ownTeam) + `LeagueResult`-Zeilen (Fremdspiele). `StandingsCalculator`. Siehe `docs/STANDINGS.md`. |

## Training

| Begriff | Bedeutung |
|---------|-----------|
| **Training** | Einzelne Trainingseinheit. `Training` / `TrainingAttendance`. |
| **TrainingPeriod** | Trainingsperiode mit Rhythmus (`TrainingPeriod`, `PeriodRhythmSync`). |
| **TrainingPlan** | KI-/regelbasiert generierter Trainingsplan (`TrainingPlanGenerator`). Siehe `docs/04-KI-TRAININGSPLAN.md` + `docs/trainingsplan-algorithmus.md`. |
| **TrainingStation / Drill** | Übungsstation bzw. konkrete Übung. `TrainingStation`, `Drill` (+ `DrillCategory`, `DrillComplexity`). Neue Drills: Skill `drill-onboarding`, gespeichert in `backend/src/main/resources/drills.json`. |
| **Award / GamedayAward** | Auszeichnungen (`Award`, `AwardType`, `GamedayAwardCalculator`). |

---

## Architektur-Kürzel (siehe CLAUDE.md → "Architecture — Onion / Hexagonal")

| Begriff | Bedeutung |
|---------|-----------|
| **Domain** | Innerste Schicht: reine POJOs + Domain-Services, kein Spring/JPA. |
| **Port (out)** | Repository-**Interface** in `domain/port/out/` (Dependency Inversion). |
| **Adapter** | `*RepositoryAdapter` implementiert Ports mit Spring-Repos + Mappern; Web-`@RestController` in `adapter/in/web/`. |
| **Entity vs Model** | JPA-`@Entity` (Persistenz) ist **getrennt** vom Domain-`model` — Übersetzung via Mapper. |
