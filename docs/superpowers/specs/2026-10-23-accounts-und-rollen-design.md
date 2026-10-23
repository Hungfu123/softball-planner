# Accounts, Rollen und Historie

Design-Dokument, 2026-10-23. Projekt 1 von zwei. Projekt 2 (Live-Scoring zu mehreren)
liegt daneben unter `2026-10-23-live-scoring-zu-mehreren-design.md` und setzt dieses hier
voraus.

## Warum

Die App hat heute genau einen Zugang: Benutzername `admin`, ein Passwort aus
`APP_AUTH_PASSWORD`, fest verdrahtet in `SecurityConfig` (`InMemoryUserDetailsManager`) und
im Frontend (`client.ts:10` baut `btoa('admin:' + password)`). Wer das Passwort hat, darf
alles — Lineups umbauen, Spieler löschen, den Spielbogen an die Liga schicken.

Das Team soll rein. Spieler sollen ihre Zahlen sehen, wissen wann das nächste Spiel ist,
und beim Scoring mitmachen dürfen. Ohne dass eine schiefgegangene Fingerbewegung den
Spieltag zerlegt. Dafür braucht es Accounts, Rollen und — weil mehr Hände mitspielen — eine
Spur davon, wer was angefasst hat.

Der Auslöser ist konkret: Hung scort und schlägt im selben Spiel. Jemand muss übernehmen
können. Das geht nur, wenn es den Jemand als Account gibt.

## Ziele

- Jeder aktive Spieler kann sich anmelden und sieht, was ihn angeht.
- Drei Rollen mit klarer Grenze: Superadmin, Admin, Spieler.
- Superadmin sieht, wer wann zuletzt drin war und was geändert wurde.
- Spieler können nichts kaputt machen, was sie nicht kaputt machen dürfen.
- Nach dem Deploy funktioniert Hungs bestehender Zugang weiter, nur unter neuem Namen.

## Nicht-Ziele

