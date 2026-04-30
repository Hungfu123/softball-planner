# Spielbogen — RFL-Style Scoring für fremde Spiele

**Status:** Design (Brainstorming abgeschlossen, Implementation steht aus)
**Datum:** 2026-04-30
**Autor:** Hung Luu

## 1. Kontext

Dead Sox bekommt vom Liga-Verband (RFL — Ruhr-Fun-Liga Mixed Fastpitch Softball) Papier-Scoring-Sheets, die handschriftlich ausgefüllt werden müssen. Niemand im Team kennt die offizielle Scoring-Notation (`6-3`, `F8`, `K`, `BB`, …). Es gibt keinen Drucker, also muss alles digital ausfüllbar sein. Aktuelles Live-Scoring (`ScoringPage`) verfolgt nur unsere eigenen At-Bats und ist an unsere Game-Entity gekoppelt — für RFL-Sheet-Workflows ungeeignet.

Ziel ist ein eigenständiges, von der bestehenden Scoring-Welt entkoppeltes Tool namens **"Spielbogen"**, das den RFL-Sheet-Workflow auf dem Phone unterstützt: zwei fremde Lineups erfassen, Spiel scoren, am Ende ein PDF im RFL-Layout exportieren oder optional einen LeagueResult in die Saison-Tabelle eintragen.

## 2. Ziele

1. Liga-Mitglied ohne Scoring-Vorkenntnisse kann ein Spiel zwischen zwei fremden Teams auf dem Phone live scoren
2. App übersetzt einfache Tap-Inputs (TREFFER/STRIKEOUT/AUS/WALK/HBP) in offizielle RFL-Notation
3. Generiertes Sheet sieht 1:1 wie das RFL-Original aus, kann als PDF exportiert werden
4. Optional anhängbar an eine Saison → automatischer LeagueResult-Eintrag in die Liga-Tabelle
5. Bestehende ScoringPage und unsere AtBat-/BattingStats-Daten bleiben **unangetastet**

## 3. Nicht-Ziele

- Spielbogen wird **nicht** für unsere eigenen Spiele genutzt (alte ScoringPage bleibt dafür zuständig)
- Kein Tracking von Defense-Stats (Errors, Putouts, Assists) als aggregierte Übersicht — Notation auf Sheet reicht
- Keine Multi-Tenancy / Multi-Team-Vorbereitung in dieser Spec
- Keine Migration alter AtBats in das neue Datenmodell

## 4. Architektur

Das Feature folgt der bestehenden Onion-/Hexagonal-Architektur. Alle neuen Komponenten leben in eigenen Pfaden, vollständig getrennt von der bestehenden Scoring-Welt (separate Tabellen, separate Domain-Modelle, separate Services). Bestehende Komponenten (z.B. `DiamondView` für Live-BaseState) werden nicht wiederverwendet — der `BogenSheetRenderer` ist eigenständig, weil er Sheet-Zellen-Notation rendert (anderer Use-Case als Live-Diamond). Diese Trennung ist bewusst: konzeptionelle Klarheit zählt mehr als Code-Wiederverwendung über Tool-Grenzen hinweg.

### Backend-Schichten

```
domain/
├── model/
│   ├── Spielbogen
│   ├── SpielbogenSlot
│   ├── SpielbogenAtBat
│   ├── SpielbogenStealingEvent
│   ├── SpielbogenSubstitution
│   ├── BogenSide (enum: HOME, AWAY)
│   ├── BogenStatus (enum: DRAFT, LIVE, DONE)
│   └── OutType (enum: GROUNDER, FLY, FOUL, UNASSISTED,
│                       DOUBLE_PLAY, TRIPLE_PLAY, FORCE_OUT, TAG_OUT)
├── port/out/
│   ├── SpielbogenRepository
│   ├── SpielbogenSlotRepository
│   ├── SpielbogenAtBatRepository
│   ├── SpielbogenStealingRepository
│   └── SpielbogenSubstitutionRepository
└── service/
    ├── BogenSheetRenderer        (transformiert AtBats + Subs + Stealings → Cell-Notation)
    ├── BogenScoreCalculator      (aggregiert Inning- und Total-Runs)
    └── BogenLineupValidator      (min 9, max 10, sequenziell)

application/
├── SpielbogenService             (CRUD Bogen, Status-Transitions, Liga-Result-Sync)
├── SpielbogenSlotService         (Lineup-CRUD, Bulk-Replace, GameDay-Copy)
├── SpielbogenScoringService      (AtBat + Stealing + Sub Recording, Auto-Side-Switch)
└── SpielbogenSheetService        (Read-Aggregat fürs RFL-Sheet)

adapter/
├── in/web/
│   ├── SpielbogenController         /api/spielbogen
│   └── SpielbogenScoringController  /api/spielbogen/{id}/at-bats etc.
├── out/persistence/
│   ├── entity/                  (5 JPA-Entities)
│   ├── repository/              (5 Spring-Repository-Interfaces)
│   ├── adapter/                 (5 Adapter-Klassen)
│   └── mapper/                  (5 Mapper)
└── dto/                         (~15 Records für Request/Response)
```

### Frontend-Schichten

```
src/
├── App.tsx                      (3 neue Routen, lazy-loaded)
├── api/client.ts                (~15 neue Endpoint-Wrapper)
├── hooks/
│   ├── useSpielbogenList
│   ├── useSpielbogen
│   ├── useSpielbogenScoring
│   └── useGameDayLineupCopy
└── components/spielbogen/
    ├── SpielbogenList
    ├── SpielbogenWizard         (3 Steps: Meta, Lineup, Übersicht)
    ├── SpielbogenPage           (Scoring-Page)
    ├── SideToggle
    ├── ActionButtons            (Adaptiert von bestehender ScoringPage)
    ├── OutDetailDrawer          (Mini-Feld-SVG mit explizitem Sub-Menü)
    ├── LastAtBatPreview         (Live Inline Preview mit Klartext-Erklärung + Undo)
    ├── RflSheetDrawer           (Vaul-Drawer mit komplettem Sheet)
    ├── DiamondCell              (Eine Sheet-Zelle)
    ├── CheatsheetDrawer         (Notation-Cheatsheet)
    ├── SubstitutionDrawer
    └── StealingDrawer
```

