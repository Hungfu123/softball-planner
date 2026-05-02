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
     ↓ POST /api/trainings/{id}/plan?focus=INFIELD_DEFENSE&infieldPositions=SS,2B&...

Backend (Spring Boot)
  └─ TrainingController → TrainingPlanService → TrainingPlanGenerator
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

`Drill` (Domain) und `DrillResponse` (DTO) bekommen Feld `complexity: DrillComplexity` (default `BASIC`, JSON-deserialisiert mit `null` → BASIC).

### `drills.json` Tagging

Position-Drills bekommen explizites Tag:

| Position | BASIC | ADVANCED |
|---|---|---|
| **1B** | 1B Footwork & Stretch, 1B Scoops, 1B Bad Throws, 1B Receiving von allen Positionen | 1B Bunt Defense, 1B 3-1 Putout, 1B 3-6-3 Double Play, 1B Wurf nach Home & 3rd Base |
| **2B** | 2B Fielding mit Bat, **2B Hocke-Wurf zur 1B** *(neu)* | 2B Komplett-Drill, 2B Double Play Pivots |
| **SS** | SS Halbkreis Fielding, SS Backhand zur 1B, SS Fielding mit Bat | SS Komplett-Drill, SS Force 3B + Bogen zur 1B |
| **3B** | **3B Short Hop Reaction** *(neu)*, **3B Forehand & Backhand zur 1B** *(neu)*, **3B Reaktion „Jetzt!"** *(neu)* | 3B Komplett-Drill, 3B Bunt Defense |

Alle anderen Drills (THROWING, OUTFIELD, CATCHER, …) werden default `BASIC` getaggt — hat keinen Effekt, da Sub-Focus-Logik nur für INFIELD_DEFENSE greift.

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

`POST /api/trainings/{id}/plan` bekommt neuen optionalen Query-Param:

```
?focus=INFIELD_DEFENSE,OUTFIELD
&infieldPositions=SS,2B          ← NEU, optional, kommagetrennt
&playerCount=10
&durationMinutes=120
```

Werte für `infieldPositions`: Subset von `{1B, 2B, SS, 3B}`. Wird ignoriert wenn `INFIELD_DEFENSE` nicht im Focus ist. Leer/fehlend → wie bisher (alle Infield-Positionen, zufällige Auswahl).

### Service-Signatur

```java
public TrainingPlanResponse generate(
    Long trainingId,
    int playerCount,
    String focus,
    int durationMinutes,
    List<String> infieldPositions   // NEU, optional, default leere Liste
);
```

### Generator-Signatur

```java
public TrainingPlanContent generate(
    List<Drill> allDrills,
    int playerCount,
    String focus,
    int totalMinutes,
    List<String> infieldPositions   // NEU
);
```

Bestehende Methode mit 4 Parametern wird via Overload (delegiert auf 5-Param-Variante mit leerer Liste) erhalten — Backward-Kompatibilität für Tests.

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

2. Aufbaupause 5 min (wie heute).

3. STATIONS-Block (parallel, Gruppen rotieren)
   - 1 Station pro gewählter Position mit ADVANCED-Drill.
   - Stations-Cap wie heute: max 3 (≥12 Spieler), max 2 (<12 Spieler).
   - Mehr Positionen als Cap → zufällige Auswahl der `cap` Positionen.
   - Drill-Wahl pro Position (Priorität):
     1. ADVANCED der Position (nicht aus Basics-Block, nicht usedDrillIds).
     2. Sonst: zweite BASIC der Position (anders als in Basics).
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

### Beispiel — Position=[3B] alone

```
BASICS-Block: 3B Short Hop Reaction (BASIC, 5 min)
STATIONS-Block: 3B Komplett-Drill als einzige Station (Rest der Drill-Zeit)
```

### Beispiel — Fallback bei dünner Position-Liste

Wenn nur 2B gewählt, aber 16 Spieler (Cap = 3):
- Station 1: 2B Komplett-Drill
- Station 2 (Fallback): 2B Double Play Pivots (zweite ADVANCED derselben Position)
- Station 3 (Fallback): ADVANCED einer anderen Infield-Position (z.B. SS Komplett-Drill, da SS am besten zu 2B passt)

## Side-Fix: Stranded Drills

