# Trainingsplan-Feature — Changelog

Letzte Aktualisierung: 15.04.2026 (Session 2)

---

## Session 2 (15.04.2026) — Zusammenfassung

### Deterministischer Generator (KI ersetzt)
- KI-basierte Generierung (Groq/Llama) komplett durch deterministischen Algorithmus ersetzt
- `TrainingPlanGenerator.java` als Domain Service: Aufwärmen → Stationsblöcke pro Schwerpunkt → Batting → Spiel
- Stationsblöcke fest 25 min, max 2 pro Schwerpunkt, min 2 Drills pro Station
- `TrainingPlanService` nutzt Generator direkt, kein AI-Call mehr
- Refine-Endpoint + KI-Button im Frontend entfernt
- Spring AI bleibt optional (`@ConditionalOnProperty feature.ai.enabled`)

### Neue Drills + PDF
- 6 neue Drills erstellt (41 total): Hocke-Wurf, Grounder-Fielding Basics, Outfield Basic, Relay Einfach, Infield→Home, Infield Plays
- Neue Kategorie `RELAY` im DrillCategory Enum
- Neuer Schwerpunkt "Relay & Cutoff" in der App
- Whiffleballs bei Hitting Stationen ergänzt
- Typst-Quellen in `drills/` ins Hauptprojekt verschoben (mit `build.sh`)
- Alle pdfPage-Nummern in drills.json aktualisiert

### Schwerpunkt-Mapping überarbeitet
- OUTFIELD: `FIELDING` entfernt (war Overlap mit Infield)
- INFIELD_DEFENSE: `FIELDING` entfernt
- BASERUNNING: `CONDITIONING` hinzugefügt
- CATCHER: Neuer eigener Schwerpunkt
- RELAY: Neuer Schwerpunkt mit `RELAY` Kategorie
- ALLROUND: Alle Kategorien

### Performance-Optimierungen
- **Bundle-Splitting**: Hauptbundle von 945 KB → 341 KB (-64%)
- **Lazy-Loading**: TrainingPlanPage als eigener 40 KB Chunk
- **html2canvas entfernt**: 201 KB gespart (war unused)
- **Batch-API**: `getByTrainingIds` Endpoint — 1 Query statt N für Plan-Status
- **N+1 Fix Backend**: `findByTrainingIdIn()` statt Loop
- **EAGER→LAZY**: Alle Entity-Relationships (Player, Driver, OpponentTeam)
- **useMemo**: playerTotals, trainingCounts, sortedPlayers vorberechnet statt in Render-Loop
- **useEffect Fix**: GameDayPlanner Re-Render-Loop bei lineup.load/staff.load
- **API-Batching**: GameDayPlanner getGameDays + getSeason in Promise.all
- **DB-Indizes**: V13 Migration für training_plans + substitutions
- **Static Caching**: `spring.web.resources.cache.period=86400`

### UX-Redesign Übersicht (TrainingPlanPage)
- **Fokus-Ansicht**: Nächstes Training als große navy Karte, kommende kompakt, vergangene eingeklappt
- **Ganze Zeile klickbar** statt "Öffnen" Button
- **Hover-Icons**: Pencil + Trash bei Plan vorhanden
- **"✓ Plan"** statt "Plan vorhanden" (kompakter)
- **FocusBadges**: Kurznamen als Pills (max 2 + "+X"), statt langer Komma-String
- **formatDateLong**: "Donnerstag, 16. April" für die Hauptkarte

### UX-Redesign Plan-Anzeige (PlanDisplay)
- **Sidebar-Layout**: Desktop links Drills, rechts sticky Sidebar
- **Sidebar**: Schwerpunkt-Label, Buttons (PDF/Anpassen/Löschen als Icons), Überblick, Gruppenaufteilung, Drill-Handbuch Link
- **WhatsApp-Überblick**: Direkt in Sidebar angezeigt + "Kopieren" Button
- **Stationsblöcke**: Weiße Karte + navy Badge, Station A/B/C Cards
- **Drill-Karten einheitlich**: Alle gleich (Badge als Unterschied), keine linke Border mehr
- **Batting-Hinweis**: "Je nach Equipment Stationen auswählen"
- **Beschreibung eingeklappt**: Standard nur Titel + Rotation/Gruppen sichtbar
- **Mobile**: Handbuch-Link oben (lg:hidden), Nav-Tabs kleiner (text-xs auf Mobile)

### UX-Redesign Plan-Editor (PlanEditor)
- **Navy Info-Box**: Drill-Count + Zeit + Tipp invertiert (navy-800, weiße Schrift)
- **Selection-Actions**: Eigene Zeile unter Info-Box statt im Header
- **"→ Station X"** kompakte Pills statt große Buttons
- **"+ Drill" / "Auflösen"** als sichtbare Buttons mit Hover in Station-Header
- **Checkbox-Multiselect**: 2+ Drills → "Neue Station", 1+ → "→ Station X"
- **PDF-Links klickbar**: "S.16 ↗" navy-blau statt unsichtbar grau
- **DrillPickerModal**: Schwerpunkt-Awareness (focusCategories hervorgehoben)

