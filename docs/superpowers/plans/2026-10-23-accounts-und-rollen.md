# Accounts, Rollen und Historie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jedem aktiven Spieler einen eigenen Zugang geben, drei Rollen mit harter Grenze durchsetzen, und dem Superadmin zeigen, wer wann da war und was geändert wurde.

**Architecture:** Onion wie der Rest — `AppUser` und `AuditEvent` als Domain-Models mit Port, Entity, Mapper und Adapter. Spring Security bleibt HTTP Basic, bekommt aber einen DB-gestützten `UserDetailsService` und eine Rollenhierarchie. Autorisierung läuft über **Methodensicherheit mit Default-Deny auf Klassenebene**, nicht über Pfadmuster: `GameController` und `ScoringController` teilen sich `/api/games`, und fünf Controller hängen ohne eigenes Präfix direkt unter `/api`.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Security, Flyway, PostgreSQL 17, Testcontainers, React 19, TypeScript, React Router DOM 7, Tailwind v4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-23-accounts-und-rollen-design.md`

**Setzt voraus:** `docs/superpowers/plans/2026-10-23-navigationsumbau.md` ist durch — dieser Plan hängt Accounts und Historie in eine Leiste, die vorher Platz bekommen hat.

## Global Constraints

- Deutsche Oberfläche und deutsche Fehlermeldungen. Domain-Code englisch (`Role`, `AppUser`) wie `Position`, `Gender`, `PositionSlot`.
- Dark-Only. `softball-red` nur für negative Signale.
- Tailwind v4 ohne Klammer-Syntax. Trefferflächen mindestens **44 × 44 px**.
- Onion-Regel: `domain` kennt weder Spring noch JPA noch DTOs. Schichtverletzung = Abbruch.
- Schemaänderungen **nur** als neue `V{n}__*.sql`; `ddl-auto=validate` bleibt.
- **Migrationen legen keine Accounts und keine personenbezogenen Daten an** — wie bei V65.
- Zwei getrennte Passwörter: `app.auth.password` (`APP_AUTH_PASSWORD`, Superadmin) und `app.auth.player-password` (`APP_PLAYER_PASSWORD`, verteilt). Niemals zusammenlegen.
- Validierung in Domain- oder Application-Services. `BusinessValidationException` → 400, `ResourceNotFoundException` → 404.
- DTOs sind Java-Records in `adapter/dto/` mit Bean-Validation auf den Request-Records.
- SLF4J auf INFO für Zustandsänderungen, WARN für behandelte Ausnahmen. Kein Logging in trivialen Gettern.
- Keine `Co-Authored-By`-Zeilen. Gitmoji-Präfix.
- Vor jedem Commit: `cd frontend && npm run build` und `cd backend && ./mvnw test -s .mvn/local-settings.xml`.
- Nächste freie Migrationsnummer ist **V70** (höchste vorhandene: V69).

## Review Focus

Fünf Dinge, die die Spec voraussetzt, aber kein Task-Test von allein prüft:

1. **Zwei Leute legen gleichzeitig denselben Benutzernamen an.** Die Prüfung im Service sieht beide als frei, der `UNIQUE`-Index lässt einen durch. Der andere darf keinen 500 bekommen, sondern dieselbe deutsche 400-Meldung. Test in Task 7.
2. **Der Spieler des letzten Superadmins wird gelöscht.** `ON DELETE CASCADE` nimmt den
   Account lautlos mit; der nächste Start legt über den Bootstrap einen neuen Superadmin
   mit dem Standardpasswort an. Aus einem Versehen wird ein offener Zugang. Test in Task 7.
3. **Der letzte Superadmin degradiert oder löscht sich selbst.** Danach kann niemand mehr Rollen vergeben — die Installation ist tot und nur noch über die Datenbank zu retten. Test in Task 7.
4. **Ein abgemeldeter Browser mit altem `localStorage`.** Am Deploy-Tag trägt jeder Tab `admin:…`. Ohne 401-Abfang sieht der Nutzer nur Fehler-Toasts und findet nicht zur Anmeldemaske zurück. Test in Task 9.
5. **Ein Spieler ruft einen Schreib-Endpunkt direkt auf**, vorbei an der Oberfläche. Das Backend muss ablehnen, auch wo die Navigation den Weg gar nicht anbietet. Test in Task 3.
6. **Ein Spieler liest sein eigenes Profil.** Die Trainingszahlen müssen auch dort fehlen — wer seine eigene Quote kennt, gibt sie weiter, und genau der Vergleich soll nicht entstehen. Test in Task 4.

---

## File Structure

| Bereich | Dateien | Task |
|---|---|---|
| Migrationen | `V70__app_user.sql`, `V71__audit_event.sql` | 1, 8 |
| Domain | `model/AppUser`, `model/Role`, `model/AuditEvent`, `model/AuditKind`, `port/out/AppUserRepository`, `port/out/AuditEventRepository` | 1, 8 |
| Persistence | `entity/AppUserEntity`, `mapper/AppUserMapper`, `repository/SpringAppUserRepository`, `adapter/AppUserRepositoryAdapter` (+ dasselbe für Audit) | 1, 8 |
| Application | `UserAccountService`, `AccountSelfService`, `AuditService`, `AccountBootstrap` | 1, 6, 7, 8 |
| Security | `shared/config/SecurityConfig` (umgebaut), `shared/security/AppUserDetailsService`, `CurrentUser`, `ScoringPermission`, `AuditFilter`, `LastSeenFilter` | 2, 5, 6, 8 |
| Web | `MeController`, `AuthController`, `UserAccountController`, `AuditController` | 6, 7, 8 |
| Frontend Auth | `api/client.ts`, `components/auth/AuthProvider.tsx`, `LoginPage.tsx`, `RequireRole.tsx` | 9, 10 |
| Frontend Seiten | `components/dashboard/PlayerDashboard.tsx`, `components/account/KontoPage.tsx`, `components/orga/AccountsPage.tsx`, `components/orga/HistoriePage.tsx` | 11, 12 |
| Frontend Navigation | `components/layout/Layout.tsx` (Rollenfilter + Initialen-Menü), `routes.tsx` | 10 |

---

### Task 1: `app_user` — Tabelle, Domain, Bootstrap

**Files:**
- Create: `backend/src/main/resources/db/migration/V70__app_user.sql`
- Create: `domain/model/AppUser.java`, `domain/model/Role.java`, `domain/port/out/AppUserRepository.java`
- Create: `adapter/out/persistence/entity/AppUserEntity.java`, `mapper/AppUserMapper.java`, `repository/SpringAppUserRepository.java`, `adapter/AppUserRepositoryAdapter.java`
- Create: `application/AccountBootstrap.java`
- Test: `backend/src/test/java/com/softball/integration/AccountBootstrapIntegrationTest.java`

**Interfaces:**
- Produces:
  - `Role` — Enum `SUPERADMIN`, `ADMIN`, `PLAYER`
  - `AppUser` — POJO mit `id, playerId, username, passwordHash, role, mayScore, locked, passwordChanged, createdAt, lastLoginAt, lastSeenAt`
  - `AppUserRepository` — `Optional<AppUser> findByUsername(String)`, `Optional<AppUser> findByPlayerId(Long)`, `List<AppUser> findAll()`, `AppUser save(AppUser)`, `void deleteById(Long)`, `long countByRole(Role)`, `boolean existsByUsername(String)`

- [ ] **Step 1: Den Bootstrap-Test schreiben**

```java
@Test
void legtAufLeererDatenbankGenauEinenSuperadminAn() {
    assertThat(appUserRepository.findAll()).hasSize(1);
    AppUser hung = appUserRepository.findByUsername("hung").orElseThrow();
    assertThat(hung.getRole()).isEqualTo(Role.SUPERADMIN);
    assertThat(hung.getPlayerId()).isNotNull();
    assertThat(hung.isPasswordChanged()).isFalse();
}

