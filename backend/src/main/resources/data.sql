-- Migration: Position nullable machen in lineup_entries
ALTER TABLE lineup_entries ALTER COLUMN position SET NULL;

-- Migration: OwnTeam für bestehende Seasons anlegen
INSERT INTO league_teams (season_id, name, own_team)
SELECT s.id, 'Dead Sox', true
FROM seasons s
WHERE NOT EXISTS (
    SELECT 1 FROM league_teams lt
    WHERE lt.season_id = s.id AND lt.own_team = true
);
