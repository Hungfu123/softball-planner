# Lineup-Sets (Spieltag-Aufstellungs-Varianten) — Design

**Datum:** 2026-06-10
**Status:** Approved (brainstorming)

## Problem

Vor einem Spieltag macht man sich Gedanken über die Aufstellung. Leute können kurzfristig absagen.
Aktuell gibt es pro Game genau ein Lineup — Varianten durchspielen heißt überschreiben und Wissen
verlieren. Gewünscht: mehrere benannte Aufstellungs-Varianten ("Sets") pro Spieltag speichern und bei
Bedarf wieder anwenden. Wenn beim Anwenden ein Spieler des Sets nicht mehr anwesend ist, bleibt sein
Slot leer und wird manuell nachbesetzt.

## Entscheidungen (aus Brainstorming)

- **Set-Inhalt:** nur Lineups — Batting-Order, Position, DH-Annotation. Pro **allen Games** des
  Spieltags. KEINE Staff/Coaches, KEINE availablePlayers, KEINE Gegner/Scores.
- **Scope:** pro Spieltag. Sets gehören genau zu einem GameDay (kein spieltag-übergreifendes Template).
- **Erstellen:** Snapshot vom aktuellen Stand. Button "Als Set speichern" schnappt die aktuellen
  Lineups aller Games + fragt nach Namen. Mehrere benannte Sets pro Spieltag, umbenennen/löschen.
- **Anwenden:** lädt in den Editor-**Draft** (Arbeitsstand, nicht persistiert). Abwesende Spieler →
  leerer Platzhalter-Slot. User füllt nach, dann normales Speichern. Gap-Validierung greift erst beim
  Speichern.
- **Storage:** Backend, normalisiert (Approach A). Begründung: Multi-Device (Planung am Laptop,
  Durchführung am Handy/PWA), übersteht Cache-Clear, Backend besitzt die Logik (Projektkonvention).

## Datenmodell

Zwei neue Tabellen. Flyway-Migration `V38__create_lineup_sets.sql`.

```
lineup_set
  id                BIGSERIAL PK
  game_day_id       BIGINT NOT NULL  FK -> game_day(id) ON DELETE CASCADE
  name              VARCHAR NOT NULL
  created_at        TIMESTAMP NOT NULL DEFAULT now()
  sort_order        INT NOT NULL DEFAULT 0     -- stabile Anzeige-Reihenfolge

lineup_set_entry
  id                    BIGSERIAL PK
  lineup_set_id         BIGINT NOT NULL  FK -> lineup_set(id) ON DELETE CASCADE
  game_number           INT NOT NULL              -- SPIEL 1/2/3 = Tab-Identität
  player_id             BIGINT NOT NULL  FK -> player(id) ON DELETE CASCADE
  position              VARCHAR NULL              -- Position-Enum-Name oder NULL (nur batten)
  batting_order         INT NOT NULL
  dh_batter_player_id   BIGINT NULL      FK -> player(id) ON DELETE CASCADE
```

**Warum `game_number` als Key statt `game_id`:** `game_number` (1..N) ist die Tab-Identität, die der
User sieht ("SPIEL 1"), und überlebt den atomaren Game-Swap (der Inhalte tauscht, nicht Nummern).
`game_id` könnte bei Delete+Readd eines Games wechseln. Anwenden mappt Set-Entries per `game_number`
auf die aktuellen Games des Spieltags.

**Player-Delete-Cascade:** Wird ein Spieler aus dem Team gelöscht, verschwinden seine Set-Entries
(ON DELETE CASCADE auf `player_id` und `dh_batter_player_id`). Das Set bleibt bestehen, hat dann
weniger Entries — konsistent mit dem Apply-Verhalten (fehlender Spieler = leerer Slot).

## Backend (Onion)

Schichten wie bei bestehendem Lineup-Code spiegeln.

- **domain/model:** `LineupSet` (id, gameDayId, name, createdAt, sortOrder, List<LineupSetEntry>),
  `LineupSetEntry` (id, gameNumber, player, position, battingOrder, dhBatterPlayer).
- **domain/port/out:** `LineupSetRepository` (findByGameDayId, findById, save, deleteById).
- **application:** `LineupSetService` — Snapshot, Liste, Rename, Delete. Orchestriert: liest aktuelle
  Lineups über vorhandenes `LineupEntryRepository`/`GameRepository`, kopiert in Set-Entries.
- **adapter/in/web:** `LineupSetController`.
- **adapter/dto:** `LineupSetResponse`, `LineupSetEntryResponse`, `CreateLineupSetRequest{name}`,
  `RenameLineupSetRequest{name}` (records, Bean Validation `@NotBlank` auf name).
- **adapter/out/persistence:** `LineupSetEntity`, `LineupSetEntryEntity`, Spring-Repositories,
  Mapper (entity ↔ model), `LineupSetRepositoryAdapter` implementiert den Port.

### Endpoints

| Methode | Pfad | Zweck |
|---|---|---|
| `GET`    | `/api/gamedays/{id}/lineup-sets` | Liste aller Sets des Spieltags inkl. Entries |
| `POST`   | `/api/gamedays/{id}/lineup-sets` | Snapshot der aktuellen Lineups aller Games → neues Set. Body `{name}` |
| `PATCH`  | `/api/lineup-sets/{id}`          | Umbenennen. Body `{name}` |
| `DELETE` | `/api/lineup-sets/{id}`          | Set löschen |