@Test
void legtNichtsAnWennSchonEinAccountExistiert() { /* zweiter Lauf des Runners ändert nichts */ }
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=AccountBootstrapIntegrationTest`
Expected: FAIL — `Role` existiert nicht.

- [ ] **Step 3: Migration schreiben**

`V70__app_user.sql` legt `app_user` nach der Tabelle in der Spec an: `player_id BIGINT NOT NULL UNIQUE REFERENCES player(id) ON DELETE CASCADE`, `username TEXT NOT NULL`, `password_hash TEXT NOT NULL`, `role TEXT NOT NULL`, `may_score BOOLEAN NOT NULL DEFAULT FALSE`, `locked BOOLEAN NOT NULL DEFAULT FALSE`, `password_changed BOOLEAN NOT NULL DEFAULT FALSE`, `created_at TIMESTAMPTZ NOT NULL`, `last_login_at TIMESTAMPTZ`, `last_seen_at TIMESTAMPTZ`. Dazu `CREATE UNIQUE INDEX uq_app_user_username ON app_user (lower(username));`.

Den genauen Namen der Spielertabelle vorher aus einer bestehenden Migration ablesen — nicht raten.

Keine `INSERT`-Anweisung in dieser Datei.

- [ ] **Step 4: Domain, Port, Entity, Mapper, Adapter anlegen**

Nach dem Muster eines bestehenden Paares, etwa `PlayerEntity`/`PlayerMapper`/`PlayerRepositoryAdapter`. `AppUser` kennt kein Spring und kein JPA.

- [ ] **Step 5: `AccountBootstrap` schreiben**

`ApplicationRunner`. Ist `appUserRepository.findAll()` leer: den Spieler mit dem Namen aus `${app.auth.bootstrap-player:Hung}` suchen, bei Nichtfinden anlegen, und für ihn einen `AppUser` mit Benutzername `name.toLowerCase()`, Rolle `SUPERADMIN` und `passwordEncoder.encode(${app.auth.password})` speichern. Sonst nichts tun und das auf INFO loggen.

Das Anlegen des fehlenden Spielers ist Absicht: frische Datenbanken in Entwicklung, Testcontainers und E2E wären sonst ohne Zugang.

- [ ] **Step 6: Tests laufen lassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=AccountBootstrapIntegrationTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V70__app_user.sql backend/src/main/java backend/src/test/java
git commit -m "✨ Accounts: Tabelle, Domain und Bootstrap-Superadmin"
```

---

### Task 2: Anmeldung gegen die Datenbank

**Files:**
- Create: `shared/security/AppUserDetailsService.java`
- Modify: `shared/config/SecurityConfig.java` (`userDetailsService()`-Bean ersetzen, `RoleHierarchy` ergänzen, `@EnableMethodSecurity`)
- Modify: 28 Testdateien mit `@WithMockUser`
- Test: `backend/src/test/java/com/softball/integration/AuthenticationIntegrationTest.java`

**Interfaces:**
- Consumes: `AppUserRepository`, `Role` (Task 1)
- Produces: `AppUserDetailsService implements UserDetailsService` — lädt über `findByUsername`, setzt `accountNonLocked = !locked`, Authority `ROLE_` + `role.name()`. Rollenhierarchie `SUPERADMIN > ADMIN > PLAYER` als Bean.

- [ ] **Step 1: Die Tests schreiben**

```java
@Test void meldetDenBootstrapSuperadminAn() { /* GET /api/players mit hung + APP_AUTH_PASSWORD → 200 */ }
@Test void lehntDenAltenBenutzernamenAdminAb() { /* … mit admin → 401 */ }
@Test void lehntEinenGesperrtenAccountAb() { /* locked=true → 401 */ }
@Test void vergleichtDenBenutzernamenOhneGrossKleinschreibung() { /* "Hung" → 200 */ }
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=AuthenticationIntegrationTest`
Expected: FAIL — `admin` kommt noch durch, `hung` nicht.

- [ ] **Step 3: `AppUserDetailsService` schreiben und `SecurityConfig` umbauen**

`InMemoryUserDetailsManager` entfernen. `@EnableMethodSecurity` auf die Konfiguration. `RoleHierarchy`-Bean mit `SUPERADMIN > ADMIN > PLAYER`. Die `authorizeHttpRequests`-Kette bleibt wie sie ist — sie ist ab jetzt die grobe zweite Linie, die feine sitzt an den Controllern.

- [ ] **Step 4: Die 28 Testdateien umstellen**

Alle Vorkommen von `@WithMockUser` ohne Argumente auf `@WithMockUser(roles = "SUPERADMIN")` bringen. Es gibt **kein** `httpBasic` in den Tests — die Umstellung ist ein Ersetzen über alle Dateien.

Run: `grep -rl '@WithMockUser$' backend/src/test/java | wc -l`
Expected: 0 nach der Änderung.

- [ ] **Step 5: Die E2E-Zugangsdaten umstellen**

`frontend/e2e/helpers/auth.ts:3` — `CREDENTIALS` auf `hung:Deadsox123!`.
`frontend/src/routes.test.tsx:68`, `CounterPage.test.tsx:26`, `AuthProvider.test.tsx` — `btoa('admin:…')` auf `btoa('hung:…')`.

