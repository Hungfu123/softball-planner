# Anforderungen — Softball Lineup Planner

## Aktuell umgesetzt

### Saison-Verwaltung
- Saisons erstellen, bearbeiten, löschen
- Saison-Auswahl per Dropdown
- Auto-Erstellung des eigenen Teams ("Dead Sox") pro Saison

### Spieltag-Verwaltung
- Spieltage erstellen mit Datum, Label, Ort
- Bis zu 3 Spiele pro Spieltag
- Spieler als "anwesend" markieren (Checkbox-Modal)
- Spieltag bearbeiten/löschen

### Lineup-Editor
- Drag & Drop Reihenfolge (dnd-kit)
- Max 10 Spieler pro Lineup
- Positionszuweisung (P, C, 1B, 2B, 3B, SS, LF, CF, RF, EH)
- Designated Hitter (DH) — max 1 pro Spiel, nur für Feldspieler
- Lineup kopieren von anderem Spiel
- Lineup tauschen zwischen Spielen (Swap)
- Lineup leeren mit Bestätigung
- Ungespeicherte Änderungen: Warnung bei Navigation

### Coaches
- 1st Base Coach + 3rd Base Coach pro Spiel
- Auto-Save bei Dropdown-Änderung
- Nur verfügbare Spieler (nicht im Lineup/DH)

### Gegner & Ergebnisse
- Gegner-Team pro Spiel zuweisen
- Teams erstellen, umbenennen, löschen
- Ergebnis eintragen (Score Us : Score Them)
- Liga-Tabelle mit Standings (W/L/T, Win%, RS, RA, +/-)
- Ergebnisse anderer Teams eintragen (für Tabelle)

### Spieler-Pool
- Spieler erstellen, umbenennen, löschen
- Pool-Ansicht: freie Spieler sortiert nach Spielanzahl
- Übersicht-Tab: alle Spieler mit Positionen + Spielanzahl
- Trainingsbeteiligung-Tab: Balkendiagramm pro verfügbarem Spieler
- Farbcodierte Badges (rot=0, amber=1, blau=2, grün=3+)
- Bench-Anzeige (verfügbar aber nicht aufgestellt)

### Fahrgemeinschaften (Carpool)
- Autos erstellen: Fahrer, Sitzplätze (2-9), Richtung
- Kapazitäts-Anzeige pro Richtung (Hin/Rück)
- Autos bearbeiten/löschen

### Statistiken
- Saison-Stats: Spiele pro Spieler, Positionsverteilung
- Spieltag-Stats: Spielanzahl + Positionen pro Spieler

### Export
- PDF-Export direkt aus Spieltag (jsPDF)
- Dateiname: Lineup_[Ort]_[Saison_Jahr].pdf
- Daten-Export/-Import (JSON Backup)

### Training-Tracking
- Anwesenheits-Matrix (Spieler × Trainings), Tap togglet ✓/—
- Sticky linke Spalte, horizontales Scrollen
- Trainingstypen: Normal (Navy) und P/C (Rot)
- Training anlegen: Einzeln oder Wöchentlich (kombiniertes Modal mit Validierung)
- Zeiträume: erstellen, auswählen, löschen (mit Bestätigungsdialog)
- Bulk-Create: upsert bestehende Trainings, Anwesenheit bleibt erhalten
- Training absagen, löschen
- CSV-Import (Google Sheets kompatibel, Drag & Drop)
- Stammspieler automatisch als anwesend bei neuem Training
- Statistik: Balkendiagramm, Filter (Letzte 8 Wochen / Seit Beginn / Alle)
- Animierter Ladebalken
- Batch-API: Anwesenheit aller Trainings in einem Call

### Navigation
- Tabs: **Spielbetrieb** | **Training** | **Spieler**
- Aktiver Tab mit visueller Markierung

### API-Optimierungen
- Batch-Endpoint: Training-Anwesenheit (1 statt N Calls)
- Batch-Endpoint: Spieltag Lineups+Staff (1 statt 2N Calls)
- Einzeln-Endpoint: Season per ID (statt alle laden)

### UI/UX
- Farbhierarchie: Navy=primär, Weiß=sekundär, Rot=Akzent
- Weiße Karten mit shadow-sm auf grauem Hintergrund
- Invertierte Hover-Buttons (navy bg, weiße Schrift)
- Filled SVG Icons
- cursor-pointer auf allen interaktiven Elementen
- Deutsche Oberfläche durchgehend
- Modals mit dunklem Backdrop
- Toast-Benachrichtigungen (Success/Error)
- Responsive: Desktop 3-Spalten, Mobile gestapelt
- Basic Auth (Passwort-Login)

---

## Geplant (noch nicht begonnen)

### Lineup Auto-Generate
- Automatischer Lineup-Vorschlag basierend auf:
  - Trainingsanwesenheit (wer oft trainiert, wird bevorzugt)
  - Jeder spielt mindestens 1 Spiel
  - Positions-History aus vorherigen Spielen berücksichtigen
  - Spiel 2 baut auf Spiel 1 auf (kein Doppelt-Sitzen)
- Nur Positionen 1-9 (ohne EH)
- Vorschlag als Basis, manuell anpassbar

### Dark Mode
- Dunkles Theme (Navy-basiert)
- Toggle im UI
- System-Präferenz respektieren

### PWA / Offline
- App auf dem Handy installierbar (Service Worker)
- Lineup offline einsehen
- Trainings-Erfassung offline → Sync wenn wieder online
