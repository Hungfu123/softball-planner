CREATE TABLE automatic_out_events (
    id          BIGSERIAL PRIMARY KEY,
    game_id     BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    inning      INTEGER NOT NULL CHECK (inning >= 1),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(64) NOT NULL DEFAULT 'unknown'
);

CREATE INDEX idx_automatic_out_events_game_id ON automatic_out_events(game_id);
CREATE INDEX idx_automatic_out_events_game_created ON automatic_out_events(game_id, created_at);
