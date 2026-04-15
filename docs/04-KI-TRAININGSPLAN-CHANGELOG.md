# KI-Trainingsplan — Implementierungs-Changelog

Letzte Aktualisierung: 15.04.2026

## Was wurde gebaut

Trainingsplan-Generator für die Dead Sox App. Deterministischer Algorithmus erstellt Trainingspläne aus dem Drill-Katalog (35 Drills). KI (Groq) ist optional als Fallback, wird aktuell nicht für die Generierung genutzt.

---

## Architektur-Entscheidungen

### Deterministischer Generator statt KI
- **Ursprünglich:** KI-basiert (erst Google Gemini, dann Groq/Llama 3.3)
- **Probleme:** Zeitberechnung stimmte oft nicht, Stationen falsch geplant, API Key + Quota nötig
- **Lösung:** `TrainingPlanGenerator` als Domain Service — rein algorithmisch, sofort, kostenlos, offline-fähig
- **KI bleibt optional:** Spring AI + Groq Dependency noch im Projekt für späteren Fallback (wenn alle Drills aufgebraucht)

### Algorithmus
```
EINGABE: Schwerpunkte[], Spieleranzahl, DauerMinuten

1. Aufwärmen (fest 30 min) → aufwarmroutine-dead-sox
2. Spiel reservieren (≥14 Spieler + ≥120 min → 20-40 min)
3. Batting reservieren (180min→60, 120min→45, 90min→30)
4. Restzeit auf Schwerpunkte verteilen:
   - Pro Schwerpunkt: Drills filtern, zufällig mischen
   - Stationsblöcke à 25 min (fest), max 2 pro Schwerpunkt
   - Bei <8 Spielern: sequentielle Drills statt Stationen
5. Zusammenbauen: Aufwärmen → Stationen → Batting → Spiel
```

### Spring AI (optional, nicht aktiv genutzt)
- `spring-ai-starter-model-openai` v1.0.0 mit Groq Base-URL
- Properties in application.properties (harmlos wenn nicht genutzt)
- `GeminiAiAdapter` + `AiTrainingPlanPort` bleiben für späteren KI-Fallback

### Maven: Lokale Settings
- `backend/.mvn/local-settings.xml` → Maven Central direkt (Corporate Nexus nicht erreichbar)
- Alle Maven-Befehle mit `-s .mvn/local-settings.xml`

### Lokale Entwicklung
- `.env` mit `GROQ_API_KEY` (gitignored)
- `backend/run-local.sh` — Start-Script das .env liest

---

## Alle Dateien

### Backend — Domain
- `domain/model/Drill.java` — id, name, categories, minPlayers, equipment, description, hasImage, pdfPage, rotation, variants
- `domain/model/DrillCategory.java` — Enum (17 Werte)
- `domain/model/TrainingPlan.java` — id, trainingId, playerCount, focus, durationMinutes, availablePositions, content, timestamps
- `domain/model/TrainingPlanContent.java` — sections, groupDistributionHint, overallNotes
- `domain/model/TrainingPlanSection.java` — drillId, sectionType, title, durationMinutes, rounds, adaptationNotes, rotationPlan, setupNotes, tips, groupSetup, userNotes, parallelGroup, playersPerGroup
- `domain/model/TrainingPlanRequest.java` — Value Object
- `domain/port/out/DrillCatalogPort.java`
- `domain/port/out/TrainingPlanRepository.java` — inkl. existsByTrainingId, deleteByTrainingIds
- `domain/port/out/AiTrainingPlanPort.java` — generate, refine (für KI-Fallback)
- `domain/service/TrainingPlanGenerator.java` — Deterministischer Generator

### Backend — Adapter
- `adapter/out/drillcatalog/JsonDrillCatalogAdapter.java` — Lädt drills.json
- `adapter/out/ai/GeminiAiAdapter.java` — Spring AI ChatClient (optional)
- `adapter/out/persistence/entity/TrainingPlanEntity.java` — JPA + JSONB
- `adapter/out/persistence/mapper/TrainingPlanMapper.java` — FAIL_ON_UNKNOWN_PROPERTIES=false
- `adapter/out/persistence/repository/SpringTrainingPlanRepository.java`
- `adapter/out/persistence/adapter/TrainingPlanRepositoryAdapter.java`
- `adapter/in/web/DrillController.java` — GET /api/drills
- `adapter/in/web/TrainingPlanController.java` — generate, get, getByTrainingIds (Batch!), update, delete

