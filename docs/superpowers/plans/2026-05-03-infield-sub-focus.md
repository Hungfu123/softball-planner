# Infield Sub-Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sub-Focus-Auswahl bei `INFIELD_DEFENSE` (Multi-Select 1B/2B/SS/3B) mit Hybrid-Drill-Phase (BASICS sequenziell + STATIONS parallel/Deep-Dive) plus Frontend-UI, Persistierung, 4 neue Drills.

**Architecture:** Neue Enums `DrillComplexity` und `InfieldPosition` im Domain-Layer. Generator pickt BASIC/ADVANCED-Drills pro gewählter Position mit Fallback-Logik. Frontend-PlanForm bekommt Sub-Section unter Focus-Chips. Persistierung als VARCHAR-Spalte in `training_plans` via Flyway-Migration.

**Tech Stack:** Java 21 / Spring Boot 3.4 / JPA / Flyway / React 19 / TypeScript / Tailwind v4. Backend-Tests mit JUnit + AssertJ. Frontend-Build via Vite + tsc.

**Spec:** [docs/superpowers/specs/2026-05-03-infield-sub-focus-design.md](../specs/2026-05-03-infield-sub-focus-design.md)

---

## File Structure

**New files:**
- `backend/src/main/java/com/softball/domain/model/DrillComplexity.java` — Enum BASIC/ADVANCED.
- `backend/src/main/java/com/softball/domain/model/InfieldPosition.java` — Enum FIRST_BASE/SECOND_BASE/SS/THIRD_BASE.
- `backend/src/main/resources/db/migration/V{n}__add_infield_positions_to_training_plans.sql` — Flyway-Migration.
- `drills/drills/<jeder neue drill>.typ` — 4 neue Typst-Blöcke (in vorhandene Files eingefügt).

**Modified files:**
- `backend/src/main/java/com/softball/domain/model/Drill.java` — Feld `complexity` + Getter/Setter.
- `backend/src/main/java/com/softball/domain/model/TrainingPlan.java` — Feld `infieldPositions` + Getter/Setter.
- `backend/src/main/java/com/softball/adapter/dto/DrillResponse.java` — Feld `complexity`.
- `backend/src/main/java/com/softball/adapter/dto/GeneratePlanRequest.java` — Feld `infieldPositions`.
- `backend/src/main/java/com/softball/adapter/dto/TrainingPlanResponse.java` — Feld `infieldPositions`.
- `backend/src/main/java/com/softball/adapter/out/persistence/entity/TrainingPlanEntity.java` — Feld `infieldPositions`.
- `backend/src/main/java/com/softball/adapter/out/persistence/mapper/TrainingPlanMapper.java` — String ↔ List-Mapping.
- `backend/src/main/java/com/softball/adapter/out/drillcatalog/JsonDrillCatalogAdapter.java` — Default-Komplexität via Initializer (kein Code-Change wenn Drill-POJO Initializer hat).
- `backend/src/main/java/com/softball/application/TrainingPlanService.java` — Signatur erweitern.
- `backend/src/main/java/com/softball/domain/service/TrainingPlanGenerator.java` — Neue Sub-Focus-Logik.
- `backend/src/main/java/com/softball/adapter/in/web/TrainingPlanController.java` — Param-Durchreichung.
- `backend/src/main/resources/drills.json` — 4 neue Drills + complexity-Tags + WARMUP-Removal.
- `drills/drills/second-base.typ` — Neuer Drill `2B Hocke-Wurf zur 1B`.
- `drills/drills/third-base.typ` — 3 neue 3B-Drills.
- `frontend/src/types/index.ts` — `InfieldPosition`-Type + Plan-Request/Response.
- `frontend/src/components/training-plan/PlanForm.tsx` — Sub-Section.
- `frontend/src/components/training-plan/PlanDisplay.tsx` — Header-Anzeige.
- `frontend/src/components/training-plan/PlanEditor.tsx` — DrillPicker-Eingrenzung.
- `frontend/src/components/training-plan/DrillPickerModal.tsx` — Optional Complexity-Badge.
- `docs/trainingsplan-algorithmus.md` — Doku-Update.

**Test files:**
- `backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorTest.java` — Neue Sub-Focus-Tests.
- `backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorIntegrationTest.java` — Neue Integration-Tests.

---

## Phase 1: Backend Domain — Enums & Drill-Feld

### Task 1.1: DrillComplexity Enum

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/DrillComplexity.java`

- [ ] **Step 1: Create enum**

```java
package com.softball.domain.model;

public enum DrillComplexity {
    BASIC,
    ADVANCED
}
```

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/DrillComplexity.java
git commit -m "✨ Domain: DrillComplexity-Enum (BASIC/ADVANCED)"
```

### Task 1.2: InfieldPosition Enum

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/InfieldPosition.java`

- [ ] **Step 1: Create enum**

```java
package com.softball.domain.model;

public enum InfieldPosition {
    FIRST_BASE,
    SECOND_BASE,
    SS,
    THIRD_BASE;

    public DrillCategory toDrillCategory() {
        return DrillCategory.valueOf(this.name());
    }
}
```

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/InfieldPosition.java
git commit -m "✨ Domain: InfieldPosition-Enum mit DrillCategory-Mapping"
```

### Task 1.3: Drill-Modell um `complexity` erweitern

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/Drill.java`

- [ ] **Step 1: Feld + Initializer + Getter/Setter ergänzen**

```java
// neues Feld in Drill.java unterhalb der existierenden Felder
private DrillComplexity complexity = DrillComplexity.BASIC;

// Getter/Setter unten anhängen
public DrillComplexity getComplexity() { return complexity; }
public void setComplexity(final DrillComplexity complexity) {
    this.complexity = complexity != null ? complexity : DrillComplexity.BASIC;
}
```

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/Drill.java
git commit -m "✨ Domain: Drill bekommt complexity-Feld (default BASIC)"
```

### Task 1.4: DrillResponse-DTO erweitern

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/DrillResponse.java`

- [ ] **Step 1: DTO inspizieren und Feld + Mapping ergänzen**

Lies erst `DrillResponse.java`. Es ist ein Java-Record. Füge `complexity` in der Component-Liste an passender Stelle hinzu (vor dem schließenden `)`):

```java
public record DrillResponse(
    String id,
    String name,
    List<DrillCategory> categories,
    int minPlayers,
    List<String> equipment,
    String description,
    boolean hasImage,
    Integer pdfPage,
    String rotation,
    String variants,
    DrillComplexity complexity   // NEU
) {
    public static DrillResponse from(final Drill drill) {
        return new DrillResponse(
            drill.getId(), drill.getName(), drill.getCategories(),
            drill.getMinPlayers(), drill.getEquipment(), drill.getDescription(),
            drill.isHasImage(), drill.getPdfPage(), drill.getRotation(), drill.getVariants(),
            drill.getComplexity()
        );
    }
}
```

Falls `DrillResponse` nicht alle Felder hat, passe nur den Existing-Stand mit `complexity` an. Importe ergänzen: `import com.softball.domain.model.DrillComplexity;`.

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/DrillResponse.java
git commit -m "✨ DTO: DrillResponse liefert complexity"
```

---

## Phase 2: Drill-Katalog (drills.json + Typst)

### Task 2.1: drills.json — complexity-Tags für Position-Drills

**Files:**
- Modify: `backend/src/main/resources/drills.json`

- [ ] **Step 1: Python-Skript mit allen Tags ausführen**

