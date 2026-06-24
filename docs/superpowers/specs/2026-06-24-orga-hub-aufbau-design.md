# Orga-Hub + Aufbau-Heimspieltag-Katalog — Design-Spec

**Datum:** 2026-06-24
**Status:** Approved (Design), bereit für Implementierungsplan
**Baut auf:** Heimspieltag-Material (Migration V40, EquipmentItem, EquipmentService, `/api/.../equipment`-Endpoints, MaterialSheet) — bereits gemerged.

## Problem / Zweck

`/orga` zeigt aktuell direkt die Einladungsliste. Es soll ein **Hub** werden mit zwei
Bereichen: **Einladungen** (bestehend) und **Aufbau Heimspieltag** (neu). „Aufbau
Heimspieltag" ist die globale **Stammliste/Referenz** für den Heimspieltag-Aufbau:
„was brauchen wir + wo liegt es", pflegbar ohne einen konkreten Spieltag offen zu haben.

Das **Abhaken pro Spieltag bleibt unverändert am GameDay** (das bestehende
MaterialSheet). Orga = Wissen/Pflege, Spieltag = live abhaken.

**Nicht-Ziel:** kein Abhaken/Spieltag-Bezug auf der Orga-Seite; keine neue
Datenstruktur (Katalog existiert bereits als `equipment_item`).

## Kernentscheidungen

- `/orga` wird **Hub mit Unterseiten** (2 Kacheln → eigene Routen).
- Orga-Seite „Aufbau Heimspieltag" = **globaler Katalog/Referenz** (anlegen/bearbeiten/
  löschen + Lagerort), **kein** `used`/Spieltag.
- Begriff **„Aufbau Heimspieltag"** statt „Material". GameDay-Button-Label
  „Material" → **„Aufbau"** (Konsistenz).
- DRY: das Item-Formular aus `MaterialSheet` wird in eine geteilte
  `EquipmentItemForm` extrahiert und von Sheet + Katalog-Seite genutzt.

## Navigation / Routing

- `/orga` → neue **Hub-Seite** (`OrgaHome`): 2 Kacheln in eurer Card-Optik:
  - „Einladungen" (Mail-Icon) → `/orga/einladungen`
  - „Aufbau Heimspieltag" (`ClipboardListIcon`) → `/orga/aufbau`
- `/orga/einladungen` → bestehende `InvitationListPage` (nur verschoben, Inhalt unverändert).
- `/orga/aufbau` → neue `EquipmentCatalogPage`.
- Nav-Eintrag „Orga" (Layout.tsx, Mail-Icon) bleibt, zeigt auf `/orga`.
- Routen liegen wie bisher unter `Layout` in `App.tsx`.

## EquipmentCatalogPage (`/orga/aufbau`)

- Globale Stammliste, **kein Spieltag-Bezug, kein Abhaken-Status**.
- Gruppiert nach Kategorie; Toggle **Kategorie ↔ Lagerort** wie im Sheet
  („alles aus Garage" auf einen Blick).
- Reihe: `Name ×Menge 📍Lagerort` + Notiz-`!` (Tap expandiert). Keine Status-Kreis/Checkbox.
- Aktionen: **+ Sache** (anlegen), **Pencil** (bearbeiten, inline `EquipmentItemForm`),
  **TrashBin** (löschen → `ConfirmModal`: „… dauerhaft aus dem Katalog löschen? Wird
  aus allen Spieltagen entfernt.").
- Leerstate: `CrossBones` + „Noch keine Sachen — leg den Heimspieltag-Aufbau an."
- Icons nur aus `@/icons`. Tailwind v4 (Bracket-Werte wie im restlichen Code erlaubt).
  German UI. Hover-reveal Edit/Delete (Desktop), mobil immer sichtbar.

## Shared Component: `EquipmentItemForm`

- Extrahiert aus `MaterialSheet.tsx` (dort als `ItemForm`).
- Neue Datei `frontend/src/components/orga/EquipmentItemForm.tsx` (oder
  `components/planner/` falls passender — Implementierung entscheidet nach Imports).
- Props: `{ initial: EquipmentInput | EquipmentItem; onCancel: () => void; onSubmit: (input: EquipmentInput) => Promise<void> }`.
- Verhalten unverändert: Felder Name·Kategorie·Menge·Ort·Notiz, datalist-Vorschläge,
  `useId` für datalist-IDs, submit normalisiert leere Strings → `null`.
- `MaterialSheet` importiert die geteilte Form (entfernt sein lokales `ItemForm`).

## Frontend State

- Hook `useEquipmentCatalog()` (analog `useLineupSets`, ohne gameDayId):
  `{ items, loading, add, edit, remove, reload }`. `items: EquipmentItem[]` (das
  `used`-Feld ist hier immer false/irrelevant — der Katalog-GET liefert kein `used`;
  Typ-seitig wird `used` als optional behandelt oder ein eigener Katalog-Typ verwendet).
  Entscheidung: neuer Typ `EquipmentCatalogItem = Omit<EquipmentItem, 'used'>` für
  Klarheit; Hook arbeitet damit.

## Backend (2 kleine Endpoints, Service-Methoden existieren)

In `EquipmentController`:
- `GET /api/equipment` → `List<EquipmentResponse>` via `equipmentService.findAll()`
  (Katalog, kein `used`).
- `POST /api/equipment` (`@Valid EquipmentRequest`) → 201 `EquipmentResponse` via
  `equipmentService.create(name, category, quantity, storageLocation, notes)`
  (Katalog-Item ohne Spieltag/used).
- `PUT /api/equipment/{itemId}` und `DELETE /api/equipment/{itemId}` existieren bereits.

Keine Migration, kein neues Domain-Modell, keine neuen Ports.

## API-Client (Frontend)

In `src/api/client.ts`:
- `getEquipmentCatalog()` → `request<EquipmentCatalogItem[]>('/equipment')`
- `createEquipmentItem(input: EquipmentInput)` → `request<EquipmentCatalogItem>('/equipment', { method: 'POST', body: JSON.stringify(input) })`
- (`updateEquipment`, `deleteEquipment` existieren bereits.)

## GameDay-Sheet

- Unverändert in Funktion. Nur Button-Label im `GameDayPlanner` Header (Desktop-Toolbar
  + Mobile `ToolbarBtn`) **„Material" → „Aufbau"**. Icon bleibt `ClipboardListIcon`.
- `MaterialSheet` nutzt nun die geteilte `EquipmentItemForm` (kein Verhaltenswechsel).

## Tests

- **Backend Integration** (Testcontainers, in `EquipmentIntegrationTest` ergänzen):
  - `GET /api/equipment` listet angelegte Katalog-Items (nach create), kein `used`-Feld nötig.
  - `POST /api/equipment` legt ein Item an; danach erscheint es in `GET /api/equipment`
    (reload-fest).
- **Frontend:** `npm run build` + `npm run lint` grün. (Keine Logik-Unit-Tests nötig;
  Hook ist dünn, Komponenten präsentational.)

## Offen / Später (YAGNI)

Abbau-Modus, „Fehlt noch"-Filter, WhatsApp-Share, Foto pro Lagerort — wie in der
Material-Spec; nicht Teil dieses Umbaus.
