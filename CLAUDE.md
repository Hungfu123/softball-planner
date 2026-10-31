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
  kurzen Single** raus — er ist Absicherung, nicht Distanzhilfe.
  **Die Absicherung hinter der Base ist eine Regel im Generator** (`absichern()`, V75, seit
  dem 31.10.2026), kein Eintrag je Play: **RF hinter die 1, CF hinter die 2, LF hinter die
  3, der Pitcher hinter die Platte — und beim Relay aus dem Outfield geht der Pitcher hinter
  die Zielbase.** Gezählt vorher: von 48 Würfen auf eine Base stand bei **8** jemand
  dahinter, nachher bei **46**. Zwei Grenzen stecken darin, beide aus dem Bild gelernt: ein
  Outfielder sichert nur ab, was VOR ihm liegt (sonst lief der CF beim Relay quer durchs
  Infield), und wo schon jemand steht, kommt keiner dazu. Der Katalog behält das letzte
  Wort. **Das Team sagt „covern", nicht „decken"** (V77, seit dem 31.10.2026): die
  Migration hat Titel und Notizen der Start-Plays umgeschrieben, `build-seed-plays.mjs`
  schreibt es seitdem so. Beim abgetrennten „ab" faellt die Vorsilbe weg — „abcovern"
  gibt es nicht, aus „deckt dort ab" wird „covert dort". Das **freie Feld**
  (`/orga/playmaker/frei`) ist bewusst kein Play: nichts im Katalog, Stand im `localStorage`,
  **kein eigener `/api`-Aufruf** (Offline-Versprechen, per E2E geprüft). Seit den Accounts
  läuft dort wie überall der `/api/me`-Abruf des `AuthProvider`; der E2E-Test lässt genau
  diesen zu und bleibt für alles andere streng, und ein zweiter Test prüft die eigentliche
  Zusicherung — die Seite funktioniert, **wenn `/api/me` scheitert**. Details: `docs/PLAYMAKER.md`.