```bash
python3 << 'EOF'
import json
PATH = 'backend/src/main/resources/drills.json'
with open(PATH) as f:
    drills = json.load(f)

ADVANCED = {
    '1b-bunt-defense', '1b-3-1-putout', '1b-3-6-3-double-play', '1b-wurf-home-3rd',
    '2b-komplett-drill', '2b-double-play-pivots',
    'ss-komplett-drill', 'ss-force-3b-bogen-1b',
    '3b-komplett-drill', '3b-bunt-defense',
    'infield-plays-aufgebaut', 'infield-wurf-home-runner-3rd',
    'rundown', 'second-short-double-play',
}
BASIC_OVERRIDE = {
    '1b-footwork-stretch', '1b-scoops', '1b-bad-throws', '1b-receiving-alle-positionen',
    '2b-fielding-bat',
    'ss-halbkreis-fielding', 'ss-backhand-1b', 'ss-fielding-bat',
}
for d in drills:
    if d['id'] in ADVANCED:
        d['complexity'] = 'ADVANCED'
    elif d['id'] in BASIC_OVERRIDE:
        d['complexity'] = 'BASIC'
    # alle anderen → kein complexity-Feld → Default BASIC

with open(PATH, 'w') as f:
    json.dump(drills, f, indent=2, ensure_ascii=False)
    f.write('\n')
print('Done')
EOF
```

- [ ] **Step 2: Verifizieren**

Run: `grep -c '"complexity": "ADVANCED"' backend/src/main/resources/drills.json`
Expected: `14`

Run: `grep -c '"complexity": "BASIC"' backend/src/main/resources/drills.json`
Expected: `8`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/drills.json
git commit -m "📝 Drills: complexity-Tags für 22 Position-Drills"
```

### Task 2.2: drills.json — WARMUP-Removal von Sprintübung + Agility

**Files:**
- Modify: `backend/src/main/resources/drills.json`

- [ ] **Step 1: Skript**

```bash
python3 << 'EOF'
import json
PATH = 'backend/src/main/resources/drills.json'
with open(PATH) as f:
    drills = json.load(f)
TARGETS = {'sprintubung-fielding-position', 'agility-ladder-beinubungen'}
for d in drills:
    if d['id'] in TARGETS and 'WARMUP' in d['categories']:
        d['categories'].remove('WARMUP')
        print(f"- WARMUP from {d['id']}")
with open(PATH, 'w') as f:
    json.dump(drills, f, indent=2, ensure_ascii=False)
    f.write('\n')
EOF
```

- [ ] **Step 2: Verifizieren**

Run: `python3 -c "import json; d=json.load(open('backend/src/main/resources/drills.json')); [print(x['id'],x['categories']) for x in d if x['id'] in ('sprintubung-fielding-position','agility-ladder-beinubungen')]"`
Expected: keine `WARMUP` mehr in beiden Listen.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/drills.json
git commit -m "🔧 Drills: WARMUP-Cat von Sprintübung + Agility entfernt (Stranded-Fix)"
```

### Task 2.3: Typst — `2B Hocke-Wurf zur 1B`

**Files:**
- Modify: `drills/drills/second-base.typ`

- [ ] **Step 1: Drill-Block am Ende der Datei einfügen**

Hänge an `drills/drills/second-base.typ` an:

```typst
#drill(
  name: "2B Hocke-Wurf zur 1B",
  kategorien: ("2B", "Fielding"),
  spieler: 3,
  equipment: ("Bälle", "Base (1B)"),
  beschreibung: [
    Isolierte BASIC-Übung — Phase 1 vom 2B-Komplett als Stand-alone für die Aufwärm-/Aktivierungsphase.

    *Ablauf:* Tosser rollt frontal zur 2B. Die 2B fängt den Ball, bleibt in der Hocke und wirft direkt aus der Hocke heraus zur 1B. Keine Drehung, kein Aufstehen, kein Toss zum SS — nur die saubere Hocke-Wurf-Mechanik.

    *Fokus:* Tiefer Stand, Augen auf den Ball, Wurf aus der Schulter ohne Zwischenschritte.
  ],
  rotation: [Rotation 2B → 1B → Tosser → 2B nach 5–8 Bällen.],
)
```

- [ ] **Step 2: Compile prüfen**

Run: `cd drills && typst compile drills.typ drills.pdf 2>&1 | head -5`
Expected: keine Fehler.

- [ ] **Step 3: drills.json-Eintrag hinzufügen**

```bash
python3 << 'EOF'
import json
PATH = 'backend/src/main/resources/drills.json'
with open(PATH) as f:
    drills = json.load(f)
drills.append({
    "id": "2b-hocke-wurf-1b",
    "name": "2B Hocke-Wurf zur 1B",
    "categories": ["SECOND_BASE", "FIELDING"],
    "minPlayers": 3,
    "equipment": ["Bälle", "Base (1B)"],
    "description": "Isolierte BASIC-Übung — Phase 1 vom 2B-Komplett als Stand-alone für die Aufwärm-/Aktivierungsphase.\n\nAblauf: Tosser rollt frontal zur 2B. Die 2B fängt den Ball, bleibt in der Hocke und wirft direkt aus der Hocke heraus zur 1B. Keine Drehung, kein Aufstehen, kein Toss zum SS — nur die saubere Hocke-Wurf-Mechanik.\n\nFokus: Tiefer Stand, Augen auf den Ball, Wurf aus der Schulter ohne Zwischenschritte.",
    "hasImage": False,
    "rotation": "Rotation 2B → 1B → Tosser → 2B nach 5–8 Bällen.",
    "variants": None,
    "complexity": "BASIC"
})
with open(PATH, 'w') as f:
    json.dump(drills, f, indent=2, ensure_ascii=False)
    f.write('\n')
EOF
```

- [ ] **Step 4: Build PDF und drills.json sync**

Run: `./drills/build.sh 2>&1 | tail -5`
Expected: `2B Hocke-Wurf zur 1B: None → <Seite>` aktualisiert.

- [ ] **Step 5: Commit**

```bash
git add drills/drills/second-base.typ drills/drills.pdf backend/src/main/resources/drills.json backend/src/main/resources/static/drills.pdf
git commit -m "✨ Drills: 2B Hocke-Wurf zur 1B (BASIC)"
```

### Task 2.4: Typst — `3B Short Hop Reaction`

**Files:**
- Modify: `drills/drills/third-base.typ`

- [ ] **Step 1: Drill-Block in `third-base.typ` ergänzen**

```typst
#drill(
  name: "3B Short Hop Reaction",
  kategorien: ("3B", "Fielding"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Reaktions- und Hände-Drill für 3B. Werfer steht ca. 1.5–2 m vor 3B und wirft Short Hops abwechselnd middle / forehand / backhand.

    *Ablauf:* 10 Würfe middle, 10 forehand, 10 backhand. Tempo zügig, 3B bleibt tief in der Hocke.

    *Fokus:* Schnelle Hände, kein Zurückweichen, Ball aus der Hocke fangen — nicht stehen bleiben.
  ],
  rotation: [Werfer und 3B tauschen nach 30 Bällen.],
)
```

- [ ] **Step 2: drills.json-Eintrag**

