# GitHub Actions CI Pipeline

**Datum:** 2026-05-11
**Scope:** Neue Workflow-Datei `.github/workflows/ci.yml`. Bestehender `deploy.yml` unangetastet.

## Problem

- Backend hat 553+ Tests (Testcontainers, ~40s nach Boot)
- Frontend hat ESLint + Vite build + 38 Playwright E2E-Tests
- **Nichts läuft auf CI.** Push zu master triggert nur Deploy. Bug-Regressions werden nur via lokales Run gefangen.

## Lösung

Neuer Workflow `ci.yml`. Trigger: `pull_request` + `push to master`.

### Single Job mit sequenziellen Steps

Pragmatischer Start: ein Job, alle Steps. Optimierung (Matrix/Parallel) später wenn Runtime stört.

```
jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: softball
          POSTGRES_PASSWORD: softball
          POSTGRES_DB: softball
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U softball"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - checkout
      - setup-java 21 (temurin)
      - setup-node 22
      - cache maven dependencies
      - cache npm dependencies
      - cache playwright browsers
      - Frontend install: npm ci
      - Frontend lint: npm run lint
      - Frontend build: npm run build
      - Frontend Vitest: npm run test
      - Backend test: ./mvnw -s .mvn/local-settings.xml test
      - Playwright browsers: npx playwright install --with-deps chromium
      - Start backend in background: nohup ./mvnw spring-boot:run ... &
      - Wait for backend ready (curl /actuator/health loop)
      - E2E: cd frontend && npm run test:e2e
      - Upload Playwright report on failure
```

### Backend-Startup für E2E

Playwright `webServer.command` schon vorhanden — aber für CI vorgestartet via nohup, dann `webServer.reuseExistingServer=true`. Spart `webServer.timeout`-Issues.

Alternative: Playwright startet selbst (`reuseExistingServer: true` → benutzt CI-Backend wenn da, sonst startet selbst). Aktuell config funktioniert ohne Anpassung. Pragmatic: Backend nicht vor-starten, Playwright kümmert sich.

Aber Backend braucht **Testcontainers-frei** in CI (Postgres-service ist da). Backend-Config in CI: `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/softball`, `SPRING_DATASOURCE_USERNAME=softball`, `SPRING_DATASOURCE_PASSWORD=softball`. Via env vars im Workflow.

### Local-Settings für Maven

Backend benötigt `-s .mvn/local-settings.xml`. Diese Datei existiert lokal (corporate Nexus bypass). In CI nutzen wir das gleiche File. Es überschreibt corporate-Nexus, was in CI nicht relevant ist. OK.

### Caching

- Maven deps: `~/.m2/repository` cached by `pom.xml`-hash
- npm deps: `frontend/node_modules` cached by `package-lock.json`-hash
- Playwright browsers: `~/.cache/ms-playwright` cached by playwright version

### Artifacts

- Playwright report (`frontend/playwright-report/`) bei failure uploaden
- Backend surefire-reports bei failure

## Out of Scope

- Spielbogen-Tests (eigener Test-Pfad, wenn relevant separat)
- Performance benchmarks
- Deploy-Gate (Deploy läuft schon eigen, kein blocking-CI nötig)
- Cross-Browser (nur Chromium für Phase 1)
- Multi-Worker E2E (workers=1 bleibt — Shared Test-GameDay)

## Files

**Neu:**
- `.github/workflows/ci.yml`

**Optional ergänzt:**
- `frontend/package.json`: `"test:vitest": "vitest run"` script falls noch nicht vorhanden (für Vitest unit-Tests).
- `README.md`: kurzer "CI-Pipeline"-Hinweis (optional).

## Risk

- CI-Runtime: ~5-8min (Backend-Boot dauert in CI länger). Akzeptabel.
- Playwright-Browser-Install: ~30s mit cache.
- Backend test (Testcontainers) braucht Docker in CI → wir nutzen Postgres-service stattdessen, Testcontainers-Tests greifen weiterhin auf Postgres zu.

Wait: Testcontainers spinnen einen eigenen Postgres-Container hoch. Im CI funktioniert das auch wenn Docker verfügbar ist. GitHub Actions ubuntu-latest hat Docker. Aber wenn Postgres-service schon läuft, Testcontainers ignoriert sie und startet eigene. Doppelt aber OK. Vereinfachung: Service-Postgres NUR für Spring-Boot-Run (E2E-Phase). Backend-Unit-Tests via Testcontainers nutzen eigene.

Final: Postgres-service nur für E2E-Phase nötig (Spring-Boot-Run). Backend `./mvnw test` macht eigenen via Testcontainers. Wir können Postgres-service weglassen falls Testcontainers in CI funktioniert. Spart Setup.

**Vereinfachte Variante (Recommendation):**
- Backend `mvnw test`: Testcontainers (Docker-in-Docker funktioniert in GitHub Actions ubuntu-latest).
- E2E: vor `npm run test:e2e` `docker compose up -d db` ausführen.
- Kein separater Postgres-service-Block.

Das matched lokale Dev-Setup 1:1. Niedrige Reibung.