- [ ] **Step 6: Alles laufen lassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS, alle 28 Dateien grün.

- [ ] **Step 7: Commit**

```bash
git add backend/src frontend/src frontend/e2e
git commit -m "🔧 Anmeldung gegen die Datenbank statt gegen eine Konstante"
```

---

### Task 3: Default-Deny und der Test, der ihn erzwingt

**Files:**
- Modify: alle 24 Klassen in `adapter/in/web/`
- Test: `backend/src/test/java/com/softball/shared/config/SecurityCoverageTest.java`
- Test: `backend/src/test/java/com/softball/integration/RollenIntegrationTest.java`

**Interfaces:**
- Consumes: `RoleHierarchy` (Task 2)
- Produces: jede Controller-Klasse trägt eine Klassen-`@PreAuthorize`.

- [ ] **Step 1: Den Abdeckungstest schreiben**

```java
@Test
void jederControllerHatEineKlassenRegel() {
    var ohneRegel = new Reflections("com.softball.adapter.in.web")
        .getTypesAnnotatedWith(RestController.class).stream()
        .filter(c -> c.getAnnotation(PreAuthorize.class) == null)
        .map(Class::getSimpleName).toList();
    assertThat(ohneRegel).isEmpty();
}
```

Wenn `org.reflections` nicht im Klassenpfad liegt, stattdessen Springs `ClassPathScanningCandidateComponentProvider` benutzen — keine neue Abhängigkeit für einen Test.

- [ ] **Step 2: Den Rollentest schreiben**

```java
@Test @WithMockUser(roles = "PLAYER")
void spielerDarfKeinLineupSchreiben() { /* PUT /api/games/1/lineup → 403 */ }

@Test @WithMockUser(roles = "PLAYER")
void spielerDarfKeinenSpielerAnlegen() { /* POST /api/players → 403 */ }

@Test @WithMockUser(roles = "PLAYER")
void spielerSiehtDenSpielbogenNicht() { /* GET /api/spielbogen → 403 */ }

@Test @WithMockUser(roles = "ADMIN")
void adminDarfKeineRolleVergeben() { /* PUT /api/users/1/role → 403 */ }
```

Der letzte Fall läuft erst nach Task 7 grün; er wird hier geschrieben und dort scharf.

- [ ] **Step 3: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest='SecurityCoverageTest,RollenIntegrationTest'`
Expected: FAIL — 24 Controller ohne Regel, Spieler kommen überall durch.

- [ ] **Step 4: Klassenannotationen setzen**

Jede Klasse in `adapter/in/web/` bekommt `@PreAuthorize("hasRole('ADMIN')")`. Zwei Ausnahmen:
- `CalendarController` bekommt `@PreAuthorize("permitAll()")` — `/api/calendar.ics` ist bewusst offen, und Methodensicherheit würde anonyme Aufrufe sonst ablehnen, egal was in `SecurityConfig` steht.
- Controller, deren Lese-Endpunkte Spieler brauchen, behalten die strenge Klassenregel; die einzelnen Methoden öffnet Task 4.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: `SecurityCoverageTest` PASS, die ersten drei Rollentests PASS, der vierte noch rot.

- [ ] **Step 6: Commit**

```bash
git add backend/src
git commit -m "🔒 Default-Deny an jedem Controller, abgesichert durch SecurityCoverageTest"
```

---

### Task 4: Was Spieler lesen dürfen — und was sie nie sehen

**Files:**
- Modify: Lese-Methoden in `PlayerController`, `SeasonController`, `GameController`, `GameDayController`, `LeagueTeamController`, `LeagueResultController`, `BattingStatsController`, `AwardController`, `PlayController`, `PlayCategoryController`, `TrainingController`
- Modify: `adapter/dto/PlayerUsageResponse.java`, `adapter/dto/TrainingResponse.java`
- Modify: `frontend/src/components/players/UsagePanel.tsx`
- Test: `backend/src/test/java/com/softball/integration/SpielerLeserechteIntegrationTest.java`

**Interfaces:**
- Consumes: `CurrentUser` (Task 6) für die Rollenabfrage in den DTO-Fabriken
- Produces: `PlayerUsageResponse` mit `trainingsTotal`/`trainingsAttended` als `Integer` (nullable statt `int`). `TrainingResponse` ohne `attendeeCount` für Spieler.

- [ ] **Step 1: Die Tests schreiben**

```java
@Test @WithMockUser(roles = "PLAYER")
void spielerSiehtKeineTrainingszahlenImFremdenProfil() { /* GET /api/players/2/usage → trainingsTotal == null */ }

@Test @WithMockUser(roles = "PLAYER")
void spielerSiehtKeineTrainingszahlenImEigenenProfil() { /* dasselbe für die eigene id */ }

@Test @WithMockUser(roles = "ADMIN")
void adminSiehtDieTrainingszahlen() { /* trainingsTotal != null */ }

@Test @WithMockUser(roles = "PLAYER")
void spielerSiehtTrainingsterminOhneTeilnehmerzahl() { /* GET /api/trainings → date gesetzt, attendeeCount null */ }

@Test @WithMockUser(roles = "PLAYER")
void spielerKommtNichtAnDieAnwesenheit() { /* GET /api/trainings/1/attendance → 403 */ }
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=SpielerLeserechteIntegrationTest`
Expected: FAIL — Spieler kommen an alles oder an nichts.

- [ ] **Step 3: Lese-Methoden öffnen**

An den Methoden, die Spieler laut Spec lesen dürfen, `@PreAuthorize("isAuthenticated()")`. Die Liste steht in der Spec unter „Was Spieler dürfen". Alles andere bleibt bei der Klassenregel.

**Achtung — hier wird der Wächter aus Task 3 blind.** `SecurityCoverageTest` prüft nur
**Klassen**-Annotationen. Eine Methodenregel überschreibt die Klassenregel; ein
versehentliches `@PreAuthorize("isAuthenticated()")` an der falschen Methode öffnet sie für
jeden Spieler, und der Abdeckungstest bleibt grün. Genau das tut dieser Task
dutzendfach — und zwar absichtlich.

Deshalb gehört in diesen Task ein **zweiter Abdeckungstest auf Methodenebene**: er listet
jede Methode auf, deren Regel von der Klassenregel abweicht, und vergleicht sie gegen eine
im Test gepflegte Erlaubnisliste. Wer künftig eine Methode öffnet, muss sie dort eintragen —
sonst schlägt der Test fehl. Das ist der einzige Weg, die Erlaubnisse sichtbar zu halten,
statt sie über 23 Dateien zu verstreuen.

Für jeden Fund die zweite Leitfrage aus der Spec mitlaufen lassen: steckt eine Trainingszahl darin? Dann nicht öffnen.

- [ ] **Step 4: Die zwei DTOs beschneiden**

`PlayerUsageResponse.from(...)` bekommt einen zweiten Parameter `boolean mitTraining`; bei `false` beide Trainingsfelder `null`. `TrainingResponse.from(...)` entsprechend für `attendeeCount`. Die Aufrufer in den Controllern entscheiden anhand der Rolle.

`int` wird zu `Integer` — die beiden Felder müssen `null` tragen können.

- [ ] **Step 5: `UsagePanel` blendet den Block aus**

Fehlen die Werte, erscheint der Trainingsblock nicht. Die Komponente kennt den Fall schon in anderer Form über `trainingsOutOfScope`; daran anlehnen.

Test in `UsagePanel.test.tsx`: bei `trainingsTotal: null` ist kein Trainingsblock im Dokument.

- [ ] **Step 6: Tests laufen lassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml && cd ../frontend && npx vitest run && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src frontend/src
git commit -m "🔒 Spieler lesen Spielbetrieb und Statistik — Trainingsbeteiligung bleibt verborgen"
```

