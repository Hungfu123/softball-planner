# Spec: drill-onboarding Skill

**Datum:** 2026-05-21
**Status:** Approved (Design-Phase)

## Ziel

Wenn User einen neuen Drill ins Projekt aufnehmen will (Editierung von `backend/src/main/resources/drills.json`), soll Claude automatisch:

1. Den "roten Faden" des Dead-Sox-Trainings kennen (Phasen + Mapping zu `DrillCategory`)
2. Das `Drill`-Datenmodell mit allen Pflicht-/Optional-Feldern kennen
3. Den Drill in die richtige(n) Kategorie(n) klassifizieren (per Inferenz aus User-Beschreibung)
4. Gezielt nach unklaren Feldern fragen (per `AskUserQuestion`)
5. Den fertigen JSON-Eintrag in `drills.json` einfügen

## Skill-Location

Project-local: `.claude/skills/drill-onboarding/` (commit in Repo, mit-deployed).

## Dateien

```
.claude/skills/drill-onboarding/
├── SKILL.md              # Trigger + Workflow (kompakt, ~150 Wörter)
├── roter-faden.md        # Phasen + DrillCategory-Mapping
└── drill-schema.md       # Drill-Modell, Felder, ID-Slug-Regeln, Enums
```

## SKILL.md (Frontmatter + Workflow)

**Frontmatter:**
```yaml
---
name: drill-onboarding
description: Use when user adds a new drill to the Dead Sox softball-planner project. Triggers on phrases like "neuer drill", "drill hinzufügen", "drill aufnehmen", "neue übung". Loads roter-faden.md and drill-schema.md, classifies drill into training phase, asks targeted questions for missing fields, appends entry to backend/src/main/resources/drills.json.
---
```

**Workflow:**
1. User beschreibt Drill (frei oder strukturiert)
2. Claude liest `roter-faden.md` + `drill-schema.md`
3. Claude infereiert: Phase, `categories[]`, `complexity`, ID-Slug (kebab-case, ASCII)
4. Claude proposed Draft-JSON
5. Claude fragt per `AskUserQuestion` nach fehlenden Pflichtfeldern:
   - `minPlayers` (int)
   - `equipment` (liste)
   - `pdfPage` (im Handbuch? wenn ja: Seite)
   - `rotation` (Beschreibung)
   - `variants` (optional)
6. Claude verifiziert finale Klassifikation mit User
7. Claude appended an `drills.json` (vor `]`, mit `,` davor; alphabetische Reihenfolge ist NICHT erforderlich)
8. Claude erinnert: Backend-Restart nötig damit Drill verfügbar wird

## roter-faden.md Inhalt

| # | Phase | DrillCategory(s) | sectionType | Default-Dauer | Beispiel-Drill |
|---|---|---|---|---|---|
| 1 | Aufwärmen | WARMUP, CONDITIONING | WARMUP | 30 min | aufwarmroutine-dead-sox |
| 2 | Partnerdrills | PARTNER_ROUTINE | DRILL | 5 min × 2 | partner-toss, partner-fly-balls |
| 3 | Grundlagen | THROWING, FIELDING, BASERUNNING | DRILL | 10-15 min | viereck-drill-toss-wurf |
| 4 | Stationen (Fokus) | FIRST_BASE/2B/SS/3B/CATCHER/OUTFIELD/PITCHER, DOUBLE_PLAY, BUNT_DEFENSE, SITUATIONAL, RELAY, COMINGS | DRILL (in parallelGroup) | 20-30 min | position-spezifische Drills |
| 5 | Batting | HITTING | BATTING | variabel | hitting-stationen, tee-station |

**Regeln:**
- Drills können mehrere Categories haben (z.B. WARMUP + CONDITIONING)
- Mehrfachzuordnung zu Phasen möglich wenn Categories überlappen
- Ein Drill mit `HITTING` gehört IMMER in Batting-Phase, auch wenn andere Categories vorhanden

## drill-schema.md Inhalt

### Drill-Felder (aus `domain/model/Drill.java`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | String | ja | kebab-case, ASCII (ä→a, ö→o, ü→u), unique |
| `name` | String | ja | Anzeigename, Deutsch, Umlaute erlaubt |
| `categories` | List<DrillCategory> | ja | siehe Enum-Liste |
| `minPlayers` | int | ja | Minimum für Durchführbarkeit |
| `equipment` | List<String> | ja (kann leer sein) | freitext z.B. "Bälle", "4 Hütchen" |
| `description` | String | ja | Mehrzeilig, Ablauf + Phasen mit "—" |
| `hasImage` | boolean | ja | true wenn Bild im PDF-Handbuch |
| `pdfPage` | Integer | nein | nur wenn im PDF |
| `rotation` | String | ja | Wie Spieler rotieren / wer macht mit |
| `variants` | String | nein | Optional. Varianten als Text. |
| `complexity` | DrillComplexity | default BASIC | BASIC / ADVANCED |

### DrillCategory-Enum (mit deutscher Übersetzung)
| Enum | Deutsch |
|---|---|
| WARMUP | Aufwärmen |
| CONDITIONING | Kondition |
| THROWING | Werfen |
| BASERUNNING | Baserunning |
| CATCHER | Catcher |
| FIRST_BASE | 1B |
| SECOND_BASE | 2B |
| SS | Shortstop |
| THIRD_BASE | 3B |
| OUTFIELD | Outfield |
| SITUATIONAL | Spielsituation |
| HITTING | Schlagen / Batting |
| FIELDING | Defense allgemein |
| DOUBLE_PLAY | Double Play |
| BUNT_DEFENSE | Bunt-Defense |
| COMINGS | Comings (Catcher → Werfer) |
| PITCHER | Pitcher |
| RELAY | Relay |
| PARTNER_ROUTINE | Partner-Routine |

### DrillComplexity
- `BASIC` (default): einfache, technisch leichte Drills
- `ADVANCED`: komplexere Drills (mehrere Schritte, schnelle Entscheidungen, mehrere Bälle)

### ID-Slug-Regeln
- Aus `name`: lowercase, Umlaute mappen (ä→a, ö→o, ü→u, ß→ss), Sonderzeichen entfernen, Spaces → `-`
- Beispiel: "Viereck-Drill (Toss & Wurf)" → `viereck-drill-toss-wurf`

## CLAUDE.md Integration

Unter "Domain-Specific Docs" ergänzen:
```
- **Neuer Drill hinzufügen:** Skill `drill-onboarding` triggert automatisch bei Phrasen wie "neuer drill" / "drill hinzufügen". Phasen + Schema in `.claude/skills/drill-onboarding/`.
```

## Out of Scope

- Nicht: Skill-Trigger für **Bearbeiten** existierender Drills (nur Hinzufügen)
- Nicht: Automatischer Backend-Restart (nur Hinweis)
- Nicht: PDF-Generierung (drill landet nicht automatisch im Handbuch-PDF)
- Nicht: Skill validiert nicht ob `id` schon existiert — User verantwortlich

## Akzeptanz

- Skill triggert bei "neuer drill" / "drill hinzufügen" Phrasen
- Roter-Faden-Tabelle und Schema sind in MD-Form abrufbar
- Workflow asked targeted, einzelne Questions (nicht ein riesiger Fragebogen)
- Resultierender JSON-Eintrag validiert gegen `Drill.java`-Felder
- CLAUDE.md verweist auf Skill
