-- Spielzeit-Uhr. Pausierbar, deshalb zwei Felder statt eines Startzeitpunkts:
-- accumulated haelt die Zeit vor der laufenden Phase, running_since den Beginn der laufenden.
ALTER TABLE games      ADD COLUMN timer_running_since TIMESTAMP;
ALTER TABLE games      ADD COLUMN timer_accumulated_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games      ADD COLUMN time_limit_minutes INTEGER;

ALTER TABLE spielbogen ADD COLUMN timer_running_since TIMESTAMP;
ALTER TABLE spielbogen ADD COLUMN timer_accumulated_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE spielbogen ADD COLUMN time_limit_minutes INTEGER;