### Top-Nav-Integration

`Layout.tsx` `TABS`-Array bekommt einen neuen Eintrag `{ path: '/spielbogen', label: 'Spielbogen', shortLabel: 'Bogen' }`. Position: am Ende nach "Statistik".

### Liga-Integration

Bei Bogen-Status `DONE` und gesetzter `seasonId` kann der User einen Liga-Tabellen-Eintrag erzeugen. Der Service erstellt einen `LeagueResult` mit den Team-Namen (auto-create `LeagueTeam` wenn nicht vorhanden) und den aggregierten Runs. Eigene Team-Namen (`ownTeam=true`, hardcoded "Dead Sox") werden abgelehnt — diese kommen über die Game-Entity.

## 5. Datenmodell

### Migration `V19__create_spielbogen_tables.sql`

```sql
CREATE TABLE spielbogen (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    location VARCHAR(200),
    home_team_name VARCHAR(100) NOT NULL,
    away_team_name VARCHAR(100) NOT NULL,
    season_id BIGINT REFERENCES season(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    current_inning INTEGER NOT NULL DEFAULT 1,
    current_side VARCHAR(10) NOT NULL DEFAULT 'AWAY',
    home_runs INTEGER NOT NULL DEFAULT 0,
    away_runs INTEGER NOT NULL DEFAULT 0,
    league_result_id BIGINT REFERENCES league_result(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    CONSTRAINT spielbogen_status_check CHECK (status IN ('DRAFT', 'LIVE', 'DONE')),
    CONSTRAINT spielbogen_side_check CHECK (current_side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_runs_nonneg CHECK (home_runs >= 0 AND away_runs >= 0)
);

CREATE INDEX idx_spielbogen_season ON spielbogen(season_id);
CREATE INDEX idx_spielbogen_status ON spielbogen(status);
CREATE INDEX idx_spielbogen_date_desc ON spielbogen(date DESC);

CREATE TABLE spielbogen_slot (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    slot INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(10),
    batting_order INTEGER NOT NULL,
    CONSTRAINT spielbogen_slot_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_slot_slot_range CHECK (slot BETWEEN 1 AND 10),
    CONSTRAINT spielbogen_slot_order_range CHECK (batting_order BETWEEN 1 AND 10),
    UNIQUE (bogen_id, side, slot),
    UNIQUE (bogen_id, side, batting_order)
);

CREATE INDEX idx_spielbogen_slot_bogen_side ON spielbogen_slot(bogen_id, side);

CREATE TABLE spielbogen_at_bat (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    sequence INTEGER NOT NULL,
    inning INTEGER NOT NULL,
    result VARCHAR(20) NOT NULL,
    out_type VARCHAR(20),
    fielder_chain INTEGER[],
    is_error BOOLEAN NOT NULL DEFAULT FALSE,
    error_position INTEGER,
    runs_scored INTEGER NOT NULL DEFAULT 0,
    rbi INTEGER NOT NULL DEFAULT 0,
    -- BaseState-After: slot-IDs der Runner auf 1B/2B/3B nach diesem AtBat (NULL = leer)
    base_state_first BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    base_state_second BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    base_state_third BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    CONSTRAINT spielbogen_atbat_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_atbat_result_check CHECK (
        result IN ('SINGLE','DOUBLE','TRIPLE','HOMERUN','WALK','HIT_BY_PITCH','STRIKEOUT','OUT')
    ),
    CONSTRAINT spielbogen_atbat_outtype_when_out CHECK (
        (result = 'OUT' AND (out_type IS NULL OR out_type IN
            ('GROUNDER','FLY','FOUL','UNASSISTED','DOUBLE_PLAY','TRIPLE_PLAY','FORCE_OUT','TAG_OUT')))
        OR (result != 'OUT' AND out_type IS NULL)
    ),
    CONSTRAINT spielbogen_atbat_error_pos_range CHECK (
        error_position IS NULL OR error_position BETWEEN 1 AND 9
    ),
    CONSTRAINT spielbogen_atbat_runs_nonneg CHECK (runs_scored >= 0 AND rbi >= 0),
    UNIQUE (bogen_id, side, sequence)
);

CREATE INDEX idx_spielbogen_atbat_bogen_side ON spielbogen_at_bat(bogen_id, side);
CREATE INDEX idx_spielbogen_atbat_slot ON spielbogen_at_bat(slot_id);
CREATE INDEX idx_spielbogen_atbat_inning ON spielbogen_at_bat(bogen_id, side, inning);

CREATE TABLE spielbogen_stealing_event (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    from_base INTEGER NOT NULL,
    to_base INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT spielbogen_stealing_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_stealing_type_check CHECK (
        type IN ('STOLEN_BASE','CAUGHT_STEALING','OUT_ON_PLAY')
    ),
    CONSTRAINT spielbogen_stealing_base_range CHECK (
        from_base BETWEEN 1 AND 3 AND to_base BETWEEN 2 AND 4
    )
);

CREATE INDEX idx_spielbogen_stealing_bogen_side ON spielbogen_stealing_event(bogen_id, side);

CREATE TABLE spielbogen_substitution (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    player_out_name VARCHAR(100) NOT NULL,
    player_in_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT spielbogen_sub_side_check CHECK (side IN ('HOME', 'AWAY'))
);

CREATE INDEX idx_spielbogen_sub_bogen_side ON spielbogen_substitution(bogen_id, side);
```

### Status-Lifecycle

