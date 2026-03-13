# Lineup Auto-Generate

## Übersicht
Automatisches Befüllen der Lineup-Positionen für ein oder alle Spiele eines Spieltags.

## Positionen

| Auto-befüllt | Manuell |
|--------------|---------|
| 1B, 2B, 3B, SS, LF, CF, RF (7) | P, C, EH, DH |

## Spieler-Auswahl (Priorität)

| Priorität | Kriterium |
|-----------|-----------|
| 1 | Wenigste Einsätze am Spieltag (über alle Spiele hinweg) |
| 2 | Höchste Trainingsbeteiligung |

- **Kein Training** = 0 Beteiligung = niedrigste Priorität
- **DH-Batter** zählt nicht als Einsatz
- **Staff** (z.B. Base Coach) wird nur pro Spiel ausgeschlossen, nicht spieltagübergreifend
- Staff wird **nicht** vom Auto-Generate befüllt oder verändert

## Positions-Zuweisung

- Komplett zufällig (kein History-basiertes Matching)
- Positionen werden zufällig sortiert, Spieler werden zufällig zugewiesen

## Bestehende Einträge

- Manuelle Einträge werden respektiert und nicht überschrieben
- Bereits eingetragene Spieler zählen für die Einsatz-Zählung
- Spieler ohne Position im Lineup bekommen eine zufällige Position zugewiesen
- Nur leere Positionen werden befüllt ("Rest auffüllen")
- Nochmal klicken = neuer Zufall (manuelle Einträge bleiben)

## Edge Cases

- **Zu wenig Spieler**: So viele Positionen wie möglich füllen
- **Alle Positionen besetzt**: Auto-Positionen werden trotzdem neu gewürfelt
- **Reihenfolge egal**: Einzel-Auto prüft immer alle Spiele des Spieltags, egal ob Spiel 3 vor Spiel 1 befüllt wird

## Funktionen

### Einzel-Auto (pro Spiel)
- Button im LineupEditor Header (Würfel-Icon), neben dem Trash-Button
- Befüllt nur das ausgewählte Spiel
- Prüft alle anderen Spiele des Spieltags für die Einsatz-Zählung
- Wird **nicht** automatisch gespeichert — User kann anpassen und dann selbst speichern
- Nochmal klicken = neuer Zufall
- Nur sichtbar/aktiv wenn es noch leere Positionen gibt

### Alle Auto (Spieltag-Ebene)
- Button im GameDayPlanner Header-Bereich ("Alle aufstellen")
- Befüllt alle Spiele des Spieltags sequentiell
- Auto-Positionen werden in allen Spielen neu gewürfelt (auch wenn schon befüllt)
- Bereits befüllte Spiele (manuell oder auto) werden für die Einsatz-Zählung berücksichtigt
- **Speichert direkt automatisch** (kein manuelles Speichern nötig)
- Confirm-Modal vor Ausführung: "Alle Spiele automatisch aufstellen und speichern?"
- Bei ungespeicherten Änderungen im aktuellen Spiel: Warnung im Modal

### Rückgängig (nach "Alle Auto")
- Nach erfolgreichem Speichern: Toast mit "Rückgängig" Button
- Toast bleibt **10 Sekunden** sichtbar
- Klick auf "Rückgängig" → alter Zustand aller Lineups wird wiederhergestellt
- Vor dem Speichern wird der alte Zustand aller Lineups gemerkt