### Backend — Application
- `application/DrillService.java` — Multi-Focus Support (komma-separiert)
- `application/TrainingPlanService.java` — Nutzt TrainingPlanGenerator, kein KI-Call
- `application/TrainingPeriodService.java` — GEÄNDERT: explizites Plan-Cleanup bei Period-Deletion

### Backend — DTOs
- DrillResponse, GeneratePlanRequest, TrainingPlanResponse, TrainingPlanContentResponse, TrainingPlanSectionResponse, RefinePlanRequest, UpdatePlanRequest

### Backend — Resources
- `resources/drills.json` — 35 Drills mit VOLLEN Beschreibungen + pdfPage
- `resources/db/migration/V12__create_training_plans.sql` — JSONB Tabelle
- `resources/prompts/training-plan-system.txt` + `training-plan-refine.txt` — für KI-Fallback
- `resources/static/drills.pdf` — Drill-Handbuch PDF
- `resources/static/drills/*.png` — 32 Drill-Bilder (nicht im UI verwendet)

### Frontend — Hooks
- `hooks/useTrainingPlan.ts` — Batch-Loading (1 Request statt N), Auto-Period-Select

### Frontend — Komponenten
- `components/training-plan/TrainingPlanPage.tsx` — Übersicht + Formular + Plan-Anzeige + Editor
- `components/training-plan/PlanForm.tsx` — Multi-Focus Checkboxes, Dauer nach Wochentag
- `components/training-plan/PlanDisplay.tsx` — Sidebar-Layout mit Timeline, Stationsblöcke
- `components/training-plan/PlanSection.tsx` — Drill-Karte mit FormattedText, PDF-Link
- `components/training-plan/PlanEditor.tsx` — DnD, Checkbox-Multiselect für Stationen, Drill +/-
- `components/training-plan/DrillPickerModal.tsx` — Kategorie-Filter, Suche, PDF-Link pro Drill
- `components/shared/PeriodSelector.tsx` — Wiederverwendbar

### Frontend — Sonstiges
- `utils/trainingPlanPdf.ts` — PDF-Export mit jsPDF
- `types/index.ts` — Alle neuen Types
- `api/client.ts` — Neue Endpoints inkl. Batch getByTrainingIds
- `App.tsx` — Route /training-plan
- `components/layout/Layout.tsx` — Tab "Trainingsplan"
- `vite.config.ts` — Proxy für /drills, /drills.pdf
- `styles/index.css` — Print-Styles

---

## UX-Entscheidungen (chronologisch)

### Übersicht
- Sortierung aufsteigend, Auto-Scroll zum aktuellen Training
- Ganze Zeile klickbar (Plan öffnen oder erstellen)
- Bei Plan vorhanden: Hover-Icons (Pencil + Trash) statt "Öffnen" Button
- Bei kein Plan: Dezenter Text "Plan erstellen →" (wird navy bei Hover)
- Löschen mit ConfirmModal (auch in Übersicht, nicht nur in Plan-Ansicht)
- Punkte + "Plan vorhanden" Text in navy statt grün
- **Batch-Loading**: 1 API-Call statt N (Performance-Fix)

### Formular
- Mehrere Schwerpunkte auswählbar (Checkboxes, "Allround" deselectiert Rest)
- Dauer nach Wochentag vorausgewählt: Do=180min, Sa/Mo=120min, Rest=90min
- Optionen: 60, 90, 120, 180 min

### Plan-Anzeige (Sidebar-Layout)
- Desktop: Drill-Karten links, Sticky-Sidebar rechts
- Sidebar: Schwerpunkt-Label ("Schwerpunkt: INFIELD_DEFENSE"), Spieler, Dauer, Buttons, vertikale Timeline, Hinweise, Gruppenaufteilung
- Buttons in Sidebar: PDF (primär), Anpassen (Pencil), Löschen (Trash)
- Alle Karten einheitlich: weiße Karte + farbiges Badge (kein linker Border mehr)
- Stationsblöcke: Weiße Karte + navy Badge "Station · X Drills" + graue Station-Cards
- Keine inline-Bilder — PDF-Link statt Screenshots