```
DRAFT  →  LIVE  →  DONE
  │        │        │
  │        │        └→  Sheet read-only. Optional: "An Liga senden" → LeagueResult.
  │        │            Editierbar via reopen → LIVE → end-Korrektur.
  │        │
  │        └→  Scoring aktiv. AtBats/Stealings/Subs werden geschrieben.
  │
  └→  Wizard läuft. Lineups noch unvollständig erlaubt.
       Keine AtBats erlaubt. Manueller "Speichern"/"Speichern+Scoren".
```

Status-Übergänge:
- `DRAFT → LIVE` via `POST /api/spielbogen/{id}/start` (validiert Lineups: min 9 pro Side)
- `LIVE → DONE` via `POST /api/spielbogen/{id}/end` (manuelle Bestätigung, jederzeit möglich — auch mitten im Inning bei Zeitlimit-Ende)
- `DONE → LIVE` via `POST /api/spielbogen/{id}/reopen` (für Korrekturen)
- `LeagueResult` registrieren via `POST /api/spielbogen/{id}/register-league-result` (nur bei `DONE` + `seasonId`)

## 6. Backend-API

### Endpoints

```
# Spielbogen CRUD
GET    /api/spielbogen                              → SpielbogenListResponse[]
                                                       Query: ?seasonId=X&status=Y
POST   /api/spielbogen                              → SpielbogenResponse (201)
GET    /api/spielbogen/{id}                         → SpielbogenResponse
PATCH  /api/spielbogen/{id}                         → SpielbogenResponse
DELETE /api/spielbogen/{id}                         → 204

# Status-Transitions
POST   /api/spielbogen/{id}/start                   → SpielbogenResponse
POST   /api/spielbogen/{id}/end                     → SpielbogenResponse
                                                       Body (optional): { homeRuns?, awayRuns? }
                                                       (Override aggregierter Score für Time-Cap-Korrektur)
POST   /api/spielbogen/{id}/switch-side              → SpielbogenResponse
                                                       (User bestätigt Side-Wechsel nach 3 Outs;
                                                        Backend flippt currentSide + ggf. currentInning)
POST   /api/spielbogen/{id}/reopen                  → SpielbogenResponse
POST   /api/spielbogen/{id}/register-league-result  → LeagueResultResponse

# Lineup
GET    /api/spielbogen/{id}/lineup                  → SpielbogenLineupResponse
PUT    /api/spielbogen/{id}/lineup                  → SpielbogenLineupResponse
PATCH  /api/spielbogen/{id}/slots/{slotId}          → SpielbogenSlotResponse
POST   /api/spielbogen/{id}/lineup/copy-from-gameday → SpielbogenLineupResponse

# At-Bats
GET    /api/spielbogen/{id}/at-bats                 → SpielbogenAtBatResponse[]
POST   /api/spielbogen/{id}/at-bats                 → SpielbogenAtBatResponse (201)
DELETE /api/spielbogen/{id}/at-bats/last            → 204
PATCH  /api/spielbogen/{id}/at-bats/{atBatId}       → SpielbogenAtBatResponse

# Stealing & Substitution
POST   /api/spielbogen/{id}/stealing-events         → StealingEventResponse (201)
DELETE /api/spielbogen/{id}/stealing-events/{eventId} → 204
POST   /api/spielbogen/{id}/substitutions           → SubstitutionResponse (201)
DELETE /api/spielbogen/{id}/substitutions/{subId}   → 204

# Sheet (read-aggregate)
GET    /api/spielbogen/{id}/sheet                   → BogenSheetResponse
```

### Validierungsregeln

**`SpielbogenService.create`:**
- `homeTeamName` und `awayTeamName` müssen unterschiedlich sein
- `seasonId` (wenn gesetzt) muss existieren
- Bei `startImmediately=true` müssen Lineups zuerst per separatem PUT eingerichtet werden

**`SpielbogenSlotService.setLineup`:**
- min 9, max 10 Slots pro Side
- `slot`-Werte unique pro Side (1..10)
- `battingOrder` unique pro Side, sequenziell 1..N
- Bulk-Replace nur in Status `DRAFT`. In `LIVE` nur einzelne Slot-PATCH erlaubt (sonst brechen `slot_id`-Refs in AtBats)

**`SpielbogenScoringService.recordAtBat`:**
- Bogen-Status muss `LIVE` sein
- `slotId` muss zu Bogen gehören und zur angegebenen Side passen
- `outType` nur bei `result=OUT` erlaubt
- `fielderChain`: nur bei `result=OUT`, alle Werte 1-9, max 4 Einträge
- `isError=true` impliziert `errorPosition` 1-9 pflicht
- Sequence wird auto-vergeben (max+1 für Side)
- Auto-Update: `homeRuns`/`awayRuns` += `runsScored`, ggf. Auto-Side-Switch

**Side-Switch-Logik (soft, mit User-Bestätigung):**
- Nach jedem AtBat oder StealingEvent berechnet Backend Outs in current Inning + current Side
- Bei ≥3 Outs: Backend setzt `currentSide` **nicht** automatisch um, gibt aber `inningEnded: true` flag in der Response zurück
- Frontend zeigt Toast: "Inning-Wechsel · andere Mannschaft schlägt? [Bestätigen]" — Tap → ruft `POST /api/spielbogen/{id}/switch-side` auf
- Wenn User keinen Switch will (z.B. Korrektur in selber Inning): bleibt auf current Side, kann weiter scoren (4. Out wird akzeptiert, fließt in Notation aber zählt nicht doppelt)
- Wenn beide Sides je ≥3 Outs in selber Inning bestätigt hatten: nächster Switch erhöht `currentInning += 1`
- Begründung: Edge-Cases (Stealing+Strikeout gleichzeitig, Out-Korrekturen) brauchen Flexibilität. Force-Auto-Switch wäre brittle.

**Manuelle Side-Toggle:**
- Frei bei Outs < 3
- Wenn Out-Counter == 3: Toast/Modal "Inning mit 3 Outs zu Ende. Letzten Eintrag rückgängig machen oder einfach wechseln?" → 2 Buttons "Undo + Switch" / "Nur Switch"
- Erlaubt User: Korrektur (mit Undo) oder akzeptiertes Inning-Ende (nur Switch)

