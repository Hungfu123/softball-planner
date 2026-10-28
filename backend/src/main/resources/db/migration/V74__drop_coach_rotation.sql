DROP TABLE IF EXISTS lineup_set_game_rotation;
ALTER TABLE games DROP COLUMN IF EXISTS first_base_coach_rotation;
ALTER TABLE games DROP COLUMN IF EXISTS third_base_coach_rotation;
ALTER TABLE games DROP COLUMN IF EXISTS first_base_coach_rotation_reversed;
ALTER TABLE games DROP COLUMN IF EXISTS third_base_coach_rotation_reversed;
