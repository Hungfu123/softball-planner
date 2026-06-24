# Aufbau-Heimspieltag PDF-Export — Design-Spec

**Datum:** 2026-06-24
**Status:** Approved (Design), bereit für Plan
**Baut auf:** Aufbau-Heimspieltag-Katalog + Lageplan (`/orga/aufbau`, `EquipmentCatalogPage`, `VenueMap`, Items mit `storageLocation`).

## Problem / Zweck

Zum Drucken/Teilen vor dem Heimspieltag braucht's eine Übersicht „was steht wo".
Eine einzige lange Liste ist unübersichtlich. Stattdessen: ein **annotierter Lageplan
als PDF** — die Karte + pro Lagerort eine kleine Liste, **Verbindungslinie zeigt wo was
hingehört**. Orte, die nicht auf der Karte sind (eigene Orte wie „bei Hung", „kein Ort"),
kommen als Block **darunter**.

## Kernentscheidungen

- **Querformat A4** (Platz für Karte + Listen).
- **Annotierte Karte:** Karte vektoriell gezeichnet (gleiche Zonen-Geometrie wie die
  `VenueMap`), pro Lagerort mit Items ein Listen-Kärtchen + dünne **Leader-Linie** zum
  Gebäude.
- **Nicht-Karten-Orte** (storageLocation ∉ Lageplan-Zonen, inkl. „kein Ort"/null und
  eigene Orte) → Block **unten** („Weitere Orte"), ohne Linie.
- **Kärtchen-Inhalt:** `Name ×Menge` (Menge nur bei >1). **Notiz mit**, falls vorhanden —
  klar als Notiz gekennzeichnet (kursiv/grau, kleines `!`-Präfix), z.B. `! Häringe nicht vergessen`.
- **Karte breiter als die Liste:** die Listen-Kärtchen sind schlank → Karte bekommt den
  größeren Anteil (~65% Breite), Kärtchen-Spalte schmaler (~32%).
- **Vektoriell** mit jsPDF (wie die bestehenden PDF-Utils), navy/cream/rot, helvetica.
- DRY: die Zonen-Geometrie wird aus `VenueMap` in ein geteiltes Modul extrahiert, das
  Karte (Screen-SVG) und PDF teilen.

## Architektur / Komponenten

- **`venueLayout.ts`** (neu, `frontend/src/components/equipment/venueLayout.ts`):
  - Exportiert `LOCATION_SUGGESTIONS` (die 6 Lageplan-Zonen) und `VENUE_ZONES`
    (Name, Rechteck x/y/w/h, Label-Anker, ggf. `inner`/`vertical`) + ggf. `TREES`,
    Laufbahn-Pfade, Eingangs-Pfeile — alles, was Karte + PDF brauchen.
  - `VenueMap.tsx` importiert daraus (statt lokaler Konstanten).
  - `EquipmentItemForm.ts` importiert `LOCATION_SUGGESTIONS` von hier (statt aus
    EquipmentItemForm — Abhängigkeitsrichtung sauberer) ODER bleibt, solange ein
    Re-Export existiert. Implementierung entscheidet, ohne zyklische Importe.
- **`aufbauPdf.ts`** (neu, `frontend/src/utils/aufbauPdf.ts`):
  - `generateAufbauPdf(items: EquipmentCatalogItem[]): void` — erzeugt & speichert das PDF.
  - Reine Helper (testbar) ausgelagert:
    - `partitionByLocation(items)` → `{ mapGroups: {zone, items}[], otherGroups: {name, items}[] }`
      — Items nach `storageLocation` gruppieren; Gruppen, deren Ort eine Lageplan-Zone ist,
      sind `mapGroups`; alles andere (custom + null→„Ohne Ort") `otherGroups`.
    - `formatItemLine(item)` → `"Name"` oder `"Name ×N"` (N>1).
- **`EquipmentCatalogPage.tsx`**: Button **„PDF"** (neben „Zurück zur Orga"/Titel),
  ruft `generateAufbauPdf(items)`. Deaktiviert/ausgeblendet, wenn keine Items.

## PDF-Layout (A4 quer, 297×210mm)

- **Kopf:** Titel „Aufbau Heimspieltag — Lageplan & Material", rechts DeadSox-Logo
  (wie andere PDFs), dünne Trennlinie.
- **Karte links** (~65% Breite, dominanter Teil): Grundriss vektoriell (Flur/Geräteraum/
  Spint/Schrank/Halle/Garage + Laufbahn + Eingangs-Pfeile), navy-Outlines auf hellem Grund.
- **Lagerort-Kärtchen rechts** (~32%, schmale Spalte): gestapelt, je Lageplan-Ort MIT
  Items ein Kärtchen:
  - Header = Ortsname (navy, fett), darunter Items als `• Name ×N`; Notiz darunter als
    `! Notiztext` (kursiv/grau, klar als Notiz erkennbar).
  - Dünne **Leader-Linie** vom linken Kärtchen-Rand zum Gebäude-Zentrum auf der Karte.
  - Reihenfolge der Kärtchen grob nach vertikaler Gebäudeposition → weniger Linien-Kreuzung.
- **„Weitere Orte" unten:** Block mit den Nicht-Karten-Orten (custom + „Ohne Ort"),
  je Ort `Ort: Item ×N, Item, …` kompakt, ohne Linie.
- Leerfall: gibt es keine Items → Button nicht anzeigen (kein leeres PDF).

## Daten / Fluss

Keine API-/Backend-Änderung. Der Button nutzt die bereits geladenen `items` der
`EquipmentCatalogPage` und ruft `generateAufbauPdf(items)`. Gruppierung/Format rein
clientseitig.

## Tests

- **Unit (vitest, wie `pdfExport.test.ts`):** `partitionByLocation` (Map- vs Other-Gruppen,
  null→„Ohne Ort", custom→other), `formatItemLine` (×N nur bei >1). Plus ein Smoke-Test,
  dass `generateAufbauPdf(sampleItems)` ohne Exception durchläuft (jsPDF im jsdom).
- **Build/Lint** grün.

## Offen / Später (YAGNI)

Notizen im PDF; pro-Spieltag-Variante; Abbau-Reihenfolge; Mehrsprachigkeit.