### Drill-Karten (PlanSection)
- Beschreibung eingeklappt (Standard) — "Drill-Beschreibung" per Klick
- Rotation/Gruppen/Anpassung immer sichtbar
- FormattedText: Phasen/Teile als fette Überschrift in eigener Zeile
- "Handbuch S. X ↗" öffnet PDF in wiederverwendbarem Tab

### Plan-Editor
- Checkbox-Multiselect: 2+ Drills auswählen → "Neue Station (X Drills)" Button
- "Zu Station X hinzufügen" für bestehende Stationen
- "+ Drill" Button direkt im Station-Header
- "Auflösen" zum Entgruppieren — als Button mit Border + Hover
- Stationsblock: weiße Karte + navy-100 Border + navy Badge
- Zeit-Sync: Dauer ändern → alle Drills im Block gleiche Dauer
- Zeitwarnung: Rot wenn über Limit
- Kompakte einzeilige Drill-Zeilen
- Sticky Header mit Drill/Speichern/Abbrechen
- Hinweis-Text: "Drills per Checkbox auswählen..."

### DrillPickerModal
- PDF-Link pro Drill: "S.7 ↗" rechts (volle Höhe, Border-Left Trenner)
- Kategorie-Filter-Badges gleiche Höhe

### PDF-Export
- Navy Header-Bar mit Titel/Datum/Meta
- Nummerierte Kreise + farbige Badges pro Typ
- Nur Labels fett (Phase 1, Wichtig:), nicht der Fließtext
- Equipment/Rotation dezent
- KI-Coaching in hellgrauer Box
- Seitenzahlen + Footer
- Download als `trainingsplan-YYYYMMDD.pdf`

### Farben
- Pastelltöne für Badges (orange-50, navy-50, softball-red-50, purple-50, amber-50)
- Batting = softball-red statt grün
- Punkte/Status = navy statt grün
- Stationsblöcke = navy-800 Badge, keine bunte Hintergrundfarbe

---

## Algorithmus-Details

### Stationsblöcke
- Fest 25 min pro Block
- Max 2 Blöcke pro Schwerpunkt
- Min 2 Drills pro Station (sonst einzeln)
- Max 4 Drills pro Station (= max 4 Gruppen)
- Gruppengröße = Spieler ÷ Stationen

### Spiel
- Nur bei ≥14 Spielern UND ≥120 min
- Teamgröße berechnet: "Spiel (7 vs 8 — ein Team hat einen Outfielder mehr)"
- Am Ende nach Batting

### Aufwärmen
- Fest 30 min
- Immer "aufwarmroutine-dead-sox"

---

## Bekannte Issues / Offene Punkte

### Performance
- ~~Übersicht lädt langsam (N API-Calls)~~ → GELÖST: Batch-Endpoint

### Algorithmus
- Bei vielen Drills für einen Schwerpunkt: Zufällige Auswahl (shuffle) → Plan ändert sich bei jeder Generierung
- Restzeit nach Stationen wird nicht genutzt (könnte für Einzel-Drills verwendet werden)
- ALLROUND-Schwerpunkt: Alle Kategorien gemischt, keine thematische Trennung

### Frontend
- DnD in Stationsblöcken: Drills können aus Station rausgedraggt werden → parallelGroup bleibt
- Stationen-Farbe im Editor vs. Plan-Anzeige nicht 100% konsistent
- PDF-Export enthält keine Stationsblock-Gruppierung (zeigt alles sequentiell)

### Tests
- Integration-Tests brauchen Docker (Testcontainers)
- Unit-Tests: 43/43 grün
- Frontend Build: kompiliert fehlerfrei
- Neue Tests für TrainingPlanGenerator noch zu schreiben

### Deployment
- `GROQ_API_KEY` in Render Dashboard setzen (optional, nur für KI-Fallback)
- `drills.pdf` als Static Resource im JAR
- `.mvn/local-settings.xml` in CI/CD beachten

### Drill-Daten
- `pdfPage` in drills.json ist fragil bei PDF-Updates → manuell nachziehen
- `drills.json` Beschreibungen sind Volltext aus Typst-Quellen
- Mögliche Erweiterungen: difficulty, recommendedMinutes, stationSuitable, maxPlayers