**Undo-Logik:**
- `DELETE /at-bats/last` rollt komplett zurück: AtBat löschen + `currentSide`/`currentInning` neu aggregiert + `homeRuns`/`awayRuns` neu aus verbleibenden AtBats berechnet
- Implementierung: Service löscht AtBat, dann ruft `recomputeBogenState()` auf — re-aggregiert alle Outs+Runs+InningHistory aus verbleibenden Events

**Out-Counting-Regeln (welche Events erhöhen Out-Counter):**

| Event | Out-Increment |
|-------|---------------|
| AtBat result=STRIKEOUT | +1 |
| AtBat result=OUT, outType ∈ {GROUNDER, FLY, FOUL, UNASSISTED, FORCE_OUT, TAG_OUT, NULL} | +1 |
| AtBat result=OUT, outType=DOUBLE_PLAY | +2 |
| AtBat result=OUT, outType=TRIPLE_PLAY | +3 |
| AtBat mit isError=true | 0 (Error = Spieler kommt auf Base) |
| AtBat result ∈ {SINGLE, DOUBLE, TRIPLE, HOMERUN, WALK, HIT_BY_PITCH} | 0 |
| StealingEvent type=CAUGHT_STEALING | +1 |
| StealingEvent type=OUT_ON_PLAY | +1 |
| StealingEvent type=STOLEN_BASE | 0 |

**`SpielbogenService.registerLeagueResult`:**
- Nur Status `DONE` und `seasonId` gesetzt
- Auto-create `LeagueTeam` wenn Name in Saison nicht existiert (`ownTeam=false`)
- Ablehnung wenn `homeTeamName` oder `awayTeamName` einem `ownTeam=true` Team entspricht
- Idempotent: zweiter Call → 400 ("schon registriert")
- Setzt `bogen.leagueResultId` als FK

**`SpielbogenService.copyFromGameDay`:**
- Game muss zur Bogen-Saison gehören (wenn Bogen `seasonId` hat)
- Player.name → Slot.name (kein FK), Position aus LineupEntry, battingOrder identisch
- 400 wenn Bogen `LIVE` (Lineup nicht überschreibbar)

### Wichtige DTOs

```java
public record CreateSpielbogenRequest(
    @NotNull LocalDate date,
    String location,
    @NotBlank @Size(max = 100) String homeTeamName,
    @NotBlank @Size(max = 100) String awayTeamName,
    Long seasonId,
    boolean startImmediately
) {}

public record SetLineupRequest(
    @Valid List<SlotEntry> homeLineup,
    @Valid List<SlotEntry> awayLineup
) {
    public record SlotEntry(
        @NotNull @Min(1) @Max(10) Integer slot,
        @NotBlank @Size(max = 100) String name,
        String position,
        @NotNull @Min(1) @Max(10) Integer battingOrder
    ) {}
}

public record RecordAtBatRequest(
    @NotNull BogenSide side,
    @NotNull Long slotId,
    @NotNull Integer inning,
    @NotNull AtBatResult result,
    OutType outType,
    List<Integer> fielderChain,
    Boolean isError,
    Integer errorPosition,
    Integer runsScored,
    Integer rbi,
    BogenBaseStateDto baseStateAfter
) {}

// Eigenständig vom existierenden BaseStateDto, da Spielbogen-Slots referenziert werden statt Player-IDs.
public record BogenBaseStateDto(
    Long firstSlotId,    // null wenn 1B leer
    Long secondSlotId,
    Long thirdSlotId
) {}

public record BogenScoreboardDto(
    BogenSide currentSide,
    Integer currentInning,
    Integer outsInCurrentInning,
    BogenBaseStateDto baseState,
    Long currentBatterSlotId,
    Integer homeRuns,
    Integer awayRuns
) {}

public record BogenSheetResponse(
    SpielbogenResponse meta,
    List<SpielbogenSlotResponse> homeLineup,
    List<SpielbogenSlotResponse> awayLineup,
    List<SpielbogenAtBatResponse> homeAtBats,
    List<SpielbogenAtBatResponse> awayAtBats,
    List<StealingEventResponse> stealingEvents,
    List<SubstitutionResponse> substitutions,
    Map<Integer, InningRuns> inningRuns,
    BogenScoreboardDto scoreboard
) {
    public record InningRuns(Integer home, Integer away) {}
}
```

### Logging

| Service | Level | Was wird geloggt |
|---------|-------|------------------|
| SpielbogenService | INFO | create, status-transitions, registerLeagueResult |
| SpielbogenSlotService | INFO | setLineup (bogenId + counts) |
| SpielbogenScoringService | INFO | recordAtBat (bogenId, side, inning, result), undo |
| GlobalExceptionHandler | WARN | alle Validation-Fehler (BusinessValidationException, ResourceNotFoundException) |

## 7. Frontend & UX

### Routing

In `App.tsx` werden drei neue Routen ergänzt, alle innerhalb des bestehenden `Layout`-Wrappers, alle lazy-loaded mit `Suspense + LoadingSkeleton + ChunkErrorBoundary` (analog zu `TrainingPlanPage`/`StatsPage`):

```tsx
{ path: '/spielbogen', element: <LazySpielbogenList /> }
{ path: '/spielbogen/new', element: <LazySpielbogenWizard /> }
{ path: '/spielbogen/:id', element: <LazySpielbogenPage /> }
```

### Page 1: `/spielbogen` — Liste

Zeigt alle existierenden Spielbögen, gruppiert nach Status. Filter-Dropdown nach Saison (Pattern wie `PeriodDropdown` aus `TrainingPage.tsx`). Primary-Button "Neuer Spielbogen" oben rechts (`Button variant=primary`).

Tile-Komponente nutzt das gleiche Visual wie `SeasonTileGrid.tileBase`:
`bg-cream-50 border border-cream-300 rounded-xl p-3 hover:border-navy-400 hover:bg-white transition-colors active:scale-[0.98] cursor-pointer`

