#!/bin/bash
# Zieht einen vollständigen Dump der Produktions-Datenbank auf diesen Rechner.
#
#   ./scripts/dump-prod-db.sh [Zielverzeichnis]
#
# Standardziel: ~/privat/softball-backups
#
# Warum über SSH und nicht aus der App heraus: /api/data/export liefert nur Stammdaten
# (Spieler, Saisons) — keine Spielbögen, keine At-Bats, kein Schema. Als Sicherung ist das
# unbrauchbar. pg_dump läuft im DB-Container selbst, damit Client- und Server-Version
# zusammenpassen und kein Werkzeug auf dem Host nötig ist.
#
# Zugangsdaten werden NICHT übergeben: der Postgres-Container kennt POSTGRES_USER,
# POSTGRES_PASSWORD und POSTGRES_DB in seiner eigenen Umgebung. So steht kein Passwort in
# der Befehlszeile, in der Shell-History oder in diesem Skript.
set -euo pipefail

VPS="root@178.104.118.46"
COMPOSE_DIR="/opt/softball"
TARGET_DIR="${1:-$HOME/privat/softball-backups}"
STAMP="$(date +%F-%H%M)"
OUT="$TARGET_DIR/softball-prod-$STAMP.sql"

mkdir -p "$TARGET_DIR"

echo "→ Suche DB-Service auf dem VPS…"
DB_SERVICE="$(ssh "$VPS" "cd $COMPOSE_DIR && docker compose ps --services" \
  | grep -iE '^(db|postgres|database)$' | head -1 || true)"

if [ -z "$DB_SERVICE" ]; then
  echo "FEHLER: keinen DB-Service gefunden. Vorhandene Services:" >&2
  ssh "$VPS" "cd $COMPOSE_DIR && docker compose ps --services" >&2
  echo "Service-Namen oben prüfen und DB_SERVICE im Skript setzen." >&2
  exit 1
fi
echo "  Service: $DB_SERVICE"

echo "→ Dump läuft…"
# shellcheck disable=SC2029  # $DB_SERVICE soll lokal expandieren, der Rest auf dem Server
ssh "$VPS" "cd $COMPOSE_DIR && docker compose exec -T $DB_SERVICE sh -c '
  PGPASSWORD=\"\$POSTGRES_PASSWORD\" pg_dump \
    -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" \
    --no-owner --no-privileges
'" > "$OUT"

# Prüfen statt hoffen: ein leerer oder abgebrochener Dump sieht als Datei genauso aus wie
# ein guter. Ohne diese Prüfung merkt man den Unterschied erst beim Wiederherstellen.
TABLES="$(grep -c '^CREATE TABLE' "$OUT" || true)"
COMPLETE="$(grep -c 'PostgreSQL database dump complete' "$OUT" || true)"

if [ "$COMPLETE" -lt 1 ] || [ "$TABLES" -lt 10 ]; then
  echo "FEHLER: Dump unvollständig ($TABLES Tabellen, Abschlussmarke: $COMPLETE)." >&2
  echo "Datei bleibt zur Ansicht liegen: $OUT" >&2
  exit 1
fi

echo
echo "✓ $OUT"
echo "  $(du -h "$OUT" | cut -f1), $TABLES Tabellen"
echo
echo "Zeilen je Tabelle (nicht leer):"
python3 - "$OUT" <<'PY'
import re, sys
txt = open(sys.argv[1], encoding='utf-8', errors='replace').read()
for m in re.finditer(r'^COPY public\.(\w+) .*?FROM stdin;\n(.*?)^\\\.$', txt, re.S | re.M):
    rows = [l for l in m.group(2).splitlines() if l.strip()]
    if rows:
        print(f'  {m.group(1)}: {len(rows)}')
PY
echo
echo "Wiederherstellen (VORSICHT, überschreibt Daten):"
echo "  ssh $VPS \"cd $COMPOSE_DIR && docker compose exec -T $DB_SERVICE sh -c '"
echo "    PGPASSWORD=\\\"\\\$POSTGRES_PASSWORD\\\" psql -U \\\"\\\$POSTGRES_USER\\\" -d \\\"\\\$POSTGRES_DB\\\"'\" < $OUT"
