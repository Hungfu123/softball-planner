-- Aufstellung freigeben: wann der Trainer sie fuer die Spieler sichtbar gemacht hat und
-- wie sie dabei aussah (SHA-256 des Fingerabdrucks, siehe AufstellungsFingerabdruck).
-- Keine Vorbelegung: bestehende Spieltage sind damit NICHT freigegeben.
ALTER TABLE game_days ADD COLUMN lineups_released_at TIMESTAMP;
ALTER TABLE game_days ADD COLUMN lineups_released_hash VARCHAR(64);
