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