---

### Task 5: Scorer-Recht

**Files:**
- Create: `shared/security/ScoringPermission.java`
- Modify: `adapter/in/web/ScoringController.java` (alle Schreibmethoden), `adapter/in/web/GameController.java` (fünf Methoden)
- Test: `backend/src/test/java/com/softball/integration/ScorerRechtIntegrationTest.java`

**Interfaces:**
- Consumes: `CurrentUser` (Task 6)
- Produces: Bean unter dem Namen `scoring` mit `boolean darfSchreiben(Authentication)` — liest `mayScore` des angemeldeten Accounts.

- [ ] **Step 1: Die Tests schreiben**

```java
@Test void spielerOhneScorerRechtDarfKeinenAtBatSchreiben() { /* POST …/atbats → 403 */ }
@Test void spielerMitScorerRechtDarfEinenAtBatSchreiben() { /* → 2xx */ }
@Test void spielerOhneScorerRechtDarfDenAtBatLesen() { /* GET …/atbats → 200 */ }

@ParameterizedTest
@ValueSource(strings = {"score", "batting-side", "substitutions", "end", "reopen"})
void spielerMitScorerRechtKommtAnDieFuenfGameEndpunkte(String endpunkt) { /* → kein 403 */ }

@Test void spielerMitScorerRechtDarfTrotzdemKeinLineupSchreiben() { /* PUT …/lineup → 403 */ }
@Test void adminDarfAllesWieBisher() { /* dieselben Aufrufe → kein 403 */ }
```

Der vorletzte Test ist der wichtige: `PUT /api/games/{id}/lineup` liegt in derselben Klasse wie die fünf und muss admin-only bleiben.

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=ScorerRechtIntegrationTest`
Expected: FAIL.

- [ ] **Step 3: `ScoringPermission` schreiben und die Annotationen setzen**

An jede Schreibmethode in `ScoringController` und an die fünf in `GameController`:
`@PreAuthorize("hasRole('ADMIN') or @scoring.darfSchreiben(authentication)")`.

Die fünf: `PUT /{id}/score`, `PUT /{id}/batting-side`, `POST /{id}/substitutions`, `POST /{id}/end`, `POST /{id}/reopen`.

Lesend offen für jeden Angemeldeten: `getAtBats`, `getScoreboard`, `getStealingEvents`, `GET /{id}/lineup`, `GET /{id}/substitutions` — das ist die Grundlage fürs Zuschauen in Projekt 2.

**Für Admin und Superadmin ändert sich nichts.** Die Regel fügt hinzu, sie nimmt nicht weg. Wenn ein bestehender Test rot wird, ist die Regel falsch, nicht der Test.

- [ ] **Step 4: Tests laufen lassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS, auch alle Scoring-Tests.

- [ ] **Step 5: Die E2E-Suite laufen lassen**

Erst ein laufendes Backend auf Port 8080 beenden, sonst prüft Playwright ein veraltetes.

Run: `cd frontend && npm run test:e2e`
Expected: PASS. Diese Suite ist das Sicherheitsnetz des Scoring-Pfads — ein Fehlschlag hier stoppt den Task.

- [ ] **Step 6: Commit**

```bash
git add backend/src
git commit -m "✨ Scorer-Recht: Spieler dürfen scoren, wenn sie es dürfen"
```

---

### Task 6: `/api/auth/login`, `/api/me`, „zuletzt gesehen"

**Files:**
- Create: `shared/security/CurrentUser.java`, `shared/config/LastSeenFilter.java`
- Create: `adapter/in/web/AuthController.java`, `adapter/in/web/MeController.java`, `adapter/dto/MeResponse.java`
- Test: `backend/src/test/java/com/softball/integration/MeIntegrationTest.java`

**Interfaces:**
- Produces:
  - `CurrentUser` — `AppUser get()`, `Optional<AppUser> find()`, `boolean hatRolle(Role)`
  - `MeResponse(String username, Role role, Long playerId, String playerName, boolean mayScore, boolean passwordChanged)`
  - `POST /api/auth/login` → `MeResponse`, setzt `lastLoginAt`
  - `GET /api/me` → `MeResponse`, setzt `lastLoginAt` **nicht**

- [ ] **Step 1: Die Tests schreiben**

```java
@Test void loginSetztLastLoginAt() { /* POST /api/auth/login → lastLoginAt gefüllt */ }
@Test void meSetztLastLoginAtNicht() { /* lastLoginAt bleibt wie es war */ }
@Test void meSetztLastSeenAt() { /* lastSeenAt rückt nach */ }
@Test void lastSeenAtWirdHoechstensAlleFuenfMinutenGeschrieben() { /* zwei Aufrufe direkt hintereinander → ein Schreibvorgang */ }
@Test void meLiefertRolleUndSpieler() { /* role, playerId, playerName gesetzt */ }
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=MeIntegrationTest`
Expected: FAIL — `/api/me` gibt es nicht.

- [ ] **Step 3: `CurrentUser`, die zwei Controller und den Filter schreiben**

Beide Controller tragen `@PreAuthorize("isAuthenticated()")` auf Klassenebene.

`LastSeenFilter` schreibt `lastSeenAt` höchstens alle fünf Minuten je Nutzer. Der Zähler darf im Speicher liegen — nach einem Neustart einmal zu oft zu schreiben ist folgenlos.

- [ ] **Step 4: Tests laufen lassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=MeIntegrationTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src
git commit -m "✨ /api/me und der Anmelde-Handschlag"
```