Pro Tile:
- Datum + Ort
- Status-Pill links oben (`LIVE` → softball-red-100 + pulsing dot, `DRAFT` → cream-200, `DONE` → emerald-100 + ✓)
- Heim vs Gast (mit Score wenn DONE)
- Optional Hinweis "Liga-Tabelle: registriert ✓" wenn `leagueResultId` gesetzt

Empty-State: bestehende `<EmptyState>`-Komponente mit CrossBones-Icon + Aufforderung.

### Page 2: `/spielbogen/new` — Wizard

3 Schritte mit Stepper-Indikator (navy-filled Kreise + Verbindungslinie). Single-Page-Wizard (keine Routen pro Step, nur State).

**Step 1 — Meta:**
- `date` (input type=date)
- `location` (input text, optional)
- `homeTeamName` (input text, pflicht)
- `awayTeamName` (input text, pflicht)
- `season` (Dropdown wie `PeriodDropdown`, optional)

Form-Fields mit bestehendem Style: `bg-cream-50 border border-cream-300 rounded-lg`, navy-400 hover, navy-600 focus.

**Step 2 — Lineups:**
Zwei Sections (HOME / AWAY) mit Pill-Toggle oben. Pro Section drei Eingabe-Modi:

1. **Komplett-Modus** — Nutzer tippt 9-10 Namen + Positionen
2. **Schnell-Modus** — Auto-Fill `Spieler 1`..`Spieler 9` als Platzhalter, Positionen leer. Namen können später (während Spiel) per Long-Press auf Slot im Sheet ergänzt werden
3. **Aus Spieltag laden** — nur für eine Side: User wählt einen unserer GameDays, Lineup wird als Slots eingefügt (Player.name → Slot.name als String, kein FK)

Layout der Slot-Eingabe:
```
№  BATT  NAME                 POS
1   1   ▒[ ...           ]   [▼]
2   2   ▒[ ...           ]   [▼]
…
9   9   ▒[ ...           ]   [▼]   ← min 9 pflicht
10  10  ▒[ optional      ]   [▼]
```

Drag-Handle links für Reordering von `battingOrder`. Position-Dropdown beschränkt auf gültige Werte (P/C/1B/2B/3B/SS/LF/CF/RF/EH + "—").

Submit von Step 2 disabled bis pro Side mindestens 9 Slots befüllt sind (Name pflicht, Position optional).

**Step 3 — Übersicht:**
Read-only Zusammenfassung. Zwei Submit-Buttons:
- `Button variant=secondary`: "Als Entwurf speichern" → `POST /api/spielbogen` mit `startImmediately=false` → Liste
- `Button variant=primary`: "Speichern + Scoren" → `POST` mit Lineups, danach `POST /spielbogen/{id}/start` → `/spielbogen/:id`

### Page 3: `/spielbogen/:id` — Scoring-Page

Layout-Struktur folgt der bestehenden `ScoringPage` für visuelle Kohärenz, mit ergänzenden UX-Verbesserungen:

```
┌──────────────────────────────────────┐
│ [← Zurück]  SPIELBOGEN               │
├──────────────────────────────────────┤
│  Krefeld · 26.04.2026                │
│  WUPPERTAL ⚾ COLOGNE                │  ← Saira Condensed extrabold
│  Inning III · 1 Out · 0:1            │
│                                      │
│  ┌─────────┬─────────┐               │
│  │  HEIM   │  GAST   │  ← Pill-Toggle
│  │ ▓ aktiv │  inakt. │               │
│  └─────────┴─────────┘               │
│                                      │
│  [Scoreboard + Diamond + Runners]    │
│                                      │
│  Aktueller Batter:                   │
│  #4 Klaus (3B)                       │
│                                      │
│  ┌────── PRIMARY ACTIONS ──────────┐ │
│  │  [TREFFER] [STRIKEOUT] [AUS]    │ │
│  └─────────────────────────────────┘ │
│  ┌────── SECONDARY ─────────────────┐│
│  │  [WALK]   [HBP]                  ││
│  └──────────────────────────────────┘│
│                                      │
│  Letzter Eintrag:                    │
│  ┌────────────────────────────────┐ │
│  │ #3 Lara · F8                   │ │
│  │ Fly Out, gefangen von CF       │ │
│  │              [↶ Rückgängig]    │ │
│  └────────────────────────────────┘ │
│                                      │
│              [?]   ← Cheatsheet-FAB  │
│              [📋]  ← Sheet-FAB       │
└──────────────────────────────────────┘
```

### UX-Verbesserungen für Scoring-Anfänger

Die Scoring-Page wurde im Brainstorming explizit auf Softball-Spieler ohne Scoring-Vorkenntnisse zugeschnitten:

**1. Explizites Out-Detail statt Long-Press**
Long-Press auf Phone ist hidden und unzuverlässig. Nach Tap auf "AUS" öffnet ein Drawer mit Mini-Feld-SVG. Tap auf Position öffnet ein Sub-Modal mit drei explizit beschrifteten Buttons:
- "▶ Wirft zu 1B (6-3)" — als Default-Vorschlag highlighted (`bg-navy-50`)
- "Solo-Out (6 unassisted)"
- "Double Play (6-4-3)"
- "Error (E6)"

Bei Outfielder-Tap (7/8/9) wird Default-Vorschlag direkt "Fly Out (F8)" mit gleicher Modal-Struktur.

**Skip-Option immer prominent:** rechts unten im Out-Detail-Drawer ein deutlich sichtbarer "Allgemein OUT (ohne Detail)" Button. User kann jeden Out mit 1 Tap erledigen ohne Position zu wählen — das Sheet zeigt dann nur "OUT".

**2. Auto-Side-Switch bei 3 Outs**
Backend zählt Outs pro Inning + Side. Bei 3 Outs erreicht: Toast unten "Inning-Wechsel · GEGNER schlägt jetzt" (3s sichtbar), Side-Toggle wechselt automatisch. User kann manuell zurücktippen wenn es ein Fehler war. Bei 6 Outs in einem Inning: `currentInning += 1`.

