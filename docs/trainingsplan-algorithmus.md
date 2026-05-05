# Trainingsplan-Generator — Algorithmus

## Übersicht

Der Generator erstellt einen Trainingsplan in folgenden Phasen:

```
1. WARMUP            — Aufwärmroutine (30 min) + Trinkpause (5 min)
1b. PARTNER-ROUTINE  — 2 kurze Partnerdrills (je 5 min) — Wurf/Fielding-Aktivierung
2. GRUNDLAGEN        — 1-2 Partnerübungen, alle zusammen (je 10 min)
3. STATIONEN         — 2-3 Positions-Drills parallel in Gruppen (je 15-20 min)
4. BATTING           — optional: Hitting-Pre-Drill (10 min, Aktivierung) + Hitting-Stationen (40-60 min)
5. SPIEL             — Scrimmage, nur ab 150 min + 14 Spieler (20-40 min)
```

Zwischen den Phasen gibt es 5-min-Pausen (Trinken, erklären, aufbauen).

## Zeitbudget

Das Budget wird von außen nach innen berechnet. Es gibt **5 min Überzieh-Puffer** (Trainings enden selten exakt pünktlich).

```
Verfügbar         = totalMinutes + 5 min Puffer
 − Warmup          = 30 min (fix)
 − Trinkpause      = 5 min (nach Warmup, jeder geht trinken)
 − Partner-Routine = bis zu 2 × 5 min (10 min, falls Partner-Routine-Drills vorhanden)
 − Spiel           = 20-40 min (nur ab 150 min Gesamtdauer + mind. 14 Spieler)
 − Pausen          = 5 min vor Batting + optional 5 min vor Spiel
 − Batting         = siehe Batting-Tabelle unten (inkl. optionalem Hitting-Pre-Drill 10 min)
 = REST → Drill-Phase (Grundlagen + Stationen-Aufbaupause + Stationen)
```

### Batting-Zeiten

| Training | Spieler | Batting |
|----------|---------|---------|
| 180+ min | alle | 60 min |
| 120+ min | 12+ | 50 min |
| 120+ min | < 12 | 40 min |
| 90+ min | alle | 40 min |
| < 90 min | alle | 15-40 min (max halbe Restzeit) |

Begründung: Bei 12+ Spielern braucht jeder mehr Rotationszeit an der Live-Station. Bei 11 Spielern mit 3 Batting-Stationen (Live 7, Bunt 2, Tee 2) und ~3 min pro Batter → 3 Rotationen × 12 min ≈ 36-40 min.

## Phase 1b: Partner-Routine

Direkt nach dem Aufwärmen (vor der eigentlichen Drill-Phase) werden bis zu **2 Partner-Drills** mit je **5 min** eingeplant. Ziel: kurze Wurf-/Fielding-Aktivierung zu zweit, bevor Stationen aufgebaut werden.

Auswahl: Drills mit Kategorie `PARTNER_ROUTINE` und `minPlayers ≤ Spielerzahl`. Reihenfolge geshuffled. Verwendete Drills landen im `usedDrillIds`-Set und werden in der Drill-Phase nicht erneut gepickt.

Aktuelle PARTNER_ROUTINE-Drills:
- backhand-toss, aufnehmen-sidewurf, hocke-wurf-partner, grounder-fielding-basics
- partner-wurf-footwork, partner-fly-balls, partner-grounder-im-laufen

## Phase 4: Hitting Pre-Drill (optional)

Vor `hitting-stationen` wird optional **1 zusätzlicher HITTING-Drill** (10 min) als Aktivierung eingefügt — z.B. Knie-Drill, Rear-Toss, Loading vom Tee. Voraussetzung: Batting-Budget ≥ Pre-Drill-Zeit + Min-Drill-Zeit (10 + 10 = 20 min). Wird aus dem Batting-Budget abgezogen, nicht aus der Drill-Phase.

## Drill-Progression (3 Level)

Drills werden nach Komplexität in 3 Level eingeteilt:

| Level | Name | Kategorien | Trainingsform |
|-------|------|-----------|---------------|
| 1 | Grundlagen | THROWING, FIELDING (keine Position) | Alle zusammen, Partnerübungen |
| 2 | Position | FIRST_BASE, SS, OUTFIELD, CATCHER, RELAY, ... | Stationen in Gruppen |
| 3 | Simulation | SITUATIONAL, DOUBLE_PLAY, BUNT_DEFENSE, COMINGS | Stationen in Gruppen |

Level 2 + 3 werden gemeinsam als "Advanced" behandelt und in den Stationsblock gepackt. Innerhalb jedes Levels wird **geshuffled** → verschiedene Drills pro Training.

### Progression pro Schwerpunkt

| Focus | Basics (L1) | Advanced (L2+L3) |
|-------|-------------|-------------------|
| WERFEN | 5 Throwing-Drills | — (nur Basics) |
| INFIELD_DEFENSE | 5 Throwing | 18 Infield-Drills (1B, 2B, SS, 3B, DP, Bunt) |
| OUTFIELD | 5 Throwing | 7 Outfield-Drills |
| BASERUNNING | 3 Lauf-Drills | 2 Simulation (Steal, Rundown) |
| SITUATIONAL | — (nur Advanced) | 17 Spielsituationen |
| CATCHER | 5 Throwing | 5 Catcher-Drills |
| RELAY | 5 Throwing | 2 Relay-Drills |

## Sub-Focus für INFIELD_DEFENSE (optional)

Bei INFIELD_DEFENSE können konkrete Positionen angegeben werden (`infieldPositions=[FIRST_BASE,SECOND_BASE,SS,THIRD_BASE]`).

**Wenn Sub-Focus aktiv:**
1. **BASICS-Block:** Pro Position 1 BASIC-Drill (5 min, max 2 Drills, 3+ Positionen werden geshuffled).
2. **STATIONS-Block:**
   - 1 Position → sequenziell, 1 Deep-Dive-ADVANCED-Drill, alle zusammen.
   - 2+ Positionen → parallele Stationen wie heute.
3. **Fallback** wenn Position keine ADVANCED hat: zweite BASIC der Position → ADVANCED einer anderen gewählten Position → ADVANCED irgendeiner Infield-Position.

**Wenn Sub-Focus leer:** aktuelle Logik unverändert.

### BASIC vs ADVANCED Tagging

Position-Drills sind im Drill-Katalog explizit als BASIC oder ADVANCED getaggt (Feld `complexity` in `drills.json`). BASIC = isolierte Einzeltechnik. ADVANCED = Spielsituation / Mehrphasen-Drill.

Cross-Position-Drills (Infield Plays, Rundown, 2B Komplett mit SS-Cat, etc.) sind ADVANCED und zählen für jede ihrer Position-Cats.

### API-Body

`POST /api/training-plans/generate` (Body):
```json
{
  "trainingId": 42,
  "playerCount": 12,
  "focus": "INFIELD_DEFENSE,OUTFIELD",
  "durationMinutes": 120,
  "infieldPositions": ["SS", "SECOND_BASE"]
}
```

### Stranded-Drill-Fix

`sprintubung-fielding-position` und `agility-ladder-beinubungen` haben die `WARMUP`-Cat verloren — sie sind jetzt über BASERUNNING-Focus reachable.

## Stationen-Logik

| Regel | Wert |
|-------|------|
| Max Stationen bei 12+ Spielern | 3 |
| Max Stationen bei < 12 Spielern | 2 |
| Min Spieler für Stationen | 8 |
| Minuten pro Station (≤5 Spieler/Gruppe) | 15 min |
| Minuten pro Station (6+ Spieler/Gruppe) | 20 min |
| Aufbaupause vor 3 Stationen | 10 min |
| Aufbaupause vor 2 Stationen | 5 min |

**Wichtig:** Grundlagen werden auf 1 Drill reduziert (statt 2) wenn Stationen + Aufbaupause sonst nicht ins Zeitbudget passen.

## Pausen