```bash
python3 << 'EOF'
import json
PATH = 'backend/src/main/resources/drills.json'
with open(PATH) as f:
    drills = json.load(f)
drills.append({
    "id": "3b-short-hop-reaction",
    "name": "3B Short Hop Reaction",
    "categories": ["THIRD_BASE", "FIELDING"],
    "minPlayers": 2,
    "equipment": ["Bälle"],
    "description": "Reaktions- und Hände-Drill für 3B. Werfer steht ca. 1.5–2 m vor 3B und wirft Short Hops abwechselnd middle / forehand / backhand.\n\nAblauf: 10 Würfe middle, 10 forehand, 10 backhand. Tempo zügig, 3B bleibt tief in der Hocke.\n\nFokus: Schnelle Hände, kein Zurückweichen, Ball aus der Hocke fangen — nicht stehen bleiben.",
    "hasImage": False,
    "rotation": "Werfer und 3B tauschen nach 30 Bällen.",
    "variants": None,
    "complexity": "BASIC"
})
with open(PATH, 'w') as f:
    json.dump(drills, f, indent=2, ensure_ascii=False)
    f.write('\n')
EOF
```

- [ ] **Step 3: Build**

Run: `./drills/build.sh 2>&1 | tail -3`

- [ ] **Step 4: Commit**

```bash
git add drills/drills/third-base.typ drills/drills.pdf backend/src/main/resources/drills.json backend/src/main/resources/static/drills.pdf
git commit -m "✨ Drills: 3B Short Hop Reaction (BASIC)"
```

### Task 2.5: Typst — `3B Forehand & Backhand zur 1B`

**Files:**
- Modify: `drills/drills/third-base.typ`

- [ ] **Step 1: Drill-Block einfügen**

```typst
#drill(
  name: "3B Forehand & Backhand zur 1B",
  kategorien: ("3B", "Fielding"),
  spieler: 3,
  equipment: ("Bälle", "Base (1B)"),
  beschreibung: [
    Isolierte Bewegungs-Übung für 3B-Fielding zur 1B.

    *Phase 1 — Forehand:* Tosser rollt links Richtung 2B-Seite. 3B nimmt den Ball forehand auf, wirft zur 1B.

    *Phase 2 — Backhand:* Tosser rollt rechts Richtung Foul-Line. 3B Crossover-Schritt nach rechts, Ball backhand aufnehmen, Wurf zur 1B.

    Keine Spielsituation, keine Bunts — nur die saubere Bewegung und der Wurf.
  ],
  rotation: [Rotation 3B → 1B → Tosser → 3B nach 6–8 Bällen pro Phase.],
)
```

- [ ] **Step 2: drills.json-Eintrag**

```bash
python3 << 'EOF'
import json
PATH = 'backend/src/main/resources/drills.json'
with open(PATH) as f:
    drills = json.load(f)
drills.append({
    "id": "3b-forehand-backhand-1b",
    "name": "3B Forehand & Backhand zur 1B",
    "categories": ["THIRD_BASE", "FIELDING"],
    "minPlayers": 3,
    "equipment": ["Bälle", "Base (1B)"],
    "description": "Isolierte Bewegungs-Übung für 3B-Fielding zur 1B.\n\nPhase 1 — Forehand: Tosser rollt links Richtung 2B-Seite. 3B nimmt den Ball forehand auf, wirft zur 1B.\n\nPhase 2 — Backhand: Tosser rollt rechts Richtung Foul-Line. 3B Crossover-Schritt nach rechts, Ball backhand aufnehmen, Wurf zur 1B.\n\nKeine Spielsituation, keine Bunts — nur die saubere Bewegung und der Wurf.",
    "hasImage": False,
    "rotation": "Rotation 3B → 1B → Tosser → 3B nach 6–8 Bällen pro Phase.",
    "variants": None,
    "complexity": "BASIC"
})
with open(PATH, 'w') as f:
    json.dump(drills, f, indent=2, ensure_ascii=False)
    f.write('\n')
EOF
```

- [ ] **Step 3: Build + Commit**

```bash
./drills/build.sh 2>&1 | tail -3
git add drills/drills/third-base.typ drills/drills.pdf backend/src/main/resources/drills.json backend/src/main/resources/static/drills.pdf
git commit -m "✨ Drills: 3B Forehand & Backhand zur 1B (BASIC)"
```

### Task 2.6: Typst — `3B Reaktion „Jetzt!"`

**Files:**
- Modify: `drills/drills/third-base.typ`

- [ ] **Step 1: Drill-Block einfügen**

```typst
#drill(
  name: "3B Reaktion „Jetzt!\"",
  kategorien: ("3B", "Fielding"),
  spieler: 2,
  equipment: ("Bälle",),
  beschreibung: [
    Reaktions-Drill mit erstem Schritt-Footwork.

    *Ablauf:* 3B steht mit Rücken zum Werfer. Werfer wirft einen Grounder und ruft gleichzeitig „Jetzt!". 3B dreht sich, sucht den Ball, fieldet ihn und wirft zur 1B (oder Stand-in).

    *Fokus:* Reaktion, schneller First-Step (Jab → Crossover), Ball schnell finden. 10 Bälle pro Runde.
  ],
  rotation: [Werfer und 3B tauschen nach 10 Bällen.],
)
```

- [ ] **Step 2: drills.json-Eintrag**

```bash
python3 << 'EOF'
import json
PATH = 'backend/src/main/resources/drills.json'
with open(PATH) as f:
    drills = json.load(f)
drills.append({
    "id": "3b-reaktion-jetzt",
    "name": "3B Reaktion „Jetzt!\"",
    "categories": ["THIRD_BASE", "FIELDING"],
    "minPlayers": 2,
    "equipment": ["Bälle"],
    "description": "Reaktions-Drill mit erstem Schritt-Footwork.\n\nAblauf: 3B steht mit Rücken zum Werfer. Werfer wirft einen Grounder und ruft gleichzeitig „Jetzt!\". 3B dreht sich, sucht den Ball, fieldet ihn und wirft zur 1B (oder Stand-in).\n\nFokus: Reaktion, schneller First-Step (Jab → Crossover), Ball schnell finden. 10 Bälle pro Runde.",
    "hasImage": False,
    "rotation": "Werfer und 3B tauschen nach 10 Bällen.",
    "variants": None,
    "complexity": "BASIC"
})
with open(PATH, 'w') as f:
    json.dump(drills, f, indent=2, ensure_ascii=False)
    f.write('\n')
EOF
```

- [ ] **Step 3: Build + Commit**

```bash
./drills/build.sh 2>&1 | tail -3
git add drills/drills/third-base.typ drills/drills.pdf backend/src/main/resources/drills.json backend/src/main/resources/static/drills.pdf
git commit -m "✨ Drills: 3B Reaktion „Jetzt!\" (BASIC)"
```

---

## Phase 3: Persistierung — Flyway + Entity + Mapper + Domain

### Task 3.1: Flyway-Migration

**Files:**
- Create: `backend/src/main/resources/db/migration/V{n}__add_infield_positions_to_training_plans.sql`

- [ ] **Step 1: Höchste vorhandene Versions-Nummer finden**

Run: `ls backend/src/main/resources/db/migration/ | tail -5`
Notiere die höchste `V{n}__...sql` Nummer und nutze `n+1` für die neue.

- [ ] **Step 2: Migration-Datei anlegen**

Mit `n+1` als Versionsnummer (Beispiel hier: `V42`):

`backend/src/main/resources/db/migration/V42__add_infield_positions_to_training_plans.sql`:
```sql
ALTER TABLE training_plans ADD COLUMN infield_positions VARCHAR(100);
```