- **Swap** (`POST /api/games/{id1}/swap/{id2}`): atomic swap of lineup + staff + opponent + scores between two games on the SAME gameday.
- **Freigabe der Aufstellung** (`game_days.lineups_released_at` + `lineups_released_hash`,
  V73, seit dem 28.10.2026): **Spieler sehen die Aufstellung eines Spieltags erst, wenn sie
  steht** — vorher nichts, auch nicht den eigenen Platz. Wer seinen Platz kennt, kennt die
  halbe Aufstellung. Zwei Dinge entscheiden, getrennt: die **Lage** des Spieltags und wer sie
  **sehen darf**.
  **Die Lage** rechnet `domain/service/AufstellungsLageRegel` in **Berliner Zeit**, in dieser
  Reihenfolge: vergangen (`OFFEN_VERGANGEN`) → heute ab 07:00 (`OFFEN_AB_SIEBEN`) →
  freigegeben (`FREIGEGEBEN`) → heute vor 07:00 (`HEUTE_VOR_SIEBEN`) → sonst `GESPERRT`.
  **Die Reihenfolge ist Teil der Bedeutung.** Stünde `FREIGEGEBEN` über den Heute-Zweigen,
  böte die Oberfläche am Spieltag nach 7 Uhr einen „zurücknehmen"-Knopf an, dessen Rückfrage
  verspricht, die Aufstellung verschwinde wieder — sie verschwindet nicht, denn ab 7 Uhr sieht
  sie ohnehin jeder. Und ein vergangener, freigegebener Spieltag bliebe für Spieler für immer
  „der nächste". **Nicht umsortieren.**
  **Wer sie sieht** (`shared/security/AufstellungSichtbarkeit`, die einzige Stelle): Trainer
  immer; `FREIGEGEBEN`, `OFFEN_VERGANGEN` und `OFFEN_AB_SIEBEN` **jeder**; `HEUTE_VOR_SIEBEN`
  **nur Scorer** (`@scoring.darfSchreiben`); `GESPERRT` **niemand**. Ein Scorer ist kein
  eigener Rang — `may_score` hängt an einem Konto mit der Rolle `PLAYER`. Er sah früher
  **jede** Aufstellung, auch Tage vorher: genau das Leck, gegen das dies gebaut ist. Jetzt
  sieht er sie ab Mitternacht am Spieltag (der Morgen, an dem der Trainer das Freigeben
  vergessen hat, und der Spielbogen nicht leer sein darf), an allen anderen Tagen trägt ihn
  die Freigabe wie alle. Vergangene Spieltage sind offen, weil `/teams/spiele` für jedes
  gespielte Spiel die Schlagreihenfolge lädt und niemand hundert alte Spieltage nachträglich
  freigibt. **Geantwortet wird leer, nicht mit 403** — die Oberfläche trägt den leeren Fall
  ohnehin, einen Fehler trüge sie nicht.
  **Die Zeitzone:** die 7 Uhr werden an **genau einer** Stelle ausdrücklich in `Europe/Berlin`
  gerechnet (`clock.instant().atZone(BERLIN)`). Die Zone des Containers wird **nicht**
  gestellt — 18 Migrationen halten `TIMESTAMP` ohne Zone, eine Umstellung verschöbe jede
  historische Zeit im Display, auch das Feld `Zeit:` auf dem RFL-Bogen, der an den Verband
  geht. Es ist **keine automatische Freigabe**: kein geplanter Lauf, kein Schreibvorgang,
  `lineups_released_at` bleibt leer, wenn der Trainer den Schalter nicht legt.
  **Die Grenze sitzt an mehr Stellen, als man denkt** — elf Lesewege wurden geschlossen, über die
  dieselben Daten herauskamen, darunter `/gamedays/{id}/lineups`, `/gamedays/{id}/stats` (Positionen je Spiel, der
  Name klingt nach Statistik), `StatsService` hinter `/seasons/{id}/stats`,
  `/years/{y}/stats` und `/stats/all-time/games` (zählt `LineupEntry`, also Namen und
  Positionen), `/games/{id}/batting-stats` und `/gamedays/{id}/batting-stats` (der
  Lineup-Keim in `collectPlayers` — bei einem Spiel ohne At-Bats ist die Antwort **exakt die
  Aufstellung**), `/games/{id}/scoreboard` (`resolveCurrentBatter` liefert vor dem ersten
  At-Bat den Leadoff-Hitter samt Schlagplatz 1) und `/players/{id}/usage` (Schlagplätze ohne
  Datumsfilter). **Wer hier etwas anfasst, geht von den DATEN aus, nicht von den Endpunkten:**
  wer liest `LineupEntry`, `GameStaff`, `Substitution` oder abgeleitete Positionsangaben, und
  auf welchem Weg landet das bei einem Spieler? Ein gespieltes Spiel behält dabei **alle**
  Zahlen, auch wenn es nie freigegeben wurde.
  **Die Zusage ist keine Aufstellung:** „Du bist dabei" kommt aus `availablePlayers` und bleibt
  sichtbar — das beantwortet, ob man am Samstag gebraucht wird, nicht wo man steht.
  **Nach der Freigabe gilt immer der Live-Stand.** Ändert sich danach etwas, meldet
  `lineupsChangedSinceRelease` dem Trainer „Seit der Freigabe geändert" — eine **Auskunft für
  ihn, keine Sperre für die Spieler**; „Erneut freigeben" setzt den Haken zurück und ändert
  sonst nichts. Erkannt wird das über einen **Fingerabdruck** (`domain/service/
  AufstellungsFingerabdruck`, SHA-256 über Schlagplätze, Positionen, DH, Coaches,
  Auswechslungen, Spiel-id, sortiert) — **nicht** über einen zweiten Zeitstempel: es gibt rund
  ein Dutzend Wege, eine Aufstellung zu ändern (Lineup, Staff, Substitutions, Swap,
  Auto-Aufstellung, Undo, Lineup-Sets, Verfügbarkeits-Kaskade, Import, Live-Scoring), und einen
  davon zu vergessen ergäbe einen Haken, der stillschweigend falsch steht. Ein Vergleich kann
  nichts vergessen und fängt auch das Löschen. Der Haken wird **nur für Spieltage ab heute**
  gerechnet — `/api/calendar.ics` ist `permitAll()` und wird gepollt; ein vergangener Spieltag
  meldet deshalb immer `false`.
  **Die Oberfläche verbirgt nichts, sie erklärt nur Leere** (`utils/aufstellungsLage.ts`,
  `stehtNochNicht(gameDay, alleLeer)` und `alleLeer(spiele, aufstellungen)`): sind Einträge
  da, werden sie gezeigt. „Die Aufstellung steht noch nicht." gilt nur, wenn die Lage
  `GESPERRT` ist **und** der Betrachter für **kein** Spiel Einträge bekam — sonst „Für dieses
  Spiel gibt es noch keine Aufstellung." Grund: Gesperrte bekommen leere Listen, leer heißt
  also zweierlei. Das Frontend rechnet **kein Datum selbst**: `aufstellungsLage` und
  `istHeute` kommen fertig aus `GameDayResponse`. Eine Oberfläche, die nach der Freigabe statt
  nach den Daten entscheidet, wirft einem Scorer seine Daten weg. **Bestehende Spieltage sind
  nach der Migration nicht freigegeben** — die Alternative wäre gewesen, alle Altdaten
  stillschweigend zu veröffentlichen. `SpielerLeserechteIntegrationTest` und
  `AufstellungFreigabeIntegrationTest` halten das Ganze fest.
