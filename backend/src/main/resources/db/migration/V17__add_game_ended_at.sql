-- Live-Status fuer Games: ended_at Timestamp.
-- null = Spiel laeuft noch oder hat noch nicht begonnen.
-- non-null = Spiel beendet (FERTIG-Status im Dashboard).

ALTER TABLE games ADD COLUMN ended_at TIMESTAMP NULL;
