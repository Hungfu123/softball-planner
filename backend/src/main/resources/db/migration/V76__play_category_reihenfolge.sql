-- Die Kategorien stehen jetzt vom Einfachen zum Schwierigen.
--
-- Vorher begann die Liste mit Cut-off & Relay — der schwierigsten Sache im ganzen
-- Katalog — und die Spielsituationen, mit denen ein Neuer anfangen soll, standen ganz
-- unten. Wer die Seite zum Lernen aufmacht, soll oben anfangen koennen.
--
-- Die Reihenfolge: erst wer wohin gehoert, wenn der Ball irgendwo hinfliegt
-- (Spielsituationen, Base-Coverage), dann die Faelle mit einer Entscheidung
-- (Pop-up, Bunt), dann die Laufspiele (Steal, Rundown, First-and-Third), zuletzt die
-- Ketten ueber das halbe Feld (Cut-off & Relay).

UPDATE play_category SET sort_order = 10 WHERE name = 'Spielsituationen';
UPDATE play_category SET sort_order = 20 WHERE name = 'Base-Coverage';
UPDATE play_category SET sort_order = 30 WHERE name = 'Pop-up-Priorities';
UPDATE play_category SET sort_order = 40 WHERE name = 'Bunt-Defense';
UPDATE play_category SET sort_order = 50 WHERE name = 'Steal-Defense & Pickoff';
UPDATE play_category SET sort_order = 60 WHERE name = 'Rundown';
UPDATE play_category SET sort_order = 70 WHERE name = 'First-and-Third';
UPDATE play_category SET sort_order = 80 WHERE name = 'Cut-off & Relay';
