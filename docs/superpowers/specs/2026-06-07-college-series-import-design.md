# College-Series Import — Design

**Datum:** 2026-06-07
**Status:** Entwurf (Review ausstehend)
**Ziel:** Liga-Daten der "College Series" (Standings, Spielplan, Teams) per Knopfdruck aus der
externen college-series.de-API in den Softball-Planner ziehen und im eigenen Design rendern.

---

## 1. Problem & Ziel

Die Dead Sox spielen in der College Series. Liga-Tabelle, Spielplan und Teamliste werden auf
https://www.college-series.de gepflegt (Backend: `strikeout-scoring.com`). Heute müssen Fremd-
Ergebnisse für die App-Tabelle manuell als `LeagueResult` eingetragen werden.

Ziel: Ein Admin drückt **einen Knopf**, das Backend holt die Liga-Daten aus der externen API,
mappt sie auf das bestehende Domain-Modell und persistiert sie. Anzeige erfolgt im eigenen
Design (volle Team-Namen, kein TLC-Kürzel).

**Nicht-Ziel:** Kein Auto-Polling/Cron (bewusst nur manueller Knopf-Import). Keine
Multi-Tenancy. Kein Schreiben zurück an college-series.

---

## 2. Externe API (Referenz)

Host: `https://api.strikeout-scoring.com/index.php`
Offen: kein Auth, `Access-Control-Allow-Origin: *`, `Content-Type: application/json`.
IDs der College Series: League `243398103`, Season `455890221`.

| Daten | Endpoint | Felder (Auszug) |
|------|----------|-----------------|
| Standings | `/league/standings/{league}/{season}` | teamID, name, tlc, g/w/l, wperc, rs/ra/rd, sos, logo |
| Schedule | `/schedule/league/{league}/{season}` | stages[].games[]: ID, homeScore, awayScore, status (`Final`/sonst), `gameDate` (unix-Sekunden), home/awayTeamID, names, tlc, logo, color, hostName |
| Teams | `/league/teams/{league}` | ID, name, nickname, tlc, color, logo |
| Logos | `/uploads/team-{teamID}-{ts}.png` | PNG |
| Tournaments | `/tournament/season-tournaments/{season}` | optional, nicht im Scope |

> **Achtung Param-Reihenfolge:** Im URL-Pfad steht immer zuerst `243398103`, dann `455890221`.
> Die Schedule-Response benennt `seasonID=455890221`, `leagueID=243398103` — die Reihenfolge
> im Pfad bleibt aber konstant. Im Code als Konstanten `LEAGUE_ID` / `SEASON_ID` ablegen, nicht
> raten.

**Dead Sox in der API:** `teamID=406716409`, name `"Düsseldorf Dead Sox"`, tlc `DUS`, color `navy`.
→ "Eigenes Spiel" = `homeTeamID == 406716409 || awayTeamID == 406716409`.

**Risiko:** Inoffizielle API, kein Vertrag, kann sich ändern. Mapper defensiv (Null-Felder
tolerieren), Import-Fehler sauber als 502/400 mit Klartext-Meldung an den Admin zurückgeben,
keine Teil-Schreibvorgänge bei Parse-Fehler (Transaktion).

---

## 3. Entscheidungen (im Brainstorming geklärt)

