# Trainingsplan: Optionale Anfänger-Gruppe

**Datum:** 2026-05-27
**Status:** Design approved, ready für writing-plans

## Problem

Aktuell wird pro Training genau ein Plan generiert. Use-Case: parallel zur Hauptgruppe trainiert eine kleinere Anfänger-Gruppe (z.B. neue Spieler) mit anderen Drills. Sie sollen die gleiche Warmup-, Batting- und Game-Phase haben, aber während der Skill-Stations eigene, einfachere Drills bekommen.

## Approach

**Gewählt: 1 Plan mit `group`-Feld pro Section** (Approach B aus Brainstorm).

Plan bleibt 1 Eintrag pro Training. Sections bekommen ein Group-Discriminator (`ALL` / `MAIN` / `BEGINNER`). Shared Phasen (Warmup, Partner-Routine, Batting, Game) bleiben `ALL`. Skill-Phase wird bei aktivierter Anfänger-Toggle in zwei parallele Section-Blocks gesplittet: `MAIN` (alle complexities) + `BEGINNER` (nur `complexity=BASIC`, ca. 1.5x länger).

**Verworfene Alternativen:**
- **A. Zwei vollständige separate Pläne:** Duplikation von Warmup/Batting-Texten. Änderungen müssen doppelt gepflegt werden.
- **C. Sub-Plans eingebettet in Content:** Schema-Change groß, JSONB-Migration nötig, keine klare Vorteile.

## Architektur

```
[Generator-Form]
   ↓ withBeginnerGroup=true, beginnerCount=4
[TrainingPlanRequest]
   ↓
[TrainingPlanGenerator]
   ├─ Warmup section          group=ALL
   ├─ Partner-Routine         group=ALL
   ├─ Skill-Phase:
   │    ├─ Main-Stations       group=MAIN     (alle complexities)
   │    └─ Beginner-Station    group=BEGINNER (nur complexity=BASIC, ~1.5x länger)
   ├─ Batting                  group=ALL
   └─ Game                     group=ALL
   ↓
[Plan-Content JSONB]
   sections: [{...group=ALL}, {...group=MAIN}, {...group=BEGINNER}, ...]
   ↓
[Frontend PlanDisplay]
   • group=ALL: full-width section
   • Konsekutive MAIN+BEGINNER: 2-Spalten-Layout (Desktop)
                                 stacked mit Group-Pille (Mobile)
```

## Datenmodell

### TrainingPlanRequest (Domain + DTO)

```java
public class TrainingPlanRequest {
    // ... existing
    private boolean withBeginnerGroup;   // default false
    private int beginnerCount;            // default 0
}
```

### TrainingPlanSection (Domain + DTO)

```java
public class TrainingPlanSection {
    // ... existing
    private SectionGroup group;  // enum, default ALL
}

public enum SectionGroup {
    ALL,
    MAIN,
    BEGINNER
}
```

### Storage

Sections werden weiterhin als JSONB-Array in `training_plans.plan_content` gespeichert. **Keine DB-Migration nötig.** Bestehende Pläne haben kein `group`-Feld → JSON-Deserialization liefert `null` → Default-Mapping auf `ALL` (backward-compat).

## Generator-Logik

```pseudo
generate(req):
  sections = []
  mainPlayers = req.playerCount
  beginnerPlayers = req.beginnerCount
  totalPlayers = mainPlayers + beginnerPlayers
  withBeginner = req.withBeginnerGroup && beginnerPlayers >= 2

  // Shared phases — totalPlayers für Batting-Berechnung
  sections += buildWarmup(totalPlayers)              group=ALL
  sections += buildPartnerRoutine(totalPlayers)      group=ALL

  // Skill-Phase: branch
  skillMinutes = computeSkillMinutes(durationMinutes)
  if (withBeginner):
    mainSections     = buildStationBlock(allDrills,   mainPlayers,    skillMinutes)
    beginnerMinutes  = skillMinutes + max(10, skillMinutes/2)  // ~1.5x
    basicDrills      = availableDrills.filter(d -> d.complexity == BASIC)
    beginnerSections = buildStationBlock(basicDrills, beginnerPlayers, beginnerMinutes)
    mainSections.forEach(s -> s.group = MAIN)
    beginnerSections.forEach(s -> s.group = BEGINNER)
    sections += mainSections + beginnerSections
  else:
    sections += buildStationBlock(allDrills, totalPlayers, skillMinutes)  group=ALL

  sections += buildBatting(totalPlayers)             group=ALL
  sections += buildGame(totalPlayers)                group=ALL
  return sections
```

### Edge Cases

| Case | Verhalten |
|------|-----------|
| `withBeginnerGroup=false` | Single-Group wie bisher (backward-compat) |
| `beginnerPlayers < 2` | Kein Split, alle in MAIN-Pool, `groupDistributionHint`: "Zu wenig Anfänger für eigenen Block — mit Hauptgruppe trainieren" |
| `basicDrills.isEmpty()` | Fallback: nutze alle Drills für Beginner-Slot + Warnung "Keine BASIC-Drills im Pool — manuell anpassen" |
| Existing plans ohne group-field | Deserialize → `null` → default `ALL` (transparent) |

## API

### Generate (unverändert URL, neue Felder)

```
POST /api/training-plans/generate
Body: {
  trainingId, playerCount, focus, durationMinutes, infieldPositions,
  withBeginnerGroup,   // NEU
  beginnerCount        // NEU
}
```

### Manual Drill Swap (NEU)