---

### Task 7: Accounts verwalten

**Files:**
- Create: `application/UserAccountService.java`, `application/AccountSelfService.java`
- Create: `adapter/in/web/UserAccountController.java`, DTOs in `adapter/dto/`
- Modify: `application/PlayerService.java` (`setArchived` sperrt und entsperrt den Account)
- Test: `backend/src/test/java/com/softball/integration/UserAccountIntegrationTest.java`

**Interfaces:**
- Consumes: `AppUserRepository`, `Role`, `CurrentUser`
- Produces: die Endpunkte aus der Spec-Tabelle unter `/api/users` und `/api/me`. `UserAccountService` für fremde Accounts, `AccountSelfService` für den eigenen — getrennt, weil sie verschiedene Berechtigungen tragen.

- [ ] **Step 1: Die Tests schreiben**

```java
@Test void legtEinenAccountFuerEinenSpielerAn() { }
@Test void lehntEinenDoppeltenBenutzernamenAb() { /* 400, deutsche Meldung */ }
@Test void lehntDenDoppeltenNamenAuchBeiAndererGrossschreibungAb() { /* "Hung" vs "hung" */ }
@Test void uebersetztDenIndexfehlerInDieselbeMeldung() { /* Service-Prüfung übersprungen → 400, nicht 500 */ }
@Test void legtKeinenZweitenAccountFuerDenselbenSpielerAn() { }
@Test void massenanlageUeberspringtArchivierteUndMeldetDas() { }
@Test void massenanlageUeberspringtKollidierendeNamenStattSieZuErfinden() { }
@Test void setztDasPasswortAufDasVerteilteZurueck() { /* nicht auf APP_AUTH_PASSWORD */ }
@Test @WithMockUser(roles = "ADMIN") void adminDarfKeineRolleVergeben() { /* 403 */ }
@Test void derLetzteSuperadminKannSichNichtDegradieren() { /* 400 */ }
@Test void derLetzteSuperadminKannSichNichtLoeschen() { /* 400 */ }
@Test void spielerArchivierenSperrtDenAccount() { }
@Test void spielerReaktivierenEntsperrtDenAccount() { }
@Test void spielerLoeschenLoeschtDenAccountMit() { /* ON DELETE CASCADE */ }
@Test void derSpielerDesLetztenSuperadminsKannNichtGeloeschtWerden() { /* 400, deutsche Meldung */ }
@Test void nutzerAendertSeinenEigenenBenutzernamen() { }
@Test void nutzerKannNichtDenBenutzernamenEinesAnderenAendern() { /* 403 */ }
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=UserAccountIntegrationTest`
Expected: FAIL.

- [ ] **Step 3: Die beiden Services und den Controller schreiben**

**Vorsicht beim Speichern — hier liegt eine Falle aus Task 6.** `AppUserRepositoryAdapter.save`
liest die Entity zwar frisch, überschreibt sie dann aber **vollständig** mit dem Stand des
übergebenen Domain-Objekts: `locked`, `role`, `mayScore`, `passwordChanged` und
`passwordHash`. Wer einen `AppUser` lädt, ein Feld ändert und speichert, schreibt damit
alle anderen Felder auf den Stand von vorhin zurück.

In Task 6 wurde das für `lastSeenAt`/`lastLoginAt` durch gezielte Spalten-Updates gelöst
(`touchLastSeen`, `touchLastLogin`). **Dein Task schreibt genau die Felder, die dort
überschrieben würden** — und zwar aus zwei Richtungen gleichzeitig: ein Admin sperrt oder
setzt das Passwort zurück, während der Nutzer selbst seinen Benutzernamen oder sein Passwort
ändert.

Konkreter Schadensfall: Nutzer ändert sein Passwort, Admin sperrt ihn im selben Moment —
je nach Reihenfolge ist die Sperre weg oder das neue Passwort. Keines von beiden schlägt
fehl, es gibt keine Versionsspalte.

Lade, ändere und speichere deshalb **innerhalb einer Transaktion**, oder nimm gezielte
Updates wie Task 6. Schreib einen Test dafür: ein Feld über den einen Weg ändern, ein
anderes über den zweiten, und prüfen, dass **beide** Änderungen überleben.

Benutzernamen immer klein gespeichert, immer `trim()`. Keiner der drei Passwort-setzenden Endpunkte nimmt ein Passwort entgegen — es kommt aus `app.auth.player-password`.

`PUT /{id}/role` und `DELETE /{id}` tragen `@PreAuthorize("hasRole('SUPERADMIN')")` bzw. prüfen den Aussperrschutz im Service.

Den `DataIntegrityViolationException` aus dem `UNIQUE`-Index abfangen und in dieselbe `BusinessValidationException` übersetzen wie die Vorabprüfung.

- [ ] **Step 4: `PlayerService` erweitern — Sperren und Aussperrschutz**

`setArchived` sperrt beim Archivieren den zugehörigen Account und entsperrt beim
Reaktivieren. Die bestehende Bereinigung der Planungs- und Trainings-Referenzen bleibt
unangetastet.

**`delete` bekommt einen zweiten Riegel.** Der Fremdschlüssel `app_user.player_id` trägt
`ON DELETE CASCADE` — das Löschen eines Spielers nimmt seinen Account lautlos mit. Beim
letzten Superadmin ist das ein Loch: die Tabelle steht danach leer, und der nächste Start
legt über `AccountBootstrap` einen neuen Superadmin **mit dem Standardpasswort** an. Aus
einem versehentlichen Löschen wird ein offener Zugang.

`PlayerService.delete` lehnt deshalb mit `BusinessValidationException` und deutscher
Meldung ab, wenn der Spieler den letzten Superadmin trägt. `AppUserRepository` hat die
Mittel schon: `countByRole(Role.SUPERADMIN)` und `findByPlayerId(...)`.

Dieselbe Prüfung gilt für jeden anderen Weg, auf dem ein Spieler verschwinden kann —
`DataImportService` ist der Kandidat, der dabei übersehen wird. Prüfe ihn ausdrücklich.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS, auch der in Task 3 vorgeschriebene Rollentest.

- [ ] **Step 6: Commit**

```bash
git add backend/src
git commit -m "✨ Accounts anlegen, zurücksetzen, sperren — mit Aussperrschutz"
```

---

### Task 8: Historie

