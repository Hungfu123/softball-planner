CREATE TABLE whatsapp_synced_vote (
    id          BIGSERIAL PRIMARY KEY,
    training_id BIGINT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    voter_name  VARCHAR(255) NOT NULL,
    player_id   BIGINT REFERENCES players(id) ON DELETE SET NULL,
    present     BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_synced_vote UNIQUE (training_id, voter_name)
);
CREATE INDEX idx_synced_vote_unknown ON whatsapp_synced_vote (player_id) WHERE player_id IS NULL;
