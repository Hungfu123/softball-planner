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
- **Frauen-Quote** (`LineupGenderRule`, `Player.gender` seit V62): mindestens 2 Frauen auf
  dem Feld, davon 1 im Infield (**P und C zählen als Infield**, EH und DH-Batter zählen
  nicht). `Gender` kennt `FEMALE`, `MALE`, `DIVERSE`; für die Quote zählt
  nur `FEMALE` — `DIVERSE` und nicht zugeordnet zählen nicht (Verbandssache, nicht App-Sache). Die Regel **warnt nur** —
  `POST /api/games/{id}/lineup/check` liefert Hinweise, `PUT /lineup` speichert weiterhin
  jede Aufstellung. Die Auto-Aufstellung **erzwingt** die Quote, solange genug Frauen
  verfügbar sind — unabhängig von Trainingsbeteiligung.
- **Auto-Aufstellung** (`LineupSuggestionEngine`): jeder Anwesende mindestens ein Spiel →
  Trainingsbeteiligung → Spiele an diesem Spieltag → Frauen-Quote → Positions-Profil →
  Auffüllen. Die Beteiligung ist eine **Quote** (besucht ÷ stattgefunden seit dem ersten
  Auftauchen, Nenner mindestens 3, `TrainingParticipationCalculator`), **ohne Termine mit
  eingeschränktem Teilnehmerkreis** (siehe nächster Punkt). Zeitraum ist das
  **Trainingsjahr seit dem letzten 1. November**, kein rollendes Fenster; Engine,
  Trainings-Panel und Spielerpool benutzen denselben. Details: `docs/LINEUP.md`.
- **Wer war eingeladen?** (`Training.openToAll`, V63): Termine, zu denen nur ein Teil des
  Kaders geladen ist (Nur-P/C), zählen **nicht** in die Trainingsbeteiligung — niemandem
  darf als versäumt angerechnet werden, wozu er nicht geladen war. Gesetzt wird das je
  Wochentag an der Periode (`TrainingPeriod.pcOnlyWeekdays`, V64, Schalter „nur P/C" im
  Perioden-Editor). **Nicht mit `Training.type` verwechseln:** der Sommer-Montag trägt
  `PITCHER_CATCHER` und war trotzdem offen, weil Basic und P/C dort zusammen stattfanden.
  `type` beschreibt den Inhalt, `openToAll` den Teilnehmerkreis — nur letzteres zählt für
  die Fairness. Der P/C-Tag wandert zweimal im Jahr (Nov → Do, Apr → zurück zum Montag),
  ein fester Wochentag taugt deshalb nicht.
- **Trainerabrechnung** (`/orga/trainerabrechnung`, `coach_billing_profile` seit V65):
  Der Bogen des Hochschulsports fuer einen Monat. `frontend/public/trainerabrechnung-vorlage.pdf`
  ist das **Originalformular**, nicht nachgebaut — `pdf-lib` beschriftet es an gemessenen
  Koordinaten. Stunden kommen aus den geplanten Trainings des Monats: Donnerstag 3 h von
  April bis Oktober, 2 h von November bis Maerz, Rest in **ganzen Einheiten** auf
  Montag/Samstag bis zum Monatsdeckel (12 h, im Profil) — ein Wintermontag ist 20-22 Uhr,
  also zwei ganze Montage statt vier angebrochener Tage. Elf Zeilen, max 3 h je Tag, abgesagte Termine fallen raus.
  Die Migration legt **keine** personenbezogenen Daten an. Details: `docs/TRAINERABRECHNUNG.md`.
