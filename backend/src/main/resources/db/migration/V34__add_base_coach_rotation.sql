-- T18: Base-Coach-Rotation aus Lineup für 10/11-Spieler-Setups
-- Bei leerem GameStaff-Slot (1B oder 3B) wird Rotation aus Lineup gewählt.
-- 3 Paare: POS_3_8, POS_4_9, POS_5_10.

ALTER TABLE games ADD COLUMN first_base_coach_rotation VARCHAR(20);
ALTER TABLE games ADD COLUMN third_base_coach_rotation VARCHAR(20);
