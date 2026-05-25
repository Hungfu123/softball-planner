-- Inside-Park-Homerun: neuer AtBatResult-Wert. Treated wie HOMERUN
-- (Batter scort, alle Runner scoren, totalBases=4), aber separat erfassbar
-- damit man inside-the-park unterscheiden kann.

ALTER TABLE spielbogen_at_bats DROP CONSTRAINT IF EXISTS spielbogen_at_bats_result_check;

ALTER TABLE spielbogen_at_bats ADD CONSTRAINT spielbogen_at_bats_result_check
    CHECK (result IN ('SINGLE','DOUBLE','TRIPLE','HOMERUN','INSIDE_PARK_HR','WALK','HIT_BY_PITCH','STRIKEOUT','OUT'));