Kein `apply`-Endpoint — Anwenden ist reines Frontend-Draft-Loading (siehe unten).

### Snapshot-Logik (POST)

1. GameDay laden (404 wenn fehlt).
2. Alle Games + deren `lineupEntries` laden.
3. Pro Entry ein `LineupSetEntry` mit `game_number` des Games, `player_id`, `position`,
   `batting_order`, `dh_batter_player_id` anlegen.
4. Set mit Name + nächstem `sort_order` (max+1) speichern.
5. Validierung: nur `name` nicht blank. Keine Lineup-Regel-Prüfung beim Speichern (reiner Snapshot).
6. INFO-Log: "Lineup-Set '{name}' für GameDay {id} mit {n} Entries gespeichert".

## Frontend

### Apply = Draft-Load (kein Persist)

1. `useLineupSets` lädt Set-Entries, gruppiert nach `game_number`.
2. Pro Game-Editor-Draft: jeden Entry an seiner `batting_order` mit `position`/DH platzieren.
3. Entry, dessen `player_id` NICHT in aktuellem `availablePlayers` → **leerer Platzhalter-Slot** an
   dieser Batting-Order. Neues Draft-only-Konzept (siehe Typ-Änderung).
4. Nichts wird persistiert. Pro Game-Tab "ungespeicherte Änderungen"-Indikator. User füllt Lücken +
   speichert jedes Game über bestehendes `POST /api/games/{id}/lineup`. Gap-Validierung blockt Speichern
   bis 1..N lückenlos.

**Multi-Game-Draft:** Anwenden setzt den Draft ALLER Games des Spieltags. Der Planner hält Draft-State
pro Game; Tabs mit Lücken/ungespeicherten Änderungen werden markiert. Optionaler Komfort: "Alle
speichern"-Button (nur Games ohne Lücken). User tabbt durch + speichert.

### Typ-Änderung

`LocalLineupEntry` bekommt einen optionalen Leer-/Platzhalter-Zustand für abwesende Slots:

```ts
export interface LocalLineupEntry {
  player: Player | null        // null = leerer Platzhalter-Slot (Abwesender aus Set)
  position: string | null
  dhBatterId: number | null
  dhBatterName: string | null
}
```

`LineupRow` und alle Consumer von `entry.player.*` müssen den `null`-Fall behandeln (Name-Bereich zeigt
"— frei —", Slot ist nicht speicherbar). Betroffene Stellen vor Umbau auflisten (grep `entry.player`).

### Komponenten

- **Hook `useLineupSets(gameDayId)`** — CRUD (list/create/rename/delete), liefert Sets + Apply-Helper
  der Draft-State pro Game baut.
- **Set-Leiste im Planner-Header** (nähe AUTO/AUFSTELLUNG/PDF/LISTE): Chips pro Set + "+ Als Set
  speichern". Klick auf Chip = Anwenden. Hover-reveal für Umbenennen (Pencil) / Löschen (Trash) —
  Projektkonvention. Löschen über `ConfirmModal` (dark backdrop), kein `confirm()`.
- **Name-Modal** beim Speichern (dark backdrop). Umbenennen via gleiches Modal vorbefüllt.
- **UI-Politur** (Chip-Design, States, leerer Slot) über **frontend-design Skill** in der Umsetzung.

## Edge Cases

- **Apply mit abwesendem Spieler** → leerer Slot an dessen Batting-Order (Kernfall).
- **Spieler später aus Team gelöscht** → Set-Entry per Cascade weg; Set hat weniger Entries.
- **Spieltag bekommt/verliert Game nach Set-Speichern** → Set-Entries für nicht (mehr) existierende
  `game_number` werden beim Anwenden ignoriert; Games ohne Set-Entries bleiben unverändert.
- **Leerer Draft-Slot** wird nie persistiert — Speichern erzwingt sequenzielle 1..N.
- **DH-Batter abwesend** beim Apply → DH-Annotation am Field-Player wird verworfen (Field-Player bleibt,
  ohne DH). Field-Player abwesend → ganzer Slot leer (DH-Annotation entfällt mit).
- **Name leer/doppelt** → `@NotBlank`; Duplikate erlaubt (kein Unique-Constraint, Namen sind nur Labels).

## Nicht im Scope (YAGNI)

- Spieltag-übergreifende Templates.
- Sets mit eigenem Editor getrennt vom Live-Lineup.
- Staff/Coaches/Gegner/Scores im Set.
- Auto-Set-Erzeugung.

## Tests

- **Backend:** `LineupSetService`-Integrationstest (Testcontainers) — Snapshot kopiert alle Games
  korrekt, Rename, Delete, Cascade bei GameDay-Delete + Player-Delete.
- **Frontend:** Apply-Helper-Unit-Test — Mapping per `game_number`, Abwesender → null-Slot,
  DH-abwesend-Handling. `npm run build` + `npm run lint`.
- Live-Scoring nicht betroffen → keine E2E-Pflicht.
