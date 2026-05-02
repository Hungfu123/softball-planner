# Infield Sub-Focus für Trainingsplan-Generator

**Date:** 2026-05-03
**Status:** Design — to be reviewed and turned into implementation plan

## Problem

Beim Erstellen eines Trainingsplans gibt es den Schwerpunkt `INFIELD_DEFENSE`, der alle Infield-Positionen (1B, 2B, SS, 3B) gleichbehandelt — der Generator pickt zufällig 2–3 Positionen für die Stationen. Das funktioniert für Standard-Trainings, aber:

- Wer gezielt eine oder mehrere Positionen üben will, bekommt nicht zwingend die gewünschten Drills.
- Es gibt keine Drill-Progression von Basics → Aufbauend innerhalb einer Position. Position-Drills landen einfach in Stationen.
- Drills wie Sprintübung und Agility Ladder sind durch die `WARMUP`-Kategorie aus der Drill-Phase ausgefiltert und tauchen praktisch nie im Plan auf.

## Ziel

Trainingsplan-Generator erweitern, sodass:

1. Bei `INFIELD_DEFENSE` optional konkrete Positionen ausgewählt werden können (1B/2B/SS/3B, multi-select).
2. Pro gewählter Position ein **BASIC-Drill** (Einzeltechnik, alle zusammen) und ein **ADVANCED-Drill** (Stationen, Spielsituation) gespielt werden — Hybrid-Ablauf wie vom User gewünscht.
3. Wenn keine ADVANCED für eine Position existiert, der Slot mit einer anderen passenden Position aufgefüllt wird (Fallback).
4. Drills explizit nach Komplexität getaggt werden (`BASIC` / `ADVANCED`) statt über Naming-Convention.
5. Stranded Conditioning-Drills (Sprintübung, Agility) wieder erreichbar sind.

## Non-Goals

- Sub-Focus für andere Schwerpunkte (OUTFIELD/CATCHER/etc.) — nicht jetzt.
- Multi-Tenancy oder Konfiguration des Team-Names (vorhandene Single-Team-Beschränkung bleibt).
- Komplett-Refactoring des Drill-Pickers oder Trainingsplan-UIs — nur additiv.
- Batting-Zeit ändern. Bestehende Logik (60 min ab 180 min, 50/40 ab 120 min, etc.) bleibt.

## Architektur-Übersicht

```
Frontend (React)
  └─ Plan-Erstellen-UI: Inline Position-Chips unter INFIELD_DEFENSE-Toggle
     ↓ POST /api/training-plans/generate (Body: GeneratePlanRequest mit infieldPositions[])

Backend (Spring Boot)
  └─ TrainingPlanController → TrainingPlanService → TrainingPlanGenerator
     ├─ Hybrid Drill-Phase: BASICS-Block (sequenziell) + STATIONS-Block (parallel) mit Fallback
     ├─ Filter PARTNER_ROUTINE und WARMUP weiterhin aus Drill-Phase
     └─ Drill-Auswahl pro Position aus complexity-Tag
```

## Daten-Modell

### Neuer Enum `DrillComplexity`

```java
package com.softball.domain.model;

public enum DrillComplexity {
    BASIC,
    ADVANCED
}
```

### Drill-Modell + DTO erweitert

`Drill` (Domain, POJO) und `DrillResponse` (DTO) bekommen Feld `complexity: DrillComplexity`.

**Default:** Im Drill-POJO als Initializer `private DrillComplexity complexity = DrillComplexity.BASIC;`. Damit deserialisiert Jackson auch JSON ohne das Feld korrekt → BASIC. JSON mit explizitem `null` würde überschrieben — daher in `drills.json` einfach Feld weglassen oder explizit `"BASIC"` / `"ADVANCED"` setzen.

### `drills.json` Tagging

`complexity` ist **per-Drill**, nicht per-Position. Ein Drill mit mehreren Position-Cats (z.B. "2B Komplett-Drill" mit 2B+SS) gilt automatisch für jede dieser Positionen, je nach Tag.

**Position-spezifische Drills (Hauptpool):**

