CREATE TABLE lineup_set (
    id          BIGSERIAL PRIMARY KEY,
    game_day_id BIGINT NOT NULL REFERENCES game_days(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE lineup_set_entry (
    id                  BIGSERIAL PRIMARY KEY,
    lineup_set_id       BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
    game_number         INT NOT NULL,
    player_id           BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    position            VARCHAR(255),
    batting_order       INT NOT NULL,
    dh_batter_player_id BIGINT REFERENCES players(id) ON DELETE SET NULL
);

CREATE INDEX idx_lineup_set_game_day ON lineup_set(game_day_id);
CREATE INDEX idx_lineup_set_entry_set ON lineup_set_entry(lineup_set_id);