- **Base Coach** (`domain/service/BaseCoachRegel`, V74): die alte Coach-Rotation —
  `CoachRotationPair`, `lineup_set_game_rotation` (V57), die vier Spalten an `games`
  (V34/V37) und `PUT /games/{id}/coach-rotation` — ist **ersatzlos weg**. Jetzt gilt: wer
  benannt ist, coacht; je **nicht** benannter Base kommt ein Schlagplatz, **von unten
  gezählt** (zwei unbenannte → die untersten zwei, eine → die unterste, keine → leer).
  Ausgeliefert werden **Namen, keine Nummern** (`startCoaches`): wer „#9 #10" liest, muss
  erst abzählen — und las es prompt als „die untersten beiden coachen immer". Aus demselben
  Grund endet der Satz auf **„dann letzte Outs"**: die Nennung ist das *Startpaar*, danach
  coacht, wer zuletzt aus war. Ohne diesen Zusatz behauptet der Satz eine Dauerzuweisung,
  die es nicht gibt — die App rechnet im Spiel ausdrücklich nichts mit.
  Ausgeliefert wird das über `GET /gamedays/{id}/lineups` als vierte Map `baseCoaches`, damit
  es unter derselben Lesegrenze liegt wie die Aufstellung. Formuliert wird der Satz an **einer**
  Stelle, `utils/baseCoachSatz.ts` — nur so lauten PDF und App gleich und sind nicht bloß
  gleich gemeint. Seine Länge ist **gemessen, nicht geraten**: der PDF-Block ist 100 mm bei
  Helvetica 7 pt, also rund 80 Zeichen; der Test hält 60 als Abstand. Das frühere Budget von
  30 war eine Vorsichtsannahme aus dem Plan und zu eng für einen verständlichen Satz.
  Ein benannter Coach ist eine Auskunft, auch ohne Aufstellung. **Die Prüfung
  in `GameStaffService.validate` bleibt unverändert:** Base Coach darf nur sein, wer nicht
  schlägt (Bank oder DH-Host; der DH-Batter nicht).
- **Spieler-Ansicht** (`components/dashboard/Aufstellungsansicht.tsx`, im Spieler-Dashboard
  `/spielbetrieb`, an der Stelle der früheren reinen Liste): Feld, Schlagreihenfolge, Base
  Coaches, Bank. Ein Abruf je Spieltag statt einer je Spiel. Sie zeigt **nur den nächsten
  Spieltag** — ein Rückblick ist ausdrücklich nicht gebaut.
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
- **Neue Fassungen ziehen leise ein** (`pwa/UpdateWaechter.tsx` + `pwa/appUpdate.ts`,
  `registerType: 'prompt'`): **nicht `autoUpdate`** — das klingt nach demselben, tut aber etwas
  anderes. Dort übernimmt der neue Service Worker sofort, die **offene Seite** läuft aber mit dem
  alten JavaScript weiter. Im Browser fällt das kaum auf, weil man die Seite irgendwann neu
  aufruft; die **installierte App wird nie neu aufgerufen, sondern fortgesetzt** — dort blieb die
  alte Fassung stehen, bis jemand hart neu lud. Jetzt wartet der neue Worker (`skipWaiting` nur
  noch auf `SKIP_WAITING`, kein `clientsClaim`) und der Wächter lässt ihn ran, **wenn die App in
  den Vordergrund kommt** — der einzige Moment, in dem ein Neuladen wie ein normaler Start
  aussieht. **Nie auf den Scoring-Seiten** (`/gameday/{id}/scoring/…`, `/spielbogen/{id}`,
  `/spielbogen/new`): dort steckt der Stand der laufenden Begegnung in der Seite, und das wäre
  der teuerste denkbare Zeitpunkt. Die Entscheidung liegt als **pure Funktion** in
  `appUpdate.ts` (wie bei `apiCaching.ts`: der Service Worker läuft in Vitest nicht, die Regel
  schon). Gelesen wird `window.location.pathname`, nicht der Router — so hängt der Wächter an
  keiner Route und sitzt **über** dem Router, wo auch die Scoring-Seiten darunterliegen (die
  laufen außerhalb des Layouts). Ein stündliches `registration.update()` muss sein: eine
  stehende App navigiert nicht und sähe sonst nie nach.
  **Zwei Momente lassen den neuen Worker ran, nicht einer:** der Wechsel in den Vordergrund
  **und der Aufbau der Seite**. Der zweite ist der Ersatz für das, was `autoUpdate` von selbst
  tat — wer von Hand neu lädt (in der installierten App: zieht), bekäme sonst für immer
  dieselbe Seite aus dem Vorrat. Er gilt nur **innerhalb einer Minute nach dem Aufbau**
  (`AUFBAU_FENSTER_MS`, gemessen mit `performance.now()`): ohne diese Grenze risse die
  stündliche Nachfrage die Seite auch jemandem weg, der gerade ein Formular ausfüllt — genau
  davor schützt sonst „nur im Vordergrund". Eine **Bremse im `sessionStorage`** lässt den
  Aufbau-Zweig je Tab-Sitzung einmal zu und **löst sich wieder, sobald nichts mehr ansteht** —
  hielte sie durch, käme der zweite Deploy des Tages nicht mehr an. Die Tafel **nimmt sich
  nach `TAFEL_GEDULD_MS` selbst zurück**: `updateServiceWorker(true)` lädt erst, wenn der
  Worker wirklich übernimmt, und täte er das nie, stünde sonst ein bildschirmfüllender
  Vorhang ohne Ausweg. Belegt wurde die Kette gegen den **gebauten** Build (`vite preview`,
  vier Fassungen hintereinander): ein Zug reicht, auch beim zweiten Deploy im selben Tab.
