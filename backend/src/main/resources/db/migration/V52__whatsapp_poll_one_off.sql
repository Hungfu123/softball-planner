-- Umfrage kann jetzt einmalig (nicht trainingsgekoppelt) sein.
-- Bestehende Zeilen sind alle Trainings-Polls -> training_coupled = true (via DEFAULT).
ALTER TABLE whatsapp_polls ADD COLUMN training_coupled boolean NOT NULL DEFAULT true;
ALTER TABLE whatsapp_polls ADD COLUMN send_date date;
ALTER TABLE whatsapp_polls ALTER COLUMN weekday DROP NOT NULL;
-- DEFAULT nur zum Backfill; neue Zeilen setzen den Wert explizit.
ALTER TABLE whatsapp_polls ALTER COLUMN training_coupled DROP DEFAULT;
