-- Live-Scoring: At-Bats + Base-Running-Events
-- Event-Sourcing-lite: Rohe Events werden gespeichert, Stats on-the-fly berechnet.

CREATE TABLE at_bats (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    batter_player_id BIGINT NOT NULL REFERENCES players(id),
    sequence INTEGER NOT NULL,
    inning INTEGER NOT NULL CHECK (inning >= 1 AND inning <= 9),
    result VARCHAR(32) NOT NULL,
    runner_first_id BIGINT REFERENCES players(id),
    runner_second_id BIGINT REFERENCES players(id),
    runner_third_id BIGINT REFERENCES players(id),
    runs_scored INTEGER NOT NULL DEFAULT 0,
    rbi INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64) NOT NULL,
    CONSTRAINT uq_atbats_game_sequence UNIQUE (game_id, sequence)
);

CREATE INDEX idx_at_bats_game ON at_bats(game_id, sequence);
CREATE INDEX idx_at_bats_batter ON at_bats(batter_player_id);

CREATE TABLE base_running_events (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    runner_player_id BIGINT NOT NULL REFERENCES players(id),
    inning INTEGER NOT NULL CHECK (inning >= 1 AND inning <= 9),
    type VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_base_running_game ON base_running_events(game_id);
CREATE INDEX idx_base_running_runner ON base_running_events(runner_player_id);
