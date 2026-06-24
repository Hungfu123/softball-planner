# Lageplan (Venue-Map) für Aufbau-Heimspieltag — Design-Spec

**Datum:** 2026-06-24
**Status:** Approved (Design), bereit für Plan
**Baut auf:** Aufbau-Heimspieltag-Katalog (`/orga/aufbau`, `EquipmentCatalogPage`, Items mit `storageLocation`, gruppiert nach Lagerort).

## Problem / Zweck

Dead Sox baut den Heimspieltag jedes Jahr selbst auf und will wissen **wo die Sachen
physisch liegen**. Die Liste sagt „Garage / Halle / Spint", aber neue Helfer wissen nicht
**wo diese Orte sind**. Eine **Schemakarte des Geländes** (Schule + Halle + Garage +
Lagerräume + Laufbahn) macht die Lagerorte räumlich greifbar und verknüpft sie mit dem
Inventar.

## Kernentscheidungen

- **Themed SVG-Schemakarte** (kein Satellitenbild) — im App-Stil wie die bestehenden
  `FieldView`/`DiamondView`-SVGs (cream-Fläche, navy-Outline, softball-red-Akzent).
- **Geometrisch treu zum Luftbild** (User-Skizze): grobe echte Proportionen + Anordnung
  + Winkel — Flur als langer **diagonaler** Riegel (steigt nach NO/rechts an), Halle groß
  darunter, Garage separat rechts, die drei kleinen West-Räume am SW-Ende, **Laufbahn**
  unten-rechts gebogen. Nicht orthogonal-abstrakt.
- **Klickbar, mit Liste verknüpft**: Klick auf ein Gebäude filtert die Liste auf diesen
  Lagerort; aktives Gebäude hervorgehoben; „Alle anzeigen" / nochmal klicken hebt auf.
- **Kartenzonen = kanonische Lagerorte**: die Zonen-Namen werden die Default-Lagerorte
  im Form-Dropdown. Freitext-Create bleibt; nicht-kartierte Orte (Altdaten) bleiben in
  der Liste sichtbar, leuchten aber nicht auf der Karte.
- Frontend-only — kein Backend/Migration (storageLocation existiert).

## Zonen

Klickbare Lager-Zonen (= Lagerorte):
- **Garage** · **Halle** · **Flur** · **Spint** · **Geräteraum** · **Schrank**

Deko/Orientierung (nicht klickbar):
- **Laufbahn** (rote gebogene Bahn unten-rechts) · optional Bäume/Grün-Andeutung.

Layout (relativ, aus der Skizze):
- **Flur**: langer schmaler Riegel quer oben, diagonal (West-Ende tiefer, steigt nach
  Ost/rechts). Größtes Gebäude.
- **Spint / Geräteraum / Schrank**: kleine Blöcke am **West-Ende** des Flurs (links),
  gestapelt/nebeneinander — es sind Räume in dem Trakt.
- **Halle**: großer Block **unter** dem Flur, leicht links versetzt.
- **Garage**: kleinerer separater Block **rechts** vom Ost-Teil des Flurs.
- **Laufbahn**: gebogenes Oval/Segment unten-rechts (Süden).

## Komponenten

- **`VenueMap`** (neu, `frontend/src/components/equipment/VenueMap.tsx`):
  - Props: `{ counts: Record<string, number>; selected: string | null; onSelect: (loc: string | null) => void }`.
  - Rendert das SVG (viewBox, Polygone/rotierte Rechtecke je Zone + Laufbahn-Pfad +
    Labels). Zone als `<g>` mit `onClick={() => onSelect(name === selected ? null : name)}`,
    `role="button"`, Tastatur-Fokus, `aria-label`.
  - Aktive Zone gefüllt navy/softball-red, sonst cream + navy-Outline. Pro Zone ein
    kleines Count-Badge (Anzahl Sachen). Hover-Highlight.
  - Koordinaten als Konstanten-Map (wie `FIELD_COORDS` in FieldView), damit Geometrie
    leicht nachjustierbar ist.
  - Responsive über `viewBox` + `w-full h-auto`; lesbare Labels auch mobil.
- **`EquipmentCatalogPage`** (ändern):
  - Neuer State `selected: string | null` (gewählter Lagerort).
  - `VenueMap` in einer Card oben (unter Untertitel, über der Liste), bekommt `counts`
    (Anzahl Items je `storageLocation`) + `selected` + `onSelect`.
  - Liste: wenn `selected` gesetzt → nur die Gruppe dieses Orts zeigen, sonst alle.
    „Alle anzeigen"-Chip wenn gefiltert.
  - Counts: `storageLocation?.trim() || 'Ohne Ort'` zählen.
- **`EquipmentItemForm`** (kleine Änderung):
  - `LOCATION_SUGGESTIONS` von `['Garage','Raum']` → die 6 Kartenzonen
    `['Garage','Halle','Flur','Spint','Geräteraum','Schrank']`. (Create-new bleibt.)

## Datenfluss

Keine API-Änderung. `EquipmentCatalogPage` hält `selected`; `VenueMap` ist
präsentational (zeichnet + meldet Klick zurück). Counts aus den geladenen Items
berechnet (`useMemo`). Filter rein clientseitig über `selected`.

## Konsistenz / Altdaten

- Kartenzonen sind **fix** (dieses eine Vereinsgelände — Single-Team-App). Items mit
  einem Lagerort außerhalb der Zonen (z.B. „Im Spint", „Ohne Ort") erscheinen weiter
  in der Liste, werden aber nicht auf der Karte hervorgehoben. Der User kann sie per
  Edit auf einen Kanon-Ort ziehen.
- Klick auf eine Zone ohne Items → leere gefilterte Liste + Hinweis „Hier liegt noch
  nichts."

## Tests

- FE `npm run build` + `npm run lint` grün. Karte ist präsentational; Interaktion
  (select/clear/filter) per Augenschein nach Deploy verifizieren — Geometrie wird
  visuell nachjustiert (erste Version = Koordinaten aus der Skizze geschätzt).

## Offen / Später (YAGNI)

Aufbau-Reihenfolge/Stationen (separate Idee, nicht Teil dieser Karte); Zonen im UI
editierbar machen; mehrere Gelände/Mandanten.