| Position | BASIC | ADVANCED |
|---|---|---|
| **1B** | 1B Footwork & Stretch, 1B Scoops, 1B Bad Throws, 1B Receiving von allen Positionen | 1B Bunt Defense, 1B 3-1 Putout, 1B 3-6-3 Double Play, 1B Wurf nach Home & 3rd Base |
| **2B** | 2B Fielding mit Bat, **2B Hocke-Wurf zur 1B** *(neu)* | 2B Komplett-Drill, 2B Double Play Pivots |
| **SS** | SS Halbkreis Fielding, SS Backhand zur 1B, SS Fielding mit Bat | SS Komplett-Drill, SS Force 3B + Bogen zur 1B |
| **3B** | **3B Short Hop Reaction** *(neu)*, **3B Forehand & Backhand zur 1B** *(neu)*, **3B Reaktion „Jetzt!"** *(neu)* | 3B Komplett-Drill, 3B Bunt Defense |

**Cross-Position-Drills (zählen für mehrere Positionen, alle ADVANCED):**

| Drill | Zählt für |
|---|---|
| Infield Plays (aufgebautes Infield) | 1B, 2B, SS, 3B |
| Infield Wurf nach Home (Runner auf 3rd) | 1B, SS, 3B |
| Rundown | 1B, 2B, SS, 3B |
| Second/Short Double Play Übung | 2B, SS |
| 1B 3-6-3 Double Play | 1B, SS |
| 2B Double Play Pivots | 1B, 2B, SS |
| 2B Komplett-Drill | 2B, SS |
| SS Komplett-Drill | 2B, SS |
| SS Force 3B + Bogen zur 1B | SS, 3B |

Diese Drills landen in jedem ADVANCED-Pool, dessen Position-Cat sie haben → erweitert Variation, weniger Wiederholung.

Alle Nicht-Position-Drills (THROWING, OUTFIELD, CATCHER, …) bleiben default `BASIC` — hat keinen Effekt, da Sub-Focus-Logik nur INFIELD-Position-Pools nutzt.

### 4 neue Drills

1. **2B Hocke-Wurf zur 1B** (BASIC)
   - Spieler: 3 (2B, 1B, Tosser)
   - Tosser rollt frontal zur 2B → 2B fieldet, bleibt in Hocke → Wurf zur 1B
   - Isoliert: nur Phase 1 vom 2B-Komplett, ohne Double Play / Toss

2. **3B Short Hop Reaction** (BASIC)
   - Spieler: 2 (3B, Werfer)
   - Werfer ~1.5–2 m vor 3B, Short-Hops abwechselnd middle/forehand/backhand, je 10 Würfe
   - Trainiert schnelle Hände, kein Zurückweichen

3. **3B Forehand & Backhand zur 1B** (BASIC)
   - Spieler: 3 (3B, 1B, Tosser)
   - Phase 1: Forehand-Grounder (links Richtung 2B-Seite) → Wurf zu 1B
   - Phase 2: Backhand-Grounder (rechts zur Foul-Line, Crossover-Schritt) → Wurf zu 1B
   - Isolierte Einzelbewegung, keine Spielsituation

4. **3B Reaktion „Jetzt!"** (BASIC)
   - Spieler: 2 (3B, Werfer)
   - 3B steht mit Rücken zum Werfer. Werfer wirft Grounder + ruft "Jetzt!"
   - 3B dreht sich, findet Ball, fieldet, wirft zur 1B (oder Stand-in)
   - Trainiert: Reaktion, Ball-Suche, Jab/Crossover-First-Step

## API

### Endpoint-Erweiterung

Existierender Endpoint: `POST /api/training-plans/generate` mit `@RequestBody GeneratePlanRequest`.

`GeneratePlanRequest` (record) bekommt neues Feld `infieldPositions`:

```java
public record GeneratePlanRequest(
        @NotNull Long trainingId,
        @NotNull @Min(1) Integer playerCount,
        @NotBlank String focus,
        @NotNull @Min(30) Integer durationMinutes,
        List<InfieldPosition> infieldPositions    // NEU, optional, default null/leer
) {}
```