**Files:**
- Create: `V71__audit_event.sql`, `domain/model/AuditEvent.java`, `domain/model/AuditKind.java`, `domain/port/out/AuditEventRepository.java`, Entity/Mapper/Adapter
- Create: `application/AuditService.java`, `shared/config/AuditFilter.java`, `shared/config/AuditLabels.java`
- Create: `adapter/in/web/AuditController.java`
- Modify: `shared/config/SchedulingConfig.java` (Aufräumen)
- Test: `backend/src/test/java/com/softball/integration/AuditIntegrationTest.java`

**Interfaces:**
- Produces: `GET /api/audit` und `GET /api/audit/last-seen`, beide `@PreAuthorize("hasRole('SUPERADMIN')")`.

- [ ] **Step 1: Die Tests schreiben**

```java
@Test void schreibtEinenEintragFuerJedenErfolgreichenSchreibvorgang() { }
@Test void schreibtKeinenEintragFuerEinenLesezugriff() { }
@Test void schreibtKeinenEintragWennDerAufrufFehlschlug() { /* 4xx/5xx → nichts */ }
@Test void haeltDenBenutzernamenAuchNachdemDerAccountWegIst() { /* username-Schnappschuss */ }
@Test void fasstAufeinanderfolgendeScoringZeilenZuEinerSpanneZusammen() { /* < 20 min Abstand → eine Spanne mit von/bis */ }
@Test void trenntZweiScoringSpannenMitGrosserLuecke() { }
@Test void uebersetztBekanntePfadeInDeutschenKlartext() { /* PUT …/lineup → "Lineup geändert" */ }
@Test void zeigtUnbekanntePfadeAlsMethodeUndPfad() { /* nie unsichtbar */ }
@Test @WithMockUser(roles = "ADMIN") void adminSiehtDieHistorieNicht() { /* 403 */ }
@Test void raeumtEintraegeAelterAlsZwoelfMonateAuf() { }
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=AuditIntegrationTest`
Expected: FAIL.

- [ ] **Step 3: Migration, Domain und Persistenz anlegen**

`V71__audit_event.sql` nach der Tabelle in der Spec, mit `user_id … ON DELETE SET NULL` und Indizes auf `(occurred_at DESC)` und `(user_id, occurred_at DESC)`.

**Wo deine Migration geprüft wird — das überrascht sonst.** `application-test.properties`
setzt `ddl-auto=create-drop` und `flyway.enabled=false`: die gesamte Backend-Suite baut das
Schema aus den Entities und fährt **keine** Migration. Die einzige Stelle im Repo, die
Flyway laufen lässt und danach `validate` anwendet, ist `AccountBootstrapWiringTest` (per
`@TestPropertySource`). Dein V71 wird dort automatisch mitgeprüft, weil dieser Kontext alle
Migrationen fährt — aber wenn es bricht, schlägt ein Test namens „Wiring" fehl, nicht einer
mit „Audit" im Namen. Rechne damit, und such den Fehler nicht in deinem eigenen Test.

`validate` prüft nur Spalten und Typen. Der `ON DELETE SET NULL` auf `user_id` und die
Indizes werden dadurch **nicht** abgedeckt — dafür brauchst du Verhaltenstests.

- [ ] **Step 4: Filter, Labels und Service schreiben**

`AuditFilter` schreibt bei `POST`, `PUT`, `PATCH`, `DELETE` unter `/api/**` und nur bei 2xx. `AuditLabels` bildet Pfadmuster auf deutschen Klartext ab — **eine** Klasse, nicht verteilte `audit.record(...)`-Aufrufe in neunzehn Services. Was die Tabelle nicht kennt, landet als Methode plus Pfad.

Scoring-Pfade bekommen `kind = SCORING`; die Zusammenfassung passiert beim Lesen im `AuditService`, nicht beim Schreiben.

- [ ] **Step 5: Aufräumen einhängen**

In `SchedulingConfig` einen täglichen Lauf, der Zeilen älter als zwölf Monate löscht.

- [ ] **Step 6: Tests laufen lassen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V71__audit_event.sql backend/src
git commit -m "✨ Historie: wer war da, wer hat was geändert"
```

---

### Task 9: Anmelden mit Benutzernamen, Abmelden, 401

**Files:**
- Modify: `frontend/src/api/client.ts` (`setAuth`, 401-Abfang in `request<T>`)
- Modify: `frontend/src/components/auth/AuthProvider.tsx`, `LoginPage.tsx`
- Test: `frontend/src/components/auth/AuthProvider.test.tsx`, `frontend/src/api/client.test.ts`

**Interfaces:**
- Produces:
  - `setAuth(username: string, password: string)` — ersetzt die einstellige Form
  - `AuthValue` = `{ loggedIn, pruefend, me: MeResponse | null, error, login(username, password), logout() }`

- [ ] **Step 1: Die Tests schreiben**

```tsx
it('schickt den eingegebenen Benutzernamen, nicht den fest verdrahteten', async () => { })
it('zeigt bei 401 die Anmeldemaske und räumt localStorage auf', async () => { })
it('bleibt bei Netzfehler angemeldet', async () => { })   // PWA offline
it('prüft beim Laden gegen /api/me und zeigt solange den Ladezustand', async () => { })
it('meldet ab und löscht die Zugangsdaten', async () => { })
it('lässt den jüngsten Anmeldeversuch gewinnen', async () => { })  // bestehendes Verhalten
```

Für den Clipboard-ähnlichen Fall gilt die Projektregel: `fireEvent` statt `userEvent.setup()`, und `test-setup.ts` wird nicht angefasst.

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx vitest run src/components/auth`
Expected: FAIL.

- [ ] **Step 3: `client.ts` und `AuthProvider` umbauen**

`setAuth` nimmt zwei Argumente. `request<T>` fängt 401 ab: `clearAuth()` und ein Ereignis, auf das der `AuthProvider` hört — kein harter `location.reload()`, sonst geht ein offenes Formular verloren.

`AuthProvider` prüft beim Laden gegen `GET /api/me`. Netzfehler lassen den Nutzer angemeldet; nur 401 meldet ab.

`LoginPage` bekommt ein Benutzername-Feld vor dem Passwortfeld, `autoComplete="username"`.

- [ ] **Step 4: Abmelde-Knopf**

In der Navigation hinter den Initialen (Task 10) und auf `/konto` (Task 12).

- [ ] **Step 5: Tests laufen lassen**

Run: `cd frontend && npx vitest run && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "✨ Anmelden mit Benutzernamen, Abmelden, 401 führt zurück zur Maske"
```