- [ ] **Step 3: Compile (validiert nichts, aber checkt Build)**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V42__add_infield_positions_to_training_plans.sql
git commit -m "✨ DB: Flyway-Migration für training_plans.infield_positions"
```

### Task 3.2: TrainingPlanEntity erweitern

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/entity/TrainingPlanEntity.java`

- [ ] **Step 1: Neue Spalte einfügen**

Vor `@Column(name = "created_at"...)`:
```java
@Column(name = "infield_positions", length = 100)
private String infieldPositions;
```

Getter/Setter unten anhängen:
```java
public String getInfieldPositions() { return infieldPositions; }
public void setInfieldPositions(final String infieldPositions) { this.infieldPositions = infieldPositions; }
```

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/entity/TrainingPlanEntity.java
git commit -m "✨ Entity: TrainingPlanEntity.infieldPositions"
```

### Task 3.3: Domain TrainingPlan erweitern

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/TrainingPlan.java`

- [ ] **Step 1: Feld + Initializer + Getter/Setter**

```java
import java.util.List;
import java.util.ArrayList;

// Feld:
private List<InfieldPosition> infieldPositions = new ArrayList<>();

// Getter/Setter:
public List<InfieldPosition> getInfieldPositions() { return infieldPositions; }
public void setInfieldPositions(final List<InfieldPosition> infieldPositions) {
    this.infieldPositions = infieldPositions != null ? infieldPositions : new ArrayList<>();
}
```

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/TrainingPlan.java
git commit -m "✨ Domain: TrainingPlan.infieldPositions"
```

### Task 3.4: TrainingPlanMapper — Entity ↔ Domain

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/out/persistence/mapper/TrainingPlanMapper.java`

- [ ] **Step 1: Mapper-Methoden um Position-String ↔ List-Konvertierung erweitern**

Inspect mit `cat <pfad>` und füge in `toDomain` und `toEntity` die neue Mapping-Logik ein:

In `toDomain(...)`:
```java
final String posStr = entity.getInfieldPositions();
if (posStr != null && !posStr.isBlank()) {
    plan.setInfieldPositions(
        java.util.Arrays.stream(posStr.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(InfieldPosition::valueOf)
            .toList()
    );
}
```

In `toEntity(...)`:
```java
if (plan.getInfieldPositions() != null && !plan.getInfieldPositions().isEmpty()) {
    entity.setInfieldPositions(
        plan.getInfieldPositions().stream()
            .map(InfieldPosition::name)
            .collect(java.util.stream.Collectors.joining(","))
    );
}
```

Importe: `import com.softball.domain.model.InfieldPosition;`.

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/persistence/mapper/TrainingPlanMapper.java
git commit -m "✨ Mapper: TrainingPlan ↔ Entity mit infieldPositions-Konvertierung"
```

---

## Phase 4: Generator-Logik

### Task 4.1: Generator-Tests für Sub-Focus zuerst (TDD)

**Files:**
- Modify: `backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorIntegrationTest.java`

- [ ] **Step 1: Neuen Test für 1-Position-Deep-Dive schreiben**

Hänge an die Klasse an:
```java
@Test
void subFocus_eine_position_deep_dive() {
    final TrainingPlanContent result = generator.generate(
        realCatalog, 10, "INFIELD_DEFENSE", 120,
        java.util.List.of(com.softball.domain.model.InfieldPosition.SS)
    );
    final List<TrainingPlanSection> sections = result.getSections();
    System.out.println("\n=== Sub-Focus 1 Position (SS) ===");
    printPlan(sections);
    final List<TrainingPlanSection> drills = sections.stream()
        .filter(s -> "DRILL".equals(s.getSectionType())).toList();
    assertThat(drills).isNotEmpty();
    // Stations-Block bei 1 Position = sequenziell, kein parallelGroup
    assertThat(drills.stream().noneMatch(s -> s.getParallelGroup() != null)).isTrue();
}

@Test
void subFocus_zwei_positionen_zwei_stationen() {
    final TrainingPlanContent result = generator.generate(
        realCatalog, 12, "INFIELD_DEFENSE", 120,
        java.util.List.of(
            com.softball.domain.model.InfieldPosition.SS,
            com.softball.domain.model.InfieldPosition.SECOND_BASE
        )
    );
    final List<TrainingPlanSection> sections = result.getSections();
    System.out.println("\n=== Sub-Focus 2 Positionen (SS+2B) ===");
    printPlan(sections);
    final long stationGroups = sections.stream()
        .filter(s -> "DRILL".equals(s.getSectionType()) && s.getParallelGroup() != null)
        .map(TrainingPlanSection::getParallelGroup)
        .distinct().count();
    assertThat(stationGroups).isGreaterThan(0);
}
```

Importe ergänzen:
```java
import com.softball.domain.model.InfieldPosition;
```

Wichtig: die existierende 4-Param-Generator-Signatur ist noch da — die neuen Tests rufen die NEUE 5-Param-Signatur. Die wird in Task 4.2 hinzugefügt. Tests werden also zuerst NICHT kompilieren — das ist gewollt für TDD.

- [ ] **Step 2: Test ausführen, Compile-Fehler erwartet**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanGeneratorIntegrationTest 2>&1 | tail -10`
Expected: COMPILATION FAILURE für die neuen Tests (Method nicht gefunden).

- [ ] **Step 3: Commit der Tests (TDD-Stand: roter Test)**

```bash
git add backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorIntegrationTest.java
git commit -m "🧪 Test: Sub-Focus-Tests (rot — Generator noch nicht erweitert)"
```

### Task 4.2: Generator — neue 5-Param-Signatur + Sub-Focus-Pfad

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/TrainingPlanGenerator.java`

- [ ] **Step 1: Neue Signatur + Overload**

Suche die bestehende `public TrainingPlanContent generate(...)` und füge eine neue Signatur hinzu, die alte delegiert:

```java
// alte Methode (jetzt Overload, leitet an neue weiter):
public TrainingPlanContent generate(final List<Drill> allDrills, final int playerCount,
                                    final String focus, final int totalMinutes) {
    return generate(allDrills, playerCount, focus, totalMinutes, java.util.List.of());
}

// neue Methode:
public TrainingPlanContent generate(final List<Drill> allDrills, final int playerCount,
                                    final String focus, final int totalMinutes,
                                    final List<InfieldPosition> infieldPositions) {
    // ... bisheriger Code aus alter generate(...) hier rein, aber mit infieldPositions als Parameter
}
```

Den existierenden Body der `generate`-Methode in die NEUE 5-Param-Variante kopieren. Die alte 4-Param wird nur noch zum Pass-through.

Importe: `import com.softball.domain.model.InfieldPosition;`

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Test ausführen — vorhandene Tests müssen weiter passen**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanGeneratorTest -q 2>&1 | tail -5`
Expected: Tests grün (alte Tests benutzen noch 4-Param, geht via Overload).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/TrainingPlanGenerator.java
git commit -m "♻️ Generator: 5-Param-Overload für infieldPositions vorbereitet"
```

### Task 4.3: Generator — Sub-Focus-Drill-Phase implementieren

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/TrainingPlanGenerator.java`

- [ ] **Step 1: Helper-Konstanten ergänzen**

Bei den anderen `private static final int`-Konstanten:
```java
private static final int SUB_FOCUS_BASIC_MINUTES = 5;
private static final int SUB_FOCUS_MAX_BASICS = 2;
private static final int SUB_FOCUS_MIN_T_FOR_BASICS = 25;
```