Beispiel-Body:
```json
{
  "trainingId": 42,
  "playerCount": 10,
  "focus": "INFIELD_DEFENSE,OUTFIELD",
  "durationMinutes": 120,
  "infieldPositions": ["SS", "SECOND_BASE"]
}
```

**Validierung:** Werte für `infieldPositions` aus Java-Enum `InfieldPosition { FIRST_BASE, SECOND_BASE, SS, THIRD_BASE }` → ungültige Werte werfen 400 (Jackson-Deserialisierungsfehler). `null` oder leere Liste → wie bisher. `INFIELD_DEFENSE` nicht im Focus → Liste ignoriert (kein Fehler).

### Neuer Enum `InfieldPosition`

```java
package com.softball.domain.model;

public enum InfieldPosition {
    FIRST_BASE,
    SECOND_BASE,
    SS,
    THIRD_BASE
}
```

Mapping zu `DrillCategory` 1:1 — vereinfacht Filterung im Generator.

### Service-Signatur

```java
public TrainingPlanResponse generate(
    Long trainingId,
    int playerCount,
    String focus,
    int durationMinutes,
    List<InfieldPosition> infieldPositions   // NEU, optional, default leere Liste
);
```

### Generator-Signatur

```java
public TrainingPlanContent generate(
    List<Drill> allDrills,
    int playerCount,
    String focus,
    int totalMinutes,
    List<InfieldPosition> infieldPositions   // NEU
);
```

Bestehende 4-Param-Methode wird via Overload (delegiert auf 5-Param-Variante mit leerer Liste) erhalten — Backward-Kompatibilität für Tests.

## Generator-Logik

### Wenn `infieldPositions` LEER

Aktuelle Logik unverändert. Drill-Phase pickt 1–2 Basics + 2 Stationen aus dem Pool aller Infield-Drills.

### Wenn `infieldPositions` GESETZT (und INFIELD_DEFENSE im Focus)

```
Drill-Phase (T = remainingMinutes für Drill-Phase):

1. BASICS-Block (sequenziell, alle zusammen)
   - Pro gewählter Position: 1 BASIC-Drill, 5 min
   - Cap: max 2 BASICs (Zeitbudget). Bei 3–4 Positionen: 2 zufällig gewählt (shuffle für Variation).
   - Wenn Position keine BASIC hat → Position übersprungen (kein Stand-in im BASICS-Block).
   - Ganzer Block übersprungen wenn T < 25 min.

2. Aufbaupause 5 min (wie heute). **Wenn BASICS-Block leer war (kein Drill gepickt) → Aufbaupause auch übersprungen.**

3. STATIONS-Block
   - **Wenn nur 1 Position gewählt** → sequenzieller ADVANCED-Drill (alle zusammen, kein paralleler Stationsbetrieb). Restliche Drill-Zeit komplett auf 1 Drill (Deep Dive). Keine Aufbaupause vor diesem Block notwendig (alle bleiben zusammen).
   - **Wenn 2+ Positionen gewählt** → parallele Stationen, Gruppen rotieren wie heute:
     - 1 Station pro gewählter Position mit ADVANCED-Drill.
     - Stations-Cap wie heute: max 3 (≥12 Spieler), max 2 (<12 Spieler).
     - Mehr Positionen als Cap → zufällige Auswahl der `cap` Positionen.
   - Drill-Wahl pro Position (Priorität):
     1. ADVANCED der Position (Position-Cat im Drill, complexity=ADVANCED, nicht in usedDrillIds).
     2. Sonst: zweite BASIC der Position (anders als in BASICS-Block).
     3. Sonst: ADVANCED einer anderen gewählten Infield-Position, die noch keine eigene Station hat.
     4. Sonst: ADVANCED irgendeiner Infield-Position (Slot-Filler).
   - Restliche Drill-Zeit gleichmäßig auf die Stationen.
```

### Beispiel — 120 min, 10 Spieler, Positions=[SS, 2B, 3B]

