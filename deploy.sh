#!/bin/bash
# Deploy-Script auf dem VPS: /opt/softball/deploy.sh
# Diese Datei ist die Vorlage im Repo — nach Änderungen auf den VPS kopieren:
#   scp deploy.sh root@178.104.118.46:/opt/softball/deploy.sh
set -e

cd /opt/softball/repo
BEFORE=$(git rev-parse HEAD)
git pull origin master
AFTER=$(git rev-parse HEAD)

# Backend-Image (enthält das gebaute Frontend als static resources)
docker build -t softball-planner:latest .

cd /opt/softball
docker compose up -d backend

# WhatsApp-Sidecar nur neu bauen wenn sich whatsapp-service/ geändert hat.
# Ohne diesen Block liefen Sidecar-Fixes nie in Produktion — deploy.sh hat
# ausschließlich das Backend angefasst, das Sidecar-Image blieb auf dem Stand
# des letzten manuellen Builds.
#
# Der Neustart ist unkritisch für die Kopplung: die Baileys-Session liegt im
# Volume 'whatsapp-session' und übersteht Container-Neubau. Nur wenn WhatsApp
# das Gerät entfernt hat, ist erneutes QR-Scannen nötig.
cd /opt/softball/repo
if git diff --quiet "$BEFORE" "$AFTER" -- whatsapp-service; then
  echo 'whatsapp-service unverändert → Sidecar bleibt'
else
  echo 'whatsapp-service geändert → Sidecar neu bauen'
  cd /opt/softball
  docker compose build whatsapp
  docker compose up -d whatsapp
fi

cd /opt/softball
docker image prune -f
echo 'Deploy done!'