**3. Last-At-Bat-Preview mit Klartext**
Direkt unter ActionButtons sichtbar (nicht versteckt im Drawer): aktueller letzter Eintrag mit Klartext-Erklärung der Notation und 1-Tap-Undo. Beispiele:
- `◇1B — Single, Bahn von Home zu 1B`
- `6-3 — SS hat Ball, geworfen zu 1B (Force-Out)`
- `F8 — Fly Out, gefangen von Center Field`

User lernt Notation passiv durch Wiederholung.

**4. Schnell-Modus für Lineup-Setup**
Wizard-Step 2 erlaubt 0-Tipp-Setup: User klickt "Schnell-Modus" → 9 Slots mit `Spieler 1`..`Spieler 9` Default-Namen, leere Positionen. Submit OK. User kann mitten im Spiel via Long-Press auf einen Spielernamen im RFL-Sheet-Drawer den Namen nachtragen — öffnet `ResponsiveSheet` mit Inline-Edit-Form (Name + Position), Submit ruft `PATCH /api/spielbogen/{id}/slots/{slotId}` auf.

**5. Stealing & Substitution ohne Button-Reihe**
Stealing wird via Long-Press auf einen Runner im Diamond ausgelöst → Mini-Menü mit Type-Optionen. Substitution wird via Long-Press auf einen Spielernamen im RFL-Sheet-Drawer ausgelöst. Keine separaten Buttons in der Action-Reihe — die bleibt fokussiert auf die häufigen Aktionen.

**6. First-Time-Tour erst nach 1. AtBat**
Statt direkt nach Wizard-Submit (Cognitive Overload) erscheint die 3-Bubble-Tour erst nach dem ersten erfolgreichen AtBat — wenn User schon im Flow ist. LocalStorage-Flag `spielbogen_tour_seen` verhindert Wiederholung.

**7. Spiel jederzeit beendbar (Zeitlimit-Spiele)**
RFL-Spiele werden häufig auf Zeit gespielt — das Spiel kann mitten im Inning enden, sobald die Time-Cap erreicht ist. Die App darf User nicht in eine "muss bis Inning 7 scoren"-Logik zwingen.

UX-Konsequenzen:
- "Spiel beenden"-Button immer prominent erreichbar im Sheet-Drawer
- Bestätigungs-Modal: "Spiel jetzt beenden? Aktueller Stand: HOME 7 — AWAY 4. Inning V (laufend)" mit optionalem "Score korrigieren ✏" Toggle (öffnet zwei Inputs für homeRuns/awayRuns falls Liga-Regel-spezifische Anpassung nötig — z.B. unvollständiges letztes Halb-Inning verworfen)
- Beenden funktioniert in jedem Zustand: laufendes Inning, mitten im At-Bat, ungerade Anzahl Outs
- Nach Beenden: kein "Inning incomplete" Warnung — Spiel ist regulär zu Ende, Score ist final
- Sheet rendert verbleibende Innings als grauen Hintergrund (`bg-cream-200`) statt leerem Diamant — visuelles Signal "Spiel war hier zu Ende"
- Reopen-Funktion bleibt verfügbar falls User sich vertan hat: DONE → LIVE, dann weiter scoren oder erneut beenden

### UI-Design (Brand-Konformität)

Bestehendes Design-System "Stadium Pocket" wird konsequent wiederverwendet:

- **Farben:** Cream-Paper-Bg + Paper-Grain-Texture, Navy-800 (primary), Softball-Red-600 (accent)
- **Fonts:** Saira Condensed für Display/Stats, Archivo für Body
- **Komponenten aus `@/components/shared`:** `Button`, `ResponsiveSheet`, `EmptyState`, `LoadingSkeleton`, `ConfirmModal`, `Badge`
- **Patterns:** Tile-Look von `SeasonTileGrid`, Period-Dropdown von `TrainingPage`, Modal-Footer von `AvailablePlayersModal`, Vaul-Drawer 90vh wie bestehend

### RFL-Sheet-Drawer

Vaul-Drawer (max-h 90vh). Auf Phone (Standard-Use-Case) zeigt der Drawer **eine Side gleichzeitig** mit Pill-Toggle oben (HEIM/GAST mit aktuellem Score). User scrollt nicht beide Sides parallel. Tabelle der aktiven Side ist full-width — bei sehr schmalen Phones (<360px) horizontaler Scroll innerhalb der Tabelle mit sticky-Spalten №+Name und sticky-Header (Inning-Zahlen). PDF-Export bleibt Querformat mit beiden Sides nebeneinander (PDF wird auf Desktop / Liga-Mail-Empfänger geöffnet). Header mit Liga-Logo-Platzhalter und Datum/Ort. Zwei Tabellen-Blöcke (HOME / AWAY) mit:
- Spalten: №, Name, Pos, Inning 1-7 (oder mehr)
- Reihen: 10 Slots
- Pro Zelle: Diamond-SVG mit Notation aus `BogenSheetRenderer`
- Footer: erzielte Runs pro Inning + Summe

Visuelle Details:
- `bg-cream-50` für Sheet-Background, paper-grain durch
- `border-cream-300` (1px) für Tabellen-Linien
- Navy-700 für Diamant-Strokes (1.5px)
- Softball-red-600 für HR-Highlights und Stealing-Pfeile
- `font-display text-[8px] font-bold` für Notation
- Run-Scored-Symbol: cream-fill mit subtiler diagonaler Schraffur
- Substitution: durchgestrichener Name oben + neuer Name darunter

Buttons unten (kontextabhängig):
- "Als PDF exportieren" (immer verfügbar in DONE-Status, Phase 3)
- "Spiel beenden" (nur in LIVE → triggert DONE)
- "Spiel wieder öffnen" (nur in DONE → triggert reopen, ändert Status zurück auf LIVE)
- "An Liga senden" (nur in DONE + seasonId gesetzt + `leagueResultId == null`)
- "Bogen löschen" (immer im 3-Punkt-Menü oben rechts erreichbar)