```
0–30   WARMUP    Aufwärmroutine
30–35  BREAK
35–45  DRILL     Partner-Routine (2×5 min, wie bisher)
45–50  DRILL     SS Backhand zur 1B (BASIC, 5 min)
50–55  DRILL     2B Fielding mit Bat (BASIC, 5 min)         ← 3B übersprungen, 2 picks zufällig
55–60  BREAK     Aufbaupause Stationen
60–80  DRILL     Station A: SS Komplett-Drill (10 Spieler → 2 Stations Cap)
                 Station B: 2B Komplett-Drill                ← 3B fällt diese Runde raus
80–85  BREAK
85–95  BATTING   Hitting-Pre-Drill (10 min)
95–125 BATTING   Hitting Stationen (30 min)
```

### Beispiel — Position=[3B] alone (Deep Dive)

```
BASICS-Block: 3B Short Hop Reaction (BASIC, 5 min)
keine Aufbaupause (alle bleiben zusammen)
STATIONS-Block: 3B Komplett-Drill sequenziell, alle zusammen (Rest der Drill-Zeit, z.B. 25 min)
```

### Beispiel — Fallback bei dünner Position-Liste

Wenn nur 2B gewählt, aber 16 Spieler (Cap = 3):
- Station 1: 2B Komplett-Drill
- Station 2 (Fallback): 2B Double Play Pivots (zweite ADVANCED derselben Position)
- Station 3 (Fallback): ADVANCED einer anderen Infield-Position (z.B. SS Komplett-Drill, da SS am besten zu 2B passt)

### Multi-Focus-Interaktion

Wenn `infieldPositions` gesetzt ist UND der Focus mehrere Schwerpunkte enthält (z.B. `INFIELD_DEFENSE,OUTFIELD`):

- Drill-Zeit wird wie heute gleichmäßig auf die Schwerpunkte aufgeteilt (`minutesPerFocus = totalDrillMinutes / focuses.size()`).
- **Nur der INFIELD_DEFENSE-Block** läuft mit Sub-Focus-Logik (BASICS-Block + STATIONS-Block + Fallback).
- Andere Schwerpunkte (OUTFIELD/CATCHER/etc.) laufen mit der **bestehenden Logik** (Basics + Advanced-Stationen aus dem jeweiligen Focus-Pool).
- `infieldPositions` wird ignoriert wenn `INFIELD_DEFENSE` nicht im Focus ist.

Beispiel — `INFIELD_DEFENSE,OUTFIELD`, Positions=[SS, 2B], 120 min, 16 Spieler:
- INFIELD_DEFENSE-Block: SS BASIC + 2B BASIC + 2 Stationen (SS Komplett, 2B Komplett)
- OUTFIELD-Block: 1 Throwing/Outfield-Basic + 2 Outfield-Stationen (heutige Logik)
- Aufbaupause(n) zwischen Basics und Stationen pro Focus wie heute

## Side-Fix: Stranded Drills

`sprintubung-fielding-position` und `agility-ladder-beinubungen` haben aktuell die `WARMUP`-Kategorie. Dadurch werden sie aus der Drill-Phase ausgefiltert und nie gepickt.

**Fix:** `WARMUP`-Kategorie von beiden Drills entfernen. Sie behalten `CONDITIONING` und werden über den `BASERUNNING`-Focus (der `CONDITIONING` mit-mappt) reachable. Der eigentliche Aufwärm-Routine-Drill (`aufwarmroutine-dead-sox`) bleibt der einzige fixed-Slot.

## Frontend

### Bestehende UI-Konvention

`PlanForm.tsx` nutzt:
- Top-Level Focus-Chips mit `px-3 py-1.5 rounded-lg text-sm font-medium`, navy-800 selected, cream-50 unselected.
- Spieleranzahl, Dauer, Schwerpunkte als gestapelte Felder mit kleinen Helper-Texten in `text-xs text-gray-400`.
- Cream/navy-Aesthetik, refined minimal — keine Animations, keine Decorations.

Sub-Focus-UI muss **dazu passen**: refined minimal, kein neues visuelles Vokabular.

### UI-Layout: Sub-Section UNTER dem Focus-Chip-Block

Wenn `INFIELD_DEFENSE` ausgewählt ist, erscheint eine eigene Sub-Section **unterhalb** des kompletten Focus-Chip-Blocks (nicht inline zwischen den Chips — `flex-wrap` würde zerschießen).

