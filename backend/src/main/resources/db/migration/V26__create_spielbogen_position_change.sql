CREATE TABLE spielbogen_position_change (
    id BIGSERIAL PRIMARY KEY,
    bogen_id BIGINT NOT NULL REFERENCES spielbogen(id) ON DELETE CASCADE,
    slot_id BIGINT NOT NULL REFERENCES spielbogen_slot(id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL,
    inning INTEGER NOT NULL,
    group_id VARCHAR(36) NOT NULL,
    old_position VARCHAR(8),
    new_position VARCHAR(8),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT spielbogen_poschg_side_check CHECK (side IN ('HOME', 'AWAY'))
);

CREATE INDEX idx_spielbogen_poschg_bogen_side ON spielbogen_position_change(bogen_id, side);
CREATE INDEX idx_spielbogen_poschg_group ON spielbogen_position_change(group_id);
