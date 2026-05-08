CREATE TABLE spielbogen_runner_advance (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    at_bat_id BIGINT NOT NULL REFERENCES spielbogen_at_bat(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    from_base SMALLINT NOT NULL,
    to_base SMALLINT NOT NULL,
    reason VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT runner_advance_side_check CHECK (side IN ('HOME', 'AWAY')),
    CONSTRAINT runner_advance_base_check CHECK (
        from_base BETWEEN 0 AND 3 AND to_base BETWEEN 1 AND 4 AND to_base > from_base
    )
);

CREATE INDEX idx_runner_advance_bogen_side ON spielbogen_runner_advance(bogen_id, side);
CREATE INDEX idx_runner_advance_atbat ON spielbogen_runner_advance(at_bat_id);
CREATE INDEX idx_runner_advance_slot ON spielbogen_runner_advance(slot_id);
