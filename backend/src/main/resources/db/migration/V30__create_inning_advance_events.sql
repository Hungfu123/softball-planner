CREATE TABLE inning_advance_events (
    id              BIGSERIAL PRIMARY KEY,
    game_id         BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    to_inning       INTEGER NOT NULL CHECK (to_inning >= 2),
    opponent_runs   INTEGER NOT NULL DEFAULT 0 CHECK (opponent_runs >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(64) NOT NULL DEFAULT 'unknown'
);

CREATE INDEX idx_inning_advance_events_game_id ON inning_advance_events(game_id);
CREATE INDEX idx_inning_advance_events_game_created ON inning_advance_events(game_id, created_at);
