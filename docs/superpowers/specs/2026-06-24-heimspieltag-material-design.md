# Heimspieltag-Material — Design-Spec

**Datum:** 2026-06-24
**Status:** Approved (Design), bereit für Implementierungsplan

## Problem / Zweck

Beim **Heimspieltag** baut Dead Sox alles selbst auf: Pavillons, Backstop, Bases,
Messband, Kalk (Linien), Hütchen (Outfield), Catering, Getränke. Zwei wiederkehrende
Fragen:

1. **Was brauchen wir?** — vollständige, wiederverwendbare Liste.
2. **Wo liegt was?** — die meisten Sachen sind in Garage oder Raum.

Aktuell nur im Kopf / WhatsApp. Ziel: am Spieltag live dokumentieren, was gebraucht
wurde und wo es lag — und beim nächsten Mal („wenn wir wieder dran sind") darauf
aufbauen statt bei null zu starten.

**Nicht-Ziel:** RSVP / Spieler-Koordination (läuft über WhatsApp). Keine
Verantwortlichen-Zuordnung in-app.

## Kernentscheidungen

- **Stamm-Katalog + Abhaken pro Heimspieltag** (Ansatz A). Katalog = wiederverwendbares
  lebendes Dokument; Haken-Status hängt am jeweiligen GameDay.
- **Kein Pro-Event-Snapshot** von Lagerort/Menge. „Wo es war" = aktueller Lagerort am
  Katalog (man will wissen, wo man es *holt*, nicht wo es historisch lag). Ändert sich
  der Ort → einmal am Katalog korrigieren.
- **v1 nur über das Material-Sheet am Spieltag.** Eigener Katalog-Pflegeort (`/orga`)
  später, falls nötig.
- **Kategorien:** feste Vorschläge (Aufbau / Spielmaterial / Catering) **+ frei tippbar**.
- **v1-Extras dabei:** Ansicht „nach Lagerort" + „vom letzten Heimspieltag übernehmen".

## Datenmodell

### Katalog-Item (global, wiederverwendbar)
- `id`
- `name` — z.B. Pavillon, Backstop, Bases, Messband, Kalk, Hütchen Outfield, Getränke
- `category` — Freitext mit Vorschlägen (Aufbau / Spielmaterial / Catering)
- `quantity` — Menge (Integer, z.B. 3)
- `storageLocation` — Freitext, Schnell-Vorschläge Garage/Raum ← „wo liegt was"
- `notes` — Freitext, optional (z.B. „Häringe nicht vergessen")

### Pro-Heimspieltag (Nutzung)
- Verknüpfung `(gameDayId, equipmentItemId)` mit `used: boolean`
- „Was haben wir gebraucht" = `used`-Haken dieses Spieltags
- „Wo war's" = `storageLocation` am Katalog-Item

### Tabellen (Flyway `V{n}__equipment.sql`)
- `equipment_item` — Katalog (Spalten siehe oben)
- `game_day_equipment` — `(game_day_id FK, equipment_item_id FK, used)`,
  Unique auf `(game_day_id, equipment_item_id)`.
  Cascade-Delete: Item gelöscht → zugehörige `game_day_equipment`-Zeilen weg.

## Backend (Onion / Hexagonal — bestehende Konventionen)

- **domain/model:** `EquipmentItem`
- **domain/port/out:** `EquipmentItemRepository`, `GameDayEquipmentRepository`
  (oder eine kombinierte Port-Schnittstelle; SOLID im Blick — splitten falls Service wächst)
- **application:** `EquipmentService` — Katalog-CRUD + Nutzungs-Toggle.
  Single Responsibility beachten; wenn Katalog-Pflege und Event-Nutzung zu groß werden,
  in `EquipmentCatalogService` + `GameDayEquipmentService` trennen.
- **adapter/in/web:** `EquipmentController`
- **adapter/dto:** Request/Response-Records mit Bean-Validation (`@NotBlank` name,
  `@Min(0)` quantity)
- **adapter/out/persistence:** Entity / Repository / Mapper / Adapter je Modell

### Endpoints (alles sofort persistent, reload-fest)
- `GET  /api/gamedays/{id}/equipment` — Katalog + `used`-Status für diesen Spieltag
- `PUT  /api/gamedays/{id}/equipment/{itemId}` `{used}` — Haken setzen/lösen
- `POST /api/equipment` — neue Sache (Katalog) anlegen
- `PUT  /api/equipment/{itemId}` — Sache bearbeiten
- `DELETE /api/equipment/{itemId}` — Sache aus Katalog löschen (Cascade)
- `POST /api/gamedays/{id}/equipment/carry-over` — Items vorhaken, die am letzten
  Heimspieltag der Saison `used` waren

Validation/Errors über `GlobalExceptionHandler` (`BusinessValidationException` → 400,
`ResourceNotFoundException` → 404). State-Changes auf INFO loggen.

## Frontend

- **Hook:** `useEquipment(gameDayId)` — lädt Katalog + Nutzung, kapselt
  toggle/add/edit/remove/carryOver. Optimistic UI, bei Fehler Rollback + Toast
  (wie bestehende Mutations). Komponenten präsentational.
- **Einstieg:** Button **„Material"** im GameDay-Header (neben Anwesend / Live scoren),
  Icon `ClipboardListIcon`.
- **Sheet:**
  - **Handy:** vollflächiges Sheet, sticky Header (Titel · „Dabei 12/15" · `XMark`),
    sticky „+ Sache" unten. Ganze Reihe tappbar = abhaken. `⋯` immer sichtbar.
    Gruppen einklappbar.
  - **Desktop:** zentriertes dark-backdrop-Modal (~640px), Gruppen offen,
    Edit/Delete (`Pencil`/`TrashBin`) hover-reveal.
  - Eine Spalte, Breakpoints `lg:` (keine arbitrary brackets, Tailwind v4).
- **Gruppierung-Toggle:** nach Kategorie ↔ nach Lagerort („alles aus Garage" = eine Fahrt).
- **Vom letzten Mal übernehmen:** Button, wenn der Spieltag noch keine Haken hat →
  ruft `carry-over`.

### Reihen-Anatomie / Lesbarkeit
- `● Name ×Menge 📍Lagerort !` — Name dominiert (navy-900 semibold, ~16px mobil),
  Rest gedämpft.
- Abgehakt = `CheckCircle` rot gefüllt (KEIN Durchstreichen). Offen = leerer Kreis
  `cream-400`.
- Zeilenhöhe ≥52px. Menge `tabular-nums`. Lange Namen/Orte truncate + … (nie 3-zeilig).
- Lagerort-Chip `cream-100`/`navy-800`. Notiz nur als `AlertTriangle`-`!` (`amber-400`),
  Tap expandiert.
- Gruppen-Header `navy-900` uppercase tracking-widest, Mini-Fortschritt `3/4`.

### Editieren
- **Zeile tappen = abhaken.** Editieren nur explizit über `Pencil` (kein Versehen).
- Pencil → Reihe klappt inline zum Mini-Formular auf (gleiche Form wie „+ Sache"):
  Name · Kategorie · Menge · Ort · Notiz, mit Schnell-Vorschlägen.

### Löschen — zwei getrennte Bedeutungen
- **„Nicht diesmal" = Haken weg** (untick). Bleibt im Katalog. Normalfall.
- **`TrashBin` = ganz aus Katalog löschen** → `ConfirmModal`: „Pavillon dauerhaft aus
  dem Material-Katalog löschen? Wird aus allen Spieltagen entfernt." (kein `confirm()`).
- Kein Swipe-to-delete (zu leicht versehentlich am Platz).

### Icons (nur eigenes Set, kein Lucide)
`ClipboardListIcon` (Feature), `CheckCircle` (abgehakt), `PlusCircle` (add),
`Pencil` (edit), `TrashBin` (delete), `AlertTriangle` (Notiz-Marker), `XMark` (schließen),
`CrossBones` (Leerstate). Keine Pro-Item-Bild-Icons (keine für Bases/Backstop vorhanden).

### Leerstate (erstes Mal)
`CrossBones` + „Noch keine Sachen — leg los, baut sich beim Aufbau von selbst auf."

## Tests

- **Backend Integration (Testcontainers):** Toggle/Add/Edit/Delete, danach **neu laden**
  und prüfen dass alles persistiert ist (Persistenz explizit testen — die Lücke vom
  jüngsten Tab-Bug, wo `games.length` nie geprüft wurde). Carry-over-Logik testen.
  Cascade-Delete testen.
- **Frontend:** Hook-Logik (optimistic toggle + Rollback), Gruppierung Kategorie/Ort.
- **Pre-Commit:** `npm run build` + `./mvnw test -s .mvn/local-settings.xml`.

## Offen / Später (YAGNI)

Abbau-Modus (zweiter Haken „eingepackt"), „Fehlt noch"-Filter, WhatsApp-Share der
Liste, eigener `/orga`-Katalogpflege-Ort, Foto pro Lagerort, mehrere Vorlagen.
