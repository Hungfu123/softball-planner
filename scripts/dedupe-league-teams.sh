#!/usr/bin/env bash
# Dedupliziert League-Team-NAMEN über alle Saisons/Ligen hinweg.
#
# Hintergrund: League-Teams sind pro Saison/Liga angelegt und der Name ist ein
# freies Textfeld — aus "Aachen" und "Aachen Aixplosives" werden in der
# Gegner-Statistik (die nach NAME aggregiert) zwei getrennte Einträge.
# Nach dem Umbenennen auf EINEN kanonischen Namen verschmelzen sie automatisch.
# Die Team-IDs und alle Verweise (Spiele, Liga-Ergebnisse, Standings) bleiben
# unberührt — es ändert sich nur das Label.
#
# Ablauf:
#   1. Backup:   ./scripts/dedupe-league-teams.sh backup    (verändert NICHTS)
#   2. Analyse:  ./scripts/dedupe-league-teams.sh analyze   (verändert NICHTS)
#   3. Mapping:  MAPPINGS-Block unten anpassen
#   4. Ausführen: ./scripts/dedupe-league-teams.sh apply
#
# Lokal im Repo-Root ausführbar; auf dem VPS in /opt/softball
# (COMPOSE_FILE ggf. auf /opt/softball/docker-compose.yml setzen).

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
DB_USER="${DB_USER:-softball}"
DB_NAME="${DB_NAME:-softball}"

psql_cmd() {
  docker compose -f "$COMPOSE_FILE" exec -T db psql -U "$DB_USER" -d "$DB_NAME" "$@"
}

# --- Mapping: ALTER_NAME=KANONISCHER_NAME (Groß-/Kleinschreibung egal) ---
# Trage hier deine Dubletten ein, z.B.:
MAPPINGS=(
  # "Aachen=Aachen Aixplosives"
  # "Bonn=Bonn Cardinals"
)
# ------------------------------------------------------------------------

cmd="${1:-analyze}"

case "$cmd" in
  backup)
    docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" \
      > "backup-league-teams-$(date +%Y%m%d-%H%M%S).sql"
    echo "Backup geschrieben: backup-league-teams-*.sql"
    ;;

  analyze)
    echo "=== Verdächtige Namens-Paare (einer enthält den anderen) ==="
    psql_cmd -c "
      SELECT DISTINCT a.name AS name_a, b.name AS name_b
      FROM (SELECT DISTINCT trim(name) AS name FROM league_teams) a
      JOIN (SELECT DISTINCT trim(name) AS name FROM league_teams) b
        ON lower(a.name) <> lower(b.name)
       AND lower(a.name) LIKE lower(b.name) || '%'
      ORDER BY 1, 2;"
    echo ""
    echo "=== Alle Team-Namen mit Vorkommen über Saisons ==="
    psql_cmd -c "
      SELECT trim(name) AS name, count(*) AS saison_zeilen
      FROM league_teams
      GROUP BY trim(name)
      ORDER BY count(*) DESC, name;"
    echo ""
    echo "→ Passe danach den MAPPINGS-Block im Script an und führe 'apply' aus."
    ;;

  apply)
    if [ ${#MAPPINGS[@]} -eq 0 ]; then
      echo "MAPPINGS ist leer — erst Dubletten im Script-Block eintragen (analyze zeigt Kandidaten)."
      exit 1
    fi
    for m in "${MAPPINGS[@]}"; do
      old="${m%%=*}"
      new="${m##*=}"
      echo "→ '$old' wird zu '$new'"
      psql_cmd -v old="$old" -v new="$new" -c \
        "UPDATE league_teams SET name = :'new' WHERE lower(trim(name)) = lower(trim(:'old'));"
    done
    echo "Fertig. Die Gegner-Statistik zeigt jetzt die zusammengeführten Namen."
    ;;

  *)
    echo "Usage: $0 {backup|analyze|apply}"
    exit 1
    ;;
esac
