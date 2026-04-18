# Trainingsplan-Generator — Algorithmus

## Übersicht

Der Generator erstellt einen Trainingsplan in folgenden Phasen:

```
1. WARMUP        — Aufwärmroutine (30 min) + Trinkpause (5 min)
2. GRUNDLAGEN    — 1-2 Partnerübungen, alle zusammen (je 10 min)
3. STATIONEN     — 2-3 Positions-Drills parallel in Gruppen (je 15-20 min)
4. BATTING       — Hitting-Stationen: Live, Bunt, Tee, Korken (40-60 min)
5. SPIEL         — Scrimmage, nur ab 150 min + 14 Spieler (20-40 min)
```

Zwischen den Phasen gibt es 5-min-Pausen (Trinken, erklären, aufbauen).

## Zeitbudget

Das Budget wird von außen nach innen berechnet. Es gibt **5 min Überzieh-Puffer** (Trainings enden selten exakt pünktlich).

```
Verfügbar    = totalMinutes + 5 min Puffer
 − Warmup     = 30 min (fix)
 − Trinkpause = 5 min (nach Warmup, jeder geht trinken)
 − Spiel      = 20-40 min (nur ab 150 min Gesamtdauer + mind. 14 Spieler)
 − Pausen     = 5 min vor Batting + optional 5 min vor Spiel
 − Batting    = siehe Batting-Tabelle unten
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
 − 5  Pause vor Batting (reserviert)
 − 40 Batting (11 < 12 → 40 min)
 = 45 min für Drill-Phase
```

### Drill-Phase (45 min)

```
Focus: INFIELD_DEFENSE
 → Matching Drills: 5 Throwing (L1) + 18 Infield (L2+L3)
 → Stationen: max 2 (11 < 12), ceil(11/2) = 6 Spieler/Gruppe → 15 min/Station
 → Stations-Bedarf: 2×15 min + 5 min Aufbaupause = 35 min
 → Für Basics verfügbar: 45 − 35 = 10 min → 1 Grundlagen-Drill (10 min)
```

### Ergebnis

```
  0- 30 min  WARMUP    Aufwärmroutine der Dead Sox
 30- 35 min  BREAK     Trinken
 35- 45 min  DRILL     Grounder-Fielding Basics (alle zusammen, 10 min)
 45- 50 min  BREAK     Trinken, Stationen erklären + aufbauen (5 min)
 50- 80 min  DRILL     Station A: SS Komplett-Drill (6 Spieler, 15 min)
             DRILL     Station B: 3B Bunt Defense (5 Spieler, 15 min)
 80- 85 min  BREAK     Trinken, Batting-Stationen aufbauen (5 min)
 85-125 min  BATTING   Hitting Stationen (40 min)
                       = 125 min (5 min über 120 — normal)
```

## Deduplizierung bei mehreren Schwerpunkten

Bei komma-getrennten Focuses (z.B. `INFIELD_DEFENSE,OUTFIELD`) wird die Drill-Zeit gleichmäßig auf die Schwerpunkte verteilt. Ein `usedDrillIds`-Set trackt bereits verwendete Drills — Throwing-Basics die in beiden Focuses matchen werden nur einmal verwendet.

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