1. **Scope:** Standings + Schedule + Teams. (Anmeldungen/Tournaments raus.)
2. **Trigger:** Knopf-Import. Admin klickt → Backend holt + persistiert einmalig.
3. **Fetch im Backend**, nicht im Frontend (kein fremder Host im Browser, Daten in eigener DB).
4. **Eigene Spiele:** Import schreibt **nur Fremd-gegen-Fremd**-Spiele als `LeagueResult`.
   Dead-Sox-Spiele werden **nicht** importiert — die plant/scored das Team selbst als
   `Game`/`GameDay`. Damit bleibt die `StandingsCalculator`-Regel ("ownTeam nie in
   `LeagueResult`") intakt.
5. **Standings** werden **nicht** von der externen `wperc` übernommen, sondern wie bisher von
   `StandingsCalculator` aus eigenen `Game`-Rows + importierten `LeagueResult`-Rows gerechnet.
6. **Anzeige:** volle Team-Namen, keine TLC-Kürzel.

---

## 4. Daten-Mapping

### 4.1 Teams → `LeagueTeam`
- Alle 16 Teams der `/league/teams`-Antwort.
- Match per **Name** auf bestehende `LeagueTeam` der aktuellen Season (idempotent: vorhandene
  nicht duplizieren, fehlende anlegen).
- `"Düsseldorf Dead Sox"` → mappt auf den bestehenden **ownTeam**. **Nicht** als zweites Team
  anlegen. (ownTeam-Name ist aktuell hardcoded "Dead Sox" in `SeasonService` — Matching daher
  über eine explizite Alias-Zuordnung `406716409 → ownTeam`, nicht über String-Gleichheit.)

### 4.2 Fremd-Spiele (Final) → `LeagueResult`
- Aus `schedule` alle `games` mit `status == "Final"`, bei denen **keine** Seite Dead Sox ist.
- `gameDate` (unix-Sekunden) → `LocalDate` (Zeitzone Europe/Berlin).
- `homeTeamID`/`awayTeamID` → bereits gemappte `LeagueTeam` (Lookup über External-ID).
- `homeScore`/`awayScore` → `homeScore`/`awayScore`.
- Idempotenz: bestehende importierte `LeagueResult` der Season vor dem Schreiben löschen und neu
  setzen (nur die importierten — manuell angelegte nicht anrühren; siehe offene Frage 7.1).

### 4.3 Dead-Sox-Spiele
- Übersprungen. (Optional später: Schedule-Anzeige; siehe offene Frage 7.2.)

### 4.4 External-ID-Zuordnung
`LeagueTeam` hat heute keine External-ID-Spalte. Für stabiles, wiederholbares Matching:
neue nullable Spalte `external_team_id` (varchar) auf `league_team` (Flyway `V{n}`).
Lookup beim Import läuft über diese Spalte statt über den Namen.

---

## 5. Architektur (Onion-konform)

```
adapter/in/web/       CollegeSeriesImportController   POST /api/league/import/college-series
application/          CollegeSeriesImportService       Orchestrierung + Transaktion + Mapping
domain/port/out/      CollegeSeriesClient (Interface)  holt rohe Liga-Daten
adapter/out/external/ StrikeoutScoringClient           implementiert Port (RestClient/HttpClient)
adapter/dto/          CollegeSeriesImportResponse      {teamsCreated, resultsImported, skipped, ...}
```

- **Domain bleibt clean:** `CollegeSeriesClient` ist ein Outbound-Port (Interface) in
  `domain/port/out/`. Die HTTP-Implementierung liegt im Adapter, gibt rohe DTOs/Records zurück.
- **`CollegeSeriesImportService`** (application) orchestriert: Client aufrufen → mappen →
  `LeagueTeamRepository` + `LeagueResultRepository` schreiben. Eine Transaktion; bei Parse-/
  Netzwerkfehler komplett zurückrollen.
- **Mapping** (unix→LocalDate, External-ID-Lookup, Dead-Sox-Filter) in eigener Mapper-Klasse,
  damit der Service schlank bleibt (SRP — der User flaggt God-Services).
- IDs/Host als Konfiguration (`application.yml`: `college-series.league-id`,
  `.season-id`, `.base-url`), nicht hartkodiert im Service.

### Datenfluss (Import)
```
Admin → POST /api/league/import/college-series
  → CollegeSeriesImportService.import()
    → CollegeSeriesClient.fetchTeams()      → /league/teams/{league}
    → CollegeSeriesClient.fetchSchedule()   → /schedule/league/{league}/{season}
    → mapTeams()    → upsert LeagueTeam (skip ownTeam-Alias)
    → mapResults()  → filter Final & nicht-DeadSox → replace LeagueResult
  → CollegeSeriesImportResponse (Zähler) → Toast im Frontend
```

---

## 6. Frontend (eigenes Design)

> Wird in der Implementierung mit der **frontend-design**-Skill umgesetzt. Hier nur die
> Anforderungen, kein finaler Markup.

- **Import-Knopf:** im Admin-/Standings-Kontext. Dark-Backdrop-`ConfirmModal` vor dem Import
  ("Liga-Daten von college-series importieren? Überschreibt importierte Ergebnisse."), Toast mit
  Ergebnis-Zählern danach. Loading-State während Fetch.
- **Standings:** bestehende `Standings.tsx` rendert die berechnete Tabelle weiter — volle
  Team-Namen statt TLC.
- **Design-System:** Navy-Theme, Dead-Sox-Optik, custom SVG-Icons (keine Icon-Lib), Modals statt
  `confirm()`, Hover-Reveal. Deutsch durchgehend.
- **Logos/Farben (optional):** college-series liefert `logo`/`color` pro Team. Nice-to-have für
  hübschere Team-Zeilen. Erfordert zusätzliche `LeagueTeam`-Spalten → bewusst als optionale
  Ausbaustufe markiert, nicht im Kern-Scope (siehe offene Frage 7.3).

---

## 7. Offene Fragen (für Spec-Review)

1. **Idempotenz `LeagueResult`:** Sollen beim Re-Import *alle* `LeagueResult` der Season ersetzt
   werden, oder nur die per Import angelegten? → Empfehlung: Flag `imported boolean` auf
   `LeagueResult`, beim Re-Import nur `imported=true` ersetzen, manuell angelegte bleiben.
2. **Schedule-Anzeige:** Wird der volle Liga-**Spielplan** (inkl. zukünftiger/tba-Spiele und
   Dead-Sox-Spiele) als eigene Ansicht gebraucht, oder reicht die berechnete Standings-Tabelle?
   Spielplan-Anzeige würde eine read-only Quelle für *alle* Spiele brauchen (nicht nur
   Fremd-Final-Ergebnisse). → aktuell **out of scope**, bei Bedarf eigene Iteration.
3. **Logos/Farben:** Team-Zeilen mit Logo/Farbe? → optionale Ausbaustufe, erfordert
   `LeagueTeam`-Schema-Erweiterung.

---

## 8. Test-Strategie

- **Unit:** Mapper (unix→LocalDate inkl. Zeitzone, Dead-Sox-Filter, External-ID-Lookup,
  Null-tolerante Felder) mit echten API-Sample-JSONs als Fixtures.
- **Integration (Testcontainers):** `CollegeSeriesImportService` mit gemocktem `CollegeSeriesClient`
  (Fixture-JSON) → prüft, dass Teams upgesertet, nur Fremd-Final als `LeagueResult` geschrieben,
  Dead-Sox-Spiele übersprungen, ownTeam nicht dupliziert, Re-Import idempotent.
- **Kein** Live-Call gegen die externe API im Test (flaky, unhöflich).
- Frontend `npm run build` + Backend `./mvnw test -s .mvn/local-settings.xml` vor Commit.