```
┌─ Schwerpunkte ─────────────────────────────────────┐
│  Mehrere auswählbar. "Allround" wählt alles.       │
│  [Werfen] [Infield Defense✓] [Outfield] [...]      │
│                                                    │
│  ┌─ Infield-Positionen (Sub-Section, conditional) ─┐
│  │  Optional. Leer = alle Positionen (Standard).  │
│  │  [1B] [2B✓] [SS✓] [3B]                          │
│  └─────────────────────────────────────────────────┘
└────────────────────────────────────────────────────┘
```

**Visual-Hierarchy:**
- Sub-Chips sind kleiner: `px-2 py-1 rounded-md text-xs` (vs `px-3 py-1.5 text-sm` Top-Level).
- Sub-Section: Hintergrund cream-100 oder leicht eingerückt + dünne linke Border (`border-l-2 border-cream-300 pl-3`) für Sub-Hierarchie-Signal.
- Helper-Text: `text-xs text-gray-400` darüber.
- Smooth auf-/zuklappen via `transition-all duration-200` mit `max-height`.

### State-Verhalten

- `selectedInfieldPositions: InfieldPosition[]` als Zusatz-State im PlanForm.
- INFIELD_DEFENSE aus Focus-Set entfernt → Sub-Section ausblenden, **aber State preservieren** (damit User bei Re-Toggle nicht neu auswählen muss).
- Beim Submit: `infieldPositions` nur dann an API senden, wenn INFIELD_DEFENSE im aktuellen Focus-Set UND mindestens 1 Position ausgewählt ist. Sonst `null`/leere Liste.
- Reset auf "alle Infield-Positionen" über Helper-Hint klar kommuniziert ("Leer = alle").

### Plan-Output zeigt Sub-Focus

Wenn ein Plan mit Sub-Focus generiert wurde, soll die Plan-Anzeige (`PlanDisplay.tsx`) klar machen, mit welchem Fokus er erstellt wurde:

- Plan-Header (oder Schwerpunkt-Pill) zeigt "Infield Defense — SS, 2B" statt nur "Infield Defense".
- Erlaubt Wiedererkennung beim späteren Wiederöffnen des Plans.
- Backend-Response (`TrainingPlanResponse`) muss `infieldPositions` mitliefern.

### Persistierung

`TrainingPlan`-Entity bekommt neues Feld `infieldPositions` (kommagetrennter String, z.B. `"SS,SECOND_BASE"`):

- **Flyway-Migration:** Neue Datei `V{n}__add_infield_positions_to_training_plans.sql`:
  ```sql
  ALTER TABLE training_plans ADD COLUMN infield_positions VARCHAR(100);
  ```
- **Entity:** `@Column(name = "infield_positions", length = 100) private String infieldPositions;` (nullable).
- **Domain `TrainingPlan`:** `private List<InfieldPosition> infieldPositions = new ArrayList<>();`
- **Mapper:** Entity → Domain: parse comma-separated string. Domain → Entity: join with comma.
- **Default:** null/leer → keine Sub-Focus-Anzeige im Plan-Header.

### Frontend-Types

```ts
// types/index.ts
export type InfieldPosition = 'FIRST_BASE' | 'SECOND_BASE' | 'SS' | 'THIRD_BASE'

export interface GeneratePlanRequest {
  trainingId: number
  playerCount: number
  focus: string
  durationMinutes: number
  infieldPositions?: InfieldPosition[]   // NEU
}

export interface TrainingPlanResponse {
  // bisher...
  infieldPositions?: InfieldPosition[]   // NEU, für Plan-Header-Anzeige
}
```

### Komponenten-Aufteilung

- `PlanForm.tsx` bekommt:
  - Neuer State `selectedInfieldPositions: Set<InfieldPosition>`.
  - Neue Komponente (in derselben Datei oder separat) `InfieldPositionPicker` für die Sub-Chips, conditional gerendert.
  - Submit-Logik passt `infieldPositions` an Request an.
- `PlanDisplay.tsx` rendert Sub-Focus im Header.

### Frontend-Design-Skill-Polish (Implementierungsphase)

