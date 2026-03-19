ALTER TABLE games DROP CONSTRAINT IF EXISTS CONSTRAINT_2;
ALTER TABLE games ADD CONSTRAINT games_number_check CHECK (game_number >= 1 AND game_number <= 10);
