CREATE TABLE spielbogen (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    location VARCHAR(200),
    home_team_name VARCHAR(100) NOT NULL,
    away_team_name VARCHAR(100) NOT NULL,
    season_id BIGINT REFERENCES seasons(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    current_inning INTEGER NOT NULL DEFAULT 1,
    current_side VARCHAR(10) NOT NULL DEFAULT 'AWAY',
    home_runs INTEGER NOT NULL DEFAULT 0,
    away_runs INTEGER NOT NULL DEFAULT 0,
    league_result_id BIGINT REFERENCES league_results(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    CONSTRAINT spielbogen_status_check CHECK (status IN ('DRAFT', 'LIVE', 'DONE')),
    CONSTRAINT spielbogen_side_check CHECK (current_side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_runs_nonneg CHECK (home_runs >= 0 AND away_runs >= 0)
);

CREATE INDEX idx_spielbogen_season ON spielbogen(season_id);
CREATE INDEX idx_spielbogen_status ON spielbogen(status);
CREATE INDEX idx_spielbogen_date_desc ON spielbogen(date DESC);

CREATE TABLE spielbogen_slot (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    slot INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(10),
    batting_order INTEGER NOT NULL,
    CONSTRAINT spielbogen_slot_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_slot_slot_range CHECK (slot BETWEEN 1 AND 10),
    CONSTRAINT spielbogen_slot_order_range CHECK (batting_order BETWEEN 1 AND 10),
    UNIQUE (bogen_id, side, slot),
    UNIQUE (bogen_id, side, batting_order)
);

CREATE INDEX idx_spielbogen_slot_bogen_side ON spielbogen_slot(bogen_id, side);
