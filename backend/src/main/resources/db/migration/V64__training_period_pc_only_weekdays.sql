-- An welchen Wochentagen einer Periode nur Pitcher und Catcher eingeladen sind.
--
-- CSV mit ISO-Wochentagen wie `weekdays` daneben, z.B. '4' fuer "donnerstags nur P/C".
-- Leer heisst: alle Termine der Periode sind offen fuer den ganzen Kader.
--
-- Damit ist der Strukturwechsel eine Einstellung und kein Code: ab November traegt der
-- Donnerstag das Nur-P/C-Training, ab April wandert es zurueck auf den Montag — oder
-- faellt weg, wenn Basic und P/C wieder zusammen stattfinden.
ALTER TABLE training_periods ADD COLUMN pc_only_weekdays VARCHAR(20);

-- Backfill: die Wintersaison 25/26 hatte montags Nur-P/C, die Sommersaison nicht.
UPDATE training_periods SET pc_only_weekdays = '1' WHERE end_date < DATE '2026-04-01';
