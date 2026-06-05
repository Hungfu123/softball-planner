# Stationen-Lageplan v3 — Spieler-Rollen + Rotation — Design

**Datum:** 2026-06-05
**Status:** Approved (Brainstorming)
**Kontext:** Aufbauend auf dem Batting-Stationen-Lageplan (Feld-Ecke + Stationen + roter Leitfaden). Erweiterung: Spieler werden nummeriert, mit Rollen (aktiv/passiv) auf Stationen verteilt, und der rote Leitfaden zeigt die Rotation. Visuell mit frontend-design-Qualität (Dead-Sox-Look).

## Entscheidungen (Brainstorming)

1. **Rotation-Darstellung:** Statisch + Pfeile (ein Bild, kein Stepping/Animation).
2. **Spieleranzahl:** Aus Anwesenheit des Trainings (Outfield = Rest).
3. **Plätze je Station:** 2 (aktiv + passiv); Wahl-Combo (`choiceGroup` gesetzt) = einzeln (1 Platz).
4. **Nummerierung:** ungerade = aktiv, gerade = passiv/Hilfe (pro Paar erste/niedrigere Nummer aktiv).
5. **Puck zeigt Icon** statt Nummer. Korken-Label = "Korken/Whiffle".

## Modell

### Rollen je Stationstyp (abgeleitet, kein neues Feld)

| Typ | aktiv | passiv |
|-----|-------|--------|
| LIVE | schlägt | tosst |
| TEE | schlägt | Hilfe |
| BUNT | buntet | wirft |
| KORKEN | schlägt | tosst |
| HUETCHEN | (einzeln) | — |
| OTHER | (einzeln) | — |

Regel **paired vs single**: Station mit `choiceGroup != null` → **einzeln** (1 Platz, keine Rolle). Sonst **paired** (2 Plätze, aktiv+passiv). (HUETCHEN/OTHER ohne choiceGroup zählen ebenfalls paired mit Default-Rollen schlägt/tosst — die "einzeln"-Eigenschaft kommt ausschließlich aus `choiceGroup`.)

### Spieler-Nummerierung (deterministisch, kein Speichern)

Stationen in Array-/Routen-Reihenfolge durchgehen, Zähler ab 1:
- **paired** → zwei Nummern `[n, n+1]`: **n = aktiv** (ungerade im Default), **n+1 = passiv**. Zähler += 2.
- **single** → eine Nummer `[n]`. Zähler += 1.
- **Outfield** → restliche Nummern `zähler … playerCount` (nur wenn `playerCount` > vergebene).

Default-Set ergibt: Live 1/2, Tee 3/4, Bunt 5/6, Korken 7/8, Hütchen 9, Tee-Besen 10, Outfield 11…N.

### Spieleranzahl

`playerCount` = Anzahl anwesender Spieler des aktiven Trainings. Neuer Prop von `TrainingTodayPage` → `TrainingPlanView` → `StationsDiagram`. Outfield = `max(0, playerCount − Σ Stationsplätze)`. Fehlt `playerCount` (0/undefined) → kein Outfield-Cluster, nur Stationsnummern.

## Darstellung (StationsDiagram)

- **Puck** = Typ-Icon (groß, mittig), Diamant für LIVE. Keine Stationsnummer mehr.
- **Spieler-Badges** je Station: kleine runde Nummern neben dem Puck. **aktiv** = softball-red gefüllt, **passiv** = Outline/navy. Mini: nur Nummern; Vollbild: Nummer + Rollen-Label ("schlägt"/"tosst"/…).
- **Label** unter Puck (Stationsname, z.B. "Korken/Whiffle").
- **Roter Leitfaden** = orthogonale Route mit Pfeilen entlang der Rotations-Reihenfolge (Station 1 → 2 → … → letzte).
- **Outfield-Cluster**: restliche Nummern als kleine Badges in der offenen Feldfläche (Mitte/rechts), Label "Outfield".
- **Hinweiszeile** (Vollbild): "Rotation: passiv → aktiv → nächste Station".
- **WÄHLE-1-Rahmen** um choiceGroup-Paare bleibt.
- **Drag&Drop** der Stationen im Vollbild bleibt; Positionen weiter persistiert.

## Komponenten / Units

- `stationRoles.ts` (neu) — reine Logik: `assignPlayers(stations, playerCount)` → `{ stations: StationWithSlots[], outfield: number[] }`. `StationWithSlots` = Station + `slots: { number, role: 'active'|'passive'|'single', roleLabel: string }[]`. Inkl. Rollen-Label-Map je Typ. Voll testbar (Vitest), kein React.
- `deriveStations.ts` — unverändert (liefert `Station[]` mit Position). Korken-Default-Label "Korken/Whiffle".
- `StationsDiagram.tsx` — rendert Icon-Pucks + Spieler-Badges + Rollen + Outfield + Route. Nutzt `assignPlayers`. Neue Props: `playerCount?: number`. Drag/`editable`/`onMove` bleiben.
- `StationsEditorDrawer.tsx` — unverändert (Typ/Label/Level/choiceGroup/add/remove).
- `TrainingPlanView.tsx` — reicht `playerCount` an Diagramm; Karte/Vollbild wie bisher.
- `TrainingTodayPage.tsx` — übergibt Anzahl anwesender Spieler des aktiven Trainings als `playerCount`.

## Daten / Persistenz

Keine DB-Änderung. Rollen + Nummern + Outfield rein abgeleitet. `playerCount` kommt live aus der Anwesenheit (bereits im Frontend-State).

## Nicht im Scope (YAGNI)

- Stepping-/Auto-Animation der Rotation.
- Manuelle Spieler-namentliche Zuordnung (nur Nummern, nicht echte Spieler-Namen).
- Persistierte Rollen/Reihenfolge pro Spieler.
- Mehr als 2 Plätze je Station.

## Verifikation

- Vitest: `assignPlayers` (Nummerierung ungerade=aktiv, single bei choiceGroup, Outfield-Rest, Rollen-Labels).
- `npm run build` + `npm run lint`.
- Visuell Desktop + Mobile (Default-Set + mit playerCount, Outfield).
