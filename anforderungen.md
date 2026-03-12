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

## In Entwicklung

### Training-Tracking
**Ziel:** Excel + WhatsApp-Ablesen ersetzen durch schnelle In-App-Erfassung

#### Backend
- `Training` Entity: Datum, Uhrzeit (optional), Ort (optional), abgesagt-Flag
- `TrainingAttendance` Entity: Training + Spieler + anwesend (boolean)
- `regular` Flag auf Player (Stammspieler)
- Endpoints: CRUD Trainings, Attendance setzen/lesen, Statistiken
- Automatisches Vorausfüllen: Stammspieler = anwesend bei neuem Training
- Abgesagte Trainings zählen nicht in Statistik

#### Frontend — Matrix-Ansicht
- Eine Tabelle, alle Trainings auf einen Blick (wie Excel)
- Sticky linke Spalte: Spielernamen bleiben sichtbar beim Scrollen
- Spalten: je ein Trainingsdatum, neueste rechts
- Zellen: Tap togglet ✓/— (anwesend/nicht da)
- Auto-Save bei jedem Toggle
- Abgesagte Trainings: grau/durchgestrichen
- Summenzeile unten: Anwesende pro Training
- Summe rechts: Gesamt-Anwesenheit pro Spieler

#### Neues Training anlegen
- Tap auf Datum-Spalte: alle Stammspieler automatisch ✓
- "Neues Training" Button: Datum (Pflicht), Uhrzeit + Ort (optional)
- Ganzes Training absagen oder löschen

#### Statistik-Ansicht (unterhalb Matrix)
- Balkendiagramm pro Spieler
- Sortiert nach Anwesenheit absteigend
- Prozent-Anzeige (anwesend / mögliche Trainings)
- Stammspieler visuell hervorgehoben

#### Stammspieler-Markierung
- Toggle in Spieler-Verwaltung: Spieler als "Stamm" markieren
- Stammspieler werden bei neuem Training automatisch als anwesend eingetragen
- Gilt ab sofort (nicht rückwirkend)

### Navigation-Umbau
- Tabs in der Header-Leiste: **Spielbetrieb** | **Training** | **Spieler**
- Spielbetrieb = aktuelles Dashboard (Saison, Spieltage, Liga)
- Training = Matrix + Statistik (neu)
- Spieler = Spieler-Verwaltung (existiert)
- Aktiver Tab mit visueller Markierung

---

## Geplant (noch nicht begonnen)

### Verfügbarkeits-Historie
- Gesamtübersicht: wer war wie oft da (Training + Spieltage kombiniert)
- Zuverlässigkeits-Score pro Spieler pro Saison
- Verlauf über Zeit (Trend: wird mehr/weniger aktiv)

### Lineup Auto-Generate
- Automatischer Lineup-Vorschlag basierend auf:
  - Wer hat am wenigsten gespielt (Fairness)
  - Trainingsanwesenheit (wer oft trainiert, wird bevorzugt)
  - Positions-Rotation (nicht immer gleiche Position)
- Vorschlag als Basis, manuell anpassbar
- Sortierung im Pool berücksichtigt Trainingsquote

### Dark Mode
- Dunkles Theme (Navy-basiert)
- Toggle im UI
- System-Präferenz respektieren

### PWA / Offline
- App auf dem Handy installierbar (Service Worker)
- Lineup offline einsehen
- Trainings-Erfassung offline → Sync wenn wieder online
