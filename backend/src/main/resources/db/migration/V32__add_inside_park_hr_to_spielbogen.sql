-- Inside-Park-Homerun: neuer AtBatResult-Wert. Treated wie HOMERUN
-- (Batter scort, alle Runner scoren, totalBases=4), aber separat erfassbar
-- damit man inside-the-park unterscheiden kann.
--
-- HINWEIS: Tabellenname ist 'spielbogen_at_bat' (singular, siehe V20),
-- Constraint-Name 'spielbogen_atbat_result_check' (ohne Unterstrich
-- zwischen 'atbat' und 'result').

ALTER TABLE spielbogen_at_bat DROP CONSTRAINT IF EXISTS spielbogen_atbat_result_check;

ALTER TABLE spielbogen_at_bat ADD CONSTRAINT spielbogen_atbat_result_check
    CHECK (result IN ('SINGLE','DOUBLE','TRIPLE','HOMERUN','INSIDE_PARK_HR','WALK','HIT_BY_PITCH','STRIKEOUT','OUT'));
