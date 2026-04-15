# KI-Trainingsplan Feature

## Context

Die Dead Sox haben keinen Trainer. Dieses Feature bringt einen KI-gestützten Trainingsplan-Generator in die App. Der User gibt Rahmenbedingungen an (Spieleranzahl, Positionen, Schwerpunkt, Dauer), die KI (Google Gemini Free Tier) erstellt daraus einen strukturierten Trainingsplan mit Drills aus dem bestehenden Dead Sox Drill-Handbuch (35 Drills, 29 Seiten PDF). Der Plan kann jederzeit mit KI-Unterstützung angepasst werden — ob vor oder nach dem Training, der gleiche Flow: Änderungen beschreiben, KI strukturiert es schön.

## UX-Konzept

### Navigation
- **Eigener Nav-Tab "Trainingsplan"** in der Top-Navigation (neben Dashboard, Training, Spieler, etc.)

### Übersichtsseite (`/training-plan`)
- Zeigt Trainings-Termine (aus bestehenden Training-Einträgen) mit Status:
  ```
  Di, 15.04.  ✅ Plan vorhanden  [Öffnen]
  Do, 10.04.  ✅ Plan vorhanden  [Öffnen]
  Di, 08.04.  — Kein Plan        [Erstellen]
  ```
- Trainingsplan ist an bestehende Training-Termine gekoppelt (1:1 Beziehung)
- Gefiltert nach aktueller Trainingsperiode

### Plan erstellen — Formular
- **Spieleranzahl** (Number Input)
- **Verfügbare Positionen** (Checkboxes: Pitcher, Catcher, 1B, 2B, SS, 3B, Outfielder)
- **Schwerpunkt** (Radio: Werfen, Infield Defense, Outfield, Baserunning, Situational, Allround)
- **Dauer** (Radio: 60 / 90 / 120 min)
- Button "Plan generieren" → KI erstellt den Plan

### Trainingsstruktur (Regeln für die KI)
1. **Aufwärmroutine** — immer zuerst
2. **Drills nach Schwerpunkt** — aufeinander aufbauend (Technik → Anwendung)
3. **Batting** — immer, letzte ~60 Minuten. Live Batting (Pitcher oder Toss) bevorzugt
4. **Spiel (7v7 o.ä.)** — optional, nur wenn genug Spieler UND genug Zeit

### KI-Output pro Drill
- Anpassung auf tatsächliche Spieleranzahl (Improvisations-Tipps)
- Rotation damit jeder drankommt + Rundenzahl
- Aufbau-/Übergangszeit
- Gruppenaufteilung mit Hinweis: erfahrene Spieler verteilen
- Tipps und Varianten

### Plan-Anzeige
- Vertikale Timeline mit Drill-Karten
- Jede Karte: Titel, Dauer, Diagramm (aus PDF), KI-Coaching-Details (aufklappbar)
- Drucken-Button für aufs Feld

### Plan anpassen (vor oder nach dem Training — gleicher Flow)
- Plan öffnen → "Anpassen" Button
- Drills hinzufügen/entfernen/umsortieren
- Freitext-Notizen pro Drill und am Ende (optional)
- "Mit KI aufbereiten" → KI strukturiert die Änderungen schön und überschreibt den Plan
- Kein Versionen-System — eine Version, wird überschrieben
- Gleicher Flow ob vor dem Training (Anpassungen am KI-Vorschlag) oder danach (dokumentieren was wirklich gemacht wurde)

---

## Technischer Plan

### Phase 1: Drill-Katalog (Backend)

**Drills als statische JSON-Datei** (nicht in DB) — 35 Drills ändern sich selten, JSON ist versionierbar.