- [ ] **Step 2: Helper-Methoden für Drill-Pools (am Klassen-Ende anhängen)**

```java
private List<Drill> findBasicsForPosition(final List<Drill> allDrills, final InfieldPosition pos,
                                            final java.util.Set<String> usedDrillIds, final int maxPlayers) {
    final DrillCategory cat = pos.toDrillCategory();
    return allDrills.stream()
        .filter(d -> d.getCategories().contains(cat))
        .filter(d -> d.getComplexity() == DrillComplexity.BASIC)
        .filter(d -> !d.getCategories().contains(DrillCategory.WARMUP))
        .filter(d -> !d.getCategories().contains(DrillCategory.HITTING))
        .filter(d -> !d.getCategories().contains(DrillCategory.PARTNER_ROUTINE))
        .filter(d -> d.getMinPlayers() <= maxPlayers)
        .filter(d -> !usedDrillIds.contains(d.getId()))
        .toList();
}

private List<Drill> findAdvancedForPosition(final List<Drill> allDrills, final InfieldPosition pos,
                                              final java.util.Set<String> usedDrillIds, final int maxPlayers) {
    final DrillCategory cat = pos.toDrillCategory();
    return allDrills.stream()
        .filter(d -> d.getCategories().contains(cat))
        .filter(d -> d.getComplexity() == DrillComplexity.ADVANCED)
        .filter(d -> !d.getCategories().contains(DrillCategory.WARMUP))
        .filter(d -> !d.getCategories().contains(DrillCategory.HITTING))
        .filter(d -> !d.getCategories().contains(DrillCategory.PARTNER_ROUTINE))
        .filter(d -> d.getMinPlayers() <= maxPlayers)
        .filter(d -> !usedDrillIds.contains(d.getId()))
        .toList();
}
```

- [ ] **Step 3: Sub-Focus-Drill-Phase in `generate(...)` integrieren**

In der NEUEN 5-Param-`generate`-Methode, finde die Stelle wo die Drill-Phase startet (nach Step 4 `for (int fi = 0; fi < focuses.size(); fi++)`).

Vor diesem Loop einen Branch einfügen:
```java
final boolean useSubFocus = infieldPositions != null && !infieldPositions.isEmpty()
    && focuses.stream().anyMatch(f -> f.equalsIgnoreCase("INFIELD_DEFENSE"));

if (useSubFocus) {
    // SUB-FOCUS-Pfad — überspringt die normale Drill-Phase für INFIELD_DEFENSE
    int subFocusMinutes = totalDrillMinutes;
    final List<InfieldPosition> shuffledPositions = new java.util.ArrayList<>(infieldPositions);
    java.util.Collections.shuffle(shuffledPositions);

    // BASICS-Block: max 2 Drills, 5 min each
    int basicsAdded = 0;
    if (subFocusMinutes >= SUB_FOCUS_MIN_T_FOR_BASICS) {
        for (final InfieldPosition pos : shuffledPositions) {
            if (basicsAdded >= SUB_FOCUS_MAX_BASICS) break;
            final List<Drill> basics = findBasicsForPosition(allDrills, pos, usedDrillIds, playerCount);
            if (basics.isEmpty()) continue;
            final List<Drill> shuffled = new java.util.ArrayList<>(basics);
            java.util.Collections.shuffle(shuffled);
            final Drill drill = shuffled.get(0);
            sections.add(buildDrillSection(drill, "DRILL", SUB_FOCUS_BASIC_MINUTES, playerCount));
            usedDrillIds.add(drill.getId());
            subFocusMinutes -= SUB_FOCUS_BASIC_MINUTES;
            basicsAdded++;
        }
    }

    // STATIONS-Block
    final int stationsCap = playerCount >= 12 ? 3 : 2;
    if (shuffledPositions.size() == 1) {
        // Deep Dive — sequenzielle ADVANCED-Drill, keine Aufbaupause
        final InfieldPosition pos = shuffledPositions.get(0);
        Drill chosen = pickAdvancedWithFallback(allDrills, pos, shuffledPositions, usedDrillIds, playerCount);
        if (chosen != null) {
            sections.add(buildDrillSection(chosen, "DRILL", subFocusMinutes, playerCount));
            usedDrillIds.add(chosen.getId());
        }
    } else {
        // 2+ Positionen → parallele Stationen
        if (basicsAdded > 0) {
            sections.add(buildBreakSection("Trinken, nächste Übungen kurz erklären. Wer die Übung kennt, hilft beim Stationen aufbauen.", BREAK_MINUTES));
            subFocusMinutes -= BREAK_MINUTES;
        }
        final List<InfieldPosition> stationPositions = shuffledPositions.subList(0,
            Math.min(stationsCap, shuffledPositions.size()));
        final List<Drill> stationDrills = new java.util.ArrayList<>();
        for (final InfieldPosition pos : stationPositions) {
            final Drill chosen = pickAdvancedWithFallback(allDrills, pos, stationPositions, usedDrillIds, playerCount);
            if (chosen != null) {
                stationDrills.add(chosen);
                usedDrillIds.add(chosen.getId());
            }
        }
        if (!stationDrills.isEmpty()) {
            sections.addAll(buildStationBlock(stationDrills, playerCount, subFocusMinutes, parallelGroupCounter));
            parallelGroupCounter++;
        }
    }

    // andere Schwerpunkte (z.B. OUTFIELD bei Multi-Focus) trotzdem normal abarbeiten:
    final List<String> remainingFocuses = focuses.stream()
        .filter(f -> !f.equalsIgnoreCase("INFIELD_DEFENSE"))
        .toList();
    if (!remainingFocuses.isEmpty()) {
        // hier den vorhandenen Focus-Loop für remainingFocuses laufen lassen — Code dafür im bisherigen Loop kopieren oder Loop refaktorieren
        // ... (der vorhandene for-Loop bleibt wie er ist, aber nur noch über remainingFocuses iterieren)
    }
} else {
    // BISHERIGER PFAD — over alle focuses iterieren wie bisher
    for (int fi = 0; fi < focuses.size(); fi++) {
        // ... existing code ...
    }
}
```

Wichtig: die `for`-Schleife der bisherigen Drill-Phase muss in den `else`-Zweig wandern. Bei Multi-Focus mit Sub-Focus läuft sie für die Nicht-INFIELD-Schwerpunkte weiter (refaktorieren in eigene Helper-Methode `processFocusBlock(...)` ist sauberer).

- [ ] **Step 4: Helper `pickAdvancedWithFallback` ergänzen**

