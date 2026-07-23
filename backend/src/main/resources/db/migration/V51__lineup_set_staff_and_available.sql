CREATE TABLE lineup_set_staff (
    id            BIGSERIAL PRIMARY KEY,
    lineup_set_id BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
    game_number   INT NOT NULL,
    player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    role          VARCHAR(32) NOT NULL
);
CREATE INDEX idx_lineup_set_staff_set ON lineup_set_staff(lineup_set_id);

CREATE TABLE lineup_set_available_player (
    id            BIGSERIAL PRIMARY KEY,
    lineup_set_id BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
    player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE
);
CREATE INDEX idx_lineup_set_avail_set ON lineup_set_available_player(lineup_set_id);
