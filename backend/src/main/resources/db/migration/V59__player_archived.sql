-- Spieler-Archiv-Flag: ausgeschiedene Spieler ausblenden, ohne ihre Historie
-- (At-Bats, Steals) und die daraus berechneten Stats der Mitspieler zu beschädigen.
ALTER TABLE players ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