- **Das Ziehen-zum-Neuladen bleibt offen** (`hooks/useZiehenSperre.ts`): die installierte App
  hat keine Adressleiste und keinen Neu-laden-Knopf — das Ziehen ist der einzige Handgriff,
  der ihr bleibt, wenn etwas klemmt. `overscroll-behavior: none` stand deshalb kurz pauschal
  an `html, body` und hängt jetzt am Attribut `data-kein-ziehen`, das nur auf den
  Scoring-Seiten gesetzt wird. **Die Liste der Seiten ist dieselbe wie beim Update**
  (`schreibtGeradeMit` in `pwa/appUpdate.ts`), und zwar aus demselben Grund: niemandem das
  laufende Spiel unter den Händen wegziehen. **Nicht wieder pauschal setzen.** Gelauscht wird
  am Router (`router.subscribe`), nicht an `useLocation` — die Sperre muss über dem
  `RouterProvider` sitzen, weil die Scoring-Seiten außerhalb des Layouts laufen.
  **Und es holt wieder eine neue Fassung** — das tat es unter `autoUpdate` von selbst
  (`skipWaiting` + `clientsClaim`, das zweite Neuladen zeigte die neue Fassung), und mit
  `prompt` wartet der neue Service Worker, bis ihn jemand ruft. Ohne Zutun bekäme ein
  Neuladen von Hand für immer dieselbe Seite aus dem Vorrat. Deshalb der **Aufbau-Zweig** im
  Wächter (siehe nächster Punkt); ohne ihn wäre das Ziehen eine Attrappe.
- **PWA** — service worker via `vite-plugin-pwa`. `/api`, `/drills`, `/actuator` are excluded
  from `navigateFallback`. API GETs cached `NetworkFirst` with 5s timeout. Zwei Ausnahmen in
  `src/pwa/apiCaching.ts`, und der Cache-Schlüssel ist **nur die URL** — das ist der Grund für
  beide: **rollenabhängige** Antworten laufen `NetworkOnly` (sonst bekäme ein Spieler die
  gespeicherte Antwort eines Trainers), **seltener Lesestoff** läuft `StaleWhileRevalidate`.
  In den Lesestoff gehört **nichts, was man in der App selbst bearbeitet** — Lineup,
  Spielstand, Umfrage, **Plays**. Plays standen dort einen halben Tag lang, und wer ein Play
  bearbeitete, bekam danach die Fassung von vorher. **Gefunden hat das keine Prüfung, sondern
  ein E2E-Lauf gegen den gebauten JAR:** CI testet gegen den Vite-Dev-Server, und der
  registriert gar keinen Service Worker.

## UI/UX preferences