`sprintubung-fielding-position` und `agility-ladder-beinubungen` haben aktuell die `WARMUP`-Kategorie. Dadurch werden sie aus der Drill-Phase ausgefiltert und nie gepickt.

**Fix:** `WARMUP`-Kategorie von beiden Drills entfernen. Sie behalten `CONDITIONING` und werden über den `BASERUNNING`-Focus (der `CONDITIONING` mit-mappt) reachable. Der eigentliche Aufwärm-Routine-Drill (`aufwarmroutine-dead-sox`) bleibt der einzige fixed-Slot.

## Frontend

### UI-Änderung in Plan-Erstellen-Komponente

Inline unter dem `INFIELD_DEFENSE`-Toggle erscheinen 4 Position-Chips (multi-toggle):

```
┌─ Schwerpunkt ──────────────────────────────────────┐
│  ☐ Werfen                                          │
│  ☑ Infield Defense                                 │
│      Positionen (optional, multi-select):          │
│      ☐ 1B   ☑ 2B   ☑ SS   ☐ 3B                     │
│  ☐ Outfield                                        │
│  ☐ Baserunning                                     │
│  ☐ Catcher                                         │
│  ☐ Situational                                     │
│  ☐ Relay                                           │
│  ☐ Allround                                        │
└────────────────────────────────────────────────────┘
```

**State-Verhalten:**
- INFIELD_DEFENSE deaktiviert → Position-Chips ausgeblendet, ausgewählte Positionen reset.
- INFIELD_DEFENSE aktiv aber keine Position → Plan-API ohne `infieldPositions`-Param → wie heute.
- Mindestens 1 Position aktiv → Plan-API mit `infieldPositions=...`.

**Komponenten:**
- Bestehende Focus-Auswahl-Komponente erweitert. Neuer State: `selectedInfieldPositions: ('1B'|'2B'|'SS'|'3B')[]`.
- `DrillCategory`-Type bleibt unverändert (Position-Codes sind Sub-Focus, keine Kategorien).
- API-Aufruf in `useTrainingPlan` Hook (oder vergleichbar) übergibt `infieldPositions`.

**Frontend-Design Skill** wird beim Implementieren herangezogen für Polish (Chip-Visual, Hover-States, Animation beim Aufklappen).

## Tests

### Backend

`TrainingPlanGeneratorTest` + `TrainingPlanGeneratorIntegrationTest` erweitern um:

- Sub-Focus mit 1 Position → BASIC-Block mit 1 Drill, 1 Station.
- Sub-Focus mit 2 Positionen → 2 BASICs, 2 Stationen.
- Sub-Focus mit 3 Positionen, 10 Spieler → Cap 2 Stationen, 1 Position fällt raus.
- Sub-Focus mit 4 Positionen, 16 Spieler → 2 BASICs (von 4), 3 Stationen (Cap).
- Position ohne BASIC (3B vor neuen Drills, später z.B. testweise) → BASIC-Block überspringt.
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

1. Backend Domain: Enum + Feld in `Drill` und DTO.
2. drills.json: complexity-Tags + 4 neue Drills + WARMUP-Removal.
3. Typst: 4 neue Drills + PDF rebuild.
4. Generator: Logik für BASICS-Block + STATIONS-Block mit Fallback.
5. API: Param-Annahme im Controller, Service-Signatur erweitern.
6. Backend-Tests.
7. Frontend Types: `infieldPositions` im Plan-Request-Body.
8. Frontend UI: Inline-Chips, State, API-Call.
9. Frontend Polish via frontend-design Skill (Chip-Visual).
10. Doku update.
11. Build (`mvn test`, `npm run build`), commit, push.

## Risiken & Offene Punkte

- **Drill-Knappheit bei 3B:** Vor den neuen Drills hatte 3B 0 BASIC + 2 ADVANCED. Mit den 3 neuen 3B-BASICs ist 3B vollwertig.
- **Cap-Konflikt bei 4 Positionen + 10 Spielern:** 4 Positionen, aber max 2 Stationen → 2 fallen raus. Nutzer könnte überrascht sein. Mitigation: Frontend-Hinweis "Bei wenigen Spielern werden manche Positionen nicht zu Stationen — wähle gezielt."
- **Backward-Kompatibilität:** Bestehende Plans (ohne `infieldPositions`) verhalten sich unverändert.
- **Performance:** Drill-Auswahl bleibt O(n), `n` ~50 Drills — irrelevant.
