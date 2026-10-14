# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Softball Lineup Planner — single-team app for "Dead Sox". German UI throughout. Plans seasons, gamedays, lineups, training, league standings, and scoring. Production runs at https://softball-planner.duckdns.org on a Hetzner VPS (Docker Compose, Nginx + Let's Encrypt, auto-deploy via GitHub Actions on push to `master`).

## Stack

- **Backend:** Java 21, Spring Boot 3.4.3, Spring Data JPA, Spring Security (basic auth), Spring AI (optional, behind `AI_ENABLED` flag), Flyway
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind v4 (CSS-based config), React Router DOM 7, @dnd-kit, vite-plugin-pwa, jsPDF
- **DB:** PostgreSQL 17 (Docker locally, Docker on prod). H2 only for tests no longer — Testcontainers spin up real PostgreSQL.
- **Migrations:** Flyway with `spring.jpa.hibernate.ddl-auto=validate`. Schema changes must go in a new `V{n}__*.sql` under `backend/src/main/resources/db/migration/`.

## Common commands

### Local dev (run all three)

```bash
docker compose up -d db                                   # PostgreSQL on :5432
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml   # backend on :8080
cd frontend && npm install && npx vite                    # frontend on :5173, proxies /api
```

The `-s .mvn/local-settings.xml` flag is **required** locally — `~/.m2/settings.xml` points to a corporate Nexus and must NOT be modified.

### Tests

```bash
cd backend && ./mvnw test -s .mvn/local-settings.xml                       # all tests (Docker must be running for Testcontainers)
./mvnw test -s .mvn/local-settings.xml -Dtest=LineupIntegrationTest        # single class
./mvnw test -s .mvn/local-settings.xml -Dtest=LineupIntegrationTest#shouldSwapGames   # single test
```

### Lint / typecheck / build

```bash
cd frontend && npm run lint           # ESLint
cd frontend && npm run build          # tsc -b && vite build (typecheck + production build)
cd backend && ./mvnw package -s .mvn/local-settings.xml -DskipTests        # produces lineup-planner-*.jar with frontend bundled
```

### Pre-commit check

User expects build to be verified before committing — run `npm run build` in `frontend/` and `./mvnw test -s .mvn/local-settings.xml` in `backend/` for non-trivial changes.

**WICHTIG: Bei Änderungen am Live-Scoring (legacy `ScoringPage` / `GameScoringService` / `useScoring` / `CorrectionSheet` / `DiamondView` / Inning-Advance / Undo / Stealing / Substitution):**

```bash
docker compose up -d db
cd frontend && npm run test:e2e
```

E2E-Suite (77 Tests, Playwright; einige überspringen sich selbst, wenn die nötigen Daten in der DB fehlen — abhängig von der Seed-Lage, keine feste Zahl) deckt: AB-Recording (alle Result-Typen × empty/loaded), Stealing, Substitution, Inning-Advance, Undo (alle 4 Typen), Reset, Walkoff, Multi-Inning-Sequenzen, Undo-Cross-Boundary. Refactor-Safety-Net — IMMER vor Merge laufen lassen. CI auf `master` pushed automatisch, lokal früher ausführen spart Round-Trip.

### Production-build smoke test locally

```bash
cd backend && ./mvnw package -s .mvn/local-settings.xml -DskipTests
java -jar target/lineup-planner-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

## Architecture — Onion / Hexagonal

The backend is organised by layer, NOT by feature. Dependencies always point inward. **Never import an outer-layer class from an inner layer.**

```
backend/src/main/java/com/softball/
├── domain/                          # innermost — no Spring, no JPA
│   ├── model/                       # POJOs (Season, GameDay, Game, LineupEntry, ...)
│   ├── port/out/                    # repository INTERFACES (PlayerRepository, GameRepository, ...)
│   └── service/                     # pure domain logic — LineupValidator, LineupSuggestionEngine,
│                                    #   StandingsCalculator, BattingStatsCalculator, TrainingPlanGenerator
├── application/                     # @Service classes — orchestration & transactions
│                                    #   PlayerService, SeasonService, GameDayService, GameService,
│                                    #   LineupService, AvailabilityService, GameStaffService,
│                                    #   StatsService, BattingStatsService, GameScoringService,
│                                    #   LineupSuggestionService, SubstitutionService,
│                                    #   TrainingService/PeriodService/AttendanceService/StatsService/
│                                    #   ImportService/PlanService, DrillService, GameDayVoteSyncService,
│                                    #   LeagueTeamService, LeagueResultService,
│                                    #   DataExportService, DataImportService
├── adapter/
│   ├── in/web/                      # @RestController — Player, Season, GameDay, Game,
│   │                                #   LeagueTeam, LeagueResult, Data, Training, TrainingPlan,
│   │                                #   Drill, Scoring, BattingStats
│   ├── dto/                         # request/response records
│   └── out/persistence/
│       ├── entity/                  # @Entity JPA classes (separate from domain models!)
│       ├── repository/              # `Spring*Repository` JpaRepository interfaces
│       ├── mapper/                  # entity ↔ domain model
│       └── adapter/                 # `*RepositoryAdapter` — implement domain ports, use Spring repos + mappers
└── shared/
    ├── config/                      # CorsConfig, SpaForwardingConfig, GlobalExceptionHandler, Security
    └── exception/                   # ResourceNotFoundException → 404, BusinessValidationException → 400