- Chip-Hover-States subtil: leichter scale 1.02 + border-color → navy-300.
- Sub-Section-Aufklappen: `motion-safe:animate-fadeIn` (oder CSS `@keyframes`) + `transform-origin: top`.
- Plan-Header-Sub-Focus-Pill: navy-800 mit weißer Schrift, kleiner als Haupt-Focus-Pill.

## Tests

### Backend

`TrainingPlanGeneratorTest` + `TrainingPlanGeneratorIntegrationTest` erweitern um:

- Sub-Focus mit 1 Position → BASICS-Block mit 1 Drill + sequenzieller ADVANCED-Drill (kein Stationsbetrieb, alle zusammen).
- Sub-Focus mit 2 Positionen → 2 BASICs, 2 Stationen.
- Sub-Focus mit 3 Positionen, 10 Spieler → Cap 2 Stationen, 1 Position fällt raus.
- Sub-Focus mit 4 Positionen, 16 Spieler → 2 BASICs (von 4), 3 Stationen (Cap).
- Position ohne BASIC (3B vor neuen Drills, später z.B. testweise) → BASICS-Block überspringt.
- Position ohne ADVANCED → Fallback auf andere Position.
- `infieldPositions` ohne INFIELD_DEFENSE-Focus → ignoriert.
- Sprintübung + Agility nach WARMUP-Removal → reachable in BASERUNNING-Focus.

### Frontend

Optional: Komponententest für Position-Chip-Verhalten (zeigt sich nur bei INFIELD_DEFENSE, reset beim Toggle).

## Doku

`docs/trainingsplan-algorithmus.md` aktualisieren:
- Neue Phase: BASICS-Block (sub-focus) zwischen Partner-Routine und Stationen.
- API-Param `infieldPositions` dokumentieren.
- BASIC/ADVANCED Mapping pro Position als Tabelle.

## Implementation-Reihenfolge

1. Backend Domain: `DrillComplexity`-Enum + `InfieldPosition`-Enum + Feld `complexity` in `Drill` und `DrillResponse`.
2. drills.json: complexity-Tags pro Position-Drill + 4 neue Drills + WARMUP-Removal von Sprintübung/Agility.
3. Typst: 4 neue Drills (3× 3B BASIC, 1× 2B BASIC) + PDF rebuild.
4. Persistierung: Flyway-Migration für `infield_positions`-Spalte. `TrainingPlanEntity` + Mapper + Domain `TrainingPlan` erweitern.
5. Generator: Logik für BASICS-Block + STATIONS-Block (1-Position-Deep-Dive vs Multi-Position-Stations) mit Fallback.
6. API: `GeneratePlanRequest` erweitern, Service- und Generator-Signatur erweitern, `TrainingPlanResponse` erweitern.
7. Backend-Tests (Generator + Integration mit Sub-Focus-Pfaden).
8. Frontend Types: `InfieldPosition` + `infieldPositions?` in `GeneratePlanRequest` und `TrainingPlanResponse`.
9. Frontend UI in `PlanForm.tsx`: Sub-Section unterhalb Focus-Chips, State, Submit-Logik.
10. Frontend Plan-Header in `PlanDisplay.tsx`: Sub-Focus-Anzeige.
11. Frontend Polish via frontend-design Skill (Chip-Visual, Transition).
12. Doku update (`trainingsplan-algorithmus.md`).
13. Build (`mvn test -s .mvn/local-settings.xml`, `npm run build`), commit, push.

## Risiken & Offene Punkte

- **Drill-Knappheit bei 3B:** Vor den neuen Drills hatte 3B 0 BASIC + 2 ADVANCED. Mit den 3 neuen 3B-BASICs ist 3B vollwertig.
- **Cap-Konflikt bei 4 Positionen + 10 Spielern:** 4 Positionen, aber max 2 Stationen → 2 fallen raus. Nutzer könnte überrascht sein. Mitigation: Frontend-Hinweis "Bei wenigen Spielern werden manche Positionen nicht zu Stationen — wähle gezielt."
- **Backward-Kompatibilität:** Bestehende Plans (ohne `infieldPositions`) verhalten sich unverändert.
- **Performance:** Drill-Auswahl bleibt O(n), `n` ~50 Drills — irrelevant.
