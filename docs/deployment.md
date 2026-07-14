# Deployment

## Server
- **URL:** https://softball-planner.duckdns.org
- **Server:** Hetzner CX22 (4,75€/Monat), IP: `178.104.118.46`
- **Stack:** Docker Compose (PostgreSQL + Spring Boot + Nginx + SSL)

## Auto-Deploy
Push auf `master` → GitHub Action → Server baut und startet neu (~3-5 min).

## Logs anschauen
```bash
# Backend-Logs (letzte 50 Zeilen)
ssh root@178.104.118.46 "docker compose -f /opt/softball/docker-compose.yml logs --tail 50 backend"

# Backend-Logs live mitverfolgen
ssh root@178.104.118.46 "docker compose -f /opt/softball/docker-compose.yml logs -f backend"

# Container-Status
ssh root@178.104.118.46 "docker compose -f /opt/softball/docker-compose.yml ps"
```

## Server-Zugang
```bash
ssh root@178.104.118.46
```

## Manuell deployen (ohne GitHub Action)
```bash
ssh root@178.104.118.46 "/opt/softball/deploy.sh"
```

## WhatsApp-Sidecar (Umfragen-Polls)

Der Node-Sidecar (`whatsapp-service/`, whatsapp-web.js) läuft in Produktion als eigener Compose-Service im **internen** Netz — kein Port nach außen, nur `backend` erreicht ihn über den Service-Namen.

Ergänzung in `/opt/softball/docker-compose.yml` (nicht Teil dieses Repos):

```yaml
services:
  whatsapp:
    build: ./whatsapp-service
    restart: unless-stopped
    environment:
      - WHATSAPP_SERVICE_TOKEN=${WHATSAPP_SERVICE_TOKEN}
      - SESSION_PATH=/data/session
    volumes:
      - whatsapp-session:/data/session
    # kein "ports:" — nur intern über den Service-Namen "whatsapp" erreichbar

  backend:
    environment:
      # ... bestehende Env-Vars ...
      - WHATSAPP_SERVICE_URL=http://whatsapp:3000
      - WHATSAPP_SERVICE_TOKEN=${WHATSAPP_SERVICE_TOKEN}

volumes:
  whatsapp-session:
```

**Env-Variablen (VPS, in `/opt/softball/.env` oder direkt im Compose-File gesetzt):**

| Variable | Gesetzt bei | Bedeutung |
|----------|-------------|-----------|
| `WHATSAPP_SERVICE_TOKEN` | `whatsapp` + `backend` | Frei gewähltes gemeinsames Geheimnis (Header `X-Service-Token`) — **muss in beiden Services identisch sein**, sonst lehnt der Sidecar Requests vom Backend ab |
| `WHATSAPP_SERVICE_URL` | `backend` | Interne Compose-DNS-Adresse `http://whatsapp:3000`; lokal (`./mvnw spring-boot:run`) default `http://localhost:3000` (siehe `application.properties`) |

**Erst-Kopplung (einmalig, pro Server-Neuaufsetzung oder Session-Reset):**
Nach dem ersten Start hat whatsapp-web.js noch keine Session. Über die Orga-UI unter `/orga/whatsapp-umfrage` erscheint ein QR-Code — mit dem Handy (WhatsApp → Verknüpfte Geräte) scannen, danach Status „verbunden". Die Session wird danach im Docker-Volume `whatsapp-session` persistiert und übersteht Container-Neustarts/Deploys; nur bei Volume-Löschung oder Geräte-Abmeldung in WhatsApp selbst ist erneutes Scannen nötig.

**Lokaler Smoke-Test:** Im Repo-`docker-compose.yml` hat der `whatsapp`-Service zusätzlich `ports: ["3000:3000"]` (lokal unkritisch, da kein Internet-Zugriff auf den Compose-Host) — damit erreicht der lokal per `./mvnw spring-boot:run` laufende Backend-Prozess den Container unter `localhost:3000` ganz ohne weitere Konfiguration.

## Dateien auf dem Server
| Pfad | Beschreibung |
|------|-------------|
| `/opt/softball/docker-compose.yml` | Container-Konfiguration |
| `/opt/softball/deploy.sh` | Deploy-Script (git pull → build → restart) |
| `/opt/softball/repo/` | Git-Repo-Klon |
| `/opt/softball/nginx/default.conf` | Nginx-Config (SSL + Proxy) |

## Neuer Laptop?
1. SSH-Key generieren: `ssh-keygen -t ed25519`
2. Public Key auf Server eintragen:
   ```bash
   # Über Hetzner Cloud Console (Browser) einloggen
   # Dann: nano /root/.ssh/authorized_keys → neuen Key einfügen
   ```
3. Fertig: `ssh root@178.104.118.46`

## Accounts
| Dienst | Zweck |
|--------|-------|
| Hetzner Cloud | Server (SEPA-Zahlung) |
| DuckDNS | Domain (Hungfu123@github) |
| GitHub Secrets | `DEPLOY_SSH_KEY` für Auto-Deploy |