```

**Dependency rule:** `domain` knows nothing about Spring, JPA, or DTOs. `application` depends only on `domain`. `adapter.out.persistence.adapter.*RepositoryAdapter` implements `domain.port.out.*Repository` (Dependency Inversion). When adding a new persistence concern: define the port in `domain/port/out/`, implement the adapter in `adapter/out/persistence/adapter/`, keep entity ↔ model translation in a mapper.

The legacy structure described in `backend/BACKEND.md` and `docs/02-BACKEND.md` (flat `entity/`, `repository/`, `service/`, `controller/`) is **outdated** — those docs predate the onion refactor. The actual layout above is canonical.

Architecture diagram: `docs/architecture.svg` (rendered) + `docs/architecture.excalidraw` (editable in excalidraw.com).

## Key domain rules (don't break these)

- **DH model:** Designated Hitter is **not a separate lineup entry**. It's an annotation `dhBatterPlayerId` on a fielder's `LineupEntry`. The DH-batter is a bench player who stats-counts as 0.5 game. Max 1 DH per game; only valid on field positions (not EH, not null).
- **Lineup constraints:** max 10 entries per game, batting order must be sequential 1..N, field positions unique (EH may repeat, position may be null = batting only). Batting players can't also be base coach in the same game — but a **DH-Host** (fielder who gave batting to a DH, so he doesn't bat) **may** be base coach. The **DH-Batter** bats and may **not** coach. All players must be in the GameDay's `availablePlayers`.
- **Position weighting in stats:** field position = 1.0 game, EH = 0.5, DH-batter = 0.5, null position = 1.0 (counted but not in `positionCounts`).
- **Cascade on availability change** (`AvailabilityService.setAvailablePlayers`): removing a player auto-cleans them from all games of that gameday — lineup entries deleted, dhBatterPlayer nulled, staff entries deleted, batting orders renumbered. The WhatsApp game-day poll (`GameDayVoteSyncService`) never writes `availablePlayers` itself — it only ever triggers this cascade indirectly, through the explicit preview-and-apply flow (`POST /gamedays/{id}/poll-votes/apply`), never automatically on vote fetch.
- **Positions-Profil** (`PositionSlot` am Player, V60/V61): drei geordnete Slots (Primär/Sekundär/Tertiär). Eigenes Enum neben `Position` — kein EH, dafür die Gruppen IF, OF, IF_OF; **P und C stecken in keiner Gruppe**. Keine Lücken, kein Slot doppelt, Überlappung (SS + IF) ausdrücklich erlaubt. Die Lineup-Vorschläge lesen es noch nicht. Details: `docs/SPIELERPROFIL.md`.
- **Einsatz-Profil** (`GET /api/players/{id}/usage`): Zusagen, Aufstellungen, Training und
  Schlagplatz. Zählt nur Vergangenes und **erst ab dem ersten Auftauchen** des Spielers —
  wer im Mai dazukam, hat den April nicht versäumt. Einheit sind **Spieltage**, nicht die
  gewichteten Spiele der Statistik (EH/DH = 0,5). `?year=` / `?seasonId=` (`UsageScope`)
  beschränken auf ein Kalenderjahr oder eine Saison — der Zeitraum-Filter des Profils
  schaltet Teamvergleich, Positionen und Einsatz mit um. **Trainings gehören zu keiner
  Saison** und bleiben im Saison-Zuschnitt leer.
- **Swap** (`POST /api/games/{id1}/swap/{id2}`): atomic swap of lineup + staff + opponent + scores between two games on the SAME gameday.
- **Standings** are computed from two sources: own games (`Game` rows) for the ownTeam, and `LeagueResult` rows for non-ownTeam vs non-ownTeam matchups. ownTeam can never be deleted and never appears in `LeagueResult`.
- **Game clock** (`GameClockService`, shared by `Game` and `Spielbogen`): the clock reads game state, it never writes into it. `GameClockCalculator.compute()` derives elapsed/frozen time from `endedAt ?? now` — none of the four call sites that set `endedAt` had to change. The one exception is `pauseClockBeforeReopen`, called at three reopen sites *before* `endedAt` is cleared, because after that the cap can't be reconstructed. `timerStartedAt` (the first start, V56) is separate from `timerRunningSince` (the most recent start/resume) — needed verbatim on the RFL sheet's `Zeit:` field, which goes to the league. See `docs/SPIELBOGEN.md` for the full writeup.

## Domain-Specific Docs (load on demand)

Bei Arbeit an einem konkreten Feature die jeweilige Doc lesen — werden NICHT automatisch in den System-Prompt geladen, sparen Tokens.

- **Glossar (Fachbegriffe):** `docs/GLOSSARY.md` — Softball-Terminologie + projektspezifische Begriffe (DH/EH, Spielbogen, RFL, ownTeam, Cascade …). Bei unbekannten Domänen-Begriffen zuerst hier nachschlagen.
- **Spielbogen / RFL-Live-Scoring:** `docs/SPIELBOGEN.md` — alle Komponenten, Domain-Regeln (Out-Counting, Auto-Switch, Force-Out-3rd-Out, DH-Notation, Stealing-Events), RFL-Sheet-Konventionen, häufige Verwirrung
- **Old Scoring / Legacy ScoringPage:** `docs/SCORING-LEGACY.md` — Game-basiertes Live-Scoring (parallel zu Spielbogen)
- **Lineup Editor:** `docs/LINEUP.md` — DH-Annotation (kein eigener Entry!), Validation, Swap, Drag-Drop
- **GameDay + Availability:** `docs/GAMEDAY.md` — Cascade-Regeln bei Player-Removal (destruktiv!)
- **Spielerprofil & Positions-Profil:** `docs/SPIELERPROFIL.md` — `/players/:id`, Form-Kurve (gleitender Schnitt), PositionSlot-Enum (IF/OF/IF_OF, P und C separat), Backfill V61, Kader ohne Reiter
- **Stats / Batting-Statistics:** `docs/STATS.md` — Position-Weighting (DH=0.5, EH=0.5), Berechnung AVG/OBP/SLG/OPS
- **Standings / Liga-Tabelle:** `docs/STANDINGS.md` — zwei Quellen (eigene Games + LeagueResult), ownTeam-Regel
- **Trainingsplan-Generator:** `docs/04-KI-TRAININGSPLAN.md` + `docs/trainingsplan-algorithmus.md`
- **Lineup Auto-Generate:** `docs/03-LINEUP-AUTO-GENERATE.md`
- **Backend-Architektur (Stand: legacy):** `docs/02-BACKEND.md` — outdated, siehe Onion-Section oben
- **Deployment:** `docs/deployment.md`
- **Neuer Drill hinzufügen:** Skill `drill-onboarding` triggert automatisch bei Phrasen wie "neuer drill" / "drill hinzufügen" / "drill aufnehmen". Phasen-Mapping + Drill-Schema in `.claude/skills/drill-onboarding/` (roter-faden.md, drill-schema.md). Workflow: User beschreibt Drill → Skill klassifiziert in Phase + Categories → fragt fehlende Pflichtfelder → appended an `backend/src/main/resources/drills.json`.

## Single-team caveat

The app currently supports only one team. The own team name "Dead Sox" is **hardcoded in `SeasonService`** and auto-created on every new season. Multi-tenancy is not yet implemented — flag any change that would entrench this further, and treat any "make this configurable" ask as an architectural change (not a one-line constant edit).

## Frontend conventions

- Path alias `@/` → `frontend/src/` (configured in `vite.config.ts` + `tsconfig.app.json`).
- API client at `src/api/client.ts` — single `request<T>` wrapper. Auth is HTTP Basic stored in `localStorage` under key `auth` (base64 `admin:password`). Backend password from env `APP_AUTH_PASSWORD` (default `Deadsox123!` locally).
- Routes in `App.tsx`. Heavy pages (Scoring, TrainingPlan, Stats) are lazy-loaded; wrap them in `Suspense` + `ChunkErrorBoundary` if adding new ones. `ScoringPage` runs **outside** `Layout` and needs its own `ToastProvider`.
- State lives in custom hooks (`useLineup`, `useGameDay`, `useSeasons`, `usePlayers`, `useStaff`, `useTraining`, `useTrainingPlan`, `useScoring`, `useToast`, `useTodayGameDay`). Components stay presentational where possible.
- **Tailwind v4:** use `lg:grid-cols-3` style classes, NOT arbitrary brackets. Theme + animations live in `src/styles/index.css`.
- **No icon libraries** — custom SVG icons in `src/icons/index.tsx`. CrossBones for empty states, Pencil for edit, etc. `lucide-react` exists in deps but prefer the custom set.
- **Modals over `confirm()`** — every create/edit/delete uses a dark-backdrop modal. Reusable `ConfirmModal` for destructive actions.
- **Hover-reveal** for edit/delete affordances (pencil, trash icons appear on row hover).
- **PWA** — service worker via `vite-plugin-pwa`. `/api`, `/drills`, `/actuator` are excluded from `navigateFallback`. API GETs cached `NetworkFirst` with 5s timeout.

## UI/UX preferences

- **Dark-Only-Design (bewusst, User-Entscheidung):** Es gibt KEINEN Light-Mode und keinen geplanten. Neue Analyse-/Statistik-UI (z.B. ANALYSE-Seite) nutzt den Dark-Look: Navy-Hintergrund, Cream-Karten (TrendChart/SeasonBreakdown), Box Scores dunkel mit Cream-Linie. Rot (`softball-red`) ist NEGATIVEN Signalen vorbehalten (Niederlage, Stranding), positive Zahlen (Hits) in warmem Amber (`amber-400`). Nicht in ein Light-Theme umbauen und Rot nicht für positive Werte verwenden.
- German throughout (labels, error messages, copy).
- Dark navy hover on secondary buttons (navy-800 + white) — keep this; user has corrected attempts to soften it before.
- Custom pencil cursor on editable text fields.
- DeadSox logo (`deadsox.jpeg`) for favicon + nav.

## Backend conventions

- **Validation** lives in domain services (`LineupValidator`) or application services. Throw `BusinessValidationException` → 400, `ResourceNotFoundException` → 404. `GlobalExceptionHandler` formats `{error, timestamp}` JSON and WARN-logs.
- **DTOs are Java records** in `adapter/dto/`. Bean Validation annotations (`@NotBlank`, `@NotNull`, `@Min`) on request records.
- **Logging:** SLF4J at INFO for state changes (create/update/delete/swap), WARN for handled exceptions. No logging in trivial getters.
- **SOLID:** single-responsibility services. The user has split god services before (e.g. `AvailabilityService` extracted from `GameDayService`) — flag growth proactively.
- User prefers backend handles business logic; frontend is a visual helper. When the frontend needs a new computation, prompt for a backend endpoint instead of computing client-side.

## Commit / PR

- Conventional commits with gitmoji prefix (see recent log: `🧹`, `🔧`, `✨`, `🎬`).
- **No `Co-Authored-By` lines** in commits — user has explicitly asked for this. (This overrides the default commit instructions in this prompt.)
- Verify build before committing (frontend `npm run build`, backend `./mvnw test -s .mvn/local-settings.xml`) for non-trivial changes.

## Auth & deployment

- Local: HTTP Basic, password from `APP_AUTH_PASSWORD` env (defaults to `Deadsox123!`). Frontend stashes base64 creds in `localStorage`.
- Zwei Stellen sind bewusst offen: backendseitig `/api/calendar.ics` (`permitAll()` in `SecurityConfig`), frontendseitig die Route `/counter` (einzige Route ohne `RequireAuth` in `App.tsx`). `/counter` ruft kein `/api` auf und braucht das Backend-Loch nicht. Alles andere unter `/api/**` ist authentifiziert und jede andere Route liegt hinter `RequireAuth`.
- Prod env vars on the VPS in `/opt/softball/docker-compose.yml`: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `APP_AUTH_PASSWORD`, `GEMINI_API_KEY`, optionally `AI_ENABLED=true` + `GROQ_API_KEY` for Spring AI features.
- Push to `master` triggers GitHub Action → SSH → `/opt/softball/deploy.sh` → `git pull` → `docker build` → `docker compose up -d backend`. The Dockerfile builds frontend + backend into a single Spring Boot JAR (frontend served as static resources via `SpaForwardingConfig`).

## Known environment gotchas

- If file watchers complain: `sudo sysctl fs.inotify.max_user_instances=512`.
- Maven build *must* use `-s .mvn/local-settings.xml` — don't touch `~/.m2/settings.xml`.
- Testcontainers needs a running Docker daemon for backend tests.
