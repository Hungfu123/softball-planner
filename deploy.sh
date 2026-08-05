#!/bin/bash
# Deploy-Script auf dem VPS: /opt/softball/deploy.sh
# Diese Datei ist die Vorlage im Repo — nach Änderungen auf den VPS kopieren:
#   scp deploy.sh root@178.104.118.46:/opt/softball/deploy.sh
set -e

cd /opt/softball/repo
git pull origin master

# Backend-Image (enthält das gebaute Frontend als static resources)
docker build -t softball-planner:latest .

cd /opt/softball
docker compose up -d backend

# WhatsApp-Sidecar neu bauen wenn sich whatsapp-service/ seit dem letzten Build
# geändert hat. Ohne diesen Block liefen Sidecar-Fixes nie in Produktion —
# deploy.sh hat ausschließlich das Backend angefasst.
#
# Vergleich über den Git-Tree-Hash des Verzeichnisses gegen einen Stempel des
# letzten Builds, NICHT über den Diff des Pulls: wenn der Push-Hook den Commit
# schon geholt hat, ist ein späterer Pull ein No-Op und ein Pull-Diff würde die
# Änderung übersehen. Der Tree-Hash beschreibt den Ist-Zustand und ist damit
# unabhängig davon, wer wann gepullt hat.
#
# Der Neustart ist unkritisch für die Kopplung: die Baileys-Session liegt im
# Volume 'whatsapp-session' und übersteht Container-Neubau. Nur wenn WhatsApp
# das Gerät entfernt hat, ist erneutes QR-Scannen nötig.
STAMP=/opt/softball/.whatsapp-src-tree
CURRENT_TREE=$(git -C /opt/softball/repo rev-parse HEAD:whatsapp-service)
if [ "$(cat "$STAMP" 2>/dev/null)" = "$CURRENT_TREE" ]; then
  echo 'whatsapp-service unverändert → Sidecar bleibt'
else
  echo 'whatsapp-service geändert → Sidecar neu bauen'
  cd /opt/softball
  docker compose build whatsapp
  docker compose up -d whatsapp
  echo "$CURRENT_TREE" > "$STAMP"
fi

cd /opt/softball
docker image prune -f
echo 'Deploy done!'
