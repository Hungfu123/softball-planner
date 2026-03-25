CREATE TABLE substitutions (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_out_id BIGINT NOT NULL REFERENCES players(id),
    player_in_id BIGINT NOT NULL REFERENCES players(id),
    inning INTEGER NOT NULL CHECK (inning >= 1 AND inning <= 6),
    UNIQUE (game_id, player_out_id, inning)
);