- **Playmaker** (`/orga/playmaker`, `play`/`play_step`/`play_category` seit V66–V68): ein
  Feld zum Zeigen, kein Regelwerk. Ein Play ist eine Folge von **Ständen**, jeder Stand ein
  vollständiger `markers`-Schnappschuss (neun Verteidiger, Runner, Ball) in **Fuß**, y nach
  unten, Home (155, 218). Die Wiedergabe interpoliert und fasst die Stände nie an; Runner
  folgen den Base-Wegen und laufen **nie rückwärts nach Home**. `PlayValidator` prüft nur
  Datenintegrität (Nummerierung, Outs 0–3, Dauer 200–6000 ms im 200er-Raster) — Softball-
  Regeln ausdrücklich nicht. Die 51 Start-Plays kommen aus `scripts/build-seed-plays.mjs`,
  nicht aus der Hand. **Cut-off/Relay ist Teamkonvention, nicht Lehrbuch:** der Cut-Mann ist
  immer ein Mittelinfielder (links/Mitte → SS, rechts → 2B), der andere deckt die 2, der Mann
  an der Zielbase stellt ihn (Home → Catcher, 3 → 3B), die Corner bleiben an ihren Bases. Die
  Baseball-Variante (1B/3B als Cut für Home) gilt hier NICHT, und der Cut geht **auch beim
  kurzen Single** raus — er ist Absicherung, nicht Distanzhilfe. Das **freie Feld**
  (`/orga/playmaker/frei`) ist bewusst kein Play: nichts im Katalog, Stand im `localStorage`,
  **kein eigener `/api`-Aufruf** (Offline-Versprechen, per E2E geprüft). Seit den Accounts
  läuft dort wie überall der `/api/me`-Abruf des `AuthProvider`; der E2E-Test lässt genau
  diesen zu und bleibt für alles andere streng, und ein zweiter Test prüft die eigentliche
  Zusicherung — die Seite funktioniert, **wenn `/api/me` scheitert**. Details: `docs/PLAYMAKER.md`.
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
- **Playmaker (2D-Play-Board):** `docs/PLAYMAKER.md` — Koordinaten und Grammatik des Boards, Wiedergabe/Interpolation, Dauer-Raster, Generator der 48 Start-Plays
- **Spielerprofil & Positions-Profil:** `docs/SPIELERPROFIL.md` — `/players/:id`, Form-Kurve (gleitender Schnitt), PositionSlot-Enum (IF/OF/IF_OF, P und C separat), Backfill V61, Kader ohne Reiter
- **Stats / Batting-Statistics:** `docs/STATS.md` — Position-Weighting (DH=0.5, EH=0.5), Berechnung AVG/OBP/SLG/OPS
- **Standings / Liga-Tabelle:** `docs/STANDINGS.md` — zwei Quellen (eigene Games + LeagueResult), ownTeam-Regel
- **Trainingsplan-Generator:** `docs/04-KI-TRAININGSPLAN.md` + `docs/trainingsplan-algorithmus.md`
- **Lineup Auto-Generate:** `docs/03-LINEUP-AUTO-GENERATE.md`
- **Backend-Architektur (Stand: legacy):** `docs/02-BACKEND.md` — outdated, siehe Onion-Section oben
- **Trainerabrechnung:** `docs/TRAINERABRECHNUNG.md` — Originalvorlage statt Nachbau, Stunden-Regel Sommer/Winter, Stammdaten ohne Daten in der Migration
- **Deployment:** `docs/deployment.md`
- **Neuer Drill hinzufügen:** Skill `drill-onboarding` triggert automatisch bei Phrasen wie "neuer drill" / "drill hinzufügen" / "drill aufnehmen". Phasen-Mapping + Drill-Schema in `.claude/skills/drill-onboarding/` (roter-faden.md, drill-schema.md). Workflow: User beschreibt Drill → Skill klassifiziert in Phase + Categories → fragt fehlende Pflichtfelder → appended an `backend/src/main/resources/drills.json`.

## Single-team caveat

The app currently supports only one team. The own team name "Dead Sox" is **hardcoded in `SeasonService`** and auto-created on every new season. Multi-tenancy is not yet implemented — flag any change that would entrench this further, and treat any "make this configurable" ask as an architectural change (not a one-line constant edit).

## Frontend conventions

- Path alias `@/` → `frontend/src/` (configured in `vite.config.ts` + `tsconfig.app.json`).
- API client at `src/api/client.ts` — single `request<T>` wrapper über `senden()`, das **jeden** Aufruf trägt und 401 abfängt. Auth is HTTP Basic in `localStorage` unter `auth` (base64 `benutzername:passwort`, UTF-8-kodiert — Umlaute sind erlaubt). Der Benutzername kommt aus dem Anmeldeformular, nicht aus einer Konstante. `useAuth()` liefert `me` mit `{username, role, playerId, playerName, mayScore, passwordChanged}` aus `GET /api/me`; `POST /api/auth/login` ist der Handschlag beim Formular und setzt `lastLoginAt`, `/api/me` tut das nicht.
- **Keine eigenen `fetch`-Aufrufe gegen `/api`** — sie umgehen den 401-Abfang. Drei solche Umgehungen gab es schon (`api/plays.ts`, `downloadCalendarIcs`, `generateTrainingPlan`); alle laufen jetzt über `senden()`.
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
- DeadSox logo as vector (`frontend/public/deadsox.svg`) for favicon + nav; `deadsox.png` is the raster twin for the invitation PDF (jsPDF cannot embed SVG), the PWA icons are rendered from the same source. `drills/logo.svg` is the same mark without its background rect, for the dark cover of the drill booklet.

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