---

### Task 10: Rollen in der Oberfläche

**Files:**
- Create: `frontend/src/components/auth/RequireRole.tsx`
- Create: `frontend/src/components/layout/KontoMenu.tsx`
- Modify: `frontend/src/routes.tsx`, `frontend/src/components/layout/Layout.tsx`
- Test: `frontend/src/routes.test.tsx`, `frontend/src/components/layout/Layout.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` mit `me.role` (Task 9)
- Produces: `<RequireRole mind="ADMIN">…</RequireRole>` — schickt bei zu niedriger Rolle auf `/` zurück. Dazu `<RequireRole scorer>…</RequireRole>` für die Scoring-Route: lässt durch, wer Admin ist **oder** `mayScore` trägt.

- [ ] **Step 1: Die Tests schreiben**

```tsx
it.each(['/players', '/training', '/orga', '/spielbogen', '/orga/trainerabrechnung'])(
  'schickt einen Spieler von %s zurück aufs Dashboard', async (pfad) => { })

it('lässt einen Spieler auf /stats, /kalender und sein Profil', async () => { })

it('zeigt einem Spieler drei Reiter', () => { })
it('zeigt einem Admin fünf Reiter', () => { })

it('zeigt jedem Angemeldeten Mein Profil und Abmelden im Menü', () => { })
it('zeigt einem Spieler keine Verwaltungs-Einträge im Menü', () => { })

it('sperrt die Scoring-Route für einen Spieler ohne Scorer-Recht', async () => { })
it('lässt einen Spieler mit Scorer-Recht auf die Scoring-Route', async () => { })

it('zeigt einem Spieler in der Gegner-Ansicht keine Umbenennen- und Löschen-Knöpfe', () => { })
```

**Nicht nur Routen, auch Knöpfe.** Task 4 öffnet Lesezugriffe und lässt Schreibzugriffe zu.
Manche Seiten zeigen ihre Bearbeiten-Schaltflächen aber unabhängig von der Rolle — bekannt
ist das für die Gegner-Ansicht (`TeamDirectoryPage`, `clubDirectoryShared`): Umbenennen und
Löschen sind für Spieler sichtbar und enden in 403. Geh beim Rollenfilter jede Seite durch,
die ein Spieler sehen darf, und blende dort aus, was er nicht auslösen kann.

Die letzten zwei sind der einzige Ort, an dem `mayScore` die Oberfläche steuert: die
Scoring-Route hängt nicht an der Rolle, sondern am Recht. `RequireRole` braucht dafür eine
zweite Form — `<RequireRole scorer>` — die `me.mayScore` prüft und Admins durchlässt.

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx vitest run src/routes.test.tsx src/components/layout`
Expected: FAIL.

- [ ] **Step 3: `RequireRole` schreiben und über die Routen legen**

Die Routentabelle bleibt die eine Stelle. `RequireRole` sitzt innerhalb von `RequireAuth`.

- [ ] **Step 4: Die Reitertabelle nach Rolle filtern**

Spieler sehen `/` (Start), `/stats` (Analyse), `/kalender`. Admin und Superadmin sehen die fünf aus dem Navigationsumbau.

`/kalender` liegt heute als `extraPaths` am Orga-Reiter — für Spieler braucht es einen eigenen Reiter, weil sie Orga nicht sehen.

- [ ] **Step 5: `KontoMenu` schreiben**

Kreis mit den Initialen oben rechts im Kopf, mindestens 44 × 44 px. Dahinter **zunächst nur die Einträge, deren Ziele schon existieren**: Mein Profil (`/players/:id`) und Abmelden.

Konto, Accounts und Historie kommen **erst in Task 12** dazu, zusammen mit ihren Routen. Stünden sie hier schon, zeigten drei Menüeinträge über zwei Commits hinweg ins Leere — die Catch-all-Route fängt sie aufs Dashboard. Dieselbe Regel wie im Navigationsplan, wo die Orga-Kachel für den Spielbogen gebaut wurde, bevor sein Reiter verschwand: kein Commit, in dem ein sichtbarer Weg ins Nichts führt.

Die Rollenlogik des Menüs entsteht trotzdem hier und wird mit den beiden vorhandenen Einträgen getestet; Task 12 hängt die drei weiteren nur ein.

Das Menü portalt nach `body` — ein nicht portaltes Menü liegt hinter `ResponsiveSheet`, das ist in diesem Projekt schon einmal passiert.

- [ ] **Step 6: Tests laufen lassen**

Run: `cd frontend && npx vitest run && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "✨ Rollen in der Oberfläche: Routen, Reiter, Konto-Menü"
```

---

### Task 11: Spieler-Dashboard

**Files:**
- Create: `frontend/src/components/dashboard/PlayerDashboard.tsx`
- Modify: `frontend/src/routes.tsx` (`/` zeigt rollenabhängig)
- Test: `frontend/src/components/dashboard/PlayerDashboard.test.tsx`

**Interfaces:**
- Consumes: `me.playerId` (Task 9), bestehende `HeroNextGameDay`, `UpcomingList`, `api.getPlayerBattingStats`

- [ ] **Step 1: Die Tests schreiben**

```tsx
it('zeigt das nächste Spiel', () => { })
it('sagt ob der Spieler aufgestellt ist, mit Position und Schlagplatz', () => { })
it('sagt dass er nicht aufgestellt ist, wenn er fehlt', () => { })
it('zeigt vier Kennzahlen: AVG, OBP, Spiele, Hits', () => { })
it('zeigt keine Trainingszahl', () => { })
it('verlinkt ins volle Profil', () => { })
it('kommt ohne nächstes Spiel zurecht', () => { })   // Saisonende
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx vitest run src/components/dashboard/PlayerDashboard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Die Seite bauen**

Vier Blöcke in dieser Reihenfolge: nächstes Spiel, „bin ich dabei", vier Kennzahlen, kommende Spieltage. Auf dem Handy eine Spalte, ab `lg` nächstes Spiel und Kennzahlen nebeneinander.

Verfügbarkeit wird **angezeigt, nicht gesetzt** — Zusagen laufen über die WhatsApp-Umfrage, ein zweiter Weg hinein würde die bestehende Mechanik aufweichen.

- [ ] **Step 4: In `routes.tsx` einhängen**

`/` rendert `PlayerDashboard` bei Rolle `PLAYER`, sonst das bestehende `Dashboard`.

- [ ] **Step 5: Tests laufen lassen**

