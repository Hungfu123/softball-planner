# Softball Planner

Planungstool fuer Softball-Teams. Verwaltet Saisons, Spieltage, Lineups, Positionen, Statistiken und mehr.

## Warum diese App?

- **Schluss mit Zettelwirtschaft:** Kein Hin-und-Her mehr mit WhatsApp-Listen oder handgeschriebenen Lineups
- **Faire Aufstellung:** Die App zeigt automatisch, wer wie oft gespielt hat — Spieler mit weniger Einsaetzen stehen oben im Pool
- **Schnell am Spieltag:** Lineup vom letzten Spiel kopieren, anpassen, fertig. Druckbares Sheet direkt dabei
- **Alles an einem Ort:** Saisons, Spieltage, Lineups, Gegner, Ergebnisse, Tabelle und Statistiken

## Was kann die App?

### Saison-Verwaltung
- Saisons erstellen, bearbeiten (Name, Jahr) und loeschen
- Zwischen Saisons wechseln
- Saison-Statistiken: Einsaetze pro Spieler, haeufigste Positionen mit Anzahl

### Spieler-Verwaltung
- Globale Spielerliste pflegen (erstellen, umbenennen, loeschen)
- Spieler werden saisonuebergreifend verwendet
- Default Batting Order: Jedem Spieler eine Standard-Schlagposition (1-10) zuweisen — beim Hinzufuegen zur Lineup wird er automatisch an dieser Position eingefuegt

### Spieltag-Planung
- Spieltage mit Datum, Label und Ort anlegen und bearbeiten
- Pro Spieltag festlegen, welche Spieler verfuegbar sind
- Jeder Spieltag hat mehrere Spiele (z.B. Doubleheader)
- Gegner pro Spiel eintragen

### Lineup-Editor
- Spieler aus dem Pool per Klick ins Lineup aufnehmen
- Positionen zuweisen: P, C, 1B, 2B, 3B, SS, LF, CF, RF, EH
- Batting Order per Drag & Drop oder Pfeiltasten festlegen
- Designated Hitter (DH): Einen Bankspieler als Schlagmann fuer einen Feldspieler zuweisen
- Max 10 Spieler pro Lineup, max 1 DH pro Spiel
- Feldansicht: SVG-Baseballfeld zeigt die aktuelle Aufstellung visuell

### Base Coaches
- 1st Base Coach und 3rd Base Coach pro Spiel zuweisen
- Coaches bleiben im Spieler-Pool verfuegbar

### Lineup Auto-Generate
- Zufaellige Aufstellung generieren basierend auf verfuegbaren Spielern
- Priorisiert Spieler mit hoeherem Trainingsbesuch

### Lineup kopieren & tauschen
- Lineup von einem vorherigen Spiel der Saison uebernehmen
- Quick-Action: Ein Klick kopiert das letzte Spiel direkt
- Lineups zwischen Spielen eines Spieltags tauschen (inkl. Staff und Gegner)

### Statistiken & Hinweise
- Spieler-Pool sortiert nach Einsaetzen (wer am wenigsten gespielt hat, steht oben)
- Spieler ohne Einsatz werden rot hervorgehoben
- Orangener Punkt am Tab wenn Lineup unvollstaendig (< 9 Feldpositionen)

### Liga-Tabelle
- Mannschaften pro Saison verwalten
- Ergebnisse eintragen
- Automatische Tabellenberechnung

### Training
- Trainings-Zeitraeume verwalten (z.B. Wintertraining, Saisonvorbereitung)
- Trainings anlegen mit Datum, Uhrzeit und Ort
- Anwesenheit pro Training erfassen
- Trainingstypen: Regular und Pitcher/Catcher
- Trainingsbeteiligung als CSV exportieren

### Export
- Druckoptimiertes Lineup-Sheet und Scoring-Sheet pro Spieltag (zentriert, PDF-optimiert)
- Direkt als PDF druckbar
- Datenbank als JSON exportieren/importieren

## Architektur

Das Backend folgt einer **Onion / Hexagonal Architecture** mit klarer Schichtentrennung:

![Architektur](docs/architecture.svg)

| Schicht | Inhalt |
|---------|--------|
| **Domain** (innen) | 16 Models, 12 Repository-Ports, 3 Domain Services (LineupValidator, LineupSuggestionEngine, StandingsCalculator) |
| **Application** (mitte) | 19 Services in 4 Gruppen: Game & Lineup, Training, Season & Liga, Daten & Stammdaten |
| **Adapter** (aussen) | 9 REST-Controller (Inbound), 12 Repository-Adapter + Entities + Mappers (Outbound/JPA) |

> Abhaengigkeiten zeigen immer nach innen. Repository-Adapter implementieren Domain-Ports (Dependency Inversion).

Die editierbare Version des Diagramms liegt unter [`docs/architecture.excalidraw`](docs/architecture.excalidraw) und kann in [excalidraw.com](https://excalidraw.com) geoeffnet werden.

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Spring Boot, Java 21, Spring Security |
| Datenbank | PostgreSQL |
| Migrationen | Flyway |
| Tests | JUnit, Testcontainers (PostgreSQL) |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Routing | React Router DOM |

## Lokal starten

### Voraussetzungen
- Java 21
- Node.js
- Docker

### 1. Datenbank starten

```bash
docker compose up -d db
```

Startet PostgreSQL auf Port 5432 (User: `softball`, Passwort: `softball`, DB: `softball`).

### 2. Backend starten

```bash
cd backend
./mvnw spring-boot:run -s .mvn/local-settings.xml
```

Nutzt `local-settings.xml` statt der globalen Maven-Settings. Flyway erstellt beim ersten Start automatisch alle Tabellen.

### 3. Frontend starten (Entwicklung)

```bash
cd frontend
npm install
npx vite
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:8080`
Der Vite Dev-Server proxied `/api` automatisch ans Backend.

### Login
Standard-Passwort: siehe `app.auth.password` in `application.properties`.

## Tests

```bash
cd backend
./mvnw test
```

Integration-Tests laufen gegen eine echte PostgreSQL via Testcontainers (Docker muss laufen).

## Deployment

Die App laeuft auf einem **Hetzner VPS** (Docker Compose) unter https://softball-planner.duckdns.org.

### Stack
- **Backend + Frontend:** Spring Boot JAR (Frontend als statische Resources) im Docker-Container
- **Datenbank:** PostgreSQL 17 im Docker-Container
- **Reverse-Proxy:** Nginx mit SSL (Let's Encrypt, auto-renewal via certbot)
- **Domain:** DuckDNS

### Wie es funktioniert
- Push auf `master` → GitHub Action → SSH zum Server → `/opt/softball/deploy.sh`
- Deploy-Script: `git pull` → `docker build` → `docker compose up -d backend`
- Dockerfile baut Frontend + Backend in ein JAR
- Flyway migriert die Datenbank beim Start
- Umgebungsvariablen in `/opt/softball/docker-compose.yml`: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `APP_AUTH_PASSWORD`, `GEMINI_API_KEY`

### Produktions-Build lokal testen

```bash
cd backend
./mvnw package -DskipTests
java -jar target/lineup-planner-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```