- **Drei Rollen:** `SUPERADMIN > ADMIN > PLAYER` als Spring-`RoleHierarchy`. Jeder Account hängt 1:0..1 an einem Spieler (`app_user.player_id`, `NOT NULL UNIQUE`, `ON DELETE CASCADE`). Ein Spieler kann ohne Account existieren, ein Account nie ohne Spieler.
- **Zwei getrennte Passwörter, niemals eins:** `APP_AUTH_PASSWORD` gehört dem Superadmin, `APP_PLAYER_PASSWORD` ist das an die Spieler verteilte. Wären sie gleich, wäre jeder Spieler einen Anmeldeversuch von Superadmin entfernt — der Benutzername ist der Vorname. `VerteiltesPasswort` verweigert den Start, wenn sie übereinstimmen oder die zweite fehlt.
- **Default-Deny:** jede Klasse in `adapter/in/web/` trägt exakt `@PreAuthorize("hasRole('ADMIN')")`, Ausnahmen sind `CalendarController` (`permitAll()`), `MeController`/`AuthController` (`isAuthenticated()`) und `AuditController` (`SUPERADMIN`). **Drei Wächter-Tests erzwingen das** — `SecurityCoverageTest`, `MethodSecurityCoverageTest`, `CurrentUserArchitectureTest`. Ein neuer Controller ohne Regel lässt die Suite scheitern.
- **`CurrentUser` ist `@RequestScope`** und funktioniert nur innerhalb einer HTTP-Anfrage. Aus `@Scheduled`-Läufen wirft er; der Architekturtest fängt das.
- Local: HTTP Basic, Passwörter aus `APP_AUTH_PASSWORD` und `APP_PLAYER_PASSWORD`. Der Bootstrap legt auf leerer Datenbank genau einen Superadmin an (Benutzername aus `app.auth.bootstrap-player`, Vorgabe `Hung`, klein geschrieben).
- Zwei Stellen sind bewusst offen: backendseitig `/api/calendar.ics` (`permitAll()` in `SecurityConfig`), frontendseitig die Route `/counter` (einzige Route ohne `RequireAuth` in `App.tsx`). **Ohne Anmeldung ruft `/counter` kein `/api` auf** und braucht das Backend-Loch nicht; angemeldet läuft dort wie überall der `/api/me`-Abruf des `AuthProvider`. Alles andere unter `/api/**` ist authentifiziert und jede andere Route liegt hinter `RequireAuth`.
- **Das freie Feld** (`/orga/playmaker/frei`) hält sein Offline-Versprechen weiter, aber die E2E misst es jetzt anders: der Test lässt genau `/api/me` zu (der `AuthProvider` läuft app-weit) und bleibt für alles andere unter `/api` streng. Dazu prüft ein zweiter Test die eigentliche Zusicherung — die Seite funktioniert, **wenn `/api/me` scheitert**. Ein routenabhängiger Sonderweg im Provider wurde bewusst nicht gebaut.
- Prod env vars on the VPS in `/opt/softball/docker-compose.yml`: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `APP_AUTH_PASSWORD`, **`APP_PLAYER_PASSWORD`** (ohne sie startet prod nicht — Absicht), `GEMINI_API_KEY`, optionally `AI_ENABLED=true` + `GROQ_API_KEY` for Spring AI features.
- Push to `master` triggers GitHub Action → SSH → `/opt/softball/deploy.sh` → `git pull` → `docker build` → `docker compose up -d backend`. The Dockerfile builds frontend + backend into a single Spring Boot JAR (frontend served as static resources via `SpaForwardingConfig`).

## Known environment gotchas

- If file watchers complain: `sudo sysctl fs.inotify.max_user_instances=512`.
- Maven build *must* use `-s .mvn/local-settings.xml` — don't touch `~/.m2/settings.xml`.
- Testcontainers needs a running Docker daemon for backend tests.
