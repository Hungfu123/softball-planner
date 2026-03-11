# Softball Lineup Planner

Lineup-Planungstool fuer Softball-Teams. Verwaltet Saisons, Spieltage, Lineups, Positionen und Statistiken.

## Warum diese App?

- **Schluss mit Zettelwirtschaft:** Kein Hin-und-Her mehr mit WhatsApp-Listen oder handgeschriebenen Lineups
- **Faire Aufstellung:** Die App zeigt automatisch, wer wie oft gespielt hat — Spieler mit weniger Einsaetzen stehen oben im Pool
- **Schnell am Spieltag:** Lineup vom letzten Spiel kopieren, anpassen, fertig. Druckbares Sheet direkt dabei
- **Alles an einem Ort:** Saisons, Spieltage, Lineups, Gegner, Ergebnisse, Tabelle und Fahrgemeinschaften

## Was kann die App?

### Saison-Verwaltung
- Saisons erstellen, bearbeiten (Name, Jahr) und loeschen
- Zwischen Saisons wechseln
- Saison-Statistiken: Einsaetze pro Spieler, haeufigste Positionen mit Anzahl

### Spieler-Verwaltung
- Globale Spielerliste pflegen (erstellen, umbenennen, loeschen)
- Spieler werden saisonuebergreifend verwendet

### Spieltag-Planung
- Spieltage mit Datum, Label und Ort anlegen und bearbeiten
- Pro Spieltag festlegen, welche Spieler verfuegbar sind
- Jeder Spieltag hat mehrere Spiele (z.B. Doubleheader)
- Gegner pro Spiel eintragen

### Lineup-Editor
- Spieler aus dem Pool per Klick ins Lineup aufnehmen
- Positionen zuweisen: P, C, 1B, 2B, 3B, SS, LF, CF, RF, EH
- Batting Order per Drag & Drop oder Pfeiltasten festlegen
- Bereits vergebene Feldpositionen werden automatisch aus der Auswahl entfernt
- Designated Hitter (DH): Einen Bankspieler als Schlagmann fuer einen Feldspieler zuweisen
- Max 10 Spieler pro Lineup, max 1 DH pro Spiel
- Feldansicht: SVG-Baseballfeld zeigt die aktuelle Aufstellung visuell

### Base Coaches
- 1st Base Coach und 3rd Base Coach pro Spiel zuweisen
- Coaches bleiben im Spieler-Pool verfuegbar

### Lineup kopieren & tauschen
- Lineup von einem vorherigen Spiel der Saison uebernehmen
- Quick-Action: Ein Klick kopiert das letzte Spiel direkt
- Alternativ: Beliebiges Spiel aus der Saison waehlen (nach Spieltag gruppiert)
- Lineups zwischen Spielen eines Spieltags tauschen (inkl. Staff und Gegner)

### Statistiken & Hinweise
- Spieler-Pool sortiert nach Einsaetzen (wer am wenigsten gespielt hat, steht oben)
- Spieler ohne Einsatz werden rot hervorgehoben
- Orangener Punkt am Tab wenn Lineup unvollstaendig (< 9 Feldpositionen)
- Orangener Punkt am Spieler-Button wenn weniger als 9 Spieler verfuegbar

### Liga-Tabelle
- Mannschaften pro Saison verwalten
- Ergebnisse eintragen
- Automatische Tabellenberechnung

### Fahrgemeinschaften
- Fahrer und Sitzplaetze pro Spieltag planen
- Hin- und Rueckfahrt getrennt oder zusammen

### Export
- Druckoptimiertes Lineup-Sheet pro Spieltag
- Direkt als PDF druckbar
- Datenbank als JSON exportieren/importieren

## Lokal starten

```bash
# Backend
cd backend
./mvnw spring-boot:run

# Frontend (in neuem Terminal)
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:8080`
Der Vite Dev-Server proxied `/api` automatisch ans Backend.

### Login
Standard-Passwort: siehe `app.auth.password` in `application.properties`.

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Spring Boot, Java 21, Spring Security |
| Datenbank | H2 (Dev), PostgreSQL (Prod) |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Routing | React Router DOM |
