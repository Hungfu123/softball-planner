-- Automatisches Out im Spielbogen: neuer AtBatResult-Wert AUTOMATIC_OUT.
-- Fehlende Spielerin → Out im Inning, aber keine Batting-Leistung (kein AB, keine PA).
-- Wird als normale AtBat-Row am aktuellen Slot gebucht, damit Out-Zählung,
-- 3rd-Out-Auto-Switch, Out-Index und Undo den bestehenden AB-Pfad erben.
--
-- HINWEIS: Tabellenname ist 'spielbogen_at_bat' (singular, siehe V20),
-- Constraint-Name 'spielbogen_atbat_result_check' (ohne Unterstrich
-- zwischen 'atbat' und 'result').

ALTER TABLE spielbogen_at_bat DROP CONSTRAINT IF EXISTS spielbogen_atbat_result_check;

ALTER TABLE spielbogen_at_bat ADD CONSTRAINT spielbogen_atbat_result_check
    CHECK (result IN ('SINGLE','DOUBLE','TRIPLE','HOMERUN','INSIDE_PARK_HR','WALK','HIT_BY_PITCH','STRIKEOUT','OUT','AUTOMATIC_OUT'));
