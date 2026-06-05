# Batting-Stationen-Diagramm — Design

**Datum:** 2026-06-05
**Status:** Approved (Brainstorming)
**Kontext:** Training-Feature. Coach soll beim Trainingsplan ein visuelles Stationen-Diagramm sehen — Orientierung für Team beim Batting-Block. Dynamisch je nach mitgebrachten Stationen (typisch: 1 Live-Station + Tee/Bunt/Korken/Hütchen).

## Ziel

Aus dem bestehenden Trainingsplan ein Stationen-Diagramm ableiten, das der Coach leicht anpassen kann, und es als kompakte Karte im Plan-Tab anzeigen — mit Vollbild zum Zeigen am Beamer/Handy. Dead-Sox-Style (navy/cream/softball-red, Taktikboard-Optik).

## Entscheidungen (aus Brainstorming)

1. **Datenquelle:** Aus Plan ableiten + Tweak (kein separates Modell).
2. **Platzierung:** Klein inline im Plan-Tab beim Batting-Block + Tap → Vollbild.
3. **Stations-Typ:** Coach wählt Typ je Station aus fester Liste (Typ → Icon + Farbe). Label automatisch vom Drill-Namen.
4. **Layout:** Auto-Layout auf stilisiertem Feld (keine Drag&Drop-Handarbeit).

## Datenmodell

`TrainingPlanSection` wird um 3 **optionale** Felder erweitert. Sections liegen als JSONB (`training_plans.plan_content`) → **keine DB-Migration**, `spring.jpa.hibernate.ddl-auto=validate` bleibt grün.

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `stationType` | `LIVE \| TEE \| BUNT \| KORKEN \| HUETCHEN \| OTHER \| null` | Typ → Icon + Farbe. `null` = keine Station |
| `stationLevel` | `ADVANCED \| BEGINNER \| null` | Level-Badge am Marker |
| `stationChoiceGroup` | `Integer \| null` | Stationen mit gleicher Nummer = "WÄHLE 1"-Alternativen, gerahmt |

Bestehende Felder weiterverwenden:
- `parallelGroup` (Integer) → steuert Auto-Layout-Adjazenz (gleiche Gruppe = nebeneinander). Bereits vorhanden.
- Section-Reihenfolge → Rotations-Nummer der Station.

### Backend-Änderungen

- `domain/model/TrainingPlanSection.java`: 3 Felder + Enum `StationType`, `StationLevel` (im `domain/model`).
- `adapter/out/persistence/...`: Section liegt in `plan_content` JSONB — Jackson serialisiert die neuen Felder automatisch, sofern das gemappte Objekt sie hält. Mapper/Entity prüfen, dass Section-Serialisierung die Felder durchreicht.
- `adapter/dto/`: Request/Response-Record für Section um die 3 Felder ergänzen.
- Speichern: bestehendes `PUT /api/training-plans/{id}` (aktualisiert `plan_content` inkl. Sections). Kein neuer Endpoint.

## Ableitung + Tweak

- Eine Section wird zur Station **genau dann, wenn `stationType != null`**.
- **Vorbelegung:** Beim ersten Öffnen des Stationen-Editors bekommen Sections mit `sectionType == BATTING` `stationType = LIVE` vorbelegt (= "abgeleitet"). Coach passt Typ/Level/Choice an.
- `deriveStations(sections)`-Util: filtert `stationType != null`, sortiert nach Section-Index, gruppiert nach `parallelGroup` (Layout) und `stationChoiceGroup` (Choice-Klammer), nummeriert in Rotations-Reihenfolge.

## UI / Komponenten

Kleine, isolierte Units:

- **`deriveStations(sections): Station[]`** — reine Util (frontend). Input Sections, Output Station-Liste mit `{ index, label, type, level, parallelGroup, choiceGroup }`.
- **`StationsDiagram`** — präsentational, Prop `size: 'mini' | 'full'`, `stations: Station[]`. Enthält Auto-Layout (stilisiertes Halbfeld, nummerierte Pucks mit Typ-Icon, Level-Badge, "WÄHLE 1"-Klammer für Choice-Gruppen). `mini` = schlicht/kompakt, `full` = Taktikboard-Look (Filz, Kreidelinien, Header).
- **`StationsEditorDrawer`** — Bearbeiten: Liste der Plan-Sections, je Zeile Typ-Picker (LIVE/TEE/BUNT/KORKEN/HUETCHEN/OTHER/—), Level (—/Advanced/Beginner), Choice-Gruppe. Speichert via Plan-Update (`useTrainingPlan.update()`).
- **Neue Custom-SVG-Icons** in `src/icons/index.tsx`: Bat (Live), Tee, Bunt, Korken, Hütchen. Konvention: kein Icon-Lib.
- **Integration in `TrainingPlanView.tsx`**: Mini-Karte im Batting-Block (nur wenn ≥1 Station). Tap → Vollbild-Modal (`StationsDiagram size="full"`). "Bearbeiten"-Affordance → `StationsEditorDrawer`.

## Datenfluss

1. Plan geladen (`useTrainingPlan`, `plans` Map).
2. `deriveStations(plan.content.sections)` → `Station[]`.
3. `Station[].length > 0` → Mini-Karte rendert im Batting-Block.
4. Tap Mini → Vollbild-Modal.
5. Coach öffnet Editor → ändert Typ/Level/Choice → `update(plan)` → `PUT` → Refetch → Diagramm aktualisiert.

## Style

- Palette: Dead-Sox navy/cream/softball-red (bestehende Tailwind-v4-Tokens).
- Typo: bestehende `font-display` etc. (kein neuer Font im App-Kontext; der Bebas/Saira-Look aus dem Standalone-Mockup bleibt dem Vollbild-Board vorbehalten, sofern Fonts schon eingebunden — sonst app-eigene Display-Font).
- Mini: kompakte Karte, fügt sich in bestehende Section-Karten.
- Vollbild: Taktikboard (Filz-Feld, Kreide-Foullinien, Home-Plate, Staggered-Pop der Marker).

## Nicht im Scope (YAGNI)

- Drag & Drop freie Positionierung.
- Auto-Erraten des Stationstyps aus Drill-Namen.
- Mehrere getrennte Stationen-Blöcke pro Training (v1: ein Batting-/Stationen-Block; weitere parallelGroups werden mit angezeigt, aber kein separates Editor-Konzept).
- Eigener Stationen-Tab.
- PDF-Export des Diagramms (kann später an SharePlanDrawer andocken).

## Verifikation

- Frontend: `npm run build` (tsc + vite), `npm run lint`.
- Backend: `./mvnw test -s .mvn/local-settings.xml` (Section-Serialisierung mit neuen Feldern, Plan-Update-Roundtrip).
- Manuell: Plan mit Batting-Sections → Editor → Typen setzen → Mini + Vollbild prüfen, Choice-Paar + Level-Badge.
