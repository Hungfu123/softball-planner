-- Spielzeit-Uhr: der tatsaechliche Spielbeginn, getrennt von timer_running_since.
-- timer_running_since zeigt nach einer Pause den letzten Resume, nicht den ersten Start —
-- fuer die "Zeit:"-Angabe auf dem RFL-Blatt (geht an die Liga) braucht es die echte
-- Anfangszeit, unveraendert durch spaetere Pause/Resume-Zyklen.
ALTER TABLE games      ADD COLUMN timer_started_at TIMESTAMP;
ALTER TABLE spielbogen ADD COLUMN timer_started_at TIMESTAMP;