Am Klassen-Ende:
```java
private Drill pickAdvancedWithFallback(final List<Drill> allDrills, final InfieldPosition pos,
                                          final List<InfieldPosition> selectedPositions,
                                          final java.util.Set<String> usedDrillIds, final int playerCount) {
    // 1. ADVANCED der Position
    final List<Drill> own = findAdvancedForPosition(allDrills, pos, usedDrillIds, playerCount);
    if (!own.isEmpty()) {
        final List<Drill> shuffled = new java.util.ArrayList<>(own);
        java.util.Collections.shuffle(shuffled);
        return shuffled.get(0);
    }
    // 2. zweite BASIC der Position
    final List<Drill> basics = findBasicsForPosition(allDrills, pos, usedDrillIds, playerCount);
    if (!basics.isEmpty()) {
        final List<Drill> shuffled = new java.util.ArrayList<>(basics);
        java.util.Collections.shuffle(shuffled);
        return shuffled.get(0);
    }
    // 3. ADVANCED einer anderen gewählten Position
    for (final InfieldPosition other : selectedPositions) {
        if (other == pos) continue;
        final List<Drill> otherDrills = findAdvancedForPosition(allDrills, other, usedDrillIds, playerCount);
        if (!otherDrills.isEmpty()) {
            final List<Drill> shuffled = new java.util.ArrayList<>(otherDrills);
            java.util.Collections.shuffle(shuffled);
            return shuffled.get(0);
        }
    }
    // 4. ADVANCED irgendeiner Infield-Position (Slot-Filler)
    for (final InfieldPosition any : InfieldPosition.values()) {
        if (selectedPositions.contains(any)) continue;
        final List<Drill> anyDrills = findAdvancedForPosition(allDrills, any, usedDrillIds, playerCount);
        if (!anyDrills.isEmpty()) {
            final List<Drill> shuffled = new java.util.ArrayList<>(anyDrills);
            java.util.Collections.shuffle(shuffled);
            return shuffled.get(0);
        }
    }
    return null;
}
```

- [ ] **Step 5: Compile + Tests laufen**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanGeneratorIntegrationTest -q 2>&1 | tail -10`
Expected: Neue Sub-Focus-Tests grün, alte Tests grün.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/TrainingPlanGenerator.java
git commit -m "✨ Generator: Sub-Focus-Pfad mit BASICS-Block + STATIONS/Deep-Dive + Fallback"
```

---

## Phase 5: API + Service

### Task 5.1: GeneratePlanRequest erweitern

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/GeneratePlanRequest.java`

- [ ] **Step 1: Record erweitern**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.InfieldPosition;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record GeneratePlanRequest(
        @NotNull Long trainingId,
        @NotNull @Min(1) Integer playerCount,
        @NotBlank String focus,
        @NotNull @Min(30) Integer durationMinutes,
        List<InfieldPosition> infieldPositions
) {
    public List<InfieldPosition> infieldPositionsOrEmpty() {
        return infieldPositions != null ? infieldPositions : List.of();
    }
}
```

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/GeneratePlanRequest.java
git commit -m "✨ DTO: GeneratePlanRequest.infieldPositions"
```

### Task 5.2: TrainingPlanService — Signatur + Durchreichung

**Files:**
- Modify: `backend/src/main/java/com/softball/application/TrainingPlanService.java`

- [ ] **Step 1: `generate(...)` erweitern**

Suche die existierende `generate`-Methode und ändere die Signatur:
```java
public TrainingPlanResponse generate(final Long trainingId, final int playerCount,
                                     final String focus, final int durationMinutes,
                                     final List<InfieldPosition> infieldPositions) {
    // ... bisherige Validierung
    final List<Drill> drills = drillService.filterByFocus(focus, playerCount);
    final TrainingPlanContent content = generator.generate(drills, playerCount, focus, durationMinutes,
        infieldPositions != null ? infieldPositions : List.of());
    final TrainingPlan plan = new TrainingPlan(trainingId, playerCount, focus, durationMinutes);
    plan.setContent(content);
    plan.setInfieldPositions(infieldPositions != null ? infieldPositions : List.of());
    return TrainingPlanResponse.from(trainingPlanRepository.save(plan));
}
```

Importe: `import com.softball.domain.model.InfieldPosition;`

- [ ] **Step 2: Controller anpassen**

`backend/src/main/java/com/softball/adapter/in/web/TrainingPlanController.java`:

```java
@PostMapping("/generate")
public TrainingPlanResponse generate(@Valid @RequestBody final GeneratePlanRequest request) {
    return trainingPlanService.generate(
        request.trainingId(),
        request.playerCount(),
        request.focus(),
        request.durationMinutes(),
        request.infieldPositionsOrEmpty()
    );
}
```

- [ ] **Step 3: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/application/TrainingPlanService.java backend/src/main/java/com/softball/adapter/in/web/TrainingPlanController.java
git commit -m "✨ API: TrainingPlanService und Controller verarbeiten infieldPositions"
```

### Task 5.3: TrainingPlanResponse erweitern

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/TrainingPlanResponse.java`

- [ ] **Step 1: Feld in Record-Definition + `from(...)` ergänzen**

Lies erst die Datei. Falls Record:
```java
public record TrainingPlanResponse(
    // ... bestehende Felder ...
    List<InfieldPosition> infieldPositions
) {
    public static TrainingPlanResponse from(final TrainingPlan plan) {
        return new TrainingPlanResponse(
            // ... bestehende Argumente ...
            plan.getInfieldPositions()
        );
    }
}
```

Importe ergänzen.

- [ ] **Step 2: Compile**

Run: `./mvnw compile -s .mvn/local-settings.xml -q`

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/TrainingPlanResponse.java
git commit -m "✨ DTO: TrainingPlanResponse liefert infieldPositions"
```

---

## Phase 6: Backend-Tests komplett

### Task 6.1: Unit-Tests für Sub-Focus-Edge-Cases

**Files:**
- Modify: `backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorTest.java`

- [ ] **Step 1: Tests anhängen**

```java
@Nested
@DisplayName("Sub-Focus")
class SubFocus {
    @Test
    void position_ohne_basic_skip_im_basics_block() {
        // 2B hat im echten Katalog 2 BASICs. Wir bauen einen Test-Katalog OHNE 2B-BASICs:
        final List<Drill> testCat = new ArrayList<>(realCatalog());
        testCat.removeIf(d -> d.getCategories().contains(DrillCategory.SECOND_BASE)
            && d.getComplexity() == DrillComplexity.BASIC);
        final TrainingPlanContent result = new TrainingPlanGenerator().generate(
            testCat, 12, "INFIELD_DEFENSE", 120,
            List.of(InfieldPosition.SECOND_BASE)
        );
        assertThat(result.getSections()).isNotEmpty();
        // Plan sollte trotzdem generieren — BASICS-Block überspringt 2B
    }

    @Test
    void infieldPositions_ohne_INFIELD_DEFENSE_focus_ignoriert() {
        final TrainingPlanContent result = new TrainingPlanGenerator().generate(
            realCatalog(), 10, "OUTFIELD", 90,
            List.of(InfieldPosition.SS)
        );
        // Plan sollte normal generieren ohne Sub-Focus zu beachten
        assertThat(result.getSections()).isNotEmpty();
        // keine Behauptung über Position-spezifische Drills — passt durchläuft normalen OUTFIELD-Path
    }

    @Test
    void empty_infieldPositions_verhalten_wie_alte_logik() {
        final TrainingPlanContent withEmpty = new TrainingPlanGenerator().generate(
            realCatalog(), 12, "INFIELD_DEFENSE", 120, List.of()
        );
        final TrainingPlanContent withoutParam = new TrainingPlanGenerator().generate(
            realCatalog(), 12, "INFIELD_DEFENSE", 120
        );
        assertThat(withEmpty.getSections().size()).isEqualTo(withoutParam.getSections().size());
    }
}
```

Wichtig: `realCatalog()` ist ein vorhandener Helper in der Test-Klasse (vorhanden im bestehenden Code). Falls nicht, einen Helper schreiben, der drills.json lädt.

- [ ] **Step 2: Tests laufen**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanGeneratorTest -q 2>&1 | tail -10`
Expected: Alle 3 neue Tests grün.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorTest.java
git commit -m "🧪 Test: Sub-Focus Edge-Cases (skip, ignore, empty)"
```

### Task 6.2: Stranded-Drill-Test

