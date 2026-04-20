-- Extra Innings unterstützen: Softball hat bei Tie-Game nach 7 Innings
-- Tiebreaker / Extra Innings. Original-Check erlaubte nur 1-9, das reicht
-- nicht für lange Tiebreaker-Situationen.
-- Praktische Obergrenze 99 (absurdly long but defensive).

ALTER TABLE at_bats DROP CONSTRAINT IF EXISTS at_bats_inning_check;
ALTER TABLE at_bats ADD CONSTRAINT at_bats_inning_check CHECK (inning >= 1 AND inning <= 99);

ALTER TABLE base_running_events DROP CONSTRAINT IF EXISTS base_running_events_inning_check;
ALTER TABLE base_running_events ADD CONSTRAINT base_running_events_inning_check CHECK (inning >= 1 AND inning <= 99);
