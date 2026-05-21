# Roter Faden — Trainingsstruktur Dead Sox

Jedes Training folgt dieser festen Reihenfolge. Drill-Klassifikation muss zu einer der Phasen passen.

## Phasen-Reihenfolge

| # | Phase | DrillCategory(s) | sectionType im Plan | Default-Dauer | Beispiel-Drills |
|---|---|---|---|---|---|
| 1 | **Aufwärmen** | `WARMUP`, `CONDITIONING` | `WARMUP` | 30 min | `aufwarmroutine-dead-sox`, `sprintubung-fielding-position` |
| 2 | **Partnerdrills** | `PARTNER_ROUTINE` | `DRILL` | 5 min × max 2 | Partner-Toss, Partner-Werfen |
| 3 | **Grundlagen** | `THROWING`, `FIELDING`, `BASERUNNING` | `DRILL` | 10–15 min | `viereck-drill-toss-wurf`, Footwork-Basics |
| 4 | **Stationen (Fokus)** | `FIRST_BASE`, `SECOND_BASE`, `SS`, `THIRD_BASE`, `OUTFIELD`, `CATCHER`, `PITCHER`, `DOUBLE_PLAY`, `BUNT_DEFENSE`, `SITUATIONAL`, `RELAY`, `COMINGS` | `DRILL` (in `parallelGroup`) | 20–30 min | Position-spezifische Drills, Cut-Off-Plays |
| 5 | **Batting** | `HITTING` | `BATTING` | variabel | `hitting-stationen`, Tee-Station, Bunt-Station, Live-Batting |

## Klassifikations-Regeln

### Eindeutige Zuordnungen
- Drill hat `HITTING` → **IMMER Batting-Phase**, egal welche anderen Categories
- Drill hat nur `WARMUP` und/oder `CONDITIONING` → **Aufwärmen**
- Drill hat `PARTNER_ROUTINE` → **Partnerdrills** (auch wenn weitere Categories wie THROWING dabei sind)

### Mehrdeutige Drills
- `THROWING` + `FIELDING` (ohne Position) → **Grundlagen**
- Position-Categories (1B/2B/SS/3B/OF/C/P) + andere → **Stationen**
- `BASERUNNING` allein → **Grundlagen**
- `BASERUNNING` + `CONDITIONING` ohne andere → **Aufwärmen** (passt zur Routine)

### Mehrfache Categories sind normal
Ein Drill kann mehrere Categories haben (`["THROWING", "FIELDING"]`), aber landet immer in genau einer Phase. Die Phase ergibt sich aus den Categories nach obigen Regeln.

## Was eine Phase NICHT ist

- **Aufwärmen** ist KEIN Skill-Drill — keine taktischen Inhalte, nur Körper aufwärmen
- **Partnerdrills** sind keine Stationen — alle machen gleichzeitig in Paaren, kein Rotieren
- **Grundlagen** sind allgemeine Skills die JEDE Position braucht (Werfen, Fangen, Laufen)
- **Stationen** sind Position-spezifisch ODER taktische Spielsituationen
- **Batting** ist Schlag-Training, ausschließlich

## Dauer-Konstanten (aus TrainingPlanGenerator.java)

| Konstante | Wert | Verwendung |
|---|---|---|
| `WARMUP_MINUTES` | 30 | Aufwärmen-Block |
| `BREAK_MINUTES` | 5 | Pause nach Aufwärmen |
| `PARTNER_ROUTINE_DRILL_MINUTES` | 5 | pro Partner-Drill |
| `MAX_PARTNER_ROUTINE_DRILLS` | 2 | Max-Anzahl Partner-Drills |
| `BASICS_DRILL_MINUTES` | (siehe Code) | Grundlagen-Block |
| `SUB_FOCUS_BASIC_MINUTES` | (siehe Code) | Stationen mit BASIC-Complexity |
| `HITTING_PRE_DRILL_MINUTES` | 10 | Vor-Batting-Drill |