**Files:**
- Modify: `backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorIntegrationTest.java`

- [ ] **Step 1: Test ergänzen**

```java
@Test
void sprintubung_und_agility_reachable_in_baserunning_focus() {
    // Mehrere Trainings simulieren — Drills tauchen über Shuffle früher oder später auf
    boolean sprintFound = false;
    boolean agilityFound = false;
    for (int i = 0; i < 30 && !(sprintFound && agilityFound); i++) {
        final TrainingPlanContent result = generator.generate(
            realCatalog, 10, "BASERUNNING", 120
        );
        for (final TrainingPlanSection s : result.getSections()) {
            if ("sprintubung-fielding-position".equals(s.getDrillId())) sprintFound = true;
            if ("agility-ladder-beinubungen".equals(s.getDrillId())) agilityFound = true;
        }
    }
    assertThat(sprintFound).as("Sprintübung reachable").isTrue();
    assertThat(agilityFound).as("Agility Ladder reachable").isTrue();
}
```

- [ ] **Step 2: Test laufen**

Run: `./mvnw test -s .mvn/local-settings.xml -Dtest=TrainingPlanGeneratorIntegrationTest#sprintubung_und_agility_reachable_in_baserunning_focus -q 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/com/softball/domain/service/TrainingPlanGeneratorIntegrationTest.java
git commit -m "🧪 Test: Sprintübung + Agility nach WARMUP-Removal reachable"
```

### Task 6.3: Komplette Test-Suite laufen lassen

- [ ] **Step 1: Alle Tests**

Run: `./mvnw test -s .mvn/local-settings.xml -q 2>&1 | tail -10`
Expected: BUILD SUCCESS, 0 Failures.

- [ ] **Step 2: Falls rote Tests, fixen.**

Falls bestehende Tests gegen neue Generator-Logik kollidieren (z.B. erwartete spezifische Drill-Reihenfolge), prüfen welche Test-Annahmen jetzt falsch sind und punktuell korrigieren — Bestehende Logik (ohne Sub-Focus) muss unverändert bleiben.

- [ ] **Step 3: Commit (falls Fixes nötig)**

```bash
git add backend/
git commit -m "🧪 Tests: existierende Tests an refaktorierten Generator-Loop angepasst"
```

---

## Phase 7: Frontend Types

### Task 7.1: TypeScript-Types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: InfieldPosition + Plan-Request/Response**

```ts
// Bei den Drill-Types ergänzen
export type DrillComplexity = 'BASIC' | 'ADVANCED'

export type InfieldPosition = 'FIRST_BASE' | 'SECOND_BASE' | 'SS' | 'THIRD_BASE'

export const INFIELD_POSITION_LABELS: Record<InfieldPosition, string> = {
  FIRST_BASE: '1B',
  SECOND_BASE: '2B',
  SS: 'SS',
  THIRD_BASE: '3B',
}

// Existing GeneratePlanRequest erweitern:
export interface GeneratePlanRequest {
  trainingId: number
  playerCount: number
  focus: string
  durationMinutes: number
  infieldPositions?: InfieldPosition[]
}

// Existing TrainingPlanResponse erweitern:
// (Falls Interface, neuen Feldnamen ergänzen)
// infieldPositions?: InfieldPosition[]
```

DrillResponse erweitern:
```ts
export interface DrillResponse {
  // bisherige Felder
  complexity?: DrillComplexity
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: keine TypeScript-Errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "✨ Types: InfieldPosition + DrillComplexity + Request/Response-Felder"
```

---

## Phase 8: Frontend UI — PlanForm

### Task 8.1: PlanForm — Sub-Section unter Focus-Chips

**Files:**
- Modify: `frontend/src/components/training-plan/PlanForm.tsx`

- [ ] **Step 1: State + Helper**

Importe oben:
```ts
import type { InfieldPosition } from '@/types'
import { INFIELD_POSITION_LABELS } from '@/types'
```

Im `PlanForm`-Komponenten-Body, neben anderen `useState`:
```ts
const [selectedInfieldPositions, setSelectedInfieldPositions] = useState<Set<InfieldPosition>>(new Set())
```

Toggle-Funktion:
```ts
const toggleInfieldPosition = (pos: InfieldPosition) => {
  setSelectedInfieldPositions(prev => {
    const next = new Set(prev)
    if (next.has(pos)) next.delete(pos)
    else next.add(pos)
    return next
  })
}
```

- [ ] **Step 2: Submit-Handler erweitern**

```ts
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  const data: GeneratePlanRequest = {
    trainingId,
    playerCount,
    focus: [...focuses].join(','),
    durationMinutes: duration,
  }
  if (focuses.has('INFIELD_DEFENSE') && selectedInfieldPositions.size > 0) {
    data.infieldPositions = [...selectedInfieldPositions]
  }
  onGenerate(data)
}
```

- [ ] **Step 3: Sub-Section-JSX einfügen**

Direkt nach dem schließenden `</div>` des Schwerpunkte-Blocks (also nach den FOCUS_OPTIONS-Buttons), vor dem Dauer-Block:

```tsx
{focuses.has('INFIELD_DEFENSE') && (
  <div className="ml-2 pl-3 border-l-2 border-cream-300 transition-all duration-200">
    <p className="text-xs text-gray-400 mb-2">
      Infield-Positionen (optional). Leer = alle Positionen (Standard).
    </p>
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(INFIELD_POSITION_LABELS) as InfieldPosition[]).map(pos => (
        <button
          key={pos}
          type="button"
          onClick={() => toggleInfieldPosition(pos)}
          className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
            selectedInfieldPositions.has(pos)
              ? 'bg-navy-800 text-white border-navy-800'
              : 'bg-cream-50 text-gray-600 border-cream-300 hover:border-navy-300'
          }`}
        >
          {INFIELD_POSITION_LABELS[pos]}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: kein TS-Error, kein Lint-Error.

- [ ] **Step 5: Manuell testen — Dev-Server starten und ausprobieren**