- Kein E-Mail-Versand, keine Passwort-Reset-Links, keine Selbstregistrierung.
- Keine Mandantenfähigkeit. Die App bleibt eine Ein-Team-App (siehe CLAUDE.md,
  „Single-team caveat"). Nichts in diesem Entwurf darf das weiter zementieren, aber es löst
  es auch nicht.
- Kein OAuth, kein SSO, keine Zwei-Faktor-Anmeldung.
- Kein Wechsel von HTTP Basic auf Sessions oder JWT. Basic bleibt — siehe „Warum Basic
  bleibt".
- Keine feingranularen Rechte pro Seite. Drei Rollen plus **ein** Zusatzrecht
  (Scorer), mehr nicht.

## Anti-Ziele

Das hier wäre ein Fehlschlag, auch wenn alles technisch funktioniert:

- **Ein Spieler sieht etwas, das ihn nichts angeht.** Trainerabrechnung, Spielbogen,
  WhatsApp-Daten — das ist Orga, nicht Kader.
- **Ein neuer Endpunkt rutscht ungeschützt durch.** Die Rechteprüfung darf nicht davon
  abhängen, dass jemand beim nächsten Feature daran denkt. Siehe „Default-Deny".
- **Die Historie ersäuft in Rauschen.** Wenn „wer hat das Lineup geändert" zwischen
  achthundert At-Bat-Zeilen liegt, ist sie wertlos.
- **Jemand sperrt sich aus.** Kein Zustand, in dem kein Superadmin mehr existiert.
- **Der Scoring-Pfad wird strenger als heute.** Bestehende Abläufe dürfen nicht
  schwergängiger werden (siehe Risiken).

## Entscheidungen, die der User getroffen hat

| Frage | Entscheidung |
|---|---|
| Account↔Spieler | 1:0..1. Account gehört immer zu genau einem Spieler, Spieler kann ohne Account existieren |
| Wer kriegt beim Deploy einen Account | Nur die **aktiven** Spieler. Archivierte nicht |
| Neuer Spieler | Kriegt **nicht** automatisch einen Account. Wird einzeln entschieden |
| Benutzername | Der Spielername in Kleinbuchstaben. Muss eindeutig sein, geprüft beim Anlegen und beim Ändern |
| Passwort | Ein gemeinsames, per WhatsApp verteilt. Jeder darf es freiwillig ändern |
| Benutzername ändern | Darf jeder selbst, auch auf eine Mailadresse |
| Passwort vergessen | Admin oder Superadmin setzt zurück. Keine Mail, kein Link |
| Spieler archivieren | Account wird **gesperrt**, nicht gelöscht |
| Spieler löschen | Account wird mitgelöscht. Account kann auch allein gelöscht werden |
| Admin darf | Accounts anlegen, Passwörter zurücksetzen. **Keine** Rollen vergeben, **keine** Historie sehen |
| Superadmin darf | Alles, plus Rollen vergeben, plus Historie |
| Spielbogen (RFL) | Nur Admin und Superadmin. Spieler sehen ihn gar nicht |
| Live-Scoring zugucken | Jeder Angemeldete |
| Live-Scoring eintragen | Nur mit Scorer-Recht am Account. Mehrere dürfen es haben |
| Hungs Account nach Deploy | Bleibt bestehen, Benutzername wird `hung`, Rolle Superadmin. Alle melden sich neu an |
| Kalender | Zeigt Spielern Trainingstermine (Datum, Zeit, Ort) |
| Trainingsbeteiligung | Für Spieler **unsichtbar** — auch die eigene. Begründung unten |
| Passwörter | Zwei getrennte: `APP_AUTH_PASSWORD` für den Superadmin, `APP_PLAYER_PASSWORD` für die verteilten Spieler-Accounts |
| Scoring-Seite ohne Scorer-Recht | In diesem Projekt **gesperrt**. Der Zuschauer-Modus kommt in Projekt 2 |

## Entscheidungen des Autors

Markiert, weil der User sie nicht getroffen hat. Alle korrigierbar.

- **Basic Auth bleibt.** Siehe unten.
- **Das Scorer-Recht wird schon in diesem Projekt scharf geschaltet**, nicht erst in
  Projekt 2. Ein Schalter, der nichts tut, verwirrt mehr als er nützt. Ohne das Recht kann
  ein Spieler die Scoring-Seite öffnen und zugucken, aber keinen Schreib-Endpunkt
  aufrufen.
- **Audit-Zeilen werden vollständig geschrieben und erst beim Lesen zusammengefasst.**
  Nicht beim Schreiben verdichtet. Begründung unten.
- **„Zuletzt gesehen" und „zuletzt angemeldet" sind zwei Felder.** Begründung unten.
- **Die Rollen-Enum heißt `Role` mit `SUPERADMIN`, `ADMIN`, `PLAYER`.** Englisch wie der
  Rest des Domain-Codes (`Position`, `Gender`, `PositionSlot`), UI-Texte deutsch.
- **`POST /api/auth/login` für den Anmelde-Handschlag**, `GET /api/me` für alles andere.
  Begründung unten.
- **`client.ts` bekommt doch eine Änderung: 401 fängt die Anmeldung ab.** Begründung unten.
- **Fünf Schreib-Endpunkte aus `GameController` zählen zum Scoring**, nicht nur die aus
  `ScoringController`. Begründung unten.

## Warum Basic bleibt

HTTP Basic schickt die Zugangsdaten bei jedem Aufruf mit. Das Frontend legt sie
base64-kodiert in `localStorage` ab. Das ist keine schöne Lösung, aber es ist die
bestehende, sie funktioniert, und sie umzubauen wäre ein eigenes Projekt mit eigenem
Risiko — Token-Ablauf, Refresh, Abmelden auf allen Geräten.

Was sich ändert: der Benutzername ist nicht mehr fest `admin`, sondern kommt aus dem
Anmeldeformular. `getAuthHeaders()` selbst bleibt, wie es ist. Einen zweiten Eingriff
braucht `client.ts` trotzdem — den 401-Abfang, siehe „Der Deploy-Tag".

**Konsequenz für Projekt 2:** `EventSource` kann keine eigenen Header setzen. Der
SSE-Strom kann die Basic-Credentials also nicht auf dem normalen Weg mitschicken. Das ist
ein Problem von Projekt 2, nicht von diesem hier, aber es ist der Preis dieser
Entscheidung und steht dort als offener Punkt.

**Konsequenz für die Sicherheit:** Benutzername ist der Klarname, Passwort anfangs für
alle gleich. Jeder im Team kann sich als jeder andere anmelden, solange niemand sein
Passwort geändert hat. Für „wer war zuletzt online" heißt das: die Zahl ist ein Hinweis,
kein Beweis. Für die Historie genauso. Das ist bewusst in Kauf genommen — es ist ein
Softballteam, kein Bankkonto. Es gehört aber in die UI geschrieben, an der Stelle wo die
Historie steht: ein Satz, der sagt, dass gemeinsame Passwörter die Zuordnung weich machen.

## Trainingsbeteiligung bleibt vor Spielern verborgen

Eine ausdrückliche Vorgabe des Users, und sie reicht weiter als sie zuerst aussieht.

Die Auto-Aufstellung gewichtet die Trainingsbeteiligung (`TrainingParticipationCalculator`,
siehe CLAUDE.md). Wer seine eigene Quote sieht, kann sie mit der des Nebenmanns
vergleichen und daraus eine Forderung ableiten, warum er hätte spielen müssen. Genau das
soll nicht entstehen. Es geht nicht um Geheimhaltung, sondern darum, keinen Nebenschauplatz
aufzumachen, der die Aufstellung zur Verhandlung macht.

Betroffene Stellen, vollständig:

- **`GET /api/players/{id}/usage`** liefert `trainingsTotal` und `trainingsAttended`
  (`PlayerUsageResponse`). Für Rolle `PLAYER` kommen beide als `null` zurück. Für **jedes**
  Profil, auch das eigene — wer seine eigene Quote kennt, kann sie weitergeben.
- **`UsagePanel.tsx`** blendet den Trainingsblock aus, wenn die Felder `null` sind. Die
  Komponente kennt diesen Fall schon in anderer Form (`trainingsOutOfScope` beim
  Saison-Zuschnitt), die Darstellung kann sich daran anlehnen.
- **`GET /api/trainings`** liefert Spielern eine beschnittene `TrainingResponse`: Datum,
  Zeit, Ort, abgesagt, Art. Ohne `attendeeCount`, ohne Teilnehmer. Der Endpunkt öffnet sich
  für Spieler **nur**, damit der Kalender Trainingstermine zeigen kann.
- **Alles andere unter `/api/trainings/**`** — Anwesenheit, Statistik, Perioden, Import —
  bleibt für Spieler zu, lesend wie schreibend. Ebenso Trainingspläne und Drills.

Die Statistikseite (`frontend/src/components/stats/`) ist geprüft und enthält keine
Trainingszahlen. Dort ist nichts zu tun.

## Zwei Passwörter, nicht eins

`APP_AUTH_PASSWORD` ist heute das einzige Passwort der App und wird nach dem Deploy das
Passwort des Superadmins `hung`. Das verteilte Spieler-Passwort muss ein **anderes** sein,
als neue Eigenschaft `app.auth.player-password` (Umgebungsvariable `APP_PLAYER_PASSWORD`).

Wären es dieselben, wäre die Rechteverwaltung wirkungslos: der Benutzername des Superadmins
ist Hungs Vorname in Kleinbuchstaben, den kennt jeder im Team, und das Passwort stünde in
der WhatsApp-Gruppe. Jeder Spieler wäre einen Anmeldeversuch von Superadmin entfernt.

`POST /api/users` und `POST /api/users/bulk-create` setzen das Spieler-Passwort,
`PUT /api/users/{id}/password-reset` setzt darauf zurück. Keiner der drei nimmt ein
Passwort im Aufruf entgegen — es kommt immer aus der Konfiguration. Damit steht es nirgends
in einem Log und nirgends im Browser.

Der Superadmin wird in der Oberfläche einmal darauf hingewiesen, sein eigenes Passwort zu
ändern, solange `password_changed` falsch ist.

## Datenmodell

Zwei neue Tabellen. Beide folgen der Onion-Struktur: Domain-Model ohne Spring/JPA, Port in
`domain/port/out/`, Entity plus Mapper plus Adapter in `adapter/out/persistence/`.

### `app_user`

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | bigserial PK | |
| `player_id` | bigint NOT NULL UNIQUE, FK → `player(id)` | Account gehört immer zu genau einem Spieler |
| `username` | text NOT NULL UNIQUE | Klein geschrieben gespeichert, Vergleich case-insensitiv |
| `password_hash` | text NOT NULL | BCrypt, der Encoder existiert schon |
| `role` | text NOT NULL | `SUPERADMIN` \| `ADMIN` \| `PLAYER` |
| `may_score` | boolean NOT NULL default false | Darf im Legacy-Scoring eintragen |
| `locked` | boolean NOT NULL default false | Gesperrt (z.B. weil Spieler archiviert) |
| `password_changed` | boolean NOT NULL default false | Hat er das verteilte Passwort ersetzt |
| `created_at` | timestamptz NOT NULL | |
| `last_login_at` | timestamptz NULL | Letzte erfolgreiche Anmeldung über die Anmeldemaske |
| `last_seen_at` | timestamptz NULL | Letzter authentifizierter Aufruf, höchstens alle 5 min fortgeschrieben |

Der `player_id`-FK bekommt `ON DELETE CASCADE`. Damit erledigt sich „Spieler löschen →
Account weg" auf Datenbankebene, und `PlayerService.delete` muss nichts zusätzlich tun.
Die Löschsperre dort (Scoring-Daten vorhanden → `BusinessValidationException`) bleibt
unverändert; in der Praxis werden Spieler ohnehin archiviert statt gelöscht.

`username` ist in Postgres `text` mit einem `UNIQUE INDEX ON lower(username)`. Gespeichert
wird bereits klein, der Index ist die Absicherung.

**Warum `last_login_at` und `last_seen_at` getrennt sind:** Basic Auth hat keinen
Anmeldevorgang — jeder Aufruf trägt die Zugangsdaten. Würde man nur „zuletzt
authentifiziert" schreiben, wäre das bei jedem offenen Tab jede Minute neu, und die Frage
„wer war seit Wochen nicht drin" ließe sich trotzdem beantworten, aber „wer hat sich
überhaupt mal angemeldet" nicht. `last_login_at` wird beim expliziten Anmelde-Handschlag
gesetzt (`/api/me` nach dem Formular), `last_seen_at` von einem Filter, gedrosselt auf
höchstens einen Schreibvorgang pro Nutzer alle fünf Minuten.

### `audit_event`

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | bigserial PK | |
| `user_id` | bigint NULL, FK → `app_user(id)` ON DELETE SET NULL | |
| `username` | text NOT NULL | Schnappschuss. Bleibt lesbar, wenn der Account weg ist |
| `kind` | text NOT NULL | `LOGIN` \| `LOGIN_FAILED` \| `WRITE` \| `SCORING` |
| `method` | text NULL | HTTP-Verb |
| `path` | text NULL | Aufgerufener Pfad |
| `label` | text NULL | Deutscher Klartext, z.B. „Lineup geändert" |
| `target_type` | text NULL | z.B. `GAME`, `PLAYER` |
| `target_id` | bigint NULL | |
| `status` | int NULL | HTTP-Status der Antwort |
| `occurred_at` | timestamptz NOT NULL | |

Index auf `(occurred_at DESC)` und auf `(user_id, occurred_at DESC)`.

**Warum nicht beim Schreiben verdichtet wird:** Der User will „X hat Spiel Y gescort,
19:04–20:30" statt achthundert Einzelzeilen. Man könnte das beim Schreiben
zusammenfassen — ein laufender Eintrag pro Nutzer und Spiel, dessen Endzeit fortgeschrieben
wird. Das braucht aber Zustand im Server, der Neustarts und parallele Instanzen überleben
muss, und es verliert Information, die man beim Debuggen eines verkorksten Spielbogens
gerade gebraucht hätte.

Gewählt: alles schreiben, beim Lesen zusammenfassen. Eine Saison macht grob
30 Spiele × 200 Schreibvorgänge = 6000 Zeilen. Für Postgres nichts. Die Abfrage
gruppiert aufeinanderfolgende `SCORING`-Zeilen desselben Nutzers am selben Spiel zu einer
Spanne, sobald zwischen zwei Zeilen weniger als 20 Minuten liegen. Die Aufräumarbeit
übernimmt ein geplanter Lauf (es gibt schon eine `SchedulingConfig`), der Zeilen älter als
zwölf Monate löscht.

**Warum `label` nicht generisch erzeugt wird:** Aus `PUT /api/games/42/lineup` lässt sich
„Lineup geändert" ableiten, aber nur mit einer Zuordnungstabelle. Die gehört in **eine**
Klasse (`AuditLabels`), die Pfadmuster auf deutschen Klartext abbildet. Der Alternativweg —
jeder der neunzehn Application-Services ruft selbst `audit.record(...)` — verteilt die
Verantwortung über den halben Backend und wird beim nächsten Feature vergessen. Was die
Tabelle nicht kennt, landet als `method + path` in der Historie. Unschön, aber nie
unsichtbar.

## Autorisierung

### Default-Deny

Das Anti-Ziel „ein neuer Endpunkt rutscht ungeschützt durch" bestimmt die Bauweise. Reine
URL-Muster in `SecurityConfig` reichen nicht: `GameController` und `ScoringController`
teilen sich `/api/games`, und mehrere Controller hängen direkt unter `/api` ohne eigenes
Präfix (`GameDayController`, `EquipmentController`, `LeagueTeamController`,
`LeagueResultController`, `LineupSetController`). Wer dort mit Pfadmustern arbeitet, baut
ein Sieb.

Stattdessen: **Methodensicherheit als Hauptmechanismus.** Jede Controller-Klasse bekommt
auf Klassenebene `@PreAuthorize("hasRole('ADMIN')")` (Superadmin erbt über
`RoleHierarchy`). Methoden, die Spieler sehen dürfen, überschreiben das einzeln mit
`@PreAuthorize("isAuthenticated()")` oder einer engeren Bedingung. Ein Endpunkt ohne
Annotation erbt damit automatisch die strenge Klassenregel.

Dazu ein Test, der das erzwingt: `SecurityCoverageTest` geht per Reflection über alle
`@RestController`-Klassen und schlägt fehl, wenn eine Klasse keine Klassenannotation hat.
Damit kann ein neuer Controller nicht ungeschützt entstehen.

In `SecurityConfig` bleibt eine grobe zweite Linie: `/api/**` authentifiziert, die zwei
bewusst offenen Stellen (`/api/calendar.ics`, `/actuator/health`) wie bisher offen.

### Rollenhierarchie

`SUPERADMIN > ADMIN > PLAYER`, als `RoleHierarchy`-Bean. Spart die Doppelnennung in jeder
Annotation.

### Was Spieler dürfen

Lesen:

- Spielbetrieb: Saisons, Spieltage, Spiele, Ergebnisse, Liga-Tabelle
- Lineups — **nur lesen**, keine Änderung
- Statistik und Analyse, inklusive Batting-Stats
- Eigenes Spielerprofil (`/api/players/{id}`, `/usage`, Form-Kurve)
- Spielerliste (Namen und Profile der Mitspieler)
- Kalender, Counter, Playmaker, Play-Kategorien
- Trainings**termine** über `GET /api/trainings`, beschnitten: Datum, Zeit, Ort, Art.
  Ausschließlich damit der Kalender vollständig ist
- Scoreboard, At-Bats, Steals, Lineup und Wechsel eines Spiels — die Lesegrundlage für
  das Zuschauen in Projekt 2

Schreiben:

- Eigener Account: Benutzername ändern, Passwort ändern
- Scoring-Schreibvorgänge **nur mit `may_score`**

Nichts davon, weder lesend noch schreibend:

- Spielbogen (`/api/spielbogen/**`) — ausdrückliche Entscheidung des Users
- Trainerabrechnung (`/api/coach-billing/**`)
- WhatsApp (`/api/orga/whatsapp/**`)
- Alles unter `/api/trainings/**` außer der beschnittenen Terminliste — besonders
  Anwesenheit und Trainingsstatistik
- Trainingspläne, Drills
- Einladungen, Equipment, Datenexport und -import
- Spieler anlegen, ändern, archivieren, löschen
- Lineups ändern (`PUT /api/games/{id}/lineup`), Verfügbarkeiten setzen
- Die Scoring-Seite, solange sie kein Scorer-Recht haben
- Accounts und Historie

Die Grenzfälle, die der Builder entscheiden muss, stehen unter „Was offen bleibt".

### Scoring-Schreibrechte

Die Schreib-Endpunkte bekommen
`@PreAuthorize("hasRole('ADMIN') or @scoring.darfSchreiben(authentication)")` — ein kleiner
Bean, der `may_score` des angemeldeten Accounts prüft.

Sie liegen in **zwei** Controllern, und das ist der Punkt, an dem eine Pfadregel
versagt hätte:

Aus `ScoringController` (`/api/games/{id}/…`):
`atbats`, `atbats/last`, `scoring/**`, `stealing-events`, `clock/**`.

Aus **`GameController`**, von `ScoringPage` aufgerufen und damit genauso Teil des Scorens:

| Endpunkt | Wofür | Ohne das Recht |
|---|---|---|
| `PUT /api/games/{id}/score` | Spielstand beim Inningwechsel | Inning lässt sich nicht weiterschalten |
| `PUT /api/games/{id}/batting-side` | Seitenwechsel | Top/Btm bleibt stehen |
| `POST /api/games/{id}/substitutions` | Spielerwechsel | Wechsel nicht eintragbar |
| `POST /api/games/{id}/end` | Spiel beenden | Spiel bleibt offen |
| `POST /api/games/{id}/reopen` | Wieder öffnen | Korrektur nach Spielende unmöglich |

Ohne diese fünf könnte der Übernehmer zwar At-Bats eintragen, aber kein Inning
weiterschalten — die ganze Motivation des Projekts wäre hin.

`PUT /api/games/{id}/lineup` liegt in derselben Klasse und bleibt **admin-only**. Deshalb
ist das hier eine Annotation je Methode, kein Pfadpräfix.

Lesende Scoring-Endpunkte (`getAtBats`, `getScoreboard`, `getStealingEvents`, und die von
`ScoringPage` gebrauchten `GET /{id}/lineup`, `GET /{id}/substitutions`) sind für jeden
Angemeldeten offen — sie sind die Grundlage des Zuschauens in Projekt 2.

**Wichtig für den Scoring-Pfad:** Für Admin und Superadmin ändert sich dadurch nichts. Die
Regel fügt Spielern eine Erlaubnis hinzu, sie nimmt niemandem eine weg. Das ist die
Bedingung, unter der dieses Projekt den Scoring-Pfad überhaupt anfassen darf.

### Die Scoring-Seite selbst bleibt in diesem Projekt zu

`ScoringPage.tsx` hat rund 2900 Zeilen und ist durchgehend aufs Eintragen gebaut. Ein
echter Zuschauer-Modus hieße, ein `readOnly` durch die riskanteste Datei des Projekts zu
fädeln — den Pfad, den CLAUDE.md mit einer 77 Tests starken Playwright-Suite einzäunt.

Entscheidung des Users: **in diesem Projekt bleibt die Route für Spieler ohne Scorer-Recht
gesperrt.** Der Zuschauer-Modus ist Projekt 2, wo dieser Pfad ohnehin geöffnet wird und
die E2E-Suite als Ganzes läuft.

Spieler **mit** Scorer-Recht kommen auf die Seite und können alles, was ein Admin dort
kann. Das ist nach diesem Projekt der einzige Weg für einen Spieler ins Scoring.

## Backend-Aufbau

Nach der bestehenden Onion-Struktur:

```
domain/model/          AppUser, Role (enum), AuditEvent, AuditKind (enum)
domain/port/out/       AppUserRepository, AuditEventRepository
application/           UserAccountService    — anlegen, ändern, löschen, sperren, Eindeutigkeit
                       AccountSelfService    — eigener Benutzername, eigenes Passwort
                       AuditService          — schreiben, lesen, zusammenfassen, aufräumen
adapter/in/web/        UserAccountController (/api/users)
                       MeController          (/api/me)
                       AuditController       (/api/audit)
adapter/out/persistence/entity|mapper|adapter/   AppUserEntity, AuditEventEntity, …
shared/config/         SecurityConfig (umgebaut), RoleHierarchy, AuditFilter, LastSeenFilter
shared/security/       CurrentUser (Zugriff auf den angemeldeten Account)
```

`UserAccountService` und `AccountSelfService` sind getrennt, weil sie verschiedene
Berechtigungen haben und sonst ein Dienst entsteht, der sowohl „Admin ändert fremden
Account" als auch „Nutzer ändert seinen eigenen" kann — genau die Art Gott-Service, die in
diesem Projekt schon einmal aufgetrennt wurde (`AvailabilityService` aus `GameDayService`).

`UserDetailsService` wird DB-gestützt. `InMemoryUserDetailsManager` fällt weg. Gesperrte
Accounts (`locked`) kommen als `UserDetails` mit `accountNonLocked = false` zurück, Spring
lehnt sie dann selbst ab.

### Endpunkte

| Methode | Pfad | Wer |
|---|---|---|
| POST | `/api/auth/login` | Jeder Angemeldete. Der Anmelde-Handschlag: setzt `last_login_at`, liefert dieselbe Auskunft wie `/api/me` |
| GET | `/api/me` | Jeder Angemeldete. Liefert `{username, role, playerId, playerName, mayScore, passwordChanged}`, setzt nur `last_seen_at` |
| PUT | `/api/me/username` | Jeder Angemeldete, für sich selbst |
| PUT | `/api/me/password` | Jeder Angemeldete, für sich selbst |
| GET | `/api/users` | Admin |
| POST | `/api/users` | Admin. Legt Account für einen Spieler an |
| POST | `/api/users/bulk-create` | Admin. Für alle aktiven Spieler ohne Account |
| PUT | `/api/users/{id}/password-reset` | Admin. Setzt auf das verteilte Passwort zurück |
| PUT | `/api/users/{id}/role` | **Superadmin** |
| PUT | `/api/users/{id}/may-score` | Admin |
| PUT | `/api/users/{id}/locked` | Admin |
| DELETE | `/api/users/{id}` | Admin |
| GET | `/api/audit` | **Superadmin**. Gefiltert nach Nutzer, Zeitraum, Art |
| GET | `/api/audit/last-seen` | **Superadmin**. Wer war wann zuletzt da |

Eindeutigkeitsprüfung des Benutzernamens sitzt im `UserAccountService` und im
`AccountSelfService`, wirft `BusinessValidationException` → 400 mit deutscher Meldung. Die
Datenbank sichert mit `UNIQUE` nach; der Fehler aus dem Index wird abgefangen und in
dieselbe Meldung übersetzt, damit zwei gleichzeitige Anlagen nicht als 500 enden.

**Aussperrschutz:** `PUT /role` und `DELETE` lehnen ab, wenn danach kein Superadmin mehr
übrig wäre. Ein Superadmin kann sich auch nicht selbst degradieren oder löschen.

**Warum `/api/auth/login` neben `/api/me` steht:** `AuthProvider` ruft `/api/me` bei jedem
Laden der Seite auf, nicht nur nach dem Formular. Würde dieser Aufruf `last_login_at`
setzen, wäre es dieselbe Zahl wie `last_seen_at` und die Trennung sinnlos. Nur das
Absenden des Anmeldeformulars ruft `POST /api/auth/login`; jeder Seitenaufbau danach ruft
`GET /api/me`.

**Spieler reaktivieren:** `PUT /api/players/{id}/archive` mit `false` entsperrt den
zugehörigen Account wieder. Die Sperre beim Archivieren wäre sonst eine Einbahnstraße.

**`CalendarController`:** `/api/calendar.ics` ist heute bewusst `permitAll()`. Mit
Methodensicherheit auf Klassenebene würde es anonyme Aufrufe ablehnen, egal was in
`SecurityConfig` steht. Die Klasse bekommt deshalb ausdrücklich
`@PreAuthorize("permitAll()")`, und `SecurityCoverageTest` akzeptiert das als gültige
Regel.

## Migration und Inbetriebnahme

### Flyway

- `V70__app_user.sql` — Tabelle, Indizes, FK mit `ON DELETE CASCADE`
- `V71__audit_event.sql` — Tabelle, Indizes

**Die Migrationen legen keine Accounts und keine personenbezogenen Daten an.** Das folgt
der Linie, die bei der Trainerabrechnung (V65) schon gezogen wurde. Passwörter gehören
nicht in eine Datei im Repository, auch nicht gehasht.

### Bootstrap

Ein `AccountBootstrap` als `ApplicationRunner`: Ist die Tabelle `app_user` leer, wird
genau ein Superadmin angelegt.

- Spieler: der mit dem Namen aus `app.auth.bootstrap-player` (Vorgabe `Hung`). Gibt es ihn
  nicht, wird er angelegt — sonst wären frische Datenbanken (lokale Entwicklung,
  Testcontainers, E2E) ohne Zugang.
- Benutzername: dieser Name in Kleinbuchstaben, also `hung`.
- Passwort: `APP_AUTH_PASSWORD`, unverändert. Damit stimmt die Aussage des Users, dass
  „der eine Account derselbe bleibt, nur mit meinem Benutzernamen".
- Rolle: `SUPERADMIN`.

Ist die Tabelle nicht leer, tut der Runner nichts. Kein Notzugang, keine Hintertür, kein
`admin`-Konto das heimlich weiterlebt.

### Die anderen Accounts

Nicht automatisch. Hung drückt nach dem Deploy einmal auf „Accounts für alle aktiven
Spieler anlegen" (`POST /api/users/bulk-create`). Das legt für jeden nicht-archivierten
Spieler ohne Account einen an, Benutzername aus dem Namen klein geschrieben, Passwort das
verteilte, Rolle `PLAYER`. Der Aufruf zeigt vorher an, was er tun würde, und meldet
hinterher, was er getan und was er übersprungen hat.

Namen, die klein geschrieben kollidieren (zwei „Hung"), werden **nicht** automatisch
entschärft. Sie werden übersprungen und gemeldet, damit ein Mensch entscheidet. Erfundene
Namen wie `hung2` sind schlechter als eine Rückfrage.

### Was in den Tests angefasst werden muss

- `frontend/e2e/helpers/auth.ts:3` — `CREDENTIALS = 'admin:Deadsox123!'` wird `hung:…`
- Rund ein Dutzend Backend-Integrationstests nutzen `httpBasic("admin", …)`. Alle auf den
  neuen Benutzernamen. Die Stellen finden sich über `grep -rl 'httpBasic' backend/src/test`
- `frontend/src/routes.test.tsx:68`, `CounterPage.test.tsx:26`,
  `AuthProvider.test.tsx` — `btoa('admin:x')` wird `btoa('hung:x')`
- Neue Tests: `SecurityCoverageTest` (jeder Controller hat eine Klassenregel), Rollen-Tests
  je Endpunktgruppe, Eindeutigkeit des Benutzernamens, Aussperrschutz, Bootstrap auf leerer
  Datenbank

## Frontend

### Anmeldung

`LoginPage` bekommt ein zweites Feld. `setAuth(username, password)` statt
`setAuth(password)`. `AuthProvider` prüft nicht mehr gegen `/api/players`, sondern gegen
`/api/me`, und hält danach `{username, role, playerId, mayScore}` im Kontext. Die
Schutzlogik gegen überholende Anmeldeversuche (`versuch`-Zähler) bleibt wie sie ist.

### Der Deploy-Tag

Nach dem Deploy trägt jeder offene Browser noch `admin:…` im `localStorage`. `AuthProvider`
übernimmt `loggedIn` heute aus `hasAuth()`, **ohne zu prüfen**, und `clearAuth()` wird nur
im Anmeldeablauf gerufen. Es gibt weder einen 401-Abfang noch einen Abmelde-Knopf. Ohne
Gegenmaßnahme sieht also jeder Rückkehrer ein Dashboard, auf dem jeder Aufruf als
Fehler-Toast endet — und findet keinen Weg zurück zur Anmeldemaske.

Zwei Änderungen, beide klein:

- **`request<T>` in `client.ts` fängt 401 ab**: `clearAuth()` und zurück zur Anmeldung.
  Das widerspricht der früheren Absicht, `client.ts` unangetastet zu lassen — die Absicht
  war falsch, diese Stelle ist der einzige Ort, durch den jeder Aufruf geht.
- **Abmelde-Knopf** in der Navigation und auf `/konto`. Mit mehreren Accounts und
  geteilten Telefonen am Spielfeldrand ist das keine Kür.

`AuthProvider` prüft beim Laden zusätzlich gegen `GET /api/me` und zeigt solange den
bestehenden Ladezustand. Schlägt der Aufruf mit 401 fehl, erscheint die Anmeldemaske;
scheitert er am Netz, bleibt der Nutzer angemeldet — offline soll die PWA nicht
abmelden.

### Rechte in der Oberfläche

`routes.tsx` ist die richtige Stelle — eine zentrale Tabelle, ein einziges Gate
(`RequireAuth`). Daneben kommt `RequireRole`, das dieselbe Rolle prüft wie das Backend und
bei fehlender Berechtigung auf das Dashboard zurückschickt.

Die Oberfläche versteckt, das Backend verbietet. Beides, nicht nur eins. Ein Spieler, der
`/orga/trainerabrechnung` in die Adresszeile tippt, landet auf dem Dashboard — und selbst
wenn nicht, liefert das Backend 403.

Navigation wird nach Rolle gefiltert. Ein Spieler sieht keine Menüpunkte, die er nicht
öffnen kann.

### Spieler-Dashboard

Eigene Komponente, Route `/`, wird statt des Admin-`Dashboard` gerendert, wenn die Rolle
`PLAYER` ist. Inhalt, in dieser Reihenfolge auf dem Handy:

1. **Nächstes Spiel** — Datum, Gegner, Uhrzeit, Ort. Der bestehende `HeroNextGameDay` ist
   dafür der Ausgangspunkt
2. **Bin ich dabei** — steht er in der Verfügbarkeitsliste, steht er im Lineup, auf
   welcher Position, an welcher Stelle im Schlagplan
3. **Meine Zahlen, kurz** — AVG, OBP, Spiele, Hits. Vier Kacheln, nicht die ganze
   Statistikseite. Von dort ein Weg ins volle Profil (`/players/:id`)
4. **Was kommt** — die nächsten Spieltage als Liste. `UpcomingList` existiert

Handy und Desktop ausdrücklich beide: eine Spalte auf dem Handy, auf dem Desktop
Nächstes-Spiel und Zahlen nebeneinander. Dark-Only wie der Rest (CLAUDE.md, „Dark-Only
bewusst"). Rot bleibt negativen Signalen vorbehalten.

### Navigation

Die Reiterleiste sitzt im Kopf (`Layout.tsx`, `sticky top-0`), nicht am unteren Rand, und
ist waagerecht scrollbar. Der Kommentar im Code hält die Maße fest: die Reiter brauchen
**301 px**, ein 390er-Telefon hat **366 px** innen. Sieben passen gerade so; auf schmaleren
Geräten greift `navOverflows` mit einem Verlauf als Scroll-Hinweis.

Mit Konto, Accounts und Historie kämen vier weitere Ziele dazu. Die Leiste trägt sie nicht.
Die Entscheidungen:

**Analyse und Statistik werden ein Punkt, er heißt `ANALYSE`.** Der Umschalter dafür
existiert bereits (`AnalysisModeTabs`, heute *Spiel-Verlauf* und *Gegner*); er bekommt einen
dritten Chip. Reihenfolge und Vorgabe: **Statistik**, Spiel-Verlauf, Gegner — damit bleibt
das häufigste Ziel einen Tipp entfernt. Das Wort *Statistik* verschwindet dadurch aus der
Leiste, bleibt aber als erster Chip sichtbar.

Der Code begründet den Namen schon selbst: der Punkt heiße „bewusst nicht mehr Gegner". Ein
Gegner-Verzeichnis ist keine Statistik, deshalb trägt der Oberbegriff, nicht der Teil.

**Der Spielbogen verlässt die Leiste und zieht nach Orga.** Nach Auskunft des Users wird er
derzeit kaum benutzt. Damit bleiben **fünf** Reiter — Spiele, Training, Spieler, Analyse,
Orga — und rund 215 statt 301 px. Über 150 px Luft, kein Scroll-Hinweis mehr, breitere
Trefferflächen.

**Persönliches liegt hinter den Initialen oben rechts:** Mein Profil, Konto & Passwort,
Abmelden; für Admins zusätzlich Accounts, für Superadmins Historie. Nichts Neues kommt in
die Leiste.

**Orga wird gruppiert, sortiert nach tatsächlichem Gebrauch** — nicht nach Thema. Eine Ebene
Überschriften, nichts klappt auf, jede Kachel bleibt einen Tipp entfernt:

| Block | Darstellung | Inhalt |
|---|---|---|
| (ohne Überschrift) | vier große Kacheln | Counter, Umfrage, Trainerabrechnung, **Accounts** |
| Weiteres | normale Kacheln | Kalender, Einladungen, Playmaker |
| Selten | ruhige Zeilen, je 46 px | Spielbogen, **Historie** |

„Zähler" heißt künftig **Counter**, passend zur Adresse `/counter`.

**Der Aufbau-Katalog verschwindet ganz** — Entscheidung des Users, er benutzt ihn nicht
mehr. Betroffen sind `components/equipment/` (4 Dateien), `useEquipmentCatalog`,
`utils/aufbauPdf*`, die Einträge in `routes.tsx`, `lazyPages.tsx`, `OrgaHome`, `client.ts`
und `types`, dazu backendseitig `EquipmentItem` mit Port, Adapter, Mapper, Entity,
Spring-Repo, `EquipmentService`, `EquipmentController` und zwei DTOs. `VenueMap` und
`venueLayout` hängen nur am Aufbau-PDF und gehen mit.

Nicht verwechseln: `Drill.equipment` ist eine Stringliste aus `drills.json` und hat mit dem
Katalog nichts zu tun — der Trainingsplan-Generator bleibt unberührt.

Die Tabelle `equipment_item` **bleibt vorerst stehen**. Sie trägt die echten Bestandsdaten,
und `ddl-auto=validate` stört sich nicht an einer Tabelle ohne Entity. Der Code ist über Git
rückholbar, die Zeilen wären es nicht. `DROP TABLE equipment_item;` ist eine spätere
Migration, wenn der User sicher ist.

Das ist eine **eigene Aufgabe mit eigenem Commit**, kein Teil dieses Projekts. Sie steht
hier, weil die Orga-Übersicht sonst eine Kachel zu viel hätte.

Accounts und Historie liegen damit an zwei Stellen — hier und im Initialen-Menü. Das ist
Absicht: das Menü zum Zielen, Orga zum Stöbern.

**Was ausdrücklich nicht gemacht wird:** kein zusätzlicher Spielbogen-Knopf auf der
Spieltagsseite. Er war als Ausgleich dafür gedacht, dass heute **nichts** im Frontend auf
`/spielbogen` verlinkt außer dem Reiter — bei der tatsächlichen Nutzung lohnt er nicht.
Sollte der Spielbogen wieder wichtiger werden, ist das der erste Griff.

### Nachtrag: die Steuerelemente auf ANALYSE (entschieden 2026-10-23, noch nicht gebaut)

Nach dem Umbau standen auf `/stats` **vier Steuerzeilen** übereinander, bevor Inhalt kam:
die drei Modus-Chips, fünf Zeitraum-Pillen, ein Jahr-Auswahlfeld und die Reiter
Schlagen/Einsätze. Zwei Fehler dabei:

- **„Gegner" stand zweimal** — oben als Modus (Gegner-Verzeichnis), unten als Zeitraum
  (nach Gegner filtern). Gleiches Wort, gleiche Pillenform, zwei Bedeutungen. Sofort
  behoben: die Zeitraum-Pille heißt jetzt „Nach Gegner".
- **Alle Ebenen trugen dieselbe Form.** Nichts unterschied „wechselt die Seite" von „filtert".

Die Praxisregel lautet: eine Reiterzeile, höchstens eine Verschachtelung. Vier Ebenen
verfehlen das deutlich.

**Entscheidung des Users: Variante F — zwei Formen, keine Pillen.**

| Aufgabe | Form | Inhalt |
|---|---|---|
| Welche Tabelle sehe ich | **Unterstrich-Reiter**, eine Zeile, waagerecht scrollbar | Schlagen · Einsätze · Spiel-Verlauf · Gegner |
| Welcher Zeitraum | **ein Knopf** rechts daneben, auf schmalen Schirmen darunter | „Jahr 2101 ▾" → öffnet das bestehende `ResponsiveSheet` mit Art und Wert |

Die Unterstrich-Reiter sind **kein neues Muster**: Schlagen/Einsätze auf `/stats` sind heute
schon so gebaut. Die Form trägt bisher nur die unterste Ebene statt der obersten. Damit
verschwindet `AnalysisModeTabs` in seiner Pillenform; die vier Ziele wandern in die
Reiterzeile.

Verworfen wurden: die Modi in den dunklen Kopf zu heben (er ist sticky und kostet die Höhe
dann dauerhaft), den Zeitraum in die Überschrift zu setzen (ein Bedienelement im Titel wird
übersehen, und der Zeitraum hat zwei Dimensionen), und die Ebenen bloß zusammenzulegen
(blieb fünf gleichförmige Pillen in einer Reihe).

Offene Punkte für die Umsetzung: die Trefferfläche der Unterstrich-Reiter muss über
Polsterung auf 44 px kommen — sie sind schmaler als Pillen. Jede Reiter- und Knopffläche
bekommt Druckgefühl (`scale(0.97)` bei `:active`), Hover nur hinter `hover: hover`. Das
Blatt fährt mit ease-out herein und schließt schneller, als es öffnet.

**Für Spieler** schrumpft die Leiste von allein: Start, Analyse, Kalender. Kein Training,
kein Spielbogen, kein Orga, kein Spieler-Verwalten. Das Gedränge ist ein Admin-Problem.

**Die Seiten ohne Navigation bleiben ohne:** `ScoringPage`, Spielbogen, Playmaker-Viewer und
Lineup-Bogen laufen außerhalb von `Layout` und füllen den Schirm per `h-dvh`. Daran ändert
sich nichts.

### Weitere Seiten

- **`/konto`** — eigener Account: Benutzername ändern, Passwort ändern. Für jede Rolle
- **`/orga/accounts`** — Accountverwaltung für Admins. Liste aller Spieler mit und ohne
  Account, Account anlegen, Passwort zurücksetzen, Scorer-Recht an und aus, sperren,
  löschen. Rollenwahl nur für Superadmins sichtbar. Der Knopf „Accounts für alle aktiven
  Spieler anlegen" sitzt hier
- **`/orga/historie`** — nur Superadmin. Zwei Blöcke: „zuletzt gesehen" als Liste aller
  Accounts nach Datum, und der Verlauf als Zeitstrahl mit Filter nach Nutzer und Zeitraum.
  Scoring-Zeilen erscheinen zusammengefasst. Oben der Satz über gemeinsame Passwörter

Alle drei nach den bestehenden Regeln: Modale mit dunklem Hintergrund statt `confirm()`,
Hover-Reveal für Bearbeiten und Löschen, eigene SVG-Icons, deutsche Texte, Tailwind v4 ohne
Klammer-Syntax.

### Service Worker

`/api/me` darf nicht aus dem Cache beantwortet werden — sonst behält ein abgemeldeter
Browser seine alte Rolle. Entweder aus dem Caching ausnehmen oder auf `NetworkOnly`
setzen.

## Risiken

| Risiko | Gegenmittel |
|---|---|
| **Ein Endpunkt bleibt ungeschützt** | Default-Deny auf Klassenebene plus `SecurityCoverageTest` |
| **Jemand sperrt alle Superadmins aus** | Letzter Superadmin kann nicht degradiert oder gelöscht werden |
| **Der Scoring-Pfad wird strenger** | Die Regel erlaubt Spielern etwas, sie verbietet Admins nichts. Vor dem Merge läuft die E2E-Suite (`npm run test:e2e`), wie in CLAUDE.md gefordert |
| **Das Frontend verrät mehr als es darf** | Das Backend ist die Grenze, nicht die Navigation. Rollen-Tests je Endpunktgruppe |
| **Der Benutzername kollidiert beim Massenanlegen** | Überspringen und melden, nicht erfinden |
| **Die Historie wird falsch verstanden** | Hinweis auf gemeinsame Passwörter steht in der Oberfläche |
| **E2E bricht, weil ein altes Backend auf 8080 läuft** | Bekanntes Problem im Projekt: vor dem Lauf das laufende Backend beenden |
| **Alle sehen am Deploy-Tag nur Fehler** | 401-Abfang in `request<T>`, Prüfung gegen `/api/me` beim Laden, Abmelde-Knopf |
| **Der Spielbogen wird unauffindbar** | Er hängt heute an genau einem Link. Nach dem Umzug liegt er unter Orga → Selten |
| **Spieler rechnet sich seine Trainingsquote aus** | `trainingsTotal`/`trainingsAttended` für Rolle `PLAYER` immer `null`, auch im eigenen Profil |
| **Scorer-Spieler kann das Inning nicht weiterschalten** | Die fünf `GameController`-Schreibzugriffe hängen am Scorer-Recht |

## Was offen bleibt

Entscheidungen für den Builder, die den Zuschnitt nicht verändern:

- Die genaue Zuordnung einiger Endpunkte zu „Spieler darf lesen". Die Leitfrage: steht es
  auf einer Seite, die ein Spieler laut Rechte-Tabelle öffnen darf? Dann lesend frei.
  Konkret zu klären: Awards, Wetter, Liga-Ergebnisse, Teams-Verzeichnis, Lineup-Sets.
  Zweite Leitfrage für jeden Fund: steckt eine Trainingszahl darin? Dann nicht.
- Ob die Verfügbarkeit („bin ich dabei") auf dem Spieler-Dashboard nur angezeigt oder auch
  gesetzt werden kann. Dieser Entwurf sagt: nur anzeigen. Zusagen laufen über die
  WhatsApp-Umfrage, und ein zweiter Weg hinein würde die bestehende Zusage-Mechanik
  aufweichen.
- Format und Feinschnitt der Audit-Labels.
- Ob `/api/me` zusätzlich die erlaubten Routen als Liste liefert, statt die Rolle im
  Frontend erneut auszuwerten.