### PDF-Export

Format: **A4 Querformat (landscape)**, eine Seite, 1:1 Mimicry zum offiziellen RFL-2023-Scoresheet-Template.

Layout-Spezifikation (alle Werte in mm, A4 landscape = 297×210):

```
Header (Y 8-22):
  • Logo-Platzhalter (10, 10, 18×18) — rot/grün-Diamant nachgebaut oder Placeholder
  • Titel "RFL – Ruhr-Fun-Liga Mixed Fastpitch Softball" (32, 16)
  • Right-Block (220, 8-22):
    - "Ort:"   + Eingabe-Box mit location
    - "Datum:" + formatDate(date)
    - "Zeit:"  + meta.time

Team-Banner (Y 28-36):
  • Links  (8, 28, 130mm wide):  "Gast:"  homeTeamName  + "Summe Runs:" homeRuns
  • Rechts (152, 28, 130mm wide): "Heim:" awayTeamName + "Summe Runs:" awayRuns

Sheet-Tabelle (Y 42-180), pro Side eine Tabelle (links + rechts):
  • Spalten-Header: №, Name, Pos, 1, 2, 3, 4, 5, 6, 7
  • 10 Slot-Reihen, jede Reihe:
    - Slot-Nummer (links)
    - Zwei Linien für Name (oberer Slash: original Name, untere: Substitutions-Name falls vorhanden)
    - Pos-Spalte
    - 7 Diamond-Zellen mit Notation aus BogenSheetRenderer
  • Footer: "erzielte Runs" + 7 Inning-Run-Boxen + Summe-Box (= Banner-Wert)

Bei Extra-Innings (>7):
  • Wenn Spalten passen → erweitern auf 8/9/10 Innings (Diamant-Spalten enger)
  • Wenn nicht passt → Seite 2 mit nur Extra-Inning-Spalten (zweite Tabelle)
```

Pseudocode `rflSheetPdf.ts`:
```typescript
const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
drawHeader(doc, meta)
drawTeamBanner(doc, 8, 28, 'Gast:', homeName, totalHome, 130)
drawTeamBanner(doc, 152, 28, 'Heim:', awayName, totalAway, 130)
drawSheet(doc, 8,   42, homeLineup, homeAtBats, stealings, subs, inningRuns.home)
drawSheet(doc, 152, 42, awayLineup, awayAtBats, stealings, subs, inningRuns.away)
doc.save(`spielbogen-${date}-${homeName}-vs-${awayName}.pdf`)
```

Renderer-Logik:
- `drawSheet` zeichnet Tabellen-Rahmen (`doc.line()`), Diamant-SVG-Pfade (`doc.path()`) und Notation (`doc.text()`)
- Notation aus `BogenSheetRenderer` (Domain-Service) wird im Frontend dupliziert (TS-Modul `bogenSheetRenderer.ts`) — Backend-Service ist primär für Sheet-API-Endpoint, Frontend macht eigenen Render für PDF + Live-View
- Substitution: zweite Zeile in Name-Spalte zeigt `playerInName` mit durchgestrichenem `playerOutName` darüber (zeichnen mit `doc.setLineDashPattern` oder Strichdurch via Linien)
- Stealing: kleiner Pfeil-Pfad in Diamant der entsprechenden Inning-Zelle, von base-fromBase zu base-toBase

Logo-Strategie für V1:
- Eigenes Diamant-Logo nachbauen mit `doc.path()` (rot-grün, ~18×18)
- Original RFL-Logo nicht eingebunden (rechtlich unklar)

Referenz-Template: `/home/hungl/Downloads/RFL 2023 Scoresheet.pdf` (offizielles Liga-Template, dient als Pixel-Vorlage)

### Cheatsheet-Drawer

ResponsiveSheet mit Sektionen (Hits / Outs / Walk-HBP / Stealing / Substitution). Jede Reihe: großes Notation-Symbol (Saira Condensed extrabold, navy-900) links + kurze Klartext-Erklärung rechts. Suchfeld oben filtert client-side.

Genutzt nur als Fallback — Inline-Tooltips in der Last-At-Bat-Preview machen das Cheatsheet im Normalfall überflüssig.

## 8. Error Handling & Edge Cases

| Szenario | Verhalten |
|----------|-----------|
| Backend down während AtBat | Toast "Verbindung verloren — Eintrag nicht gespeichert", Undo-Button bleibt 30s |
| AtBat-Save 5xx | Retry 1× automatisch, danach Toast + State verworfen |
| Concurrent-Edit (zwei Geräte) | Last-Write-Wins, Frontend reload nach 30s polling |
| Tab-Close mitten im Wizard | localStorage-Backup (`spielbogen_wizard_draft`) speichert State debounced. Beim Wizard-Open: Resume-Prompt "Entwurf vom HH:MM wiederherstellen?". Wird beim Submit von Step 3 gelöscht. Kein Halb-Bogen in DB |
| Bogen DRAFT, User kommt 3 Tage später wieder | Liste zeigt unter DRAFT-Filter, Klick öffnet Wizard mit State |
| Liga-Sync fehlschlägt (Team-Conflict) | 400 mit Message, User passt Team-Namen an + retry |
| Slot-Delete mit existierenden AtBats | Cascade DB-seitig. Confirm-Modal "X AtBats werden mitgelöscht — fortfahren?" |
| Schnell-Modus: leerer Name während Spiel | Sheet rendert "Spieler 1"-Platzhalter, Long-Press → Inline-Edit |
| Substitution-Wahl im Sub-Modal | User wählt "Ab nächstem At-Bat" (Default) oder "Pinch-Hitter — JETZT übernimmt". Pinch-Hitter heißt: nächster gescorter At-Bat ist bereits der neue Spieler. Sheet zeigt zweizeilige Name-Spalte (alter Name oben durchgestrichen, neuer drunter) ab Sub-Inning |
| Stealing während aktivem At-Bat | Stealing-Event vor At-Bat-Outcome geschrieben, BaseState updated, dann At-Bat-Outcome |
| Bogen DONE → Korrektur nötig | "Reopen"-Button setzt Status `LIVE`, Korrektur-Modal mit AtBat-Liste, Score wird neu aggregiert |
| LeagueResult schon registriert + Korrektur | Warning: "Liga-Tabelle wurde bereits aktualisiert — ggf. dort manuell anpassen" |
| Inning > 10 (extra innings) | Erlaubt, Sheet rendert dynamisch breiter (horizontal scroll) |
| Spiel endet auf Zeit mitten im Inning | "Spiel beenden" funktioniert in jedem Zustand. Sheet markiert verbleibende Innings als grau. Score = aktueller Stand. Keine Inning-Vollständigkeits-Validierung |
| Spiel endet bei ungerader Out-Zahl (1 Out) | Erlaubt. AtBats werden nicht verworfen. Auto-Side-Switch wird übersprungen wenn `end` gerufen wird |
| Auto-Side-Switch falsch (Double-Play) | Korrekt verhalten; Undo-Button rollt zurück, Side-Toggle manuell überschreibbar |
| Saison nachträglich ändern | PATCH mit neuer `seasonId` erlaubt solange `leagueResultId == null` |
| GameDay-Copy: Lineup hat <9 Slots | 8 Slots eingefügt, Rest mit Platzhaltern, User muss vor Start manuell ergänzen |

