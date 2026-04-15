#!/bin/bash
# Lokales Starten mit .env Variablen
set -a
source ../.env
set +a
mvn spring-boot:run -s .mvn/local-settings.xml -Dskip.frontend=true "$@"
