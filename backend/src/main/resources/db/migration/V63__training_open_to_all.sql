-- Wer war zu einem Training eingeladen?
--
-- Fuer die Fairness-Rechnung der Auto-Aufstellung zaehlt nicht, WAS trainiert wurde,
-- sondern WER kommen konnte. Ein Training, zu dem nur Pitcher und Catcher geladen sind,
-- darf niemandem als versaeumt angerechnet werden; eine gemeinsame Einheit schon.
--
-- `type` (REGULAR/PITCHER_CATCHER) beantwortet das NICHT: der Montag der Sommersaison
-- traegt PITCHER_CATCHER, war aber Basic UND P/C zusammen — alle konnten hin. Die
-- WhatsApp-Umfrage sagt es woertlich: "Wer kommt morgen zum P/C Training oder Basic
-- Training?".
ALTER TABLE trainings ADD COLUMN open_to_all BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill: Nur-P/C gab es ausschliesslich in der Wintersaison 25/26 (Januar bis Maerz
-- 2026) am Montag. Ab April 2026 ist der Montag die kombinierte Einheit, offen fuer
-- alle. Alles andere war ohnehin offen.
UPDATE trainings
   SET open_to_all = FALSE
 WHERE type = 'PITCHER_CATCHER'
   AND date < DATE '2026-04-01';

COMMENT ON COLUMN trainings.open_to_all IS
  'FALSE = nur ein Teil des Kaders war eingeladen (Nur-P/C). Zaehlt nicht in die Trainingsbeteiligung der Auto-Aufstellung.';