## 9. Testing-Strategie

### Unit-Tests (Domain-Services)

```
BogenLineupValidatorTest          ~10 Tests
BogenSheetRendererTest            ~15 Tests (alle Notation-Mappings + edge cases)
BogenScoreCalculatorTest          ~5 Tests
```

### Service-Tests (Mockito + JUnit, kein Testcontainers)

```
SpielbogenServiceTest             ~12 Tests (CRUD + Status + LeagueResult)
SpielbogenScoringServiceTest      ~15 Tests (AtBat-Recording + Auto-Side-Switch + Validation)
SpielbogenSlotServiceTest         ~8 Tests (Lineup-Validation + GameDay-Copy)
```

### Integration-Tests (Testcontainers PostgreSQL)

```
SpielbogenIntegrationTest         ~8 Tests (Full lifecycle, cascade-delete, sheet-aggregate)
BogenLeagueResultIntegrationTest  ~5 Tests (Liga-Sync + Standings-Update)
```

### Frontend-Tests

Manuell auf Phone (Chrome DevTools mobile mode). Frontend-Test-Suite existiert nicht im Repo.

### Verifikation pro Phase

1. `./mvnw test -s .mvn/local-settings.xml` grün
2. `npm run build` (typecheck + production build) grün
3. `npm run lint` grün
4. Manueller E2E auf Phone:
   - Wizard mit Schnell-Modus durchspielen
   - 5 AtBats mix aus Hit/Walk/Strikeout/Out
   - Side-Switch automatisch testen
   - Sheet-Drawer öffnen, Notation prüfen
   - Bogen DONE → Liga-Result registrieren

## 10. Phasen-Plan

Spec wird in 3 Implementations-Phasen umgesetzt. Jede Phase ist eigenständig deploybar, mit grünen Tests + Build:

**Phase 1 — Backend-Fundament + Listen-Page:**
- Migration V19, Domain-Modelle, Ports, Adapter, Mapper, Repositories
- `SpielbogenService` (CRUD), `SpielbogenSlotService`, `BogenLineupValidator`
- REST-Endpoints für CRUD + Lineup
- Frontend-Routes + Liste + Wizard (ohne Scoring)
- Wizard-Submit erstellt Bogen in DB als DRAFT

**Phase 2 — Scoring-Page + Sheet-View:**
- `SpielbogenScoringService`, `BogenSheetRenderer`, `BogenScoreCalculator`
- Endpoints für AtBat / Stealing / Substitution / Sheet
- `SpielbogenPage` mit ActionButtons, OutDetailDrawer, LastAtBatPreview, Side-Toggle, Auto-Switch
- `RflSheetDrawer` mit `DiamondCell`-Rendering
- Status-Transitions (start/end/reopen)
- First-Time-Tour

**Phase 3 — Liga-Integration + PDF + Cheatsheet:**
- `registerLeagueResult` Endpoint + Service
- `rflSheetPdf.ts` jsPDF-Renderer (analog zu existierendem `pdfExport.ts`)
- `CheatsheetDrawer`
- `copyFromGameDay` Endpoint + UI in Wizard

## 11. Offene Fragen / Future Work

- **Multi-Tenancy:** App ist Single-Team. Spielbogen funktioniert auch ohne Dead-Sox-Bezug. Sollte für Multi-Team-Zukunft kein Hindernis sein.
- **Photo-OCR für Lineup-Eintrag:** User fotografiert Liga-Lineup-Karte, OCR liest aus, Vorschlag für Schnell-Setup. Kommt später bei Bedarf.
- **Bulk-Paste/Parser für Lineup-Listen:** User pasted Liga-Email/WhatsApp-Liste, Parser extrahiert Slots. Aktuell unnötig (Listen meist analog/Papier, manuelle Eingabe akzeptabel). Bei Bedarf später ergänzen.
- **Voice-Input für Schnell-Setup:** Spracheingabe statt Tippen. Nicht in V1.
- **Defensive-Stats-Aggregation:** Aus `fielderChain` Daten ableitbare Errors/Putouts/Assists. User hat explizit verzichtet — kommt nur falls später angefragt.
- **Cross-Saison Standings:** Spielbogen ist saison-gebunden, kein Cross-Saison-Aggregat. Falls gewünscht: Future Work.
- **Substitutions bei eigenen Spielen mit Player-FK:** aktuell nur freitext. Falls Spielbogen je für eigene Spiele genutzt wird, könnte Slot.playerId nachgereicht werden.