Run: `cd frontend && npx vitest run && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "✨ Spieler-Dashboard: nächstes Spiel, bin ich dabei, meine Zahlen"
```

---

### Task 12: Konto, Accounts, Historie

**Files:**
- Create: `frontend/src/components/account/KontoPage.tsx`
- Create: `frontend/src/components/orga/AccountsPage.tsx`, `frontend/src/components/orga/HistoriePage.tsx`
- Modify: `frontend/src/routes.tsx`, `frontend/src/lazyPages.tsx`, `frontend/src/components/orga/OrgaHome.tsx`, `frontend/src/api/client.ts`, `frontend/src/types/index.ts`
- Test: je eine `.test.tsx` daneben

**Interfaces:**
- Consumes: die Endpunkte aus Task 7 und 8

- [ ] **Step 1: Die Tests schreiben**

```tsx
// KontoPage
it('ändert den Benutzernamen', () => { })
it('zeigt die deutsche Meldung, wenn der Name vergeben ist', () => { })
it('fordert zum Passwortwechsel auf, solange passwordChanged false ist', () => { })

// AccountsPage
it('zeigt Spieler mit und ohne Account', () => { })
it('fragt vor dem Löschen in einem Modal nach', () => { })
it('zeigt die Rollenwahl nur dem Superadmin', () => { })
it('kündigt bei der Massenanlage an, was passieren wird', () => { })

// HistoriePage
it('zeigt eine Scoring-Spanne als eine Zeile', () => { })
it('sagt dass gemeinsame Passwörter die Zuordnung weich machen', () => { })
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx vitest run src/components/account src/components/orga`
Expected: FAIL.

- [ ] **Step 3: Die drei Seiten bauen**

Nach den Hausregeln: Modale mit dunklem Hintergrund statt `confirm()`, `ConfirmModal` für Zerstörerisches, Hover-Reveal für Bearbeiten und Löschen, deutsche Texte. Keine Roh-JSON-Ansichten — strukturierte Felder.

`AccountsPage` und `HistoriePage` sind schwer genug für `lazyPages.tsx` mit `Suspense` und `ChunkErrorBoundary`.

Auf `HistoriePage` oben der Satz über gemeinsame Passwörter — die Zahl ist ein Hinweis, kein Beweis.

- [ ] **Step 4: Die drei Menüeinträge aus Task 10 einhängen**

Jetzt, wo die Routen existieren, bekommt `KontoMenu` die restlichen Einträge: Konto & Passwort für jeden, Accounts ab Admin, Historie nur für Superadmins. Je ein Test, dass ein Eintrag nur der berechtigten Rolle erscheint.

- [ ] **Step 5: In Orga einhängen**

Accounts in den oberen Block zu Counter, Umfrage und Abrechnung — der User erwartet, es am häufigsten zu benutzen. Historie unter „Selten" neben den Spielbogen.

- [ ] **Step 6: Tests laufen lassen**

Run: `cd frontend && npx vitest run && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "✨ Konto, Accountverwaltung und Historie"
```

---

### Task 13: Mit den Fingern nachprüfen

Der ausdrückliche Wunsch des Users: nicht „Tests sind grün", sondern angefasst. Drei Rollen, zwei Bildschirmgrößen.

**Interfaces:**
- Consumes: Tasks 1–12

- [ ] **Step 1: Frische Datenbank hochziehen und den vollen Durchlauf fahren**

```bash
docker compose down -v && docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml &
cd frontend && npx vite
```

Expected: Der Bootstrap legt `hung` als Superadmin an und sagt das im Log.

- [ ] **Step 2: Als Superadmin die anderen Accounts anlegen**

Anmelden als `hung`. Über `/orga/accounts` die Massenanlage ausführen.
Expected: nur nicht-archivierte Spieler bekommen einen Account; die Vorschau nennt vorher die Zahl; übersprungene Namen werden genannt, nicht erfunden.

- [ ] **Step 3: Als Spieler anmelden, bei 390 × 844**

Mit einem der angelegten Spieler anmelden.
Expected: Spieler-Dashboard, drei Reiter, kein Training, kein Orga, kein Spielbogen. `/orga/trainerabrechnung` in die Adresszeile getippt landet auf dem Dashboard. Im eigenen Profil **keine** Trainingszahl.

- [ ] **Step 4: Die Flächen nachmessen**

Initialen-Knopf, jeder Menüeintrag, die Chips auf `/stats`, die Knöpfe auf `/konto`.
Expected: jede mindestens 44 × 44 px. Was darunter liegt, wird hier korrigiert.

- [ ] **Step 5: Das Scorer-Recht am lebenden Objekt**

Als Superadmin dem Spieler das Scorer-Recht geben. Als Spieler ein Spiel scoren: At-Bat, Steal, Inning weiterschalten, Wechsel, Spiel beenden.
Expected: alles geht. Wenn das Inning klemmt, fehlt einer der fünf `GameController`-Endpunkte aus Task 5.

Danach das Recht wegnehmen.
Expected: die Scoring-Route ist für ihn zu.

- [ ] **Step 6: Als Admin gegenprüfen**

Expected: alles außer `/orga/historie` und der Rollenwahl in `/orga/accounts`.

- [ ] **Step 7: Den Deploy-Tag nachstellen**

Im Browser `localStorage.auth` von Hand auf `btoa('admin:x')` setzen und neu laden.
Expected: Anmeldemaske, keine Fehler-Toast-Lawine, kein Sackgassen-Dashboard.

- [ ] **Step 8: Bei 1440 px gegenprüfen**

Expected: Spieler-Dashboard zweispaltig, Konto-Menü nicht abgeschnitten, Historie-Zeitstrahl lesbar.

- [ ] **Step 9: Die ganze Prüfung fahren**

```bash
cd frontend && npm run build && npx vitest run
cd backend && ./mvnw test -s .mvn/local-settings.xml
# laufendes Backend auf 8080 vorher beenden
cd frontend && npm run test:e2e
```
Expected: alles PASS.

- [ ] **Step 10: Befund festhalten**

Was gemessen wurde, was korrigiert werden musste, was auffällig blieb — als kurze Liste in die Antwort an den Menschen. Keine Erfolgsmeldung ohne die Zahlen.

- [ ] **Step 11: Was der Mensch selbst tun muss, aufschreiben**

Vor dem Deploy auf dem VPS in `/opt/softball/docker-compose.yml`: `APP_PLAYER_PASSWORD` setzen. Ohne die Variable startet der Dienst mit einem Vorgabewert, den niemand verteilt hat — das gehört in die Übergabe, nicht in eine Fußnote.
