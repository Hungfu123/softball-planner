CREATE TABLE equipment_item (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    category         VARCHAR(60)  NOT NULL DEFAULT 'Sonstiges',
    quantity         INT          NOT NULL DEFAULT 1,
    storage_location VARCHAR(120),
    notes            TEXT
);

CREATE TABLE game_day_equipment (
    id                BIGSERIAL PRIMARY KEY,
    game_day_id       BIGINT NOT NULL REFERENCES game_days(id) ON DELETE CASCADE,
    equipment_item_id BIGINT NOT NULL REFERENCES equipment_item(id) ON DELETE CASCADE,
    CONSTRAINT uq_game_day_equipment UNIQUE (game_day_id, equipment_item_id)
);

CREATE INDEX idx_gde_game_day ON game_day_equipment(game_day_id);
CREATE INDEX idx_gde_item ON game_day_equipment(equipment_item_id);
