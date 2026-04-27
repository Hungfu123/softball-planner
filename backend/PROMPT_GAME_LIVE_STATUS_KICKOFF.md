# Backend Session — Kick-Off: Game Live-Status

Kopiere alles unter dieser Zeile in die neue Backend-Session.

---

# Aufgabe: Game Live-Status implementieren

## Kontext

Frontend-Dashboard zeigt Spiele mit Status-Pills (OFFEN/LIVE/FERTIG). Aktuell hat das Backend keine Status-Info — Frontend muss raten oder localStorage-Fallback nutzen. Soll geräteübergreifend funktionieren.

## Spec

Komplette technische Spec liegt in **`backend/PROMPT_GAME_LIVE_STATUS.md`** im Repo. Lies sie zuerst — dort sind alle Details:
- Domain-Erweiterung (`Game.endedAt: Instant`)
- JPA-Entity + Migration
- DTO (`GameResponse` mit `endedAt` + `atBatCount`)
- Service-Layer (Bulk-Count gegen N+1)
- Endpoints `POST /api/games/{id}/end` + `/reopen`
- Live-Score-Update via `sum(atBat.runsScored)`
- Status-Semantik-Tabelle mit Pill-Visuals
- Acceptance-Kriterien

## Architektur-Hinweise

Repo nutzt **Onion/Hexagonal Architecture**:
- Domain (innen): `domain/model/Game.java`, `domain/port/` (Interfaces)
- Application (Mitte): `application/service/`
- Adapter (außen): `adapter/dto/`, `adapter/in/web/` (Controller), `adapter/out/persistence/` (JPA)

Dependencies zeigen immer nach innen. Domain importiert keine Adapter-Klassen.

User-Präferenz: SOLID + Clean Code, Services mit Single Responsibility, keine god-classes. Schichtverletzungen flaggen.

## Wichtige Project-Settings

- ⚠️ **NICHT** `~/.m2/settings.xml` ändern (corporate Nexus)
- Lokale Builds nutzen `backend/.mvn/local-settings.xml`
- Gitmoji-Commit-Style ohne Co-Author

## Was NICHT zu tun

- Kein Multi-Tenancy einbauen — Single-Team-App ("Dead Sox") bleibt vorerst
- Keine WebSocket/Push — Frontend pollt 30s

## Reihenfolge

1. Liquibase/Flyway Migration für `ended_at` Spalte
2. Domain `Game.endedAt` + Entity-Mapping
3. `AtBatRepository.countByGameId` + Bulk-Variante
4. `GameResponse` erweitern + Mapper
5. Service: `endGame(id)` + `reopenGame(id)`
6. Controller-Endpoints
7. Live-Score-Aggregation via `sumRunsScoredByGameId`
8. Tests (Service + Controller)
9. Push, Auto-Deploy via GitHub Actions

## Done-Definition

Acceptance-Liste in `PROMPT_GAME_LIVE_STATUS.md` Sektion "Acceptance" abhaken. Frontend-PR (separat) folgt nachdem Backend deployed ist.

## Frontend-State (FYI)

Frontend hat bereits localStorage-Fallback `scoring-ended-${gameId}`. Sobald Backend deployed: Frontend-Refactor entfernt localStorage und nutzt `endedAt` + `atBatCount` aus `GameResponse`. Diese Migration liegt im Frontend-Plan, nicht in dieser Session.