| Pause | Dauer | Hinweis |
|-------|-------|---------|
| Nach Warmup | 5 min | Trinken |
| Vor Stationen | 5-10 min | Trinken, erklären, wer die Übung kennt baut auf |
| Vor Batting | 5 min | Trinken, Batting-Stationen aufbauen |
| Vor Spiel | 5 min | Trinken, Bases aufstellen, Teams einteilen |

## Beispiel: 11 Spieler, 120 min, INFIELD_DEFENSE

### Zeitbudget-Berechnung

```
Verfügbar: 120 + 5 (Puffer) = 125 min
 − 30 Warmup
 − 5  Trinkpause
 − 10 Partner-Routine (2 × 5 min)
 − 5  Pause vor Batting (reserviert)
 − 40 Batting (11 < 12 → 40 min, davon 10 min Hitting-Pre-Drill + 30 min Stationen)
 = 35 min für Drill-Phase
```

### Drill-Phase (35 min)

```
Focus: INFIELD_DEFENSE
 → Matching Drills: 3-5 Throwing (L1, abzüglich verwendeter Partner-Routine) + 18 Infield (L2+L3)
 → Stationen: max 2 (11 < 12), ceil(11/2) = 6 Spieler/Gruppe → 15 min/Station
 → Stations-Bedarf: 2×15 min + 5 min Aufbaupause = 35 min
 → Für zusätzliche Basics verfügbar: 0 min (Partner-Routine deckt Wurf-Aktivierung schon ab)
```

### Ergebnis

```
  0- 30 min  WARMUP    Aufwärmroutine der Dead Sox
 30- 35 min  BREAK     Trinken
 35- 40 min  DRILL     Hocke-Wurf zum Partner (Partner-Routine 1)
 40- 45 min  DRILL     Backhand-Toss (Partner-Routine 2)
 45- 60 min  DRILL     Station A: SS Komplett-Drill (6 Spieler, 15 min)
             DRILL     Station B: 3B Bunt Defense (5 Spieler, 15 min)
 60- 65 min  BREAK     Trinken, Batting-Stationen aufbauen (5 min)
 65- 75 min  BATTING   Knie-Drill — Drive durch die Hütchen-Gasse (Hitting-Pre-Drill, 10 min)
 75-115 min  BATTING   Hitting Stationen (30 min)
                       ≈ 115 min (5 min unter 120 — Puffer)
```

_Hinweis:_ Bei vielen Spielern oder weniger Partner-Routine-Drills im Katalog wird Phase 1b automatisch kürzer (1 Drill oder 0). Die freigewordene Zeit fließt in die Drill-Phase.

## Deduplizierung bei mehreren Schwerpunkten

Bei komma-getrennten Focuses (z.B. `INFIELD_DEFENSE,OUTFIELD`) wird die Drill-Zeit gleichmäßig auf die Schwerpunkte verteilt. Ein `usedDrillIds`-Set trackt bereits verwendete Drills — Throwing-Basics die in beiden Focuses matchen werden nur einmal verwendet.

Das Set wird **phasenübergreifend** geführt: Drills aus Partner-Routine (1b) und Hitting-Pre-Drill (Phase 4) tauchen nicht erneut in der Drill-Phase auf.

## Relevante Dateien

| Datei | Beschreibung |
|-------|-------------|
| `TrainingPlanGenerator.java` | Generator-Algorithmus |
| `TrainingPlanGeneratorTest.java` | 59 Unit-Tests mit Test-Katalog |
| `TrainingPlanGeneratorIntegrationTest.java` | 7 Integration-Tests mit echtem drills.json |
| `drills.json` | Drill-Katalog (Kategorien, minPlayers, etc.) |
| `DrillService.java` | FOCUS_CATEGORY_MAP (gleiche Zuordnung wie Generator) |
| `TrainingPlanSection.java` | Section-Model (parallelGroup, playersPerGroup, etc.) |

## Team-Kontext (Dead Sox)

- Max 17-18 Spieler im Kader
- Typische Trainings: 120 min, 8-17 Spieler
- Wenige erfahrene Spieler → Erfahrene gleichmäßig auf Gruppen verteilen
- Batting immer mit 3 Stationen: Live, Bunt, Tee (+ optional Korken)