### PDF-Export
- Komplett redesigned mit jsPDF: Navy Header-Bar, nummerierte Kreise, farbige Badges
- Nur Labels fett, Fließtext normal
- Footer mit Seitenzahlen

### Sonstiges
- App umbenannt: "SOFTBALL LINEUP" → "SOFTBALL PLANNER"
- `drills/` Ordner mit Typst-Quellen ins Hauptprojekt verschoben
- `drills/build.sh` kompiliert PDF + kopiert nach backend/static
- `drills/README.md` mit Workflow-Anleitung
- `.env` mit GROQ_API_KEY (gitignored)
- `backend/run-local.sh` Start-Script
- 3 unused API-Funktionen entfernt (updateCar, createTrainingPeriod, getTrainingPlanByTrainingId)

---

## Session 1 (14.04.2026) — Initiale Implementierung

### Gebaut
- Komplettes KI-Trainingsplan Feature mit Groq/Llama 3.3
- 35 Drills aus Typst-Quellen als drills.json
- Spring AI OpenAI-Starter mit Groq Base-URL
- Alle Backend-Schichten (Domain, Port, Adapter, Service, Controller, DTOs)
- Flyway V12 Migration (JSONB)
- Frontend: TrainingPlanPage, PlanForm, PlanDisplay, PlanSection, PlanEditor, DrillPickerModal
- PeriodSelector als Shared Component

### Probleme erkannt
- KI-Zeitberechnung unzuverlässig (120 statt 180 min)
- Stationen falsch geplant
- API Key Quota schnell aufgebraucht
- Google Gemini Free Tier hatte limit:0 Bug
→ Führte zu Session 2: Deterministischer Generator

---

## Dateien (aktuell)

### Backend (neu)
- `domain/model/Drill.java`, `DrillCategory.java`, `TrainingPlan.java`, `TrainingPlanContent.java`, `TrainingPlanSection.java`, `TrainingPlanRequest.java`
- `domain/port/out/DrillCatalogPort.java`, `TrainingPlanRepository.java`, `AiTrainingPlanPort.java`
- `domain/service/TrainingPlanGenerator.java`
- `adapter/out/drillcatalog/JsonDrillCatalogAdapter.java`
- `adapter/out/ai/GeminiAiAdapter.java` (conditional, optional)
- `adapter/out/persistence/entity/TrainingPlanEntity.java`, `mapper/TrainingPlanMapper.java`, `repository/SpringTrainingPlanRepository.java`, `adapter/TrainingPlanRepositoryAdapter.java`
- `adapter/in/web/DrillController.java`, `TrainingPlanController.java`
- `adapter/dto/` — 7 DTOs
- `application/DrillService.java`, `TrainingPlanService.java`
- `shared/exception/AiServiceException.java`
- `resources/drills.json` (41 Drills), `db/migration/V12`, `V13`, `prompts/`, `static/drills.pdf`, `static/drills/*.png`

### Backend (geändert)
- `TrainingPeriodService.java` — explizites Plan-Cleanup (K3)
- `application.properties` — Caching, AI conditional
- `pom.xml` — Spring AI Dependency
- Entities — EAGER→LAZY
- `TrainingPeriodServiceTest.java` — Mock für TrainingPlanRepository

### Frontend (neu)
- `components/training-plan/` — TrainingPlanPage, PlanForm, PlanDisplay, PlanSection, PlanEditor, DrillPickerModal
- `components/shared/PeriodSelector.tsx`
- `hooks/useTrainingPlan.ts`
- `utils/trainingPlanPdf.ts`

### Frontend (geändert)
- `App.tsx` — Route + Lazy-Loading
- `Layout.tsx` — Tab "Trainingsplan" + Mobile-responsive Nav
- `api/client.ts` — Neue Endpoints + Cleanup
- `types/index.ts` — Alle neuen Types
- `vite.config.ts` — Bundle-Splitting + Proxy
- `styles/index.css` — Print-Styles
- `TrainingPage.tsx` — useMemo Performance
- `GameDayPlanner.tsx` — API-Batching + useEffect Fix
- `index.html` — "Softball Planner"

### Drills (neu im Hauptprojekt)
- `drills/` — Typst-Quellen, `build.sh`, `README.md`

---

## Bekannte Issues

- DnD in Stationsblöcken: Drills rausdraggen behält parallelGroup
- PDF-Export enthält keine Stationsblock-Gruppierung
- Integration-Tests brauchen Docker
- Drill-Bilder (PNGs) nicht im UI verwendet — PDF-Link statt Screenshots
- `pdfPage` in drills.json manuell synchron halten bei PDF-Updates
