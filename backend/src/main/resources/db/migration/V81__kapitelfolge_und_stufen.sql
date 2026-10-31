-- Zwei Dinge, beide aus dem Gebrauch heraus: eine Reihenfolge INNERHALB des Kapitels,
-- und neue Stufen fuer die Kapitel selbst.
--
-- **Die Reihenfolge.** Ein Kapitel ist eine Lektion, und bisher sortierte es nach id.
-- Neue Plays bekommen die hoechste id, also stand die Regel „Wohin der Wurf geht" als
-- dreizehnte von vierzehn und das Detail („Backup hinter der 2") als erste. Fuer eine
-- Mannschaft, die Spielsituationen ueberhaupt erst lernt, ist das genau verkehrt herum.
-- `sort_order` zieht einzelne Plays nach vorne; wer keinen hat, behaelt seinen Platz
-- dahinter (`kapitelFolge` im Frontend: NULL zaehlt als 100000).
--
-- **Die Stufen.** Einschaetzung des Trainers, und er trainiert die Mannschaft:
-- Rundown ist nicht schwer (Stufe 2), Bunt-Defense schon (Stufe 3), und die Situation
-- mit Runnern auf 1 und 3 gehoert auf Stufe 2. Die Stufe kommt aus `sort_order` der
-- Kategorie (`kategorieStufe`: bis 20 heisst 1, bis 50 heisst 2, darueber 3).
--
-- **Und ein Name**: „First-and-Third" sagt einem Anfaenger nichts. Die Kategorie heisst
-- jetzt wie die Lage, die sie zeigt.

ALTER TABLE play ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Das Kapitel Outfield: erst die Regel, dann die Faelle vom einfachsten her, dann das,
-- was man ohne Ball tut.
UPDATE play SET sort_order = 10 WHERE title = 'Wohin der Wurf geht';
UPDATE play SET sort_order = 20 WHERE title = 'Single ins CF — Batter will die 2';
UPDATE play SET sort_order = 21 WHERE title = 'Single ins RF — Batter will die 2';
UPDATE play SET sort_order = 30 WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3';
UPDATE play SET sort_order = 31 WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3';
UPDATE play SET sort_order = 32 WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3';
UPDATE play SET sort_order = 40 WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home';
UPDATE play SET sort_order = 41 WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home';
UPDATE play SET sort_order = 42 WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home';
UPDATE play SET sort_order = 50 WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3';
UPDATE play SET sort_order = 51 WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3';
UPDATE play SET sort_order = 60 WHERE title = 'Fly in die linke Gasse — wer ruft';
UPDATE play SET sort_order = 70 WHERE title = 'Single ins LF — Backup hinter der 2';
UPDATE play SET sort_order = 71 WHERE title = 'Single ins RF — Backup hinter der 1';

UPDATE play_category SET name = 'Runner auf 1 und 3' WHERE name = 'First-and-Third';

UPDATE play_category SET sort_order = 30 WHERE name = 'Pop-up-Priorities';
UPDATE play_category SET sort_order = 35 WHERE name = 'Rundown';
UPDATE play_category SET sort_order = 40 WHERE name = 'Runner auf 1 und 3';
UPDATE play_category SET sort_order = 45 WHERE name = 'Cut-off & Relay';
UPDATE play_category SET sort_order = 50 WHERE name = 'Steal-Defense & Pickoff';
UPDATE play_category SET sort_order = 60 WHERE name = 'Bunt-Defense';

-- Und einer faellt weg: „Foul-Pop hinter Home" braucht niemand. Entscheidung des
-- Trainers. Die Staende haengen per ON DELETE CASCADE daran, und auf das Play zeigt
-- kein Gegenstueck (geprueft).
DELETE FROM play WHERE title = 'Foul-Pop hinter Home';