- **Zwei Themes seit dem 26.10.2026** (`data-theme="dark"` am `<html>`, Schalter unter `/konto`, Wahl im `localStorage` pro Gerät). Die Werte stehen als semantische Tokens in `styles/index.css` — `--color-surface/-raised/-sunken`, `--color-ink/-muted/-faint`, `--color-line`, `--color-band`: die Palette sagt WELCHE Farbe, die Tokens sagen WAS. Neue UI nimmt die Tokens, nicht `bg-cream-50`/`text-navy-900`. Vier Rollen tragen die Gestaltung: **`surface`/`surface-raised`/`surface-sunken`** (Seite, Karte, Mulde), **`ink`/`ink-muted`/`ink-faint`** mit `line`/`line-strong`, **`accent`** (gefüllt und aktiv — der gewählte Reiter, die primäre Schaltfläche, die besetzte Kachel) und **`spotlight`** (der hervorgehobene Block — Kennzahlen-Kachel, Profilkopf). Dazu `band` für Rahmen (Kopfleiste, Scoreboard) und `bar` für Datenbalken. **`band` und `spotlight` nicht verwechseln:** auf Papier sehen beide gleich aus (dunkler Klotz auf Cream), aber Rahmen darf zurücktreten und Betonung muss nach vorn — im Dunkeln heißt das entgegengesetzte Richtungen. Die alten Paletten-Klassen tragen noch ~3.770 Stellen; ein **Shim** am Ende des Dunkel-Blocks deutet sie im Dunkeln um. Wer eine Datei ohnehin anfasst, stellt sie auf Tokens um — der Shim ist ein Pflaster und soll schrumpfen. Alles Dunkle steht in `@media not print`, damit der Druck von selbst hell bleibt; die Regeln liegen **außerhalb jeder Cascade-Layer** (`@theme` schreibt in eine Layer, unbelayertes CSS gewinnt gegen jede Layer). Drei Prüfungen halten das: `kontrast.spec.ts` misst 19 Seiten in beiden Themes und ist rot, wenn der Dunkelmodus schlechter ist als der helle (nicht gegen feste Zahlen, sondern gegeneinander) und wenn eine helle Fläche ohne dunkle Schrift übrigbleibt; `hover.spec.ts` fährt dasselbe mit dem Zeiger ab; `umschalten.spec.ts` prüft den Schalter selbst samt Systemvorgabe. **Im Dunkeln geht ein Hover nach OBEN** — im Hellen wird er dunkler, dieselbe Farbe für beide macht ihn unsichtbar. **Deckendes Amber ist keine Tönung, sondern der gefüllte Akzent** (`bg-amber-400/500`): die Fläche bleibt in beiden Themes derselbe helle Fleck, also muss die Schrift darauf dunkel bleiben — der Shim deutete `text-navy-900` nach oben um und machte weiß auf Amber (1,8:1) aus dem auffälligsten Element der Seite. Eine Regel im Amber-Block hält die Tinte dort fest; wer eine neue amberfarbene Fläche baut, prüft sie im Dunkeln. **Der Kontrast-Wächter sieht nicht alles:** er misst CSS-Flächen, und was in einem SVG darunterliegt (Spielfeld, Vorschaubild) zählt für ihn nicht als Fläche — eine navy Vorschau auf navy Seite fällt ihm nicht auf, dem Auge schon. Für SVG-Text nimmt er die **oberste** gefüllte Form unter dem Textmittelpunkt; die erste zu nehmen hieß, das Feld zu messen statt der Scheibe darauf.
- **Die Analyse-/Statistik-UI ist dunkel GEBAUT** (ANALYSE-Seite, TrendChart/SeasonBreakdown, Box Scores: Navy-Hintergrund, Cream-Karten, Cream-Linie) — und bleibt das in **beiden** Themes. Das ist Gestaltung der Seite, nicht das Theme. Nicht ins Helle umbauen. Rot (`softball-red`) bleibt NEGATIVEN Signalen vorbehalten (Niederlage, Stranding), positive Zahlen (Hits) in warmem Amber (`amber-400`) — Rot nie für positive Werte.
- **Der Reiter „Einsätze" gehört dem Trainer** (`analysis/statsView.ts`,
  `sichtbareStatsView`): die Tabelle stellt den ganzen Kader nebeneinander — wer stand wie oft
  auf welcher Position. Derselbe Unterschied wie bei den Trainingszahlen: **die eigene Zahl ist
  eine Auskunft, dieselbe Zahl neben der des Nebenmanns ist ein Anspruch.** Seinen eigenen
  Einsatz sieht jeder im Profil (`/players/:id`, „Einsatz und Verfügbarkeit"), dort ohne
  Rangliste daneben. Der Reiter verschwindet **und** `?view=games` fällt auf Schlagen zurück —
  ein weggelassener Reiter allein wäre eine Attrappe, die URL steht jedem offen. **Das ist
  Verstecken, kein Verbot:** `/seasons/{id}/stats` bleibt `isAuthenticated()` und filtert nur
  nach der Aufstellungs-Lesegrenze, und gezählt werden ohnehin **vergangene** Spieltage, die
  für Spieler offen sind (derselbe Stoff steht im Reiter Spiel-Verlauf, der bleibt). Wer daraus
  eine Sperre machen will, fängt am Backend an, nicht an der Reiterzeile.
- **`/` ist die eigene Startseite, `/spielbetrieb` die Werkbank** (getrennt seit dem
  27.10.2026 — zusammen auf einer Seite wurde beides lang). Die Startseite ist ein **Bento**:
  oben der Begruessungsblock (Name, Positions-Chips, vier Kennzahlen, Formkurve als Funke),
  darunter Kacheln in verschiedenen Groessen — Spieltag und Training teilen sich eine Reihe,
  das Jahresband bekommt die Breite seiner zwoelf Saeulen, der Zaehler eine flache Zeile.
  **Jede Kachel traegt ihre Antwort im Klartext**, nichts ist zugeklappt: vier gleiche
  Klappzeilen sahen monoton aus und versteckten Auskunft, die ohnehin Platz hat. Die beiden
  Termin-Kacheln sind selbst der Link (ganze Flaeche statt einer Wortzeile darunter).
  Gemessen (volle Daten, ohne das Admin-Banner) passt alles ohne Scrollen ab **412x780**;
  bei 393x760 fehlen rund 20, bei 360x740 rund 40 Pixel — das ist die Grenze, keine
  Zusicherung. `/spielbetrieb` traegt weiter die Rollenweiche
  (`Startseite` → `Dashboard` oder `PlayerDashboard`). Die Termine kommen aus `useTermine`
  (Spieltage + Trainings in einer Liste, EINMAL geladen); **`GET /api/trainings` ist bewusst
  fuer jeden Angemeldeten offen** und streicht Spielern die Teilnehmerzahl heraus — WANN
  trainiert wird, darf jeder wissen, WER da war, bleibt bei den Trainern. Der Waechter in
  `PlayerDashboard.test.tsx` prueft deshalb nicht auf das Wort „Training", sondern auf jede
  Zahl zur Beteiligung. **Die EIGENE Anwesenheit sieht man seit dem 27.10.2026** (ausdrueckliche
  Entscheidung des Betreibers): das Jahresband faerbt den Trainings-Balken je Monat soweit aus,
  wie man da war (`GET /api/players/{id}/training-months?year=`), und die Legende zaehlt es
  zusammen. Fremde Zahlen bleiben zu — der Endpunkt antwortet dort mit **403**, und
  `/usage` nullt die Trainingsfelder weiter
  (`CurrentUser.darfTrainingszahlenSehenVon`: Trainer immer, sonst nur bei sich selbst).
  **Was dadurch NICHT sichtbar wird, ist die gewichtete Quote der Auto-Aufstellung** — die
  `TrainingParticipationCalculator` rechnet ohne Termine mit eingeschraenktem Teilnehmerkreis
  und bleibt bei den Trainern. Der Unterschied ist der ganze Punkt: eine Zaehlung ueber sich
  selbst ist Auskunft, eine Quote im Vergleich ist ein Anspruch. `SpielerLeserechteIntegrationTest`
  haelt beides fest. Dieselbe Antwort traegt `verpasstSeitdem` — wie viele Termine seit dem
  letzten Mal gelaufen sind, **zu denen der ganze Kader geladen war** (`openToAll`, nicht
  abgesagt, nicht in der Zukunft, und der besuchte Termin zaehlt nicht gegen einen). Ab **10**
  fragt die Trainings-Kachel nach: „Lange nicht da gewesen. Komm doch wieder vorbei." — **ohne
  Zahl und ohne Datum**, denn „seit 11 Terminen" waere Buchhaltung ueber einen Menschen, und
  anstelle der Zeile „Danach …", weil wer weg war einen Grund fuer den naechsten Termin braucht
  und keinen Ausblick auf den uebernaechsten. `null` heisst **noch nie da gewesen** und
  schweigt: „lange nicht gesehen" ist die falsche Anrede fuer einen, den es noch nie gab. Die
  Schwelle ist bewusst hoch (rund fuenf Wochen) — ein Hinweis ueber Anwesenheit, der zu Unrecht
  kommt, ist ein Vorwurf. `PlayerProfileIntegrationTest` pinnt die vier Faelle, die NICHT
  zaehlen. **Vorgabe des Zeitraums ist das laufende JAHR**, eine Saison daraus ist
  **waehlbar** (`bereich.ts` + `useMeineZahlen`: Jahr → `/api/years/{jahr}/batting-stats`
  + `/stats`, Saison → `/api/seasons/{id}/…`; der Verlauf kommt einmal ganz und wird auf
  `p.year` bzw. `p.seasonId` zugeschnitten). Ein Jahr traegt oft mehrere Saisons
  nebeneinander (Liga, Trainingsspiele, Turnier), und keine davon ist „die" Saison: die
  Seite suchte sich frueher selbst eine aus (die des naechstgelegenen Spieltags) und zeigte
  dann stillschweigend die Bilanz einer Nebensaison mit einem Spiel darin — unter einer
  Kachel, die „Dein Jahr 2026" ueberschrieb. **Ein Zeitraum, den die Seite waehlt, ist eine
  Falle; einer, den der Mensch waehlt, ist eine Auskunft** — deshalb steht die Auswahl
  sichtbar neben den Zahlen (nativer Pillen-Select wie im Profil, nur hell gezeichnet; bei
  hoechstens einer Saison im Jahr steht dort schlicht die Jahreszahl). Die Wahl liegt im
  `localStorage` (`startseite-bereich`) und **faellt auf das Jahr zurueck**, sobald die
  gemerkte Saison nicht mehr zum laufenden Jahr gehoert. Die Kachel „Dein Jahr" bleibt
  davon unberuehrt — sie zeigt Termine, keine Schlagzahlen.
  Mockdaten zum Ansehen: `node scripts/seed-startseite.mjs`.
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
- **Zwei Passwörter:** `APP_AUTH_PASSWORD` gehört dem Superadmin, `APP_PLAYER_PASSWORD` ist das an die Spieler verteilte. Sind sie gleich, kann sich jeder, der das verteilte kennt, unter **jedem** Benutzernamen anmelden, auch als Superadmin — der Benutzername ist der Vorname. `VerteiltesPasswort` **warnte** deswegen früher nicht, sondern verweigerte den Start; seit dem 26.10.2026 warnt es nur noch (ausdrückliche Entscheidung des Betreibers: er vertraut dem Team und ändert sein eigenes Passwort nach dem Deploy in der Oberfläche, womit `APP_AUTH_PASSWORD` für die Anmeldung bedeutungslos wird). **Nicht wieder zum harten Fehler machen, ohne ihn zu fragen.** Ein *leeres* `APP_PLAYER_PASSWORD` bleibt ein harter Fehler — das ist keine Entscheidung, sondern unfertige Konfiguration.
- **Default-Deny:** jede Klasse in `adapter/in/web/` trägt exakt `@PreAuthorize("hasRole('ADMIN')")`, Ausnahmen sind `CalendarController` (`permitAll()`), `MeController`/`AuthController` (`isAuthenticated()`) und `AuditController` (`SUPERADMIN`). **Drei Wächter-Tests erzwingen das** — `SecurityCoverageTest`, `MethodSecurityCoverageTest`, `CurrentUserArchitectureTest`. Ein neuer Controller ohne Regel lässt die Suite scheitern.
- **Die Spieleransicht des Superadmins** (`shared/security/SpielerSichtFilter`,
  `hooks/useSpielermodus.ts`): ein Schalter im Konto-Menü lässt den Superadmin die App sehen,
  wie ein Spieler sie sieht — zum Testen, ohne zweites Konto und ohne Ab- und Anmelden.
  **Im Backend, nicht nur in der Oberfläche:** die Lesegrenze sitzt hier
  (`AufstellungSichtbarkeit`), ein Schalter, der bloß die Oberfläche umstellt, zeigte die
  Spielerkarten mit **Trainerdaten** — ein gesperrter Spieltag wäre voll statt leer, und der
  Test löge genau dort, wo man hinsieht. Der Filter ersetzt die `Authentication` durch
  dieselbe mit kleineren Rechten; das greift, **weil alles Entscheidende den SecurityContext
  liest** (`@PreAuthorize`, `AufstellungSichtbarkeit.darfSehen`, `ScoringPermission`,
  `CurrentUser.darfTrainingszahlenSehen`) — `CurrentUser.istGenauRolle` liest die Datenbank und
  hat **keinen Aufrufer**; wer eine neue Entscheidung baut, nimmt den SecurityContext.
  **Die Regel ist `effektiv = min(echt, gewünscht)`** — der Kopf `X-Rolle-Ansicht` kann Rechte
  nur wegnehmen, nie geben, und wird nur von einem Konto mit der echten Rolle `SUPERADMIN`
  angenommen. **An `app_user.role` wird nichts geschrieben:** der Modus lebt im `localStorage`
  und hängt je Anfrage am Kopf, den `getAuthHeaders()` setzt (die eine Stelle, durch die alle
  drei Aufrufwege gehen). Abmelden, anderes Gerät, Neustart — überall wieder Superadmin;
  aussperren kann man sich nicht, weil es serverseitig nichts zu entsperren gibt.
  **Beim Umschalten wird der API-Cache geleert und neu geladen**: der Cache-Schlüssel ist nur
  die URL (siehe `apiCaching.ts`), und ein Moduswechsel ist kein An-/Abmelden — ohne das
  Leeren käme bei schlechtem Netz die gespeicherte Antwort des Trainers. Neu geladen wird,
  weil der Zustand sonst in einem Dutzend eigener Hooks aus dem anderen Blick stehen bliebe.
  `useRolle` überlagert die Rolle für die ganze Oberfläche (19 Dateien hängen daran) und ist
  im Modus **auch im Unbekannt-Fall** Spieler, der sonst großzügig ist. `SpielerSichtIntegrationTest`
  hält fest, was der Kopf NICHT kann. **Nicht gebaut und nicht gewollt:** sich als eine ANDERE
  Person ausgeben.
  **In der Oberfläche nie `me.role` lesen, immer `useRolle`.** `/api/me` meldet die Rolle aus
  `app_user` und weiß vom Modus nichts — der hängt je Anfrage am Kopf, nicht am Konto, und
  `MeController` liest `CurrentUser.get()`, also die Datenbank. `Startseite.tsx` entschied so
  und zeigte im Modus die **Trainer-Werkbank**, gefüllt mit den beschnittenen Daten eines
  Spielers: kein „Bin ich dabei", keine Aufstellungsansicht, also genau das, was der Modus
  prüfen soll. Die Weiche fragt seitdem nach `istAdmin` und nicht nach `=== 'PLAYER'` — wer
  nach Spieler fragt, schickt jede künftige Rolle an die Werkbank. Dieselbe Falle saß im
  Rückweg des Zählers (`CounterPage`). `Startseite.test.tsx` pinnt den Fall.
- **Die Historie blättert nicht, sie deckelt** (`AuditService.HOECHSTENS`, 5.000 Rohzeilen):
  `GET /api/audit` hat bewusst **kein** `page`/`size`. Was der Endpunkt liefert, sind nicht
  Zeilen, sondern **Spannen**, die `AuditSummarizer` aus aufeinanderfolgenden Ereignissen baut —
  ein `LIMIT` mitten im Ergebnis schnitte eine Sitzung auf, und Seite 2 begänne mit einer Spanne,
  die Seite 1 halb erzählt hat. Stattdessen holt der Dienst **eine Zeile mehr**, als er zeigt,
  und die Antwort sagt selbst, ob etwas fehlt (`abgeschnitten`, `bisZurueck`); die Oberfläche
  schreibt es hin. Deshalb ist die Antwort ein **Objekt und keine blanke Liste** — eine Liste
  kann nicht sagen, dass sie unvollständig ist, und eine Historie, die unbemerkt abbricht, ist
  schlimmer als eine, die fehlt. Nötig ist das nur für den Aufruf **ohne** Zeitraum (`from` ist
  `required = false`): im Normalbetrieb wächst nichts unbegrenzt, weil nur **schreibende**
  Zugriffe protokolliert werden (`AuditFilter.shouldNotFilter`), ein nächtlicher Lauf alles
  über zwölf Monate löscht und `idx_audit_event_occurred_at` (V71) die Kosten ans Ergebnis
  bindet statt an die Tabellengröße. Wer die Aufbewahrung verlängert, nimmt die erste dieser
  drei Stützen weg.
- **`CurrentUser` ist `@RequestScope`** und funktioniert nur innerhalb einer HTTP-Anfrage. Aus `@Scheduled`-Läufen wirft er; der Architekturtest fängt das.
- Local: HTTP Basic, Passwörter aus `APP_AUTH_PASSWORD` und `APP_PLAYER_PASSWORD`. Der Bootstrap legt auf leerer Datenbank genau einen Superadmin an (Benutzername aus `app.auth.bootstrap-player`, Vorgabe `Hung`, klein geschrieben).
- Zwei Stellen sind bewusst offen: backendseitig `/api/calendar.ics` (`permitAll()` in `SecurityConfig`), frontendseitig die Route `/counter` (einzige Route ohne `RequireAuth` in `App.tsx`). **Ohne Anmeldung ruft `/counter` kein `/api` auf** und braucht das Backend-Loch nicht; angemeldet läuft dort wie überall der `/api/me`-Abruf des `AuthProvider`. Alles andere unter `/api/**` ist authentifiziert und jede andere Route liegt hinter `RequireAuth`.
- **Das freie Feld** (`/orga/playmaker/frei`) hält sein Offline-Versprechen weiter, aber die E2E misst es jetzt anders: der Test lässt genau `/api/me` zu (der `AuthProvider` läuft app-weit) und bleibt für alles andere unter `/api` streng. Dazu prüft ein zweiter Test die eigentliche Zusicherung — die Seite funktioniert, **wenn `/api/me` scheitert**. Ein routenabhängiger Sonderweg im Provider wurde bewusst nicht gebaut.
- Prod env vars on the VPS in `/opt/softball/docker-compose.yml`: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `APP_AUTH_PASSWORD`, **`APP_PLAYER_PASSWORD`** (fehlt sie ganz, startet prod nicht — Absicht; gleich wie `APP_AUTH_PASSWORD` ist erlaubt und erzeugt nur eine Warnung), `GEMINI_API_KEY`, optionally `AI_ENABLED=true` + `GROQ_API_KEY` for Spring AI features.
- Push to `master` triggers GitHub Action → SSH → `/opt/softball/deploy.sh` → `git pull` → `docker build` → `docker compose up -d backend`. The Dockerfile builds frontend + backend into a single Spring Boot JAR (frontend served as static resources via `SpaForwardingConfig`).

## Known environment gotchas

- If file watchers complain: `sudo sysctl fs.inotify.max_user_instances=512`.
- Maven build *must* use `-s .mvn/local-settings.xml` — don't touch `~/.m2/settings.xml`.
- Testcontainers needs a running Docker daemon for backend tests.