#### Dateien erstellen:
- `backend/src/main/resources/drills.json` — Alle 35 Drills als strukturiertes JSON
  ```json
  [{
    "id": "viereck-drill-toss-wurf",
    "name": "Viereck-Drill (Toss & Wurf)",
    "categories": ["THROWING"],
    "minPlayers": 4,
    "equipment": ["Bälle", "4 Hütchen"],
    "description": "Vier Hütchen im Rechteck aufstellen...",
    "hasImage": true,
    "rotation": "Nach jeder Aktion zur nächsten Position...",
    "variants": "Beide Toss-Seiten mit Backhand..."
  }]
  ```

- `backend/src/main/resources/static/drills/*.png` — 32 Drill-Diagramme aus PDF extrahiert

- `com.softball.domain.model.Drill` — POJO (id, name, categories, minPlayers, equipment, description, hasImage, rotation, variants)
- `com.softball.domain.model.DrillCategory` — Enum (WARMUP, CONDITIONING, THROWING, BASERUNNING, CATCHER, FIRST_BASE, SECOND_BASE, SS, THIRD_BASE, OUTFIELD, SITUATIONAL, HITTING, FIELDING, DOUBLE_PLAY, BUNT_DEFENSE, COMINGS, PITCHER)
- `com.softball.domain.port.out.DrillCatalogPort` — Interface (findAll, findById, findFiltered)
- `com.softball.adapter.out.drillcatalog.JsonDrillCatalogAdapter` — @Component, lädt drills.json beim Start, filtert in-memory
- `com.softball.application.DrillService` — @Service, Filtering-Logik (Spieleranzahl + Kategorie-Mapping)
- `com.softball.adapter.in.web.DrillController` — GET /api/drills (optional gefiltert)
- `com.softball.adapter.dto.DrillResponse` — Record

#### Focus → Kategorie-Mapping:
| Focus | Drill-Kategorien |
|---|---|
| Werfen | THROWING |
| Infield Defense | FIRST_BASE, SECOND_BASE, SS, THIRD_BASE, FIELDING, DOUBLE_PLAY, BUNT_DEFENSE |
| Outfield | OUTFIELD, FIELDING |
| Baserunning | BASERUNNING |
| Situational | SITUATIONAL, DOUBLE_PLAY, BUNT_DEFENSE, COMINGS |
| Allround | alle |

Warmup + Hitting Drills werden IMMER inkludiert, unabhängig vom Focus.

### Phase 2: Datenbank (Persistence)

