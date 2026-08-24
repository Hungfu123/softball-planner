-- Coach-Rotation je Spiel als Teil des Lineup-Set-Snapshots.
-- Vorher lag die Rotation nur am Game (V34/V37) und blieb beim Set-Wechsel
-- vom vorherigen Set haengen. Alt-Sets haben keine Zeilen -> Rotation wird
-- beim Anwenden geleert (bisheriges Verhalten).
CREATE TABLE lineup_set_game_rotation (
    id                   BIGSERIAL PRIMARY KEY,
    lineup_set_id        BIGINT NOT NULL REFERENCES lineup_set(id) ON DELETE CASCADE,
    game_number          INT NOT NULL,
    first_base_pair      VARCHAR(20),
    first_base_reversed  BOOLEAN NOT NULL DEFAULT false,
    third_base_pair      VARCHAR(20),
    third_base_reversed  BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_lineup_set_game_rotation UNIQUE (lineup_set_id, game_number)
);

CREATE INDEX idx_lineup_set_game_rotation_set ON lineup_set_game_rotation(lineup_set_id);