Run: `cd frontend && npx vite &`
Run: `cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml &`
Browser: http://localhost:5173 → Training erstellen → Plan generieren → INFIELD_DEFENSE toggeln → Position-Chips sollten erscheinen.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/training-plan/PlanForm.tsx
git commit -m "✨ Frontend: PlanForm Sub-Section für Infield-Positionen"
```

---

## Phase 9: Frontend UI — PlanDisplay-Header

### Task 9.1: PlanDisplay zeigt Sub-Focus

**Files:**
- Modify: `frontend/src/components/training-plan/PlanDisplay.tsx`

- [ ] **Step 1: Header-JSX um Sub-Focus-Pill erweitern**

Lies die Datei. Suche den Header-Bereich, wo `plan.focus` gerendert wird. Daneben/darunter:

```tsx
{plan.infieldPositions && plan.infieldPositions.length > 0 && (
  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-navy-800 text-white">
    {plan.infieldPositions.map(p => INFIELD_POSITION_LABELS[p]).join(', ')}
  </span>
)}
```

Importe ergänzen:
```ts
import { INFIELD_POSITION_LABELS } from '@/types'
import type { InfieldPosition } from '@/types'
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training-plan/PlanDisplay.tsx
git commit -m "✨ Frontend: PlanDisplay-Header zeigt Sub-Focus-Pill"
```

---

## Phase 10: Frontend UI — PlanEditor & DrillPickerModal

### Task 10.1: PlanEditor — DrillPicker auf Sub-Focus eingrenzen

**Files:**
- Modify: `frontend/src/components/training-plan/PlanEditor.tsx`

- [ ] **Step 1: focusCategories-Berechnung erweitern**

Im `useMemo` für `focusCategories`:
```ts
const focusCategories = useMemo(() => {
  if (!plan.focus) return undefined
  const cats = new Set<DrillCategory>()
  for (const f of plan.focus.split(',')) {
    const trimmed = f.trim()
    if (trimmed === 'INFIELD_DEFENSE' && plan.infieldPositions && plan.infieldPositions.length > 0) {
      // Sub-Focus aktiv → nur die gewählten Positionen, nicht alle
      plan.infieldPositions.forEach(pos => cats.add(pos as DrillCategory))
      cats.add('FIELDING')
      continue
    }
    const mapped = FOCUS_CATEGORIES[trimmed]
    if (mapped) mapped.forEach(c => cats.add(c))
  }
  return cats.size > 0 ? [...cats] : undefined
}, [plan.focus, plan.infieldPositions])
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training-plan/PlanEditor.tsx
git commit -m "✨ Frontend: PlanEditor DrillPicker filtert auf Sub-Focus-Positionen"
```

### Task 10.2: DrillPickerModal — Complexity-Badge (optional)

**Files:**
- Modify: `frontend/src/components/training-plan/DrillPickerModal.tsx`

- [ ] **Step 1: Badge im Drill-Listen-Item rendern**

Suche, wo Drills in der Picker-Liste gerendert werden und füge bei jedem Drill-Item:

```tsx
{drill.complexity === 'ADVANCED' && (
  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rot-50 text-rot-700">ADVANCED</span>
)}
{drill.complexity === 'BASIC' && (
  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cream-200 text-gray-700">BASIC</span>
)}
```

Tailwind-Farben anpassen falls `rot-50` / `rot-700` nicht existieren — alternativ `bg-amber-100 text-amber-800` für ADVANCED, `bg-gray-100 text-gray-700` für BASIC.

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training-plan/DrillPickerModal.tsx
git commit -m "✨ Frontend: DrillPicker zeigt Complexity-Badge (BASIC/ADVANCED)"
```

---

## Phase 11: Frontend Polish (frontend-design Skill)

### Task 11.1: Smooth Transitions + Hover-States

**Files:**
- Modify: `frontend/src/components/training-plan/PlanForm.tsx`

- [ ] **Step 1: Sub-Section mit max-height-Transition**

Wickel das Sub-Section-`<div>` um eine Wrapper-Komponente, die `max-height` animiert:

```tsx
<div
  className={`overflow-hidden transition-all duration-200 ease-out ${
    focuses.has('INFIELD_DEFENSE') ? 'max-h-32 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
  }`}
>
  <div className="ml-2 pl-3 border-l-2 border-cream-300">
    {/* ... helper text + chips ... */}
  </div>
</div>
```

So bleibt die Sub-Section im DOM, sondern wird sanft auf-/zugeklappt — Auswahl-State bleibt erhalten.

- [ ] **Step 2: Build + manuelle UX-Prüfung**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Browser: aufklappen sollte smooth sein, nicht abrupt.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/training-plan/PlanForm.tsx
git commit -m "💄 Frontend: Sub-Section mit smooth max-height-Transition"
```

---

## Phase 12: Doku-Update

### Task 12.1: trainingsplan-algorithmus.md erweitern

**Files:**
- Modify: `docs/trainingsplan-algorithmus.md`

- [ ] **Step 1: Sektion „Sub-Focus" ergänzen**

Vor „Stationen-Logik" einfügen:
```markdown
## Sub-Focus für INFIELD_DEFENSE (optional)

Bei INFIELD_DEFENSE können konkrete Positionen angegeben werden (`infieldPositions=[1B,2B,SS,3B]`).

**Wenn Sub-Focus aktiv:**
1. **BASICS-Block:** Pro Position 1 BASIC-Drill (5 min, max 2 Drills, 3+ Positionen werden geshuffled).
2. **STATIONS-Block:**
   - 1 Position → sequenziell, 1 Deep-Dive-ADVANCED-Drill, alle zusammen.
   - 2+ Positionen → parallele Stationen wie heute.
3. **Fallback** wenn Position keine ADVANCED hat: zweite BASIC der Position → ADVANCED einer anderen gewählten Position → ADVANCED irgendeiner Infield-Position.

**Wenn Sub-Focus leer:** aktuelle Logik unverändert.

### BASIC vs ADVANCED Tagging

Position-Drills sind im Drill-Katalog explizit als BASIC oder ADVANCED getaggt (Feld `complexity` in drills.json). BASIC = isolierte Einzeltechnik. ADVANCED = Spielsituation / Mehrphasen-Drill.

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
```

- [ ] **Step 2: Stranded-Drill-Fix-Note ergänzen**

Bei „Bekannte Beschränkungen" oder ähnlichem (oder neuer Sektion):
```markdown
### Stranded-Drill-Fix

`sprintubung-fielding-position` und `agility-ladder-beinubungen` haben die `WARMUP`-Cat verloren — sie sind jetzt über BASERUNNING-Focus reachable.
```

- [ ] **Step 3: Commit**

```bash
git add docs/trainingsplan-algorithmus.md
git commit -m "📝 Doku: Sub-Focus + Stranded-Fix in Trainingsplan-Algorithmus"
```

---

## Phase 13: Final Build + Push

### Task 13.1: Komplette Test-Suite + Frontend-Build

- [ ] **Step 1: Backend Tests**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -q 2>&1 | tail -5`
Expected: BUILD SUCCESS, 0 Failures.

- [ ] **Step 2: Frontend Build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: keine TypeScript- oder Vite-Errors.

- [ ] **Step 3: Lint**

Run: `cd frontend && npm run lint 2>&1 | tail -5`
Expected: keine Errors (Warnings tolerierbar wenn nicht-blocking).

### Task 13.2: Push

- [ ] **Step 1: Commits prüfen**

Run: `git log master..HEAD --oneline | head -30`
Expected: Liste der ~25 Commits aus diesem Plan.

- [ ] **Step 2: Push**

```bash
git push
```

Auto-Deploy auf Hetzner triggert via GitHub Action → Backend-Restart inkl. Flyway-Migration → Sub-Focus live.

---

## Notes / Gotchas

- **Flyway-Versionsnummer:** Vor Task 3.1 mit `ls backend/src/main/resources/db/migration/` höchste vorhandene Versions-Nummer prüfen und auf `n+1` setzen. Plan nutzt Beispielsweise `V42`.
- **Generator-Refactor:** Task 4.3 beschreibt Sub-Focus-Pfad UND nicht-INFIELD-Schwerpunkte bei Multi-Focus. Sauberere Variante: Helper-Methode `processFocusBlock(...)` für die normale Drill-Phase, die im Sub-Focus-Pfad für Nicht-INFIELD-Focuses aufgerufen wird. Refactor-Aufwand vor der Implementierung antizipieren.
- **Tests die Drill-Reihenfolge fixieren:** Falls bestehende Tests spezifische Drill-IDs erwarten, können sie nach dem Refactor brechen. Entweder Test anpassen oder Generator-Verhalten genau spiegeln.
- **Backup vor Deploy:** Da Flyway-Migration in Prod läuft, vor Push sicherstellen, dass DB-Backup existiert (Hetzner Hetzner Snapshot vor Push manuell anstoßen, falls möglich).
