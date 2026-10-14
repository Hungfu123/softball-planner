-- Geschlecht am Spieler: Grundlage der Frauen-Quote der Liga (mindestens zwei
-- Frauen auf dem Feld, davon eine im Infield). Nullable — wer nicht zugeordnet
-- ist, zaehlt fuer die Quote nicht mit, statt stillschweigend als Mann zu gelten.
ALTER TABLE players ADD COLUMN gender VARCHAR(10);