**Flyway Migration** `V12__create_training_plans.sql`:
```sql
CREATE TABLE training_plans (
    id BIGSERIAL PRIMARY KEY,
    training_id BIGINT NOT NULL UNIQUE REFERENCES trainings(id) ON DELETE CASCADE,
    player_count INTEGER NOT NULL,
    focus VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    available_positions TEXT NOT NULL,
    plan_content JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
- 1:1 mit trainings (UNIQUE + NOT NULL auf training_id)
- ON DELETE CASCADE — Training löschen löscht auch den Plan
- plan_content als JSONB — flexibel, ganzer Plan als Dokument
- updated_at für Nachbearbeitung

#### JSONB-Hinweise (erstmalig im Projekt):
- **Entity-Annotation**: `@JdbcTypeCode(SqlTypes.JSON)` + `@Column(columnDefinition = "jsonb")` (Hibernate 6+ Pattern)
- **Mapper**: `ObjectMapper` für JSON String ↔ `TrainingPlanContent` Serialisierung
- **Tests**: Testcontainers PostgreSQL verwenden (bereits als Dependency vorhanden). H2 kennt kein JSONB — alle Tests die TrainingPlan betreffen müssen gegen echte PostgreSQL laufen

#### Dateien erstellen:
- `backend/src/main/resources/db/migration/V12__create_training_plans.sql`
- `com.softball.domain.model.TrainingPlan` — POJO (id, trainingId, playerCount, focus, durationMinutes, availablePositions, content, createdAt, updatedAt)
- `com.softball.domain.model.TrainingPlanContent` — POJO (sections, groupDistributionHint, overallNotes)
- `com.softball.domain.model.TrainingPlanSection` — POJO (drillId, sectionType, title, durationMinutes, rounds, adaptationNotes, rotationPlan, setupNotes, tips, groupSetup, userNotes)
- `com.softball.domain.port.out.TrainingPlanRepository` — Interface (save, findById, findByTrainingId, deleteById)
- `com.softball.adapter.out.persistence.entity.TrainingPlanEntity` — JPA Entity:
  ```java
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb", nullable = false)
  private String planContent;
  ```
- `com.softball.adapter.out.persistence.mapper.TrainingPlanMapper` — @Component, JSON-Serialisierung via ObjectMapper
- `com.softball.adapter.out.persistence.repository.SpringTrainingPlanRepository` — JpaRepository
- `com.softball.adapter.out.persistence.adapter.TrainingPlanRepositoryAdapter` — @Component

### Phase 3: Gemini AI Integration (Backend) — Spring AI

**Spring AI mit Google GenAI Starter** — Spring AI 1.0+ bietet ChatClient-Abstraktion, strukturierten JSON-Output, Retry, Prompt-Templates. Sauberer als roher RestClient und erlaubt späteren Modellwechsel.

#### pom.xml Änderungen:
```xml
<!-- Dependency Management für Spring AI BOM -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>1.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- Dependency -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-google-genai</artifactId>
</dependency>
```

#### Dateien erstellen:
- `com.softball.domain.port.out.AiTrainingPlanPort` — Interface
  ```java
  public interface AiTrainingPlanPort {
      TrainingPlanContent generate(TrainingPlanRequest request);
      TrainingPlanContent refine(TrainingPlan existingPlan, String userEdits);
  }
  ```
  Zwei Methoden: `generate` für Erstellen, `refine` für Anpassung mit KI

- `com.softball.domain.model.TrainingPlanRequest` — Value Object (playerCount, availablePositions, focus, durationMinutes, availableDrills)

- `com.softball.adapter.out.ai.GeminiAiAdapter` — @Component
  ```java
  @Component
  public class GeminiAiAdapter implements AiTrainingPlanPort {
      private final ChatClient chatClient;

      public GeminiAiAdapter(ChatClient.Builder builder,
                             @Value("classpath:prompts/training-plan-system.txt") Resource systemPrompt) {
          this.chatClient = builder
              .defaultSystem(systemPrompt)
              .build();
      }

      @Override
      public TrainingPlanContent generate(TrainingPlanRequest request) {
          return chatClient.prompt()
              .user(buildGeneratePrompt(request))
              .call()
              .entity(TrainingPlanContent.class);  // Structured Output → automatische JSON-Deserialisierung
      }

      @Override
      public TrainingPlanContent refine(TrainingPlan existingPlan, String userEdits) {
          return chatClient.prompt()
              .system(refineSystemPrompt)
              .user(buildRefinePrompt(existingPlan, userEdits))
              .call()
              .entity(TrainingPlanContent.class);
      }
  }
  ```

- `com.softball.shared.exception.AiServiceException` — RuntimeException für KI-Fehler (Timeout, Rate-Limit, API-Key fehlt)
  ```java
  public class AiServiceException extends RuntimeException {
      private final int httpStatus;
      public AiServiceException(String message, int httpStatus) { ... }
  }
  ```

- `backend/src/main/resources/prompts/training-plan-system.txt` — System-Prompt (deutsch)
  - Rolle: "Erfahrener Softball-Trainer für Freizeit-Team"
  - Trainingsstruktur-Regeln
  - Hinweis auf Structured Output (Spring AI generiert das JSON-Schema automatisch aus TrainingPlanContent)
  - Alles auf Deutsch

- `backend/src/main/resources/prompts/training-plan-refine.txt` — Refine-Prompt
  - Bestehenden Plan + User-Änderungen/Notizen → neu strukturierter Plan

- `application.properties` Ergänzungen:
  ```properties
  # Spring AI — Google Gemini (Free Tier via Google AI Studio)
  spring.ai.google.genai.api-key=${GEMINI_API_KEY:}
  spring.ai.google.genai.chat.options.model=gemini-2.0-flash
  spring.ai.google.genai.chat.options.temperature=0.7
  ```

- `application-test.properties` Ergänzung:
  ```properties
  # Spring AI in Tests deaktivieren (kein echter API-Call)
  spring.ai.google.genai.api-key=test-disabled
  ```

#### Vorteile gegenüber rohem RestClient:
- **Structured Output**: `chatClient.call().entity(TrainingPlanContent.class)` — Spring AI generiert JSON-Schema aus der POJO-Klasse und parst die Antwort automatisch
- **Prompt Templates**: Resource-basierte Prompts mit Variablen-Ersetzung
- **Retry/Timeout**: Spring AI hat eingebautes Retry-Handling
- **Modell-Austauschbar**: Port-Interface bleibt gleich, Adapter kann später auf OpenAI/Anthropic wechseln
- **Auto-Configuration**: Spring Boot konfiguriert ChatClient.Builder automatisch

### Deployment-Config (Render.com + Neon.tech)

- **GEMINI_API_KEY** muss als Environment Variable gesetzt werden:
  - **Lokal:** `.env` Datei oder Shell-Export
  - **Render.com:** Dashboard → Environment → `GEMINI_API_KEY` = `AIza...`
- **Neon.tech (PostgreSQL):** JSONB ist Standard-PostgreSQL, keine Extension nötig. Die Flyway-Migration läuft automatisch beim Deploy.
- **Graceful Degradation:** Wenn `GEMINI_API_KEY` leer/nicht gesetzt:
  - `GeminiAiAdapter` fängt Exception ab, wirft `AiServiceException` mit HTTP 503
  - Controller gibt HTTP 503 mit Meldung "KI-Trainingsplan nicht verfügbar — API Key fehlt"
  - Frontend fängt 503 ab und zeigt Toast/Banner: "KI nicht verfügbar"
  - Drill-Katalog (`GET /api/drills`) funktioniert trotzdem (keine KI nötig)
  - Kein separater Status-Endpoint nötig — 503 beim Generate reicht
- **Google AI Studio API Key:** Kostenlos unter aistudio.google.com → "Get API Key" (Gmail reicht, kein GCP-Projekt, keine Kreditkarte)

### Phase 4: REST API (Backend)

#### Dateien erstellen:
- `com.softball.application.TrainingPlanService` — @Service
  - `generate(trainingId, request)` → filtert Drills → ruft KI → speichert Plan
  - `getByTrainingId(trainingId)` → Plan laden
  - `update(planId, updatedContent)` → Plan überschreiben
  - `refine(planId, userEdits)` → KI-gestützte Nachbearbeitung
  - `delete(planId)`
  - Error Handling: `AiServiceException` abfangen und als ResponseStatusException(503) weiterwerfen

- `com.softball.adapter.in.web.TrainingPlanController` — @RestController `/api/training-plans`
  - `POST /api/training-plans/generate` — Plan generieren (Body: trainingId, playerCount, positions, focus, duration)
  - `GET /api/training-plans/training/{trainingId}` — Plan für ein Training laden
  - `PUT /api/training-plans/{id}` — Plan manuell überschreiben
  - `POST /api/training-plans/{id}/refine` — KI-Nachbearbeitung (Body: userEdits/Notizen)
  - `DELETE /api/training-plans/{id}`
  - Security: Alle Endpoints automatisch geschützt durch bestehende `SecurityConfig` (`/api/**` → authenticated)

- DTOs (Records in `com.softball.adapter.dto`):
  - `GeneratePlanRequest` (trainingId, playerCount, availablePositions, focus, durationMinutes) + `@NotNull`/`@Min` Validierungen
  - `TrainingPlanResponse` (id, trainingId, playerCount, focus, durationMinutes, availablePositions, content, createdAt, updatedAt) + statische `from(TrainingPlan)` Factory-Methode
  - `TrainingPlanContentResponse` (sections, groupDistributionHint, overallNotes)
  - `TrainingPlanSectionResponse` (drillId, sectionType, title, durationMinutes, rounds, adaptationNotes, rotationPlan, setupNotes, tips, groupSetup, userNotes)
  - `RefinePlanRequest` (userEdits: String) + `@NotBlank`
  - `UpdatePlanRequest` (content: TrainingPlanContentResponse) + `@NotNull`

### Phase 5: Frontend — Types + API

#### Dateien ändern:
- `frontend/src/api/client.ts` — Neue Endpoints hinzufügen (bestehendes Pattern: native Fetch + Basic Auth):
  - `getDrills(maxPlayers?: number, category?: string): Promise<DrillResponse[]>`
  - `getTrainingPlanByTrainingId(trainingId: number): Promise<TrainingPlanResponse | null>`
  - `generateTrainingPlan(data: GeneratePlanRequest): Promise<TrainingPlanResponse>`
  - `updateTrainingPlan(id: number, content: TrainingPlanContentResponse): Promise<TrainingPlanResponse>`
  - `refineTrainingPlan(id: number, userEdits: string): Promise<TrainingPlanResponse>`
  - `deleteTrainingPlan(id: number): Promise<void>`
  - Error Handling: 503 speziell abfangen für KI-nicht-verfügbar

- `frontend/src/types/index.ts` — Neue Interfaces ergänzen (bestehendes Pattern: alles in einer Datei):
  - `DrillResponse`, `DrillCategory`, `TrainingPlanResponse`, `TrainingPlanContentResponse`, `TrainingPlanSectionResponse`, `GeneratePlanRequest`, `TrainingFocus`

#### Dateien erstellen:
- `frontend/vite.config.ts` — Proxy erweitern:
  ```typescript
  proxy: {
    '/api': 'http://localhost:8080',
    '/drills': 'http://localhost:8080'   // Drill-Bilder im Dev-Mode
  }
  ```
  (Im Prod-Build served Spring Boot beides aus classpath:/static/)

### Phase 6: Frontend — UI

#### Vorarbeit: Period-Selector extrahieren
Der Period-Selector ist aktuell inline in `TrainingPage.tsx` (~30 Zeilen). Vor Phase 6 als Shared Component extrahieren:
- `frontend/src/components/shared/PeriodSelector.tsx`
  ```typescript
  interface Props {
    periods: TrainingPeriodResponse[]
    activePeriodId: number | null
    onChange: (periodId: number | null) => void
  }
  ```
  Wird dann sowohl von TrainingPage als auch TrainingPlanPage genutzt (DRY).

#### Navigation ändern:
- `frontend/src/App.tsx` — Route `/training-plan` hinzufügen (bestehendes Pattern: children von Layout)
- `frontend/src/components/layout/Layout.tsx` — Tab "Trainingsplan" in TABS-Array:
  ```typescript
  const TABS = [
    { path: '/', label: 'Spielbetrieb' },
    { path: '/training', label: 'Training' },
    { path: '/training-plan', label: 'Trainingsplan' },  // NEU
    { path: '/players', label: 'Spieler' },
  ] as const
  ```

#### Neue Komponenten:
- `frontend/src/hooks/useTrainingPlan.ts` — Hook für State-Management
  - State: plans (Map<trainingId, TrainingPlanResponse>), drills, loading, generating
  - Nutzt `useToastContext()` für Erfolgs-/Fehlermeldungen
  - Lädt Perioden via bestehende `api.getTrainingPeriods()`
  - Auto-Select der aktuellen Periode (Pattern von useTraining: `findCurrentPeriod()`)

- `frontend/src/components/training-plan/TrainingPlanPage.tsx` — Hauptseite
  - Übersicht: Liste der Trainings mit Plan-Status
  - `<PeriodSelector>` für Trainingsperioden-Filter (Shared Component)
  - Loading State: Bestehendes Shimmer-Pattern (`animate-[shimmer_...]`)

- `frontend/src/components/training-plan/PlanForm.tsx` — Eingabe-Formular
  - Spieleranzahl, Positionen (Checkboxes), Schwerpunkt (Radio), Dauer (Radio)
  - "Plan generieren" Button
  - Loading-State während KI generiert (Spinner + "Plan wird erstellt...")
  - Error-State bei 503: Toast "KI nicht verfügbar — API Key fehlt"

- `frontend/src/components/training-plan/PlanDisplay.tsx` — Plan-Anzeige
  - Timeline mit Drill-Karten
  - Diagramme inline (`/drills/{drill-id}.png`)
  - Coaching-Details aufklappbar (bestehendes Pattern: `<CollapsibleSection>`)
  - Drucken-Button

- `frontend/src/components/training-plan/PlanSection.tsx` — Einzelne Drill-Karte
  - Titel, Dauer-Badge, Typ-Badge (Aufwärmen/Drill/Batting/Spiel)
  - Diagramm
  - KI-Details (Rotation, Anpassung, Tipps)
  - Freitext-Notiz (für Anpassung)

- `frontend/src/components/training-plan/PlanEditor.tsx` — Bearbeitungsmodus
  - Drag & Drop zum Umsortieren (@dnd-kit/core + @dnd-kit/sortable, bereits im Projekt v6.3/v10.0)
  - Drills entfernen (X-Button)
  - Drill hinzufügen (öffnet DrillPickerModal)
  - Dauer pro Section editierbar
  - Freitext-Notizen pro Drill + am Ende
  - "Mit KI aufbereiten" Button → ruft /refine Endpoint
  - "Speichern" Button

- `frontend/src/components/training-plan/DrillPickerModal.tsx` — Drill auswählen
  - Modal Pattern: `fixed inset-0 z-50 bg-black/40` (bestehendes Pattern aus ConfirmModal/AvailablePlayersModal)
  - Filterbar nach Kategorie
  - Name, Kategorien, Min-Spieler angezeigt
  - Keyboard: Escape zum Schließen

#### Print-Styles:
- `frontend/src/styles/index.css` — @media print Regeln erweitern (bestehende Basis: `@page`, `.no-print`)
  - Alle Sections aufgeklappt
  - Nav/Buttons/Toast ausgeblendet
  - Sauberes Layout mit Diagrammen
  - Page-Break-Hints zwischen großen Sections

### Phase 7: Drill-Bilder extrahieren

- Aus `drills.pdf` (oder besser: einzeln aus Typst rendern via `typst compile`) die 32 Diagramme als PNG extrahieren
- Benennung: `{drill-slug}.png` (z.B. `viereck-drill-toss-wurf.png`)
- Ablage: `backend/src/main/resources/static/drills/`

### Phase 8: drills.json befüllen

- Alle 35 Drills aus den Typst-Dateien in `drills.json` konvertieren
- Felder: id, name, categories, minPlayers, equipment, description, hasImage, rotation, variants
- Die Drill-Daten sind bereits vollständig extrahiert (siehe Recherche)

---

## Reihenfolge der Implementierung

```
Phase 1 (Drill-Katalog Backend) ─┐
Phase 7 (Bilder extrahieren)     ├── parallel
Phase 8 (drills.json befüllen)   │
Phase 2 (DB Migration)           ─┘
         │
Phase 3 (Spring AI + Gemini Adapter)
         │
Phase 4 (REST API)
         │
Phase 5 (Frontend Types + API + Vite Proxy)
         │
Phase 6 (Period-Selector extrahieren → Frontend UI)
```

## Bestehende Patterns (wiederverwenden)

| Was | Referenz-Datei | Hinweis |
|---|---|---|
| Domain Model (POJO) | `backend/.../domain/model/Player.java` | Manuelle Getter/Setter, kein Lombok |
| Repository Port | `backend/.../domain/port/out/TrainingRepository.java` | Reines Interface, kein Spring |
| Application Service | `backend/.../application/TrainingService.java` | Constructor Injection, @Transactional |
| JPA Entity | `backend/.../adapter/out/persistence/entity/TrainingEntity.java` | Jakarta Annotations, IDENTITY Strategy |
| Mapper | `backend/.../adapter/out/persistence/mapper/TrainingMapper.java` | toDomain(), toEntity(), updateEntity() |
| Repository Adapter | `backend/.../adapter/out/persistence/adapter/TrainingRepositoryAdapter.java` | Implementiert Port, delegiert an Spring Data |
| REST Controller | `backend/.../adapter/in/web/TrainingController.java` | @Valid, @ResponseStatus, Constructor Injection |
| DTO Records | `backend/.../adapter/dto/TrainingResponse.java` | Records + static from() Factory + Validation |
| Exception | `backend/.../shared/exception/ResourceNotFoundException.java` | RuntimeException, neues AiServiceException analog |
| Flyway Migration | `backend/.../resources/db/migration/V11__*.sql` | BIGSERIAL, CASCADE, letzte Version = V11 |
| Frontend Hook | `frontend/src/hooks/useTraining.ts` | useState/useEffect, Debounce, Toast-Integration |
| Frontend API Client | `frontend/src/api/client.ts` | Native Fetch, Basic Auth, 204-Handling |
| Frontend Types | `frontend/src/types/index.ts` | Alle Types in einer Datei |
| Modal Pattern | `frontend/src/components/shared/ConfirmModal.tsx` | z-50, bg-black/40, Escape-Handler |
| Loading State | `frontend/src/components/training/TrainingPage.tsx` | Shimmer-Animation |
| Collapsible | `frontend/src/components/shared/CollapsibleSection.tsx` | Für aufklappbare Sections |
| Toast | `frontend/src/hooks/useToast.ts` | show(msg, 'success'/'error'), auto-dismiss |
| Period Selector | `frontend/src/components/training/TrainingPage.tsx:272-305` | Inline <select> → extrahieren! |
| Nav Tabs | `frontend/src/components/layout/Layout.tsx` | TABS-Array, path + label |
| Drag & Drop | `@dnd-kit/core@6.3` + `@dnd-kit/sortable@10.0` | Bereits installiert |
| Print Styles | `frontend/src/styles/index.css` | @page + .no-print Klasse |

## Verifizierung

### Backend
1. Backend starten, `GET /api/drills` gibt 35 Drills zurück
2. `GET /api/drills?maxPlayers=4&category=THROWING` filtert korrekt
3. Drill-Bilder erreichbar: `GET /drills/viereck-drill-toss-wurf.png` liefert PNG
4. `POST /api/training-plans/generate` mit Testdaten → Gemini generiert Plan (Spring AI ChatClient)
5. Plan in DB gespeichert (JSONB), `GET /api/training-plans/training/{id}` liefert Plan
6. `POST /api/training-plans/{id}/refine` mit Notizen → Plan wird aktualisiert
7. Ohne `GEMINI_API_KEY` → POST /generate gibt 503 mit klarer Meldung

### Frontend
8. Nav-Tab "Trainingsplan" sichtbar (Desktop + Mobile)
9. Period-Selector filtert Trainings korrekt (wiederverwendete Shared Component)
10. Übersicht zeigt Trainings mit Plan-Status (✅ vorhanden / — kein Plan)
11. Formular ausfüllen → Plan wird generiert und angezeigt (mit Diagrammen)
12. Drill-Bilder laden korrekt (Dev-Mode via Vite-Proxy `/drills`)
13. Plan bearbeiten → Drills umsortieren (DnD)/entfernen/hinzufügen + Notizen
14. "Mit KI aufbereiten" → Plan wird schön strukturiert überschrieben
15. 503-Fehler zeigt Toast "KI nicht verfügbar" (nicht generischer Fehler)
16. Drucken → sauberes Layout, alle Sections aufgeklappt, keine Nav/Buttons
17. Mobile: responsive, Touch-freundlich, DnD funktioniert auf Touch