```
PATCH /api/training-plans/{id}/sections/{index}
Body: { drillId: "PUSHUP_GROUNDER" }

Effect:
- **Überschrieben aus neuem Drill:** `drillId`, `title`, `rotationPlan`, `setupNotes`, `tips` (Drill-Meta)
- **Bleiben unverändert:** `sectionType`, `durationMinutes`, `rounds`, `group`, `adaptationNotes`, `groupSetup`, `userNotes`, `parallelGroup`, `playersPerGroup` (User-Edits + Layout-Kontext)
```

Manual Swap respektiert nicht das `group`-Constraint — User darf jeden Drill auf jede Section legen. UI filtert die Vorschläge basierend auf group, aber Backend akzeptiert beliebige drillId.

## Frontend

### Generator-Form (TrainingForm)

```
┌─ Trainingsplan generieren ──────────┐
│ Spieleranzahl: [12]  (Hauptgruppe)  │
│ [✓] Mit Anfängergruppe?             │
│ Anfänger-Anzahl: [4]  (min 2)       │
│ Focus: ...                          │
│ Dauer: ...                          │
└─────────────────────────────────────┘
```

### Plan-Anzeige (PlanDisplay)

- Linear-Loop über sections
- `group=ALL` → full-width Section-Card wie bisher
- Konsekutive `MAIN` + `BEGINNER` Sections werden gemerged dargestellt:
  - Group-Header "Skill-Phase · Hauptgruppe + Anfänger"
  - Desktop (≥sm): 2-Spalten Grid
  - Mobile (<sm): Stacked mit farbiger Group-Pille (navy=MAIN, amber=BEGINNER)

### Plan-Editor (PlanEditDrawer)

- Jeder Section bekommt Group-Badge
- "Add Drill"-Button mit Group-Picker: für welche Gruppe? (ALL/MAIN/BEGINNER)
- Manual-Drill-Swap: Pencil-Icon auf Section → DrillPickerModal mit Pre-Filter:
  - `BEGINNER` → nur `complexity=BASIC` Drills
  - `MAIN` → alle Drills
  - `ALL` → alle Drills

## Tests

### Backend (TrainingPlanGeneratorTest)
- `generate_singleGroup_unchanged` — Backward-compat (alle sections group=ALL)
- `generate_dualGroup_basicSections` — Korrekte group-Verteilung
- `generate_dualGroup_beginnerLonger` — Beginner-Block ~1.5x Main
- `generate_dualGroup_basicDrillFilter` — Beginner-Sections nur BASIC
- `generate_dualGroup_tooFewBegPlayers` — beginnerCount<2 → no split + warning
- `generate_dualGroup_noBasicDrills` — fallback + warning
- `manualDrillSwap_section` — PATCH endpoint test

### Frontend E2E
- `plan-generate-dual-group.spec.ts` — Toggle + 4 Anfänger → Display zeigt MAIN+BEGINNER side-by-side
- `plan-edit-swap-drill.spec.ts` — Manual drill swap per section

## Out of Scope / Future

- **Eigene Anfänger-Group-Stats:** Nicht in dieser Iteration. Stats sind player-level, nicht group-level.
- **Coaches pro Gruppe:** Multi-Coach-Assignment nicht enthalten — wird im PlanDisplay-Text gehandhabt ("Coach 1 → Hauptgruppe, Coach 2 → Anfänger").
- **Beginner-Drills im Pool pflegen:** User pflegt manuell aus PDF. Kein automatisches Import-Tooling.

## Bekannter Bug (separater Fix, kein Teil dieser Spec)

**PlanEditDrawer add-drill schließt Editor:**
- DrillPicker ist nested ResponsiveSheet
- Wahrscheinlich Vaul-NestedRoot Close-Propagation
- Plus Anti-Pattern: `setExpandedSet` innerhalb `setSections`-Updater
- Fix als sidequest nach diesem Feature

## Implementierungs-Reihenfolge

1. Backend Domain + Enum (`SectionGroup`, Field auf `TrainingPlanSection` + `TrainingPlanRequest`)
2. Generator-Logik branch + Tests
3. Manual-Swap-Endpoint + Test
4. Frontend Types
5. Generator-Form Checkbox + Anfänger-Count
6. PlanDisplay Group-aware Layout
7. PlanEditor Group-Badges + Drill-Swap-Button
8. E2E Tests
9. Bug-Sidequest PlanEditDrawer-Close

## Files To Touch

```
backend/src/main/java/com/softball/domain/model/
  TrainingPlanRequest.java
  TrainingPlanSection.java
  SectionGroup.java  (new)
backend/src/main/java/com/softball/domain/service/
  TrainingPlanGenerator.java
backend/src/main/java/com/softball/application/
  TrainingPlanService.java  (manual swap)
backend/src/main/java/com/softball/adapter/in/web/
  TrainingPlanController.java  (PATCH endpoint)
backend/src/main/java/com/softball/adapter/dto/
  TrainingPlanSectionResponse.java
  TrainingPlanRequestDto.java
backend/src/test/java/com/softball/domain/service/
  TrainingPlanGeneratorTest.java

frontend/src/types/index.ts
frontend/src/api/client.ts  (patchSection)
frontend/src/components/training/
  GeneratePlanDrawer.tsx       (Checkbox + Anfänger-Count)
  TrainingPlanView.tsx         (PlanDisplay Group-aware Layout)
  PlanEditDrawer.tsx           (Group-Badges, Drill-Swap-Pencil)
  DrillPickerModal.tsx         (group-filter prop)
frontend/e2e/training/
  plan-generate-dual-group.spec.ts  (new)
  plan-edit-swap-drill.spec.ts  (new)
```
