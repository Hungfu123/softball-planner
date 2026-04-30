CREATE TABLE spielbogen_at_bat (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    sequence INTEGER NOT NULL,
    inning INTEGER NOT NULL,
    result VARCHAR(20) NOT NULL,
    out_type VARCHAR(20),
    fielder_chain INTEGER[],
    is_error BOOLEAN NOT NULL DEFAULT FALSE,
    error_position INTEGER,
    runs_scored INTEGER NOT NULL DEFAULT 0,
    rbi INTEGER NOT NULL DEFAULT 0,
    base_state_first BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    base_state_second BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    base_state_third BIGINT REFERENCES spielbogen_slot(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    CONSTRAINT spielbogen_atbat_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_atbat_result_check CHECK (
        result IN ('SINGLE','DOUBLE','TRIPLE','HOMERUN','WALK','HIT_BY_PITCH','STRIKEOUT','OUT')
    ),
    CONSTRAINT spielbogen_atbat_outtype_when_out CHECK (
        (result = 'OUT' AND (out_type IS NULL OR out_type IN
            ('GROUNDER','FLY','FOUL','UNASSISTED','DOUBLE_PLAY','TRIPLE_PLAY','FORCE_OUT','TAG_OUT')))
        OR (result != 'OUT' AND out_type IS NULL)
    ),
    CONSTRAINT spielbogen_atbat_error_pos_range CHECK (
        error_position IS NULL OR error_position BETWEEN 1 AND 9
    ),
    CONSTRAINT spielbogen_atbat_runs_nonneg CHECK (runs_scored >= 0 AND rbi >= 0),
    UNIQUE (bogen_id, side, sequence)
);

CREATE INDEX idx_spielbogen_atbat_bogen_side ON spielbogen_at_bat(bogen_id, side);
CREATE INDEX idx_spielbogen_atbat_slot ON spielbogen_at_bat(slot_id);
CREATE INDEX idx_spielbogen_atbat_inning ON spielbogen_at_bat(bogen_id, side, inning);

CREATE TABLE spielbogen_stealing_event (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    from_base INTEGER NOT NULL,
    to_base INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT spielbogen_stealing_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT spielbogen_stealing_type_check CHECK (
        type IN ('STOLEN_BASE','CAUGHT_STEALING','OUT_ON_PLAY')
    ),
    CONSTRAINT spielbogen_stealing_base_range CHECK (
        from_base BETWEEN 1 AND 3 AND to_base BETWEEN 2 AND 4
    )
);

CREATE INDEX idx_spielbogen_stealing_bogen_side ON spielbogen_stealing_event(bogen_id, side);

CREATE TABLE spielbogen_substitution (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    player_out_name VARCHAR(100) NOT NULL,
    player_in_name VARCHAR(100) NOT NULL,
    is_pinch_hitter BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT spielbogen_sub_side_check CHECK (side IN ('HOME', 'AWAY'))
);

CREATE INDEX idx_spielbogen_sub_bogen_side ON spielbogen_substitution(bogen_id, side);
